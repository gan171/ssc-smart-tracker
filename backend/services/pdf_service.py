from __future__ import annotations

import io
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
        .select("id,question_text,image_url,options,correct_option,content,manual_notes,detailed_analysis,subject,topic,created_at,source_type,question_source")
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

    if source != "all":
        source_key = source.lower()

        def matches_source(question: Dict[str, Any]) -> bool:
            explicit_source = (
                question.get("source_type")
                or question.get("question_source")
                or question.get("content", {}).get("source")
            )
            if explicit_source:
                return source_key in str(explicit_source).lower()

            # fallback heuristic when explicit source column is absent
            has_image = bool(question.get("image_url"))
            if source_key == "manual_uploads":
                return has_image
            if source_key == "mock_tests":
                return not has_image
            return True

        questions = [q for q in questions if matches_source(q)]

    return questions[:quantity]


def _draw_wrapped_text(pdf: canvas.Canvas, text: str, x: float, y: float, max_width: float, font_name: str = "Helvetica", font_size: int = 11) -> float:
    pdf.setFont(font_name, font_size)
    words = (text or "").split()
    if not words:
        return y - LINE_HEIGHT

    line = ""
    for word in words:
        test_line = f"{line} {word}".strip()
        if pdf.stringWidth(test_line, font_name, font_size) <= max_width:
            line = test_line
        else:
            pdf.drawString(x, y, line)
            y -= LINE_HEIGHT
            line = word
    if line:
        pdf.drawString(x, y, line)
        y -= LINE_HEIGHT
    return y


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
    text = question.get("question_text") or ""
    height += max(2, len(text) // 80 + 1) * LINE_HEIGHT

    option_list = question.get("options") or []
    height += max(2, len(option_list)) * LINE_HEIGHT

    if question.get("image_url"):
        height += 180

    if options.get("include_solution"):
        height += 80
    elif options.get("include_answer_key"):
        height += 10

    if options.get("include_user_notes") and question.get("manual_notes"):
        height += 70

    if options.get("include_ai_analysis"):
        analysis = question.get("detailed_analysis") or question.get("content", {}).get("detailed_analysis") or ""
        if analysis:
            height += max(50, (len(analysis) // 80 + 2) * LINE_HEIGHT)

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

        pdf.setFont("Helvetica-Bold", 12)
        pdf.drawString(MARGIN_X, y, f"Q{index}.")
        y -= 20

        y = _draw_wrapped_text(pdf, question.get("question_text", ""), MARGIN_X, y, PAGE_WIDTH - (2 * MARGIN_X))
        y -= 8

        image = _download_and_resize_image(question.get("image_url"))
        if image:
            x = (PAGE_WIDTH - image.width) / 2
            pdf.drawImage(ImageReader(image), x, y - image.height, width=image.width, height=image.height, preserveAspectRatio=True, mask='auto')
            y -= image.height + 12

        option_list = question.get("options") or []
        for idx, option in enumerate(option_list):
            label = chr(65 + idx)
            y = _draw_wrapped_text(pdf, f"{label}. {option}", MARGIN_X + 10, y, PAGE_WIDTH - (2 * MARGIN_X) - 10)

        correct_option = question.get("correct_option")
        explanation = question.get("content", {}).get("explanation", "")

        if options.get("include_solution"):
            box_top = y
            pdf.setFillColorRGB(0.95, 0.97, 1)
            pdf.rect(MARGIN_X, box_top - 55, PAGE_WIDTH - (2 * MARGIN_X), 50, fill=1, stroke=0)
            pdf.setFillColor(colors.black)
            pdf.setFont("Helvetica-Bold", 10)
            pdf.drawString(MARGIN_X + 8, box_top - 20, f"Correct Option: {correct_option or 'N/A'}")
            pdf.setFont("Helvetica", 10)
            pdf.drawString(MARGIN_X + 8, box_top - 36, f"Explanation: {(explanation or 'Not available')[:120]}")
            y -= 65
        elif options.get("include_answer_key"):
            answer_key.append(f"Q{index}: {correct_option or 'N/A'}")

        if options.get("include_user_notes") and question.get("manual_notes"):
            notes = question.get("manual_notes")
            pdf.setFillColorRGB(1, 0.98, 0.75)
            pdf.rect(MARGIN_X, y - 50, PAGE_WIDTH - (2 * MARGIN_X), 45, fill=1, stroke=0)
            pdf.setFillColor(colors.black)
            pdf.setFont("Helvetica-Bold", 10)
            pdf.drawString(MARGIN_X + 8, y - 20, "My Notes")
            pdf.setFont("Helvetica", 9)
            pdf.drawString(MARGIN_X + 8, y - 35, str(notes)[:150])
            y -= 60

        if options.get("include_ai_analysis"):
            analysis = question.get("detailed_analysis") or question.get("content", {}).get("detailed_analysis")
            if analysis:
                pdf.setFillColorRGB(0.95, 0.95, 0.95)
                pdf.rect(MARGIN_X, y - 60, PAGE_WIDTH - (2 * MARGIN_X), 55, fill=1, stroke=0)
                pdf.setFillColor(colors.black)
                pdf.setFont("Helvetica-Bold", 10)
                pdf.drawString(MARGIN_X + 8, y - 20, "AI Analysis")
                pdf.setFont("Helvetica", 9)
                pdf.drawString(MARGIN_X + 8, y - 36, str(analysis)[:180])
                y -= 70

        y -= 15

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
