import os
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()

url: str = os.environ.get("SUPABASE_URL")

# Use service role for backend DB/storage operations when available.
# Fallback to SUPABASE_KEY for local/dev compatibility.
key: str = os.environ.get("SUPABASE_SERVICE_ROLE_KEY") or os.environ.get("SUPABASE_KEY")

if not url or not key:
    raise ValueError("❌ Supabase credentials missing from .env file")

supabase: Client = create_client(url, key)
print("✅ Database connection initialized.")
