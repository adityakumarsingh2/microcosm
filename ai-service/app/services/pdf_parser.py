import io
import urllib.request
import logging
from typing import List, Dict, Any
from pypdf import PdfReader

logger = logging.getLogger(__name__)

class PDFParser:
    def extract_text(self, url: str) -> List[Dict[str, Any]]:
        """
        Download a PDF from a URL (or load from local path) and extract its text page by page.
        Returns a list of dicts: [{"page_num": int, "text": str}]
        """
        try:
            logger.info(f"Downloading PDF from URL: {url}")
            
            # Support local path fallback if URL is local (e.g. http://127.0.0.1:5000/uploads/...)
            # Since both run on localhost, we can download via urllib
            headers = {'User-Agent': 'Mozilla/5.0'}
            req = urllib.request.Request(url, headers=headers)
            with urllib.request.urlopen(req) as response:
                pdf_data = response.read()
            
            logger.info("PDF downloaded successfully. Starting parsing...")
            
            reader = PdfReader(io.BytesIO(pdf_data))
            pages_content = []
            
            for i, page in enumerate(reader.pages):
                text = page.extract_text() or ""
                pages_content.append({
                    "page_num": i + 1,
                    "text": text.strip()
                })
                
            logger.info(f"Successfully parsed {len(pages_content)} pages.")
            return pages_content
            
        except Exception as e:
            logger.error(f"Error parsing PDF from {url}: {e}")
            raise

pdf_parser = PDFParser()
