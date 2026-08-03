import os
import logging
import google.generativeai as genai
from typing import List, Dict, Any

logger = logging.getLogger(__name__)
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

    async def extract_tags(self, text: str) -> List[str]:
        """
        Analyze text content and return a list of 3-5 keywords or tags.
        """
        if not os.getenv("GEMINI_API_KEY"):
            return []

        prompt = f"""Analyze the following text content and extract 3 to 5 highly specific keywords or tags representing the core topics.
Do not return conversational text, explanations, code blocks, or markdown formatting.
Return ONLY a comma-separated list of lowercase tags, e.g., "react-native, state-management, hooks".

Content:
{text[:4000]}"""

        try:
            response = await self.model.generate_content_async(prompt)
            raw_tags = response.text or ""
            # Parse comma-separated list
            tags = [t.strip().lower() for t in raw_tags.split(",") if t.strip()]
            cleaned_tags = []
            for tag in tags:
                tag = tag.replace("#", "").strip()
                if tag and len(tag) < 30:
                    cleaned_tags.append(tag)
            return cleaned_tags[:5]
        except Exception as e:
            logger.error(f"Failed to extract tags with Gemini: {e}")
            return []

    async def generate_flashcards(self, text: str) -> List[Dict[str, str]]:
        """
        Synthesize flashcards (Q&A pairs) from note content.
        """
        if not os.getenv("GEMINI_API_KEY"):
            return []

        prompt = f"""Read the following notes and generate 3 to 5 clear, high-quality study flashcards for active recall.
For each flashcard, provide a "front" (a conceptual question, fill-in-the-blank, or term to define) and a "back" (a short, concise, and accurate answer).

Return ONLY a valid JSON object matching this schema. Do not return any markdown code block wraps, explanations, or backticks:
{{
  "flashcards": [
    {{ "front": "Question here", "back": "Answer here" }}
  ]
}}

Content:
{text[:5000]}"""

        try:
            response = await self.model.generate_content_async(prompt)
            raw_text = response.text or ""
            cleaned_text = raw_text.strip()
            if cleaned_text.startswith("```json"):
                cleaned_text = cleaned_text[7:]
            if cleaned_text.endswith("```"):
                cleaned_text = cleaned_text[:-3]
            cleaned_text = cleaned_text.strip()

            import json
            data = json.loads(cleaned_text)
            return data.get("flashcards", [])
        except Exception as e:
            logger.error(f"Failed to synthesize flashcards: {e}")
            return []


gemini_service = GeminiService()
