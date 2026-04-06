import os
from dotenv import load_dotenv
from google import genai
load_dotenv(".env.txt")
api_key = os.getenv("GEMINI_API_KEY")
print("API_KEY:", api_key)
try:
    client = genai.Client(api_key=api_key)
    prompt = "Reply 'hello'."
    response = client.models.generate_content(
        model='gemini-2.5-flash',
        contents=prompt,
    )
    print("Response:", response.text)
except Exception as e:
    print("Exception during genai:", type(e).__name__, str(e))