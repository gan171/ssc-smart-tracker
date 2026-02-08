from dotenv import load_dotenv
import os

# Load environment variables from .env file
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

    print("\n" + "=" * 50)
    print("🔐 AUTH REQUEST RECEIVED")
    print("=" * 50)

    if not authorization:
        print("❌ No authorization header provided")
        raise HTTPException(status_code=401, detail="No authorization header")

    try:
        # Extract token from "Bearer <token>"
        token = authorization.replace("Bearer ", "")
        print(f"✅ Token received (length: {len(token)})")

        # Use Supabase to get the user from the token
        try:
            response = supabase.auth.get_user(token)
            user = response.user

            if not user:
                print("❌ No user found for token")
                raise HTTPException(status_code=401, detail="Invalid token")

            user_id = user.id
            print(f"✅ User authenticated via Supabase!")
            print(f"   User ID: {user_id}")
            print(f"   Email: {user.email}")
            print("=" * 50 + "\n")

            return user_id

        except Exception as e:
            print(f"❌ Supabase auth error: {e}")
            raise HTTPException(status_code=401, detail=f"Invalid or expired token: {str(e)}")

    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Unexpected error: {e}")
        raise HTTPException(status_code=401, detail=f"Authentication error: {str(e)}")


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

        # 2. Get Analysis from Gemini
        print("🤖 Calling Gemini AI...")
        ai_data = analyze_screenshot(contents)

        if "error" in ai_data:
            print(f"❌ Gemini error: {ai_data['error']}")
            raise HTTPException(status_code=500, detail=ai_data["error"])

        print(f"✅ Gemini analysis complete")

        # 3. Handle Database (Check for Duplicates for THIS USER)
        question_text = ai_data.get("question_text")
        print(f"🔍 Question: {question_text[:50]}...")

        # A. Check if this question already exists for this user
        existing_q = supabase_admin.table("questions") \
            .select("id") \
            .eq("question_text", question_text) \
            .eq("user_id", user_id) \
            .execute()

        new_id = None

        if existing_q.data:
            print(f"♻️ Duplicate found. Using existing ID: {existing_q.data[0]['id']}")
            new_id = existing_q.data[0]['id']
        else:
            # New question! Insert it
            db_data = {
                "user_id": user_id,
                "question_text": question_text,
                "subject": ai_data.get("subject"),
                "topic": ai_data.get("topic"),
                "content": ai_data,
                "status": "analyzed"
            }

            print(f"💾 Inserting new question for user: {user_id}")

            response = supabase_admin.table("questions").insert(db_data).execute()

            if response.data:
                new_id = response.data[0]['id']
                print(f"✅ Question saved! ID: {new_id}")

                # Verify it was saved with user_id
                verify = supabase_admin.table("questions").select("user_id").eq("id", new_id).execute()
                if verify.data:
                    saved_user_id = verify.data[0].get('user_id')
                    print(f"✅ VERIFIED: user_id in database = {saved_user_id}")
                    if saved_user_id != user_id:
                        print(f"⚠️  WARNING: Mismatch! Expected {user_id}, got {saved_user_id}")
            else:
                print(f"⚠️  Insert returned no data")

        print(f"✅ Upload complete!\n")
        return {
            "status": "success",
            "id": new_id,
            "data": ai_data
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
    """Fetches the user's last 20 logged mistakes"""
    try:
        print(f"\n📋 FETCHING MISTAKES for user: {user_id}")

        response = supabase_admin.table("questions") \
            .select("*") \
            .eq("user_id", user_id) \
            .order("created_at", desc=True) \
            .limit(20) \
            .execute()

        print(f"✅ Found {len(response.data)} mistakes\n")
        return response.data

    except Exception as e:
        print(f"❌ Error fetching mistakes: {e}")
        raise HTTPException(status_code=500, detail=str(e))