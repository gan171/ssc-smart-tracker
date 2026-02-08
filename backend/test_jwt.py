import os
from dotenv import load_dotenv

load_dotenv()

import jwt
from jwt import PyJWKClient

SUPABASE_URL = os.getenv("SUPABASE_URL")
print(f"Supabase URL: {SUPABASE_URL}")

# Test JWKS endpoint
jwks_url = f"{SUPABASE_URL}/auth/v1/jwks"
print(f"JWKS URL: {jwks_url}")

try:
    jwks_client = PyJWKClient(jwks_url)
    print("✅ JWKS client created successfully")

    # Paste a token from your browser console here
    # Get it by running: await supabase.auth.getSession()
    TEST_TOKEN = "PASTE_YOUR_TOKEN_HERE"

    # Get signing key
    signing_key = jwks_client.get_signing_key_from_jwt(TEST_TOKEN)
    print(f"✅ Got signing key: {signing_key.key}")

    # Decode token
    payload = jwt.decode(
        TEST_TOKEN,
        signing_key.key,
        algorithms=["ES256"],
        audience="authenticated"
    )

    print(f"✅ Token decoded successfully!")
    print(f"User ID: {payload.get('sub')}")
    print(f"Email: {payload.get('email')}")

except Exception as e:
    print(f"❌ Error: {e}")
    import traceback

    traceback.print_exc()