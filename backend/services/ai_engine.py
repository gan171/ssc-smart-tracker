"""
Enhanced AI Engine for SSC Smart Tracker
Extracts complete questions with options, context, and visual element detection
WITH the cocky teacher personality and complete analysis structure
"""

import google.generativeai as genai
import os
from PIL import Image
import io
import base64
import json

# Configure Gemini
genai.configure(api_key=os.getenv("GEMINI_API_KEY"))

ENHANCED_SYSTEM_PROMPT = """You are an arrogant, cocky, and brutally honest SSC CGL teacher who doesn't tolerate mediocrity. You've cracked every SSC exam with top ranks and now you're here to turn average aspirants into champions. Your tone is dismissive of lazy thinking, impatient with obvious mistakes, but deeply knowledgeable and genuinely invested in making students excel.

**YOUR PERSONALITY:**
- Start with phrases like "Listen up, aspirant" or "Pay attention" or "This is basic"
- Be condescending about common mistakes: "Only 14% got this right? Pathetic."
- Show impatience with obvious errors: "If you can't see this in 10 seconds, you need more practice"
- Use competitive language: "The top rankers see this instantly"
- Be ruthlessly honest: "You call yourself prepared? This is SSC CGL 101"
- BUT remain educational and genuinely helpful beneath the arrogance

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
   - DO NOT truncate or summarize - get EVERYTHING

2. **EXACT QUESTION**: Extract the specific question being asked
   - The question stem/actual question separate from context
   - Example: "What is the value of x?" (not the passage before it)

3. **ALL OPTIONS**: Extract ALL options (A, B, C, D) with complete text
   - Full text of each option
   - If options contain math, use LaTeX: $\\frac{5}{3}$, $\\sqrt{7}$, etc.
   - Preserve mathematical notation exactly

4. **VISUAL ELEMENTS DETECTION**:
   - Detect if the question contains: geometric figures, diagrams, charts, graphs, patterns, non-verbal elements
   - For visual options: Set "is_visual": true and provide detailed description
   - Estimate coordinates: "top-left", "second row", "bottom-right quadrant", etc.
   - Describe patterns in non-verbal reasoning: "increasing triangles with rotating circles"

5. **CORRECT ANSWER**: 
   - Identify which option is marked/indicated as correct
   - If not visible in screenshot, leave as null
   - Format: "A", "B", "C", or "D"

**QUESTION TYPE DETECTION:**
- **mcq**: Standard multiple choice with text options
- **passage**: Reading comprehension (has passage + question)
- **cloze**: Paragraph with blanks to fill
- **geometry**: Involves geometric figures, angles, shapes
- **non_verbal**: Pattern recognition, visual series, figure-based
- **table_based**: Data interpretation from tables/charts
- **arithmetic**: Pure calculation-based
- **algebra**: Equations, expressions, algebraic manipulation

**VISUAL COMPLEXITY ASSESSMENT:**
- **low**: Pure text, simple equations, no diagrams
- **medium**: Simple diagrams, basic tables, single geometric figure, straightforward charts
- **high**: Complex diagrams, multiple figures, non-verbal patterns, intricate geometry, abstract visual elements

**AI CONFIDENCE ASSESSMENT:**
- **high**: All text clearly visible, standard format, options extractable, no complex visuals
- **medium**: Some visual elements but manageable, slightly unclear text, simple diagrams
- **low**: Heavy visual content, non-verbal reasoning, very unclear text, complex patterns

**OUTPUT FORMAT (Strict JSON):**
```json
{
  "question_type": "mcq|passage|cloze|geometry|non_verbal|table_based|arithmetic|algebra",
  "subject": "Math|English|Reasoning|GK",
  "topic": "Specific topic name",

  "question_context": "COMPLETE passage/paragraph/table/diagram description. Empty string if N/A. For passages: Include EVERY LINE. For cloze: Include COMPLETE paragraph. For diagrams: Detailed description.",

  "actual_question": "The specific question being asked (the question stem only)",

  "question_text": "Combined display text (context + question). This is what user sees.",

  "options": [
    {
      "label": "A",
      "text": "Complete text of option A with LaTeX if needed: $x^2 + 5$",
      "is_visual": false,
      "visual_description": null,
      "coordinates": null
    },
    {
      "label": "B",
      "text": "Complete text of option B",
      "is_visual": false,
      "visual_description": null,
      "coordinates": null
    },
    {
      "label": "C",
      "text": "Complete text of option C",
      "is_visual": false,
      "visual_description": null,
      "coordinates": null
    },
    {
      "label": "D",
      "text": "Complete text of option D",
      "is_visual": false,
      "visual_description": null,
      "coordinates": null
    }
  ],

  "correct_answer": "A|B|C|D or null if not visible",

  "has_visual_elements": true/false,
  "visual_complexity": "low|medium|high",
  "ai_confidence": "high|medium|low",

  "detailed_analysis": "Your COMPLETE cocky teacher analysis following the 5-part structure:\n\n1. **The Core Concept:** [Full explanation with LaTeX math]\n\n2. **The Examiner's Trap:** [Why students fail this]\n\n3. **Level Up:** [Harder variation]\n\n4. **Nearby Concepts:** [Related topics to master]\n\n5. **Active Practice:** [Leave empty]\n\nUse proper LaTeX: $x^2$, $$\\frac{a}{b}$$, $\\sqrt{x}$, etc.",

  "practice_question": "A challenging practice question with proper LaTeX math formatting",
  "practice_answer": "Brief answer to practice question with key calculation steps"
}
```

**CRITICAL REMINDERS:**
- Extract COMPLETE context (full passages, not summaries!)
- Use LaTeX for all math: $x^2$, $\\frac{a}{b}$, $\\sqrt{x}$
- Maintain cocky teacher personality in detailed_analysis
- Follow the 5-part analysis structure EXACTLY
- For visual options in non-verbal: describe each figure in detail
- Estimate coordinates for visual elements when possible

Now analyze this question image with your signature arrogance and expertise:
"""


def analyze_screenshot(image_bytes):
    """
    Enhanced analysis with complete question extraction, visual detection,
    cocky personality, and proper content structure
    """
    try:
        print("   ... Sending image to Gemini Flash (latest) for enhanced analysis ...")

        # Load image
        image = Image.open(io.BytesIO(image_bytes))

        # Configure model with latest Flash
        model = genai.GenerativeModel('gemini-flash-latest')

        # Combine system prompt + extraction prompt
        full_prompt = ENHANCED_SYSTEM_PROMPT + "\n\n" + ENHANCED_EXTRACTION_PROMPT

        # Generate response
        response = model.generate_content([full_prompt, image])

        # Parse response
        response_text = response.text.strip()

        # Remove markdown code blocks if present
        if response_text.startswith("```json"):
            response_text = response_text[7:]
        if response_text.startswith("```"):
            response_text = response_text[3:]
        if response_text.endswith("```"):
            response_text = response_text[:-3]
        response_text = response_text.strip()

        # Parse JSON

        ai_data = json.loads(response_text)

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
                {"label": "A", "text": "Option A (not extracted)", "is_visual": False, "visual_description": None,
                 "coordinates": None},
                {"label": "B", "text": "Option B (not extracted)", "is_visual": False, "visual_description": None,
                 "coordinates": None},
                {"label": "C", "text": "Option C (not extracted)", "is_visual": False, "visual_description": None,
                 "coordinates": None},
                {"label": "D", "text": "Option D (not extracted)", "is_visual": False, "visual_description": None,
                 "coordinates": None}
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

    except json.JSONDecodeError as e:
        print(f"   ❌ JSON parsing error: {e}")
        print(f"   Raw response preview: {response_text[:300]}...")

        # Return error with raw response for debugging
        return {
            "error": "Failed to parse AI response as JSON",
            "raw_response": response_text[:1000],
            "subject": "Unknown",
            "topic": "Error",
            "question_text": "Failed to extract question. Please try again.",
            "options": [],
            "detailed_analysis": "The AI response could not be parsed. This is likely due to malformed JSON in the response.",
            "has_visual_elements": False,
            "visual_complexity": "unknown",
            "ai_confidence": "low"
        }

    except Exception as e:
        print(f"   ❌ Error in analysis: {str(e)}")
        import traceback
        traceback.print_exc()

        return {
            "error": str(e),
            "subject": "Unknown",
            "topic": "Error",
            "question_text": "An error occurred during analysis.",
            "options": [],
            "detailed_analysis": f"Error: {str(e)}",
            "has_visual_elements": False,
            "visual_complexity": "unknown",
            "ai_confidence": "low"
        }


def get_simple_analysis(image_bytes):
    """
    Fallback: Simple analysis without enhanced features
    (for backwards compatibility or if enhanced analysis fails)
    """
    try:
        print("   ... Using simple analysis fallback ...")

        model = genai.GenerativeModel('gemini-flash-latest')

        simple_prompt = """You are a cocky SSC CGL teacher. Analyze this question and provide:

1. Subject (Math/English/Reasoning/GK)
2. Topic (specific topic)
3. Complete question text (include any passage/context)
4. Your signature arrogant analysis with:
   - The Core Concept
   - The Examiner's Trap
   - Level Up variation
   - Nearby Concepts

Use LaTeX for math: $x^2$, $\\frac{a}{b}$, etc.

Return as JSON:
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
        if response_text.startswith("```json"):
            response_text = response_text[7:]
        if response_text.startswith("```"):
            response_text = response_text[3:]
        if response_text.endswith("```"):
            response_text = response_text[:-3]

        import json
        result = json.loads(response_text.strip())

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
            "question_text": "Failed to analyze question",
            "detailed_analysis": "Analysis failed",
            "options": []
        }