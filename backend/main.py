from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from backend.database import supabase
from backend.services.ai_engine import analyze_screenshot

app = FastAPI(title="SSC CGL Smart Tracker API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def read_root():
    return {"status": "active", "message": "SSC Mistake Tracker Backend is Running"}


@app.post("/upload-screenshot/")
async def upload_screenshot(file: UploadFile = File(...)):
    try:
        # 1. Read the image file
        contents = await file.read()

        # 2. Get Analysis from Gemini
        ai_data = analyze_screenshot(contents)

        if "error" in ai_data:
            raise HTTPException(status_code=500, detail=ai_data["error"])

        # 3. Handle Database (Check for Duplicates)
        question_text = ai_data.get("question_text")

        # A. Check if this question already exists
        existing_q = supabase.table("questions").select("id").eq("question_text", question_text).execute()

        new_id = None

        if existing_q.data:
            # Found it! Use the existing ID
            print(f"♻️ Duplicate found. Using existing ID.")
            new_id = existing_q.data[0]['id']
        else:
            # New question! Insert it
            db_data = {
                "question_text": question_text,
                "subject": ai_data.get("subject"),
                "topic": ai_data.get("topic"),
                "content": ai_data

            }
            response = supabase.table("questions").insert(db_data).execute()
            new_id = response.data[0]['id']
            print(f"✅ New question saved.")

        # 4. Return the Analysis to Frontend
        return {
            "status": "success",
            "id": new_id,
            "data": ai_data
        }

    except Exception as e:
        print(f"Server Error: {e}")
        # If it's a different DB error, we catch it here
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/mistakes/")
def get_mistakes():
    """Fetches the last 20 logged mistakes"""
    try:
        response = supabase.table("questions")\
            .select("*")\
            .order("created_at", desc=True)\
            .limit(20)\
            .execute()
        return response.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))