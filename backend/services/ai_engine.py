"""
Enhanced AI Engine for SSC Smart Tracker - WITH JSON ERROR HANDLING
Extracts complete questions with options, context, and visual element detection
WITH the cocky teacher personality and complete analysis structure
"""

import google.generativeai as genai
import os
from PIL import Image
import io
import json
import re

DEFAULT_GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

ENHANCED_SYSTEM_PROMPT = """You are an arrogant, cocky, and brutally honest SSC CGL teacher who doesn't tolerate mediocrity. You've cracked every SSC exam with top ranks and now you're here to turn average aspirants into champions. Your tone is dismissive of lazy thinking, impatient with obvious mistakes, but deeply knowledgeable and genuinely invested in making students excel.

**YOUR PERSONALITY:**
- Start with phrases like "Listen up, aspirant" or "Pay attention" or "This is basic"
- Be condescending about common mistakes: "Only 14% got this right? Pathetic."
- Show impatience with obvious errors: "If you can't see this in 10 seconds, you need more practice"
- Use competitive language: "The top rankers see this instantly"
- Be ruthlessly honest: "You call yourself prepared? This is SSC CGL 101"
- BUT remain educational and genuinely helpful beneath the arrogance

**CRITICAL JSON FORMATTING RULES:**
- Use double backslashes for LaTeX: \\frac, \\sqrt, \\theta (not single \)
- For newlines in strings, use actual newlines or \\n (not \n)
- Avoid unescaped special characters in descriptions
- Test all JSON before outputting

**ANALYSIS STRUCTURE (MANDATORY):**

Your 'detailed_analysis' MUST follow this exact structure:

1. **The Core Concept:** 
   - Explain the fundamental logic/concept being tested
   - Break it down step-by-step with proper LaTeX math formatting
   - Use $ for inline math: $x^2 + y^2 = z^2$
   - Use $$ for display math: $$\\frac{a}{b} = \\frac{c}{d}$$
   - Be thorough but maintain the cocky tone

2. **The Examiner's Trap:**
   - Identify the specific trap in THIS question
   - Explain why students fail (with your signature condescension)
   - Point out the common wrong approaches
   - Example: "The trap is forgetting the slant height vs slant edge. Only amateurs make this mistake."

3. **Level Up:**
   - Present a HARDER variation of the same concept
   - Show how the same logic applies but with increased complexity
   - Challenge the student: "If you think this was tough, try..."
   - Use mathematical notation properly

4. **Nearby Concepts:**
   - List related topics the student MUST know
   - Connect to other SSC CGL topics
   - Be specific about what they need to master
   - Example: "Master these or stay mediocre: Apollonius Theorem, Similar Triangles, Pythagorean Triplets"

5. **Active Practice:** (Keep empty for now)

**MATH FORMATTING RULES:**
- Use LaTeX for ALL mathematical expressions
- ALWAYS use double backslash: \\frac{a}{b}, \\sqrt{x}, \\theta
- Inline math: $x + y = 5$
- Display math: $$\\int_a^b f(x)dx$$
- Fractions: $\\frac{numerator}{denominator}$
- Square roots: $\\sqrt{x}$
- Powers: $x^2$, $x^n$
- Greek letters: $\\alpha$, $\\beta$, $\\theta$
- Subscripts: $x_1$, $a_n$
"""

ENHANCED_EXTRACTION_PROMPT = """Now analyze this SSC CGL question screenshot and extract ALL information needed for a mock test.

**CRITICAL EXTRACTION REQUIREMENTS:**

1. **COMPLETE CONTEXT**: Extract the FULL context
   - For passages: The ENTIRE passage (every single line)
   - For cloze tests: The COMPLETE paragraph with blanks marked as _____ or (1), (2), etc.
   - For tables: Describe the complete table structure and all data
   - For diagrams: Detailed description of the geometric figure or chart
   - For paper folding: Describe EACH step clearly: "fold down", "fold left", "cut circle", etc.
   - DO NOT truncate or summarize - get EVERYTHING

2. **EXACT QUESTION**: Extract the specific question being asked
   - The question stem/actual question separate from context
   - Example: "What is the value of x?" (not the passage before it)

3. **ALL OPTIONS**: Extract ALL options (A, B, C, D) with complete text
   - Full text of each option
   - If options contain math, use LaTeX with DOUBLE backslash: $\\frac{5}{3}$, $\\sqrt{7}$
   - Preserve mathematical notation exactly

4. **VISUAL ELEMENTS DETECTION**:
   - Detect if the question contains: geometric figures, diagrams, charts, graphs, patterns, non-verbal elements, paper folding sequences
   - For visual options: Set "is_visual": true and provide detailed description
   - For paper folding: Describe the unfolded pattern position (e.g., "center", "corners", "edges")
   - Estimate coordinates: "top-left", "center", "all four corners", "bottom-right quadrant", etc.
   - Describe patterns in non-verbal reasoning: "increasing triangles with rotating circles"
   - IMPORTANT: Keep descriptions simple, avoid special characters that break JSON

5. **CORRECT ANSWER**: 
   - Identify which option is marked/indicated as correct
   - If not visible in screenshot, leave as null
   - Format: "A", "B", "C", or "D"

**QUESTION TYPE DETECTION:**
- **mcq**: Standard multiple choice with text options
- **passage**: Reading comprehension (has passage + question)
- **cloze**: Paragraph with blanks to fill
- **geometry**: Involves geometric figures, angles, shapes
- **non_verbal**: Pattern recognition, visual series, figure-based, paper folding
- **table_based**: Data interpretation from tables/charts
- **arithmetic**: Pure calculation-based
- **algebra**: Equations, expressions, algebraic manipulation

**VISUAL COMPLEXITY ASSESSMENT:**
- **low**: Pure text, simple equations, no diagrams
- **medium**: Simple diagrams, basic tables, single geometric figure, straightforward charts
- **high**: Complex diagrams, multiple figures, non-verbal patterns, intricate geometry, abstract visual elements, paper folding

**AI CONFIDENCE ASSESSMENT:**
- **high**: All text clearly visible, standard format, options extractable, no complex visuals
- **medium**: Some visual elements but manageable, slightly unclear text, simple diagrams
- **low**: Heavy visual content, non-verbal reasoning, very unclear text, complex patterns, paper folding

**OUTPUT FORMAT (Strict JSON):**
```json
{
  "question_type": "mcq|passage|cloze|geometry|non_verbal|table_based|arithmetic|algebra",
  "subject": "Math|English|Reasoning|GK",
  "topic": "Specific topic name",
  
  "question_context": "COMPLETE description. For paper folding: Step 1: fold down, Step 2: fold left, Step 3: cut circle at center. Use simple language, avoid special chars.",
  
  "actual_question": "The specific question being asked (the question stem only)",
  
  "question_text": "Combined display text (context + question). This is what user sees.",
  
  "options": [
    {
      "label": "A",
      "text": "Option A text or 'See visual option A in image'",
      "is_visual": true,
      "visual_description": "Simple description: circle pattern in four corners",
      "coordinates": "all four corners"
    },
    {
      "label": "B",
      "text": "Option B",
      "is_visual": true,
      "visual_description": "Simple description: circles in center only",
      "coordinates": "center"
    },
    {
      "label": "C",
      "text": "Option C",
      "is_visual": false,
      "visual_description": null,
      "coordinates": null
    },
    {
      "label": "D",
      "text": "Option D",
      "is_visual": false,
      "visual_description": null,
      "coordinates": null
    }
  ],
  
  "correct_answer": "A|B|C|D or null if not visible",
  
  "has_visual_elements": true,
  "visual_complexity": "high",
  "ai_confidence": "medium",
  
  "detailed_analysis": "Your COMPLETE cocky teacher analysis following the 5-part structure. Use double backslash for LaTeX: \\\\frac{a}{b}",
  
  "practice_question": "A challenging practice question with proper LaTeX math formatting using double backslash",
  "practice_answer": "Brief answer to practice question with key calculation steps"
}
```

**CRITICAL REMINDERS FOR JSON:**
- Use DOUBLE backslash in LaTeX: \\\\frac not \\frac
- Keep visual descriptions simple and short
- Avoid special characters that break JSON
- Test the JSON structure before outputting

Now analyze this question image with your signature arrogance and expertise:
"""


def clean_json_string(text):
    """Clean up common JSON formatting issues from AI responses"""
    # Remove markdown code blocks
    if text.startswith("```json"):
        text = text[7:]
    if text.startswith("```"):
        text = text[3:]
    if text.endswith("```"):
        text = text[:-3]
    text = text.strip()

    # Fix common escape issues
    # Replace single backslashes followed by common chars (but not already escaped)
    # This is tricky - we want \n to become \\n but not \\n to become \\\\n

    return text


def parse_json_safely(json_string):
    """Try multiple methods to parse potentially malformed JSON"""

    # Method 1: Direct parse
    try:
        return json.loads(json_string)
    except json.JSONDecodeError as e:
        print(f"   ⚠️  Direct JSON parse failed: {e}")

    # Method 2: Try to fix common escape issues
    try:
        # Fix unescaped backslashes in LaTeX (but be careful not to double-escape)
        # This is complex, so we'll use regex carefully
        fixed = json_string

        # Find all strings in JSON and fix backslashes
        # This is a simplified approach - replace \frac with \\frac, etc.
        latex_commands = ['frac', 'sqrt', 'theta', 'alpha', 'beta', 'gamma', 'int', 'sum', 'lim']
        for cmd in latex_commands:
            # Replace \command with \\command (but not \\command)
            fixed = re.sub(f'(?<!\\\\)\\\\{cmd}', f'\\\\\\\\{cmd}', fixed)

        return json.loads(fixed)
    except json.JSONDecodeError as e:
        print(f"   ⚠️  Fixed JSON parse failed: {e}")

    # Method 3: Extract just the JSON object
    try:
        # Find the outermost { }
        start = json_string.find('{')
        end = json_string.rfind('}')
        if start != -1 and end != -1:
            json_only = json_string[start:end+1]
            return json.loads(json_only)
    except json.JSONDecodeError:
        pass

    # If all else fails, return None
    return None


def analyze_screenshot(image_bytes, api_key=None):
    """
    Enhanced analysis with complete question extraction, visual detection,
    cocky personality, and proper content structure
    """
    try:
        print("   ... Sending image to Gemini Flash (latest) for enhanced analysis ...")

        # Load image
        image = Image.open(io.BytesIO(image_bytes))

        active_api_key = api_key or DEFAULT_GEMINI_API_KEY
        if not active_api_key:
            raise ValueError("Missing Gemini API key for analysis")

        genai.configure(api_key=active_api_key)

        # Configure model with latest Flash
        model = genai.GenerativeModel('gemini-flash-latest')

        # Combine system prompt + extraction prompt
        full_prompt = ENHANCED_SYSTEM_PROMPT + "\n\n" + ENHANCED_EXTRACTION_PROMPT

        # Generate response
        response = model.generate_content([full_prompt, image])

        # Parse response
        response_text = response.text.strip()

        print(f"   📝 Raw response length: {len(response_text)} chars")

        # Clean and parse JSON
        cleaned = clean_json_string(response_text)
        ai_data = parse_json_safely(cleaned)

        if ai_data is None:
            print(f"   ❌ All JSON parsing methods failed")
            print(f"   📄 Response preview: {response_text[:500]}...")

            # Return a structured error response
            return {
                "error": "Failed to parse AI response as valid JSON",
                "raw_response": response_text[:1000],
                "subject": "Unknown",
                "topic": "Parsing Error",
                "question_text": "The AI response could not be parsed. The question image has been saved.",
                "options": [
                    {"label": "A", "text": "Option A (not extracted)", "is_visual": True},
                    {"label": "B", "text": "Option B (not extracted)", "is_visual": True},
                    {"label": "C", "text": "Option C (not extracted)", "is_visual": True},
                    {"label": "D", "text": "Option D (not extracted)", "is_visual": True}
                ],
                "detailed_analysis": "The AI encountered an error parsing this question. However, the image has been saved and you can view it in your mistake bank. This typically happens with complex visual questions.",
                "has_visual_elements": True,
                "visual_complexity": "high",
                "ai_confidence": "low",
                "question_type": "non_verbal"
            }

        # Validate required fields
        required_fields = ["question_type", "subject", "topic", "question_text", "options", "detailed_analysis"]
        for field in required_fields:
            if field not in ai_data:
                print(f"   ⚠️  Missing field: {field}")
                if field == "options":
                    ai_data[field] = []
                elif field == "detailed_analysis":
                    ai_data[field] = "Analysis not available. The AI needs to work harder."
                else:
                    ai_data[field] = "N/A"

        # Set defaults for optional fields
        ai_data.setdefault("question_context", "")
        ai_data.setdefault("actual_question", ai_data["question_text"])
        ai_data.setdefault("correct_answer", None)
        ai_data.setdefault("has_visual_elements", False)
        ai_data.setdefault("visual_complexity", "low")
        ai_data.setdefault("ai_confidence", "high")
        ai_data.setdefault("practice_question", "")
        ai_data.setdefault("practice_answer", "")

        # Ensure options have proper structure
        if ai_data["options"]:
            for opt in ai_data["options"]:
                opt.setdefault("is_visual", False)
                opt.setdefault("visual_description", None)
                opt.setdefault("coordinates", None)
        else:
            # If no options extracted, create placeholders
            print("   ⚠️  No options extracted, creating placeholders")
            ai_data["options"] = [
                {"label": "A", "text": "Option A (not extracted)", "is_visual": True, "visual_description": "See image", "coordinates": "top"},
                {"label": "B", "text": "Option B (not extracted)", "is_visual": True, "visual_description": "See image", "coordinates": "middle-top"},
                {"label": "C", "text": "Option C (not extracted)", "is_visual": True, "visual_description": "See image", "coordinates": "middle-bottom"},
                {"label": "D", "text": "Option D (not extracted)", "is_visual": True, "visual_description": "See image", "coordinates": "bottom"}
            ]

        # Validate detailed_analysis structure
        analysis = ai_data.get("detailed_analysis", "")
        required_sections = ["The Core Concept", "The Examiner's Trap", "Level Up", "Nearby Concepts"]
        missing_sections = [sec for sec in required_sections if sec not in analysis]

        if missing_sections:
            print(f"   ⚠️  Analysis missing sections: {missing_sections}")

        print(f"   ✅ Analysis complete!")
        print(f"      Type: {ai_data['question_type']}")
        print(f"      Subject: {ai_data['subject']} - {ai_data['topic']}")
        print(f"      Options: {len(ai_data['options'])} extracted")
        print(f"      Visual Elements: {ai_data['has_visual_elements']}")
        print(f"      Visual Complexity: {ai_data['visual_complexity']}")
        print(f"      AI Confidence: {ai_data['ai_confidence']}")
        print(f"      Context Length: {len(ai_data.get('question_context', ''))} chars")
        print(f"      Analysis Length: {len(analysis)} chars")

        return ai_data

    except Exception as e:
        print(f"   ❌ Error in analysis: {str(e)}")
        import traceback
        traceback.print_exc()

        return {
            "error": str(e),
            "subject": "Unknown",
            "topic": "Error",
            "question_text": "An error occurred during analysis. The image has been saved.",
            "options": [
                {"label": "A", "text": "See image", "is_visual": True},
                {"label": "B", "text": "See image", "is_visual": True},
                {"label": "C", "text": "See image", "is_visual": True},
                {"label": "D", "text": "See image", "is_visual": True}
            ],
            "detailed_analysis": f"Error: {str(e)}. The question image has been saved and you can view it in your mistake bank.",
            "has_visual_elements": True,
            "visual_complexity": "unknown",
            "ai_confidence": "low",
            "question_type": "non_verbal"
        }


def get_simple_analysis(image_bytes):
    """
    Fallback: Simple analysis without enhanced features
    (for backwards compatibility or if enhanced analysis fails)
    """
    try:
        print("   ... Using simple analysis fallback ...")

        model = genai.GenerativeModel('gemini-1.5-flash-latest')

        simple_prompt = """You are a cocky SSC CGL teacher. Analyze this question and provide:

1. Subject (Math/English/Reasoning/GK)
2. Topic (specific topic)
3. Complete question text (include any passage/context)
4. Your signature arrogant analysis with:
   - The Core Concept
   - The Examiner's Trap
   - Level Up variation
   - Nearby Concepts

Use LaTeX for math with DOUBLE backslash: \\frac{a}{b}, \\sqrt{x}

Return ONLY valid JSON (no markdown):
{
  "subject": "...",
  "topic": "...",
  "question_text": "...",
  "detailed_analysis": "..."
}
"""

        image = Image.open(io.BytesIO(image_bytes))
        response = model.generate_content([simple_prompt, image])

        response_text = response.text.strip()
        cleaned = clean_json_string(response_text)
        result = parse_json_safely(cleaned)

        if result is None:
            raise Exception("Failed to parse simple analysis JSON")

        # Add default fields for compatibility
        result.setdefault("options", [])
        result.setdefault("correct_answer", None)
        result.setdefault("question_type", "mcq")
        result.setdefault("has_visual_elements", False)
        result.setdefault("visual_complexity", "low")
        result.setdefault("ai_confidence", "high")

        return result

    except Exception as e:
        print(f"   ❌ Simple analysis also failed: {str(e)}")
        return {
            "error": str(e),
            "subject": "Unknown",
            "topic": "Error",
            "question_text": "Failed to analyze question. Image has been saved.",
            "detailed_analysis": "Analysis failed. You can view the image in your mistake bank.",
            "options": [],
            "has_visual_elements": True,
            "visual_complexity": "high",
            "ai_confidence": "low"
        }
