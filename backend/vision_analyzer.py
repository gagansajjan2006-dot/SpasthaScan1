import os
import json
import base64
import logging
import httpx
from typing import Optional, Dict, Any

logger = logging.getLogger("spasthascan.vision")

VISION_PROMPT = """You are SpasthaScan, an expert document image quality inspector.
Inspect this document image with strict objectivity:
1. ONLY judge what is actually visible in the image. NEVER invent problems.
2. Determine:
   - is_document: true or false
   - document_type: "photo", "scan", "other", or "uncertain"
   - rotation_clockwise: 0, 90, 180, 270, or null
   - rotation_confidence: float between 0.0 and 1.0, or null
   - main_text_readable: true, false, or null
   - readability_confidence: float between 0.0 and 1.0, or null
   - is_cropped: true, false, or null
   - cropping_confidence: float between 0.0 and 1.0, or null
   - background_clutter: "none", "low", "medium", "high", or "uncertain"
   - feedback: friendly 1-2 sentence message describing most important visible finding with one concrete improvement or confirmation that no changes are needed.
   - recommended_fix: short action phrase like "No changes needed." or "Rotate 90 degrees clockwise before uploading."

Return ONLY valid JSON matching this schema without any markdown tags or backticks:
{
  "is_document": true,
  "document_type": "photo",
  "rotation_clockwise": 0,
  "rotation_confidence": 0.98,
  "main_text_readable": true,
  "readability_confidence": 0.94,
  "is_cropped": false,
  "cropping_confidence": 0.97,
  "background_clutter": "low",
  "feedback": "...",
  "recommended_fix": "..."
}"""


async def analyze_with_vision_ai(image_bytes: bytes, mime_type: str = "image/jpeg") -> Optional[Dict[str, Any]]:
    """
    Attempt to run vision model analysis if GEMINI_API_KEY is configured.
    Returns parsed dictionary or None if unavailable/failed.
    """
    api_key = os.getenv("GEMINI_API_KEY", "").strip()
    if not api_key:
        return None

    try:
        b64_image = base64.b64encode(image_bytes).decode("utf-8")
        url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={api_key}"

        payload = {
            "contents": [
                {
                    "parts": [
                        {"text": VISION_PROMPT},
                        {
                            "inline_data": {
                                "mime_type": mime_type,
                                "data": b64_image
                            }
                        }
                    ]
                }
            ],
            "generationConfig": {
                "response_mime_type": "application/json",
                "temperature": 0.1
            }
        }

        async with httpx.AsyncClient(timeout=12.0) as client:
            response = await client.post(url, json=payload)
            if response.status_code == 200:
                result = response.json()
                candidate_text = result["candidates"][0]["content"]["parts"][0]["text"].strip()
                # Clean any accidental markdown backticks if returned
                if candidate_text.startswith("```"):
                    candidate_text = candidate_text.strip("`")
                    if candidate_text.startswith("json"):
                        candidate_text = candidate_text[4:].strip()
                data = json.loads(candidate_text)
                return data
            else:
                logger.warning(f"Vision API returned status {response.status_code}: {response.text[:200]}")
                return None
    except Exception as e:
        logger.warning(f"Vision AI call failed or timed out: {e}")
        return None
