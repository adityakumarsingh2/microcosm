import os
import google.generativeai as genai

api_key = os.getenv("GEMINI_API_KEY")
if api_key:
    genai.configure(api_key=api_key)

class GeminiService:
    def __init__(self):
        self.model = genai.GenerativeModel('gemini-3.1-flash-lite')
        
    async def generate_response(self, prompt: str) -> str:
        if not os.getenv("GEMINI_API_KEY"):
            return "Error: GEMINI_API_KEY is not configured in the AI service."
            
        try:
            response = await self.model.generate_content_async(prompt)
            return response.text
        except Exception as e:
            return f"Error communicating with Gemini: {str(e)}"

gemini_service = GeminiService()
