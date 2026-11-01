from google import genai
from dotenv import load_dotenv
import os

load_dotenv()

client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

print("Testing Gemini...")

response = client.models.generate_content(
    model="gemini-3.5-flash",
    contents="Say hello to VibeMatch AI in one sentence."
)

print("Gemini response:")
print(response.text)