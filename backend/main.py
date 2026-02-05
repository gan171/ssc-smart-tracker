from dotenv import load_dotenv
import os

# Load environment variables from .env file
load_dotenv()

from fastapi import FastAPI, UploadFile, File, HTTPException, Depends, Header
from fastapi.middleware.cors import CORSMiddleware
from backend.database import supabase
from backend.services.ai_engine import analyze_screenshot
from typing import Optional
import jwt

app = FastAPI(title="SSC CGL Smart Tracker API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Supabase JWT verification - Load from environment
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_JWT_SECRET = os.getenv("SUPABASE_JWT_SECRET")

# Debug: Print to verify it's loaded (remove after testing)
print(f"🔍 JWT Secret loaded: {'✅ YES' if SUPABASE_JWT_SECRET else '❌ NO'}")
print(f"🔍 JWT Secret length: {len(SUPABASE_JWT_SECRET) if SUPABASE_JWT_SECRET else 0}")


async def get_current_user(authorization: Optional[str] = Header(None)):
    """Extract and verify user from JWT token"""
    if not authorization:
        raise HTTPException(status_code=401, detail="No authorization header")

    try:
        # Extract token from "Bearer <token>"
        token = authorization.replace("Bearer ", "")

        # Decode JWT (Supabase uses HS256 by default)
        payload = jwt.decode(
            token,
            SUPABASE_JWT_SECRET,
            algorithms=["HS256"],
            audience="authenticated"
        )

        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid token")

        print(f"✅ User authenticated: {user_id}")
        return user_id

    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError as e:
        print(f"❌ JWT Error: {e}")
        raise HTTPException(status_code=401, detail="Invalid token")


@app.get("/")
def read_root():
    return {"status": "active", "message": "SSC Mistake Tracker Backend is Running"}


@app.post("/upload-screenshot/")
async def upload_screenshot(
        file: UploadFile = File(...),
        user_id: str = Depends(get_current_user)
):
    try:
        print(f"📤 Upload request from user: {user_id}")

        # 1. Read the image file
        contents = await file.read()

        # 2. Get Analysis from Gemini
        ai_data = analyze_screenshot(contents)

        if "error" in ai_data:
            raise HTTPException(status_code=500, detail=ai_data["error"])

        # 3. Handle Database (Check for Duplicates for THIS USER)
        question_text = ai_data.get("question_text")

        # A. Check if this question already exists for this user
        existing_q = supabase.table("questions") \
            .select("id") \
            .eq("question_text", question_text) \
            .eq("user_id", user_id) \
            .execute()

        new_id = None

        if existing_q.data:
            # Found it! Use the existing ID
            print(f"♻️ Duplicate found. Using existing ID.")
            new_id = existing_q.data[0]['id']
        else:
            # New question! Insert it
            db_data = {
                "user_id": user_id,  # Associate with user
                "question_text": question_text,
                "subject": ai_data.get("subject"),
                "topic": ai_data.get("topic"),
                "content": ai_data,
                "status": "analyzed"  # Mark as analyzed since we just did it
            }
            response = supabase.table("questions").insert(db_data).execute()
            new_id = response.data[0]['id']
            print(f"✅ New question saved for user {user_id}")

        # 4. Return the Analysis to Frontend
        return {
            "status": "success",
            "id": new_id,
            "data": ai_data
        }

    except Exception as e:
        print(f"❌ Server Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/mistakes/")
def get_mistakes(user_id: str = Depends(get_current_user)):
    """Fetches the user's last 20 logged mistakes"""
    try:
        response = supabase.table("questions") \
            .select("*") \
            .eq("user_id", user_id) \
            .order("created_at", desc=True) \
            .limit(20) \
            .execute()
        return response.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))