from __future__ import annotations

import io
import re
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List

import requests
from PIL import Image
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.utils import ImageReader
from reportlab.pdfgen import canvas

MAX_IMAGE_WIDTH = 400
PAGE_WIDTH, PAGE_HEIGHT = A4
MARGIN_X = 50
TOP_MARGIN = 60
BOTTOM_MARGIN = 50
LINE_HEIGHT = 16


def strip_latex(text: str) -> str:
    """Remove LaTeX formatting and convert to readable text"""
    if not text:
        return ""

    # Convert common LaTeX symbols
    replacements = {
        r'\sqrt': '√',
        r'\circ': '°',
        r'\times': '×',
        r'\div': '÷',
        r'\pm': '±',
        r'\leq': '≤',
        r'\geq': '≥',
        r'\neq': '≠',
        r'\approx': '≈',
        r'\alpha': 'α',
        r'\beta': 'β',
        r'\gamma': 'γ',
        r'\theta': 'θ',
        r'\pi': 'π',
        r'\Delta': 'Δ',
    }

    result = text

    # Replace LaTeX commands with symbols
    for latex, symbol in replacements.items():
        result = result.replace(latex, symbol)

    # Remove $...$ inline math delimiters but keep content
    result = re.sub(r'\$([^$]+)\$', r'\1', result)

    # Remove $$...$$ display math delimiters
    result = re.sub(r'\$\$([^$]+)\$\$', r'\1', result)

    # Remove \frac{a}{b} and replace with a/b
    result = re.sub(r'\\frac\{([^}]+)\}\{([^}]+)\}', r'\1/\2', result)

    # Remove remaining backslashes (but not in common text)
    result = re.sub(r'\\([a-zA-Z]+)', r'\1', result)

    # Remove curly braces
    result = result.replace('{', '').replace('}', '')

    # Clean up extra spaces
    result = re.sub(r'\s+', ' ', result).strip()

    return result


def parse_date_range(date_range: str) -> str | None:
    now = datetime.now(timezone.utc)
    if date_range == "last_7_days":
        return (now - timedelta(days=7)).isoformat()
    if date_range == "last_month":
        return (now - timedelta(days=30)).isoformat()
    return None


def fetch_questions_for_export(supabase_admin, user_id: str, filters: Dict[str, Any]) -> List[Dict[str, Any]]:
    subject = filters.get("subject", "all")
    topic = filters.get("topic", "all")
    source = filters.get("question_source", "all")
    date_range = filters.get("date_range", "all_time")
    quantity = min(max(int(filters.get("quantity", 50)), 1), 500)

    query = (
        supabase_admin.table("questions")
        .select("id,question_text,image_url,options,correct_option,content,manual_notes,subject,topic,created_at")
        .eq("user_id", user_id)
        .order("created_at", desc=True)
    )

    if subject != "all":
        query = query.eq("subject", subject)

    if subject != "all" and topic != "all":
        query = query.eq("topic", topic)

    date_threshold = parse_date_range(date_range)
    if date_threshold:
        query = query.gte("created_at", date_threshold)

    response = query.limit(quantity).execute()
    questions = response.data or []

    # Source filtering based on image presence (heuristic)
    if source != "all":
        source_key = source.lower()

        def matches_source(question: Dict[str, Any]) -> bool:
            # Heuristic: questions with images are likely manual uploads
            # questions without images might be from other sources
            has_image = bool(question.get("image_url"))
            if source_key == "manual_uploads":
                return has_image
            if source_key == "mock_tests":
                return not has_image
            return True

        questions = [q for q in questions if matches_source(q)]

    return questions[:quantity]


def _draw_wrapped_text(
        pdf: canvas.Canvas,
        text: str,
        x: float,
        y: float,
        max_width: float,
        font_name: str = "Helvetica",
        font_size: int = 11
) -> float:
    """Draw text with proper word wrapping"""
    pdf.setFont(font_name, font_size)

    # Strip LaTeX before rendering
    clean_text = strip_latex(text or "")

    words = clean_text.split()
    if not words:
        return y - LINE_HEIGHT

    line = ""
    for word in words:
        test_line = f"{line} {word}".strip()
        if pdf.stringWidth(test_line, font_name, font_size) <= max_width:
            line = test_line
        else:
            if line:  # Draw the current line
                pdf.drawString(x, y, line)
                y -= LINE_HEIGHT
            line = word

            # If single word is too long, break it
            while pdf.stringWidth(line, font_name, font_size) > max_width:
                # Find how many chars fit
                for i in range(len(line), 0, -1):
                    if pdf.stringWidth(line[:i], font_name, font_size) <= max_width:
                        pdf.drawString(x, y, line[:i])
                        y -= LINE_HEIGHT
                        line = line[i:]
                        break

    # Draw remaining text
    if line:
        pdf.drawString(x, y, line)
        y -= LINE_HEIGHT

    return y


def _draw_wrapped_text_in_box(
        pdf: canvas.Canvas,
        text: str,
        x: float,
        y: float,
        box_width: float,
        max_lines: int = 5,
        font_name: str = "Helvetica",
        font_size: int = 9
) -> float:
    """Draw text wrapped within a box with line limit"""
    pdf.setFont(font_name, font_size)

    # Strip LaTeX
    clean_text = strip_latex(text or "")

    words = clean_text.split()
    if not words:
        return y - LINE_HEIGHT

    lines_drawn = 0
    line = ""
    current_y = y

    for word in words:
        if lines_drawn >= max_lines:
            # Add ellipsis to last line
            if line:
                # Truncate to fit ellipsis
                while pdf.stringWidth(line + "...", font_name, font_size) > box_width and len(line) > 0:
                    line = line[:-1]
                pdf.drawString(x, current_y, line + "...")
            break

        test_line = f"{line} {word}".strip()
        if pdf.stringWidth(test_line, font_name, font_size) <= box_width:
            line = test_line
        else:
            if line:
                pdf.drawString(x, current_y, line)
                current_y -= LINE_HEIGHT
                lines_drawn += 1
            line = word

    # Draw remaining line if within limit
    if line and lines_drawn < max_lines:
        pdf.drawString(x, current_y, line)
        current_y -= LINE_HEIGHT

    return current_y


def _download_and_resize_image(image_url: str) -> Image.Image | None:
    if not image_url:
        return None
    try:
        response = requests.get(image_url, timeout=8)
        response.raise_for_status()
        image = Image.open(io.BytesIO(response.content))
        image = image.convert("RGB")
        if image.width > MAX_IMAGE_WIDTH:
            ratio = MAX_IMAGE_WIDTH / float(image.width)
            resized_height = int(image.height * ratio)
            image = image.resize((MAX_IMAGE_WIDTH, resized_height), Image.Resampling.LANCZOS)
        return image
    except Exception:
        return None


def _estimate_question_height(pdf: canvas.Canvas, question: Dict[str, Any], options: Dict[str, Any]) -> float:
    width = PAGE_WIDTH - (2 * MARGIN_X)
    height = 40

    # Question text
    text = strip_latex(question.get("question_text") or "")
    height += max(2, len(text) // 80 + 1) * LINE_HEIGHT

    # Options
    option_list = question.get("options") or []
    height += max(2, len(option_list)) * LINE_HEIGHT * 2

    # Image
    if question.get("image_url"):
        height += 180

    # Solution box
    if options.get("include_solution"):
        height += 80
    elif options.get("include_answer_key"):
        height += 10

    # Notes box
    if options.get("include_user_notes") and question.get("manual_notes"):
        height += 70

    # AI analysis box
    if options.get("include_ai_analysis"):
        content = question.get("content")
        if isinstance(content, dict):
            analysis = content.get("detailed_analysis")
            if analysis:
                # Estimate 5 lines max
                height += 100

    return min(height, PAGE_HEIGHT - TOP_MARGIN - BOTTOM_MARGIN - 10)


def generate_custom_revision_pdf(questions: List[Dict[str, Any]], options: Dict[str, Any]) -> bytes:
    buffer = io.BytesIO()
    pdf = canvas.Canvas(buffer, pagesize=A4)

    y = PAGE_HEIGHT - TOP_MARGIN
    answer_key: List[str] = []

    pdf.setTitle("SSC Smart Tracker - Revision Export")
    pdf.setFont("Helvetica-Bold", 14)
    pdf.drawString(MARGIN_X, y, "SSC Smart Tracker - Custom Revision PDF")
    y -= 30

    for index, question in enumerate(questions, 1):
        needed_height = _estimate_question_height(pdf, question, options)
        if y - needed_height < BOTTOM_MARGIN:
            pdf.showPage()
            y = PAGE_HEIGHT - TOP_MARGIN

        # Question number
        pdf.setFont("Helvetica-Bold", 12)
        pdf.drawString(MARGIN_X, y, f"Q{index}.")
        y -= 20

        # Question text (LaTeX stripped)
        y = _draw_wrapped_text(
            pdf,
            question.get("question_text", ""),
            MARGIN_X,
            y,
            PAGE_WIDTH - (2 * MARGIN_X)
        )
        y -= 8

        # Image
        image = _download_and_resize_image(question.get("image_url"))
        if image:
            x = (PAGE_WIDTH - image.width) / 2
            pdf.drawImage(
                ImageReader(image),
                x,
                y - image.height,
                width=image.width,
                height=image.height,
                preserveAspectRatio=True,
                mask='auto'
            )
            y -= image.height + 12

        # Options (LaTeX stripped)
        option_list = question.get("options") or []
        for idx, option in enumerate(option_list):
            label = chr(65 + idx)
            # Handle both string options and dict options with 'text' field
            option_text = option if isinstance(option, str) else (
                option.get("text") if isinstance(option, dict) else str(option)
            )
            # Strip LaTeX from option text
            clean_option = strip_latex(option_text)
            y = _draw_wrapped_text(
                pdf,
                f"{label}. {clean_option}",
                MARGIN_X + 10,
                y,
                PAGE_WIDTH - (2 * MARGIN_X) - 10
            )

        correct_option = question.get("correct_option")
        content = question.get("content", {})
        explanation = content.get("explanation", "") if isinstance(content, dict) else ""

        # Solution box
        if options.get("include_solution"):
            box_height = 55
            box_top = y
            pdf.setFillColorRGB(0.95, 0.97, 1)
            pdf.rect(MARGIN_X, box_top - box_height, PAGE_WIDTH - (2 * MARGIN_X), box_height, fill=1, stroke=0)
            pdf.setFillColor(colors.black)
            pdf.setFont("Helvetica-Bold", 10)
            pdf.drawString(MARGIN_X + 8, box_top - 20, f"Correct Option: {correct_option or 'N/A'}")
            pdf.setFont("Helvetica", 10)

            # Truncate explanation to fit
            clean_explanation = strip_latex(explanation or "Not available")
            if len(clean_explanation) > 100:
                clean_explanation = clean_explanation[:100] + "..."
            pdf.drawString(MARGIN_X + 8, box_top - 36, f"Explanation: {clean_explanation}")
            y -= (box_height + 10)
        elif options.get("include_answer_key"):
            answer_key.append(f"Q{index}: {correct_option or 'N/A'}")

        # User notes box
        if options.get("include_user_notes") and question.get("manual_notes"):
            notes = strip_latex(str(question.get("manual_notes")))
            box_height = 50
            box_top = y
            pdf.setFillColorRGB(1, 0.98, 0.75)
            pdf.rect(MARGIN_X, box_top - box_height, PAGE_WIDTH - (2 * MARGIN_X), box_height, fill=1, stroke=0)
            pdf.setFillColor(colors.black)
            pdf.setFont("Helvetica-Bold", 10)
            pdf.drawString(MARGIN_X + 8, box_top - 20, "My Notes")

            # Wrap notes properly
            box_width = PAGE_WIDTH - (2 * MARGIN_X) - 16
            y = _draw_wrapped_text_in_box(
                pdf,
                notes,
                MARGIN_X + 8,
                box_top - 35,
                box_width,
                max_lines=2,
                font_name="Helvetica",
                font_size=9
            )
            y = box_top - box_height - 10

        # AI analysis box (FULL analysis, not truncated)
        if options.get("include_ai_analysis"):
            content = question.get("content")
            analysis = None
            if isinstance(content, dict):
                analysis = content.get("detailed_analysis")

            if analysis:
                # Calculate how much space we need for the full analysis
                clean_analysis = strip_latex(str(analysis))

                # Estimate lines needed (roughly 80 chars per line)
                estimated_lines = max(5, (len(clean_analysis) // 80) + 2)
                box_height = min(estimated_lines * LINE_HEIGHT + 20, 200)  # Max 200px tall

                # Check if we need a new page
                if y - box_height < BOTTOM_MARGIN:
                    pdf.showPage()
                    y = PAGE_HEIGHT - TOP_MARGIN

                box_top = y
                pdf.setFillColorRGB(0.95, 0.95, 0.95)
                pdf.rect(MARGIN_X, box_top - box_height, PAGE_WIDTH - (2 * MARGIN_X), box_height, fill=1, stroke=0)
                pdf.setFillColor(colors.black)
                pdf.setFont("Helvetica-Bold", 10)
                pdf.drawString(MARGIN_X + 8, box_top - 20, "AI Analysis")

                # Draw FULL AI analysis with proper wrapping (no line limit!)
                box_width = PAGE_WIDTH - (2 * MARGIN_X) - 16
                current_y = box_top - 35
                pdf.setFont("Helvetica", 9)

                # Word wrap without line limit
                words = clean_analysis.split()
                line = ""
                for word in words:
                    test_line = f"{line} {word}".strip()
                    if pdf.stringWidth(test_line, "Helvetica", 9) <= box_width:
                        line = test_line
                    else:
                        if line:
                            pdf.drawString(MARGIN_X + 8, current_y, line)
                            current_y -= LINE_HEIGHT
                            # Check if we need to expand box or move to new page
                            if current_y < box_top - box_height + 10:
                                # Need more space - start new page
                                if current_y < BOTTOM_MARGIN + 50:
                                    pdf.showPage()
                                    y = PAGE_HEIGHT - TOP_MARGIN
                                    current_y = y - 20
                                    pdf.setFont("Helvetica", 9)
                        line = word

                # Draw remaining text
                if line:
                    pdf.drawString(MARGIN_X + 8, current_y, line)
                    current_y -= LINE_HEIGHT

                y = min(box_top - box_height, current_y) - 10

        y -= 15

    # Answer key page
    if answer_key:
        pdf.showPage()
        y = PAGE_HEIGHT - TOP_MARGIN
        pdf.setFont("Helvetica-Bold", 14)
        pdf.drawString(MARGIN_X, y, "Correct Answer Key")
        y -= 30

        pdf.setFont("Helvetica", 11)
        for answer in answer_key:
            if y < BOTTOM_MARGIN:
                pdf.showPage()
                y = PAGE_HEIGHT - TOP_MARGIN
                pdf.setFont("Helvetica", 11)
            pdf.drawString(MARGIN_X, y, answer)
            y -= LINE_HEIGHT

    pdf.save()
    buffer.seek(0)
    return buffer.getvalue()