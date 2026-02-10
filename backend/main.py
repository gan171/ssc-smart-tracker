from dotenv import load_dotenv
import os
import uuid
from datetime import datetime

load_dotenv()

from fastapi import FastAPI, UploadFile, File, HTTPException, Depends, Header
from fastapi.middleware.cors import CORSMiddleware
from backend.database import supabase as supabase_admin
from backend.services.ai_engine import analyze_screenshot
from typing import Optional
from supabase import create_client, Client

app = FastAPI(title="SSC CGL Smart Tracker API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
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
        print(f"❌ Auth error: {e}")
        raise HTTPException(status_code=401, detail=f"Invalid or expired token: {str(e)}")


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