import os
import google.generativeai as genai
from typing import List, Dict, Any

api_key = os.getenv("GEMINI_API_KEY")
if api_key:
    genai.configure(api_key=api_key)


CHAT_MODEL = os.getenv("GEMINI_CHAT_MODEL", "gemini-2.0-flash-lite")


class GeminiService:
    def __init__(self):
        self.model = genai.GenerativeModel(CHAT_MODEL)

    async def generate_response(self, prompt: str) -> str:
        if not os.getenv("GEMINI_API_KEY"):
            return "Error: GEMINI_API_KEY is not configured in the AI service."

        try:
            response = await self.model.generate_content_async(prompt)
            return response.text
        except Exception as e:
            return f"Error communicating with Gemini: {str(e)}"

    async def generate_with_context(
        self, grounded_prompt: str, context_chunks: List[Dict[str, Any]]
    ) -> str:
        """
        Generate a response using a pre-built grounded prompt.
        This is the RAG-aware generation path.
        """
        if not os.getenv("GEMINI_API_KEY"):
            return "Error: GEMINI_API_KEY is not configured in the AI service."

        try:
            response = await self.model.generate_content_async(grounded_prompt)
            return response.text
        except Exception as e:
            return f"Error communicating with Gemini: {str(e)}"


gemini_service = GeminiService()
