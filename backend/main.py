import os
import io
import uuid
import logging
from typing import List
from datetime import datetime
from fastapi import FastAPI, File, UploadFile, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response, JSONResponse
from PIL import Image

from schemas import InspectionResponse, HistoryItem
import inspection
import image_metrics

# Configure logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger("spasthascan.api")

app = FastAPI(
    title="SpasthaScan API",
    description="Document Image Quality Inspector API",
    version="1.0.0"
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory history cache (keeps last 50 inspections)
INSPECTION_HISTORY: List[HistoryItem] = []
MAX_HISTORY_ITEMS = 50
MAX_UPLOAD_SIZE = int(os.getenv("MAX_UPLOAD_SIZE_MB", "25")) * 1024 * 1024  # default 25MB
ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp"}
ALLOWED_MIME_TYPES = {"image/jpeg", "image/png", "image/webp"}


@app.get("/api/health")
async def health_check():
    """Health status and diagnostic information."""
    has_gemini = bool(os.getenv("GEMINI_API_KEY", "").strip())
    has_tesseract = image_metrics.PYTESSERACT_AVAILABLE

    return {
        "status": "healthy",
        "service": "SpasthaScan Quality Inspector",
        "timestamp": datetime.utcnow().isoformat() + "Z",
        "vision_ai_enabled": has_gemini,
        "ocr_available": has_tesseract,
        "max_upload_size_mb": MAX_UPLOAD_SIZE // (1024 * 1024),
        "supported_formats": ["JPG", "JPEG", "PNG", "WEBP"]
    }


@app.post("/api/inspect", response_model=InspectionResponse)
async def inspect_document_endpoint(file: UploadFile = File(...)):
    """
    Inspect an uploaded document image for quality, orientation, readability, cropping, and background clutter.
    """
    if not file.filename:
        raise HTTPException(status_code=400, detail="No file uploaded.")

    # Validate file extension
    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file format '{ext}'. Allowed formats: JPG, JPEG, PNG, WEBP."
        )

    # Read image contents
    contents = await file.read()
    if len(contents) == 0:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")

    if len(contents) > MAX_UPLOAD_SIZE:
        raise HTTPException(
            status_code=413,
            detail=f"File exceeds maximum upload size of {MAX_UPLOAD_SIZE // (1024 * 1024)}MB."
        )

    # Validate image format via PIL
    try:
        pil_img = Image.open(io.BytesIO(contents))
        pil_img.verify()
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Corrupt or invalid image file: {str(e)}")

    mime_type = file.content_type or "image/jpeg"

    try:
        result = await inspection.inspect_document(
            image_bytes=contents,
            filename=file.filename,
            mime_type=mime_type
        )
    except Exception as e:
        logger.error(f"Inspection error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Image inspection failed: {str(e)}")

    # Add to history
    history_entry = HistoryItem(
        id=str(uuid.uuid4()),
        timestamp=result.timestamp or datetime.utcnow().isoformat() + "Z",
        filename=file.filename,
        document_type=result.document_type,
        document_category=result.document_category,
        is_document=result.is_document,
        main_text_readable=result.main_text_readable,
        is_cropped=result.is_cropped,
        background_clutter=result.background_clutter,
        analysis_status=result.analysis_status,
        feedback=result.feedback,
        recommended_fix=result.recommended_fix,
        readability_confidence=result.readability_confidence,
        rotation_clockwise=result.rotation_clockwise,
        results=result
    )
    INSPECTION_HISTORY.insert(0, history_entry)
    if len(INSPECTION_HISTORY) > MAX_HISTORY_ITEMS:
        INSPECTION_HISTORY.pop()

    return result


@app.get("/api/history", response_model=List[HistoryItem])
async def get_history():
    """Retrieve recent document inspection records."""
    return INSPECTION_HISTORY


@app.post("/api/rotate-preview")
async def rotate_preview_endpoint(
    degrees: int = Query(90, description="Rotation degrees clockwise (90, 180, 270)"),
    file: UploadFile = File(...)
):
    """
    Generate a rotated preview of an uploaded image without altering original on disk.
    """
    if degrees not in [90, 180, 270]:
        raise HTTPException(status_code=400, detail="Invalid rotation degrees. Must be 90, 180, or 270.")

    contents = await file.read()
    try:
        pil_img = Image.open(io.BytesIO(contents))
        # PIL rotate rotates counter-clockwise, so negative degrees for clockwise
        rotated = pil_img.rotate(-degrees, expand=True)

        buf = io.BytesIO()
        rotated.save(buf, format="JPEG", quality=90)
        buf.seek(0)
        return Response(content=buf.getvalue(), media_type="image/jpeg")
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to generate rotated preview: {e}")


@app.post("/api/enhance")
async def enhance_image_endpoint(
    mode: str = Query("clarity", description="Enhancement mode: 'clarity' (unsharp mask + CLAHE) or 'bw_scan' (adaptive threshold clean doc)"),
    file: UploadFile = File(...)
):
    """
    Generate an enhanced, de-blurred clear view of an uploaded document image.
    Applies high-frequency unsharp masking, contrast stretch, and adaptive binarization.
    """
    import cv2
    import numpy as np

    contents = await file.read()
    try:
        img_bgr = image_metrics.decode_image_bytes(contents)
        if mode == "bw_scan":
            gray = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2GRAY)
            # Denoise slightly, apply CLAHE, then adaptive Gaussian thresholding
            clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
            cl = clahe.apply(gray)
            bw = cv2.adaptiveThreshold(cl, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY, 21, 10)
            res_bgr = cv2.cvtColor(bw, cv2.COLOR_GRAY2BGR)
        else:
            # Clarity & de-blur mode: unsharp mask with Gaussian subtraction + CLAHE in LAB space
            gaussian = cv2.GaussianBlur(img_bgr, (0, 0), 2.5)
            sharpened = cv2.addWeighted(img_bgr, 2.2, gaussian, -1.2, 0)
            
            lab = cv2.cvtColor(sharpened, cv2.COLOR_BGR2LAB)
            l, a, b = cv2.split(lab)
            clahe = cv2.createCLAHE(clipLimit=2.2, tileGridSize=(8, 8))
            cl = clahe.apply(l)
            limg = cv2.merge((cl, a, b))
            res_bgr = cv2.cvtColor(limg, cv2.COLOR_LAB2BGR)

        # Encode to JPEG
        _, encoded = cv2.imencode(".jpg", res_bgr, [int(cv2.IMWRITE_JPEG_QUALITY), 92])
        return Response(content=encoded.tobytes(), media_type="image/jpeg")
    except Exception as e:
        logger.error(f"Image enhancement error: {e}", exc_info=True)
        raise HTTPException(status_code=400, detail=f"Failed to enhance image: {e}")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
