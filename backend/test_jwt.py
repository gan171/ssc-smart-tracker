import os
import jwt
from dotenv import load_dotenv

load_dotenv()

# Get a token from your browser's console
# After logging in, run: supabase.auth.getSession().then(d => console.log(d.data.session.access_token))
TEST_TOKEN = "paste-your-token-here"

try:
    secret = os.getenv("SUPABASE_JWT_SECRET")
    print(f"Secret length: {len(secret) if secret else 0}")

    payload = jwt.decode(
        TEST_TOKEN,
        secret,
        algorithms=["HS256"],
        audience="authenticated"
    )

    print("✅ JWT decode successful!")
    print(f"User ID: {payload.get('sub')}")
    print(f"Email: {payload.get('email')}")
except Exception as e:
    print(f"❌ JWT decode failed: {e}")