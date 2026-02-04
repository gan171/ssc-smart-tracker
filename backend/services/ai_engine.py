import os
import json
import re
from google import genai
from google.genai import types
from dotenv import load_dotenv
from PIL import Image
import io
import time

load_dotenv()

client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))


def clean_json_text(text):
    """
    Fixes common JSON formatting errors from LLMs, specifically unescaped backslashes in LaTeX.
    """
    # 1. Remove markdown code blocks if present (```json ... ```)
    text = re.sub(r'^```json\s*', '', text)
    text = re.sub(r'\s*```$', '', text)

    # 2. Fix invalid escape sequences (The main culprit!)
    text = re.sub(r'\\(?![\\"/bfnrtu])', r'\\\\', text)

    return text.strip()


def analyze_screenshot(image_bytes: bytes):
    print("   ... Sending image to Gemini 1.5 Flash ...")
    image = Image.open(io.BytesIO(image_bytes))

    prompt = """
    You are a playfully cocky but expert SSC CGL Exam Tutor. 
    Analyze this screenshot (Math/English/GK/Reasoning).

    Return the output as STRICT JSON.

    CRITICAL LATEX RULE: 
    You MUST double-escape all backslashes in LaTeX math. 
    * WRONG: "\frac{1}{2}" 
    * RIGHT: "\\frac{1}{2}"

    JSON Structure:
    {
        "question_text": "The extracted question text. Use LaTeX for math ($x^2$).",
        "subject": "Math/English/Reasoning/GK",
        "topic": "Specific topic",
        "detailed_analysis": "The 5-step breakdown (Markdown). Double escape all LaTeX backslashes here too!",
        "practice_question": "Active practice question",
        "practice_answer": "Hidden answer",
        "options": ["Option A text", "Option B text", "Option C text", "Option D text"],
        "correct_answer": "Option B"
    }

    CONTENT GUIDELINES FOR 'detailed_analysis':
    1. **The Core Concept:** Teach the logic.
    2. **The Examiner's Trap:** Why students fail.
    3. **Level Up:** Harder variation.
    4. **Nearby Concepts:** Related topics.
    5. **Active Practice:** (Keep empty here).

    Tone: Cocky, confident, helpful.
    """

    max_retries = 3
    for attempt in range(max_retries):
        try:
            # Note: Using the specific model version often helps with stability
            response = client.models.generate_content(
                model="gemini-flash-latest",
                contents=[prompt, image],
                config=types.GenerateContentConfig(
                    response_mime_type="application/json"
                )
            )

            raw_text = response.text

            try:
                return json.loads(raw_text)
            except json.JSONDecodeError:
                print("   ⚠️ JSON Error detected. Attempting to repair...")
                cleaned_text = clean_json_text(raw_text)
                return json.loads(cleaned_text)

        except Exception as e:
            # Check if it is a 503 (Overloaded) error
            if "503" in str(e) or "overloaded" in str(e).lower():
                wait_time = (attempt + 1) * 2
                print(
                    f"   ⚠️ Model Overloaded. Retrying in {wait_time} seconds... (Attempt {attempt + 1}/{max_retries})")
                time.sleep(wait_time)
            else:
                # If it's a different error (like Auth), fail immediately
                print(f"❌ AI Error: {e}")
                return {
                    "error": f"AI Parsing Failed: {str(e)}",
                    "question_text": "Error processing image.",
                    "subject": "Error",
                    "topic": "Error",
                    "detailed_analysis": "Gemini failed. Please try again."
                }

    # If we run out of retries
    return {
        "error": "Server is too busy. Please wait 1 minute and try again.",
        "question_text": "System Busy",
        "subject": "Error",
        "topic": "Error",
        "detailed_analysis": "Google's servers are currently overloaded. Please try again in a moment."
    }