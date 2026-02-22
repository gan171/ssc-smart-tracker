from dotenv import load_dotenv
import os
import uuid
from datetime import datetime, timedelta

load_dotenv()

from fastapi import FastAPI, UploadFile, File, HTTPException, Depends, Header
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from backend.database import supabase as supabase_admin
from backend.services.ai_engine import analyze_screenshot
from backend.services.pdf_service import fetch_questions_for_export, generate_custom_revision_pdf
from typing import Optional
from supabase import create_client, Client
from pydantic import BaseModel, Field

app = FastAPI(title="SSC CGL Smart Tracker API")


class PdfFilters(BaseModel):
    subject: str = "all"
    topic: str = "all"
    question_source: str = "all"
    date_range: str = "all_time"
    quantity: int = Field(default=50, ge=1, le=500)


class PdfOptions(BaseModel):
    include_solution: bool = True
    include_user_notes: bool = True
    include_ai_analysis: bool = True
    include_answer_key: bool = False


class CustomPdfPayload(BaseModel):
    filters: PdfFilters
    options: PdfOptions

ALLOWED_ORIGINS=[
        "http://localhost:5173",  # Local Vite frontend
        "http://127.0.0.1:5173",  # Local Vite frontend alternate
        "http://localhost:5173",  # Local frontend (if using port 3000)
        "https://ssc-smart-tracker.vercel.app",  # TODO: Add your actual production frontend URL
        "chrome-extension://oahgmbneapjnkmmncgkjlkicdngobfoe"  # TODO: Replace with your actual Chrome Extension ID
    ]
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_origin_regex=r"^chrome-extension://.*",# Strictly restricted origins
    allow_credentials=True,
    allow_methods=["GET", "POST", "PATCH", "DELETE", "OPTIONS"], # Be explicit instead of "*"
    allow_headers=["*"],
)

# Supabase configuration
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

print(f"🔍 Supabase URL: {SUPABASE_URL}")
print(f"🔍 Supabase Key loaded: {'✅ YES' if SUPABASE_KEY else '❌ NO'}")

# Create Supabase client for auth
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)


async def get_current_user(authorization: Optional[str] = Header(None)):
    """Extract and verify user from JWT token using Supabase client"""

    if not authorization:
        raise HTTPException(status_code=401, detail="No authorization header")

    try:
        token = authorization.replace("Bearer ", "")
        response = supabase.auth.get_user(token)
        user = response.user

        if not user:
            raise HTTPException(status_code=401, detail="Invalid token")

        return user.id

    except Exception as e:
        # LOG the detailed error to your server console for debugging
        print(f"❌ Auth error [Internal]: {str(e)}")

        # RETURN a generic, safe error to the client
        raise HTTPException(status_code=401, detail="Invalid or expired authentication token")


@app.get("/")
def read_root():
    return {"status": "active", "message": "SSC Mistake Tracker Backend is Running"}


@app.post("/upload-screenshot/")
async def upload_screenshot(
        file: UploadFile = File(...),
        user_id: str = Depends(get_current_user)
):
    try:
        print(f"\n📤 UPLOAD REQUEST from user: {user_id}")

        # 1. Read the image file
        contents = await file.read()
        print(f"📄 File size: {len(contents)} bytes")

        # 2. Upload image to Supabase Storage
        image_url = None
        try:
            # Generate unique filename
            file_extension = file.filename.split('.')[-1] if '.' in file.filename else 'png'
            unique_filename = f"{user_id}/{uuid.uuid4()}.{file_extension}"

            print(f"☁️  Uploading to Supabase Storage: {unique_filename}")

            # Upload to storage
            storage_response = supabase_admin.storage.from_('question-images').upload(
                unique_filename,
                contents,
                file_options={"content-type": file.content_type or "image/png"}
            )

            # Get public URL
            image_url = supabase_admin.storage.from_('question-images').get_public_url(unique_filename)
            print(f"✅ Image uploaded: {image_url}")

        except Exception as storage_error:
            print(f"⚠️  Storage upload failed: {storage_error}")
            # Continue without image URL - not critical
            image_url = None

        # 3. Get Enhanced Analysis from Gemini
        print("🤖 Calling Gemini AI for enhanced analysis...")
        ai_data = analyze_screenshot(contents)

        if "error" in ai_data:
            print(f"❌ Gemini error: {ai_data['error']}")
            raise HTTPException(status_code=500, detail=ai_data["error"])

        print(f"✅ Gemini analysis complete")
        print(f"   Type: {ai_data.get('question_type')}")
        print(f"   Visual Elements: {ai_data.get('has_visual_elements')}")
        print(f"   AI Confidence: {ai_data.get('ai_confidence')}")

        # 4. Prepare database data with enhanced fields
        question_text = ai_data.get("question_text", "")

        db_data = {
            "user_id": user_id,
            "image_url": image_url,

            # Enhanced question data
            "question_text": question_text,
            "question_context": ai_data.get("question_context", ""),
            "actual_question": ai_data.get("actual_question", question_text),

            "subject": ai_data.get("subject"),
            "topic": ai_data.get("topic"),

            # Options and answers
            "options": ai_data.get("options", []),
            "correct_option": ai_data.get("correct_answer"),

            # Question metadata
            "question_type": ai_data.get("question_type", "mcq"),
            "has_visual_elements": ai_data.get("has_visual_elements", False),
            "visual_complexity": ai_data.get("visual_complexity", "low"),
            "ai_confidence": ai_data.get("ai_confidence", "high"),

            # Complete AI response
            "content": ai_data,

            "status": "analyzed"
        }

        # 5. Check for duplicates (by question text and user)
        existing_q = supabase_admin.table("questions") \
            .select("id") \
            .eq("question_text", question_text) \
            .eq("user_id", user_id) \
            .execute()

        new_id = None

        if existing_q.data:
            print(f"♻️ Duplicate found. Using existing ID: {existing_q.data[0]['id']}")
            new_id = existing_q.data[0]['id']

            # Update with new image and analysis if available
            if image_url:
                supabase_admin.table("questions").update({
                    "image_url": image_url,
                    "content": ai_data
                }).eq("id", new_id).execute()
        else:
            print(f"💾 Inserting new question for user: {user_id}")

            response = supabase_admin.table("questions").insert(db_data).execute()

            if response.data:
                new_id = response.data[0]['id']
                print(f"✅ Question saved! ID: {new_id}")
            else:
                print(f"⚠️  Insert returned no data")

        print(f"✅ Upload complete!\n")

        return {
            "status": "success",
            "id": new_id,
            "data": ai_data,
            "image_url": image_url,
            "has_visual_elements": ai_data.get("has_visual_elements", False),
            "ai_confidence": ai_data.get("ai_confidence", "high")
        }

    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ SERVER ERROR: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/mistakes/")
def get_mistakes(user_id: str = Depends(get_current_user)):
    """Fetches user's mistakes with enhanced data"""
    try:
        print(f"\n📋 FETCHING MISTAKES for user: {user_id}")

        response = supabase_admin.table("questions") \
            .select("*") \
            .eq("user_id", user_id) \
            .order("created_at", desc=True) \
            .limit(100) \
            .execute()

        print(f"✅ Found {len(response.data)} mistakes\n")
        return response.data

    except Exception as e:
        print(f"❌ Error fetching mistakes: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/question/{question_id}")
def get_question(question_id: str, user_id: str = Depends(get_current_user)):
    """Get a specific question with all details"""
    try:
        response = supabase_admin.table("questions") \
            .select("*") \
            .eq("id", question_id) \
            .eq("user_id", user_id) \
            .single() \
            .execute()

        return response.data

    except Exception as e:
        raise HTTPException(status_code=404, detail="Question not found")


@app.patch("/question/{question_id}/answer")
def submit_answer(
        question_id: str,
        answer_data: dict,
        user_id: str = Depends(get_current_user)
):
    """Submit user's answer and update statistics"""
    try:
        user_answer = answer_data.get("answer")

        # Get the question
        question = supabase_admin.table("questions") \
            .select("correct_option, times_attempted, times_correct") \
            .eq("id", question_id) \
            .eq("user_id", user_id) \
            .single() \
            .execute()

        if not question.data:
            raise HTTPException(status_code=404, detail="Question not found")

        # Check if correct
        is_correct = user_answer == question.data["correct_option"]

        # Update statistics
        times_attempted = (question.data.get("times_attempted") or 0) + 1
        times_correct = (question.data.get("times_correct") or 0) + (1 if is_correct else 0)

        supabase_admin.table("questions").update({
            "user_answer": user_answer,
            "times_attempted": times_attempted,
            "times_correct": times_correct,
            "last_attempted_at": datetime.now().isoformat()
        }).eq("id", question_id).eq("user_id", user_id).execute()

        return {
            "is_correct": is_correct,
            "correct_answer": question.data["correct_option"],
            "times_attempted": times_attempted,
            "times_correct": times_correct,
            "accuracy": round((times_correct / times_attempted) * 100, 1) if times_attempted > 0 else 0
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/generate-custom-pdf")
def generate_custom_pdf(payload: CustomPdfPayload, user_id: str = Depends(get_current_user)):
    try:
        questions = fetch_questions_for_export(supabase_admin, user_id, payload.filters.model_dump())
        pdf_bytes = generate_custom_revision_pdf(questions, payload.options.model_dump())

        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={
                "Content-Disposition": "attachment; filename=ssc-revision-export.pdf",
                "X-Question-Count": str(len(questions))
            },
        )
    except Exception as e:
        print(f"❌ Error generating custom PDF: {e}")
        raise HTTPException(status_code=500, detail="Failed to generate PDF")

class ReviewAnswerPayload(BaseModel):
    answer: str
    is_correct: bool


@app.patch("/question/{question_id}/review")
def submit_review_answer(
        question_id: str,
        payload: ReviewAnswerPayload,
        user_id: str = Depends(get_current_user)
):
    """
    Submit answer for spaced repetition review
    Updates: times_attempted, times_correct, next_review_date, ease_factor, interval_days, mastery_level
    """
    try:
        # Get current question data
        question = supabase_admin.table("questions") \
            .select("*") \
            .eq("id", question_id) \
            .eq("user_id", user_id) \
            .single() \
            .execute()

        if not question.data:
            raise HTTPException(status_code=404, detail="Question not found")

        q = question.data

        # Current values
        times_attempted = (q.get("times_attempted") or 0) + 1
        times_correct = (q.get("times_correct") or 0) + (1 if payload.is_correct else 0)
        current_ease = q.get("ease_factor") or 2.5
        current_interval = q.get("interval_days") or 1

        # Calculate consecutive correct answers
        # For simplicity, we'll track this in a separate way
        # In full implementation, you'd want another column for this

        # SM-2 Algorithm Implementation
        new_ease = current_ease
        new_interval = current_interval

        if payload.is_correct:
            # Correct answer - increase interval
            if times_correct == 1:
                new_interval = 1  # Review tomorrow
            elif times_correct == 2:
                new_interval = 6  # Review in 6 days
            else:
                new_interval = round(current_interval * current_ease)

            # Adjust ease factor (quality = 4 for "good")
            new_ease = current_ease + (0.1 - (5 - 4) * (0.08 + (5 - 4) * 0.02))
            new_ease = max(1.3, new_ease)

        else:
            # Incorrect answer - reset interval
            new_interval = 1  # Review tomorrow

            # Decrease ease factor (quality = 0 for "fail")
            new_ease = current_ease + (0.1 - (5 - 0) * (0.08 + (5 - 0) * 0.02))
            new_ease = max(1.3, new_ease)

        # Calculate next review date
        next_review = datetime.now() + timedelta(days=new_interval)

        # Determine mastery level
        accuracy = times_correct / times_attempted if times_attempted > 0 else 0

        if times_attempted <= 2:
            mastery_level = "learning"
        elif accuracy >= 0.8 and times_attempted >= 5:
            mastery_level = "mastered"
        elif accuracy >= 0.6:
            mastery_level = "reviewing"
        else:
            mastery_level = "learning"

        # Update database
        supabase_admin.table("questions").update({
            "user_answer": payload.answer,
            "times_attempted": times_attempted,
            "times_correct": times_correct,
            "last_attempted_at": datetime.now().isoformat(),
            "next_review_date": next_review.isoformat(),
            "ease_factor": round(new_ease, 2),
            "interval_days": new_interval,
            "mastery_level": mastery_level
        }).eq("id", question_id).eq("user_id", user_id).execute()

        return {
            "is_correct": payload.is_correct,
            "correct_answer": q["correct_option"],
            "times_attempted": times_attempted,
            "times_correct": times_correct,
            "accuracy": round((times_correct / times_attempted) * 100, 1),
            "next_review_date": next_review.isoformat(),
            "interval_days": new_interval,
            "mastery_level": mastery_level,
            "message": f"Great! See you in {new_interval} day{'s' if new_interval != 1 else ''}!" if payload.is_correct else "Let's review this again tomorrow!"
        }

    except HTTPException:
        raise
    except Exception as e:
        print(f"Error in review submission: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/questions/review-queue")
def get_review_queue(user_id: str = Depends(get_current_user)):
    """
    Get questions due for review
    Returns questions sorted by priority (overdue first, then by next_review_date)
    """
    try:
        now = datetime.now().isoformat()

        # Get all questions due within next 7 days
        response = supabase_admin.table("questions") \
            .select("*") \
            .eq("user_id", user_id) \
            .lte("next_review_date", (datetime.now() + timedelta(days=7)).isoformat()) \
            .order("next_review_date", desc=False) \
            .execute()

        questions = response.data or []

        # Categorize
        categorized = {
            "overdue": [],
            "due_today": [],
            "due_soon": [],
            "upcoming": []
        }

        today = datetime.now().date()

        for q in questions:
            review_date = datetime.fromisoformat(q["next_review_date"]).date()

            if review_date < today:
                categorized["overdue"].append(q)
            elif review_date == today:
                categorized["due_today"].append(q)
            elif review_date <= (today + timedelta(days=3)):
                categorized["due_soon"].append(q)
            else:
                categorized["upcoming"].append(q)

        return {
            "categorized": categorized,
            "stats": {
                "total_due": len(categorized["overdue"]) + len(categorized["due_today"]),
                "overdue_count": len(categorized["overdue"]),
                "today_count": len(categorized["due_today"]),
                "week_count": len(questions)
            }
        }

    except Exception as e:
        print(f"Error fetching review queue: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# Add this to your main.py

from pydantic import BaseModel
from typing import List, Optional


class QuestionOption(BaseModel):
    label: str
    text: str


class ImportQuestionPayload(BaseModel):
    question_text: str
    options: List[QuestionOption]
    correct_option: str
    user_answer: Optional[str] = None
    explanation: Optional[str] = None
    source: str = "extension"
    has_visual_elements: bool = False
    subject: Optional[str] = None
    topic: Optional[str] = None


@app.post("/import-question/")
async def import_question(
        payload: ImportQuestionPayload,
        user_id: str = Depends(get_current_user)
):
    """
    Import question directly from extension (JSON format)
    No image processing needed
    """
    try:
        print(f"\n📥 IMPORT REQUEST from user: {user_id}")
        print(f"Source: {payload.source}")
        print(f"Question: {payload.question_text[:50]}...")

        # If no image, we need to use AI to analyze the text-only question
        # For now, we'll create a basic structure

        # Convert options to expected format
        options_list = [
            {
                "label": opt.label,
                "text": opt.text,
                "is_visual": False
            }
            for opt in payload.options
        ]

        # If we have subject/topic from extension, use them
        # Otherwise, try to infer from question text (optional)
        subject = payload.subject
        topic = payload.topic

        if not subject:
            # Simple keyword matching (you can enhance this)
            question_lower = payload.question_text.lower()
            if any(word in question_lower for word in ['equation', 'algebra', 'number', 'calculate']):
                subject = "Math"
            elif any(word in question_lower for word in ['grammar', 'sentence', 'word', 'vocabulary']):
                subject = "English"
            elif any(word in question_lower for word in ['reasoning', 'pattern', 'logic']):
                subject = "Reasoning"
            else:
                subject = "General Knowledge"

        # Create content structure
        content = {
            "question_text": payload.question_text,
            "options": options_list,
            "correct_answer": payload.correct_option,
            "subject": subject,
            "topic": topic or "General",
            "question_type": "mcq",
            "has_visual_elements": payload.has_visual_elements,
            "source": payload.source,
            "detailed_analysis": payload.explanation or "Analysis not available from source platform."
        }

        # Check for duplicates
        existing_q = supabase_admin.table("questions") \
            .select("id") \
            .eq("question_text", payload.question_text) \
            .eq("user_id", user_id) \
            .execute()

        if existing_q.data:
            print(f"♻️ Duplicate found. Using existing ID: {existing_q.data[0]['id']}")
            return {
                "status": "duplicate",
                "id": existing_q.data[0]['id'],
                "message": "Question already exists in your tracker"
            }

        # Insert new question
        db_data = {
            "user_id": user_id,
            "question_text": payload.question_text,
            "subject": subject,
            "topic": topic or "General",
            "options": options_list,
            "correct_option": payload.correct_option,
            "user_answer": payload.user_answer,
            "question_type": "mcq",
            "has_visual_elements": payload.has_visual_elements,
            "content": content,
            "status": "analyzed",
            "ai_confidence": "high"
        }

        response = supabase_admin.table("questions").insert(db_data).execute()

        if response.data:
            new_id = response.data[0]['id']
            print(f"✅ Question imported! ID: {new_id}")

            return {
                "status": "success",
                "id": new_id,
                "data": content,
                "message": "Question imported successfully"
            }
        else:
            raise Exception("Insert returned no data")

    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ IMPORT ERROR: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))