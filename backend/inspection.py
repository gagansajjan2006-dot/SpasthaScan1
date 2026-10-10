import time
import logging
from typing import Dict, Any, List, Optional
from datetime import datetime

from schemas import InspectionResponse, ImageMetrics
import image_metrics
import vision_analyzer

logger = logging.getLogger("docucheck.inspection")


def generate_feedback_and_fix(
    is_doc: bool,
    doc_type: str,
    rotation: Optional[int],
    readable: Optional[bool],
    is_cropped: Optional[bool],
    clutter: str,
    issues: List[str],
    read_conf: Optional[float]
) -> tuple[str, str]:
    """
    Generate polite, friendly 1-2 sentence feedback and a single concrete fix.
    Prioritizes the single strongest confirmed issue.
    Never invents unseen problems.
    """
    if not is_doc or doc_type == "other":
        return (
            "The uploaded image does not appear to contain a document.",
            "Upload a clear photo or scan of a document."
        )

    # 1. Orientation issue
    if rotation in [90, 180, 270]:
        if rotation == 90:
            return (
                "Your document is sideways, making it difficult to read. Rotate it 90 degrees clockwise before uploading.",
                "Rotate 90 degrees clockwise."
            )
        elif rotation == 180:
            return (
                "Your document is upside down. Rotate it 180 degrees to make it upright.",
                "Rotate 180 degrees."
            )
        elif rotation == 270:
            return (
                "Your document is rotated 270 degrees clockwise. Rotate it 90 degrees counter-clockwise before uploading.",
                "Rotate 90 degrees counter-clockwise."
            )

    # 2. Cropping issue
    if is_cropped is True:
        return (
            "Part of the document appears to be cut off. Retake the photo with all four document edges visible.",
            "Capture the full document with all edges inside the frame."
        )

    # 3. Blurriness / unreadable
    if readable is False or "blurry_text" in issues:
        return (
            "The text appears blurry and difficult to read clearly. Retake the photo with the camera focused on the document.",
            "Hold camera steady and refocus on the text."
        )

    # 4. Severe exposure / contrast issues
    if "low_contrast" in issues:
        return (
            "The lighting is flat or washed out, reducing text contrast. Capture the document under balanced, direct lighting.",
            "Improve lighting to boost text contrast."
        )

    # 5. Background clutter
    if clutter == "high":
        return (
            "The background contains several distracting objects. Place the document on a plain surface and capture it again.",
            "Use a clean, uncluttered surface."
        )
    elif clutter == "medium":
        return (
            "The surrounding surface has some background patterns or items. Capturing on a neutral background will improve clarity.",
            "Place document on a plain neutral surface."
        )

    # 6. Uncertain readability
    if readable is None or (read_conf is not None and read_conf < 0.65):
        return (
            "I couldn't confidently assess the document details. Upload a clearer, higher-resolution image with the complete document visible.",
            "Upload a clearer image with complete document visible."
        )

    # 7. Clean acceptable document
    return (
        "Your document looks clear and easy to read. No changes are needed.",
        "No changes needed."
    )


async def inspect_document(image_bytes: bytes, filename: str = "document.jpg", mime_type: str = "image/jpeg") -> InspectionResponse:
    """
    Run complete document quality inspection:
    - Decodes image
    - Computes CV metrics (blur, brightness, contrast, edge density, boundary contour, cropping, clutter, text flow)
    - Checks vision AI model if available
    - Synthesizes findings with strict schema validation
    """
    start_time = time.time()

    # 1. Decode image
    img_bgr = image_metrics.decode_image_bytes(image_bytes)
    h, w = img_bgr.shape[:2]

    # 2. Calculate baseline metrics
    base_metrics = image_metrics.calculate_basic_metrics(img_bgr)
    gray = base_metrics.pop("gray")
    base_metrics.pop("canny", None)

    # 3. Detect document contour & boundary
    doc_boundary, doc_area_ratio, doc_mask = image_metrics.detect_document_boundary(img_bgr, gray)
    base_metrics["document_area_ratio"] = doc_area_ratio

    # 4. Analyze cropping
    crop_info = image_metrics.analyze_cropping(img_bgr, gray, doc_boundary)

    # 5. Classify document type
    doc_type, doc_conf = image_metrics.classify_document_type(img_bgr, gray, doc_area_ratio, base_metrics)

    # 6. Analyze background clutter
    clutter_info = image_metrics.analyze_background_clutter(gray, doc_mask, is_scan_candidate=(doc_type == "scan"))

    # 7. Analyze text & orientation
    text_info = image_metrics.analyze_text_and_orientation(img_bgr, gray)
    base_metrics["ocr_confidence"] = text_info["ocr_confidence"]
    base_metrics["ocr_word_count"] = text_info["ocr_word_count"]
    base_metrics["ocr_detected_text"] = text_info["ocr_detected_text"]

    # Identify rule-based issues
    issues: List[str] = []
    if base_metrics["blur_score"] < 65.0:
        issues.append("blurry_text")
    if base_metrics["contrast"] < 25.0:
        issues.append("low_contrast")
    if base_metrics["brightness"] < 45.0:
        issues.append("underexposed")
    elif base_metrics["brightness"] > 252.0:
        issues.append("overexposed")
    if crop_info["is_cropped"]:
        issues.append("cropped_edges")
    if text_info["rotation_clockwise"] in [90, 180, 270]:
        issues.append("rotated_document")
    if clutter_info["background_clutter"] in ["medium", "high"]:
        issues.append("background_clutter")

    # Document check
    is_document = doc_type in ["photo", "scan"]

    # Readability assessment
    # Factors: blur score, contrast, resolution (min 600px), OCR results
    min_dim = min(w, h)
    blur_score = base_metrics["blur_score"]
    contrast = base_metrics["contrast"]

    if not is_document:
        main_text_readable = None
        readability_confidence = None
    elif blur_score < 45.0 or contrast < 20.0 or min_dim < 300:
        main_text_readable = False
        readability_confidence = 0.91
    elif blur_score >= 100.0 and contrast >= 35.0 and min_dim >= 700:
        main_text_readable = True
        readability_confidence = 0.94
    elif blur_score >= 70.0 and contrast >= 28.0:
        main_text_readable = True
        readability_confidence = 0.85
    else:
        # Borderline / uncertain
        main_text_readable = True if (text_info["ocr_confidence"] or 0) > 60 else None
        readability_confidence = 0.65

    # 8. Check vision AI model if configured
    vision_ai_data = await vision_analyzer.analyze_with_vision_ai(image_bytes, mime_type)
    if vision_ai_data:
        # Fuse vision model with CV measurements
        if "is_document" in vision_ai_data:
            is_document = bool(vision_ai_data["is_document"])
        if "document_type" in vision_ai_data and vision_ai_data["document_type"] in ["photo", "scan", "other", "uncertain"]:
            doc_type = vision_ai_data["document_type"]
        if "rotation_clockwise" in vision_ai_data and vision_ai_data["rotation_clockwise"] in [0, 90, 180, 270, None]:
            text_info["rotation_clockwise"] = vision_ai_data["rotation_clockwise"]
            text_info["rotation_confidence"] = vision_ai_data.get("rotation_confidence", text_info["rotation_confidence"])
        if "main_text_readable" in vision_ai_data:
            main_text_readable = vision_ai_data["main_text_readable"]
            readability_confidence = vision_ai_data.get("readability_confidence", readability_confidence)
        if "is_cropped" in vision_ai_data:
            crop_info["is_cropped"] = vision_ai_data["is_cropped"]
            crop_info["cropping_confidence"] = vision_ai_data.get("cropping_confidence", crop_info["cropping_confidence"])
        if "background_clutter" in vision_ai_data and vision_ai_data["background_clutter"] in ["none", "low", "medium", "high", "uncertain"]:
            clutter_info["background_clutter"] = vision_ai_data["background_clutter"]
        feedback = vision_ai_data.get("feedback")
        recommended_fix = vision_ai_data.get("recommended_fix")
    else:
        feedback = None
        recommended_fix = None

    # If no AI feedback generated, create calibrated feedback
    if not feedback or not recommended_fix:
        feedback, recommended_fix = generate_feedback_and_fix(
            is_doc=is_document,
            doc_type=doc_type,
            rotation=text_info["rotation_clockwise"],
            readable=main_text_readable,
            is_cropped=crop_info["is_cropped"],
            clutter=clutter_info["background_clutter"],
            issues=issues,
            read_conf=readability_confidence
        )

    # Determine analysis status
    if readability_confidence is None and text_info["rotation_confidence"] < 0.5:
        analysis_status = "partial"
    else:
        analysis_status = "completed"

    # Determine document category
    doc_category = image_metrics.detect_document_category(
        detected_text=text_info.get("ocr_detected_text", ""),
        is_document=is_document,
        filename=filename
    )

    processing_time_ms = round((time.time() - start_time) * 1000, 1)

    return InspectionResponse(
        is_document=is_document,
        document_type=doc_type,
        document_category=doc_category,
        rotation_clockwise=text_info["rotation_clockwise"],
        rotation_confidence=text_info["rotation_confidence"],
        main_text_readable=main_text_readable,
        readability_confidence=readability_confidence,
        is_cropped=crop_info["is_cropped"],
        cropping_confidence=crop_info["cropping_confidence"],
        background_clutter=clutter_info["background_clutter"],
        feedback=feedback,
        recommended_fix=recommended_fix,
        analysis_status=analysis_status,
        metrics=ImageMetrics(**base_metrics),
        issues=issues,
        document_boundary=doc_boundary,
        cropping_details=crop_info,
        processing_time_ms=processing_time_ms,
        filename=filename,
        timestamp=datetime.utcnow().isoformat() + "Z"
    )
