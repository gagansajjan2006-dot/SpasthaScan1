import cv2
import numpy as np
from PIL import Image
import io
import math
import logging
from typing import Dict, Any, Tuple, Optional, List
from schemas import ImageMetrics

logger = logging.getLogger("docucheck.metrics")

# Try to import pytesseract safely
try:
    import pytesseract
    PYTESSERACT_AVAILABLE = True
except ImportError:
    PYTESSERACT_AVAILABLE = False


def decode_image_bytes(image_bytes: bytes) -> np.ndarray:
    """Safely decode image bytes into OpenCV BGR numpy array."""
    nparr = np.frombuffer(image_bytes, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    if img is None:
        # Fallback to PIL
        try:
            pil_img = Image.open(io.BytesIO(image_bytes))
            if pil_img.mode != "RGB":
                pil_img = pil_img.convert("RGB")
            img = cv2.cvtColor(np.array(pil_img), cv2.COLOR_RGB2BGR)
        except Exception as e:
            raise ValueError(f"Failed to decode image: {e}")
    if img is None or img.size == 0:
        raise ValueError("Invalid or corrupted image data.")
    return img


def calculate_basic_metrics(img_bgr: np.ndarray) -> Dict[str, Any]:
    """Calculate core computer vision metrics: blur, brightness, contrast, edge density."""
    h, w = img_bgr.shape[:2]
    gray = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2GRAY)

    # 1. Blur Score using Laplacian variance
    # Standard rule: < 80-100 typically shows noticeable blur in document photography
    laplacian_var = float(cv2.Laplacian(gray, cv2.CV_64F).var())

    # 2. Brightness (mean luminance)
    # Range 0 (black) to 255 (pure white)
    brightness = float(np.mean(gray))

    # 3. Contrast (standard deviation of pixel intensities)
    # Range 0 to ~127
    contrast = float(np.std(gray))

    # 4. Edge density via Canny
    # Normalizes across resolutions
    canny = cv2.Canny(gray, 50, 150)
    edge_density = float(np.count_nonzero(canny) / (w * h))

    return {
        "image_width": w,
        "image_height": h,
        "aspect_ratio": round(w / h, 4) if h > 0 else 1.0,
        "blur_score": round(laplacian_var, 2),
        "brightness": round(brightness, 2),
        "contrast": round(contrast, 2),
        "edge_density": round(edge_density, 4),
        "gray": gray,
        "canny": canny
    }


def detect_document_boundary(img_bgr: np.ndarray, gray: np.ndarray) -> Tuple[Optional[List[List[float]]], Optional[float], Optional[np.ndarray]]:
    """
    Detect document boundary polygon (4 corners).
    Returns normalized coordinates [[x/w, y/h], ...], document_area_ratio, and binary mask.
    """
    h, w = img_bgr.shape[:2]
    total_area = w * h

    # Preprocess with blur and adaptive edge/threshold
    blurred = cv2.GaussianBlur(gray, (5, 5), 0)
    edged = cv2.Canny(blurred, 30, 120)
    kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (5, 5))
    dilated = cv2.dilate(edged, kernel, iterations=2)

    contours, _ = cv2.findContours(dilated, cv2.RETR_LIST, cv2.CHAIN_APPROX_SIMPLE)
    contours = sorted(contours, key=cv2.contourArea, reverse=True)[:10]

    best_poly = None
    best_area = 0.0

    for c in contours:
        peri = cv2.arcLength(c, True)
        approx = cv2.approxPolyDP(c, 0.02 * peri, True)
        area = cv2.contourArea(approx)

        if len(approx) == 4 and cv2.isContourConvex(approx):
            if area > 0.20 * total_area:  # At least 20% of image area
                best_poly = approx
                best_area = area
                break

    if best_poly is not None:
        # Normalize coordinates between 0 and 100%
        pts = best_poly.reshape(4, 2)
        norm_pts = [[round(float(p[0] / w * 100), 2), round(float(p[1] / h * 100), 2)] for p in pts]
        area_ratio = round(best_area / total_area, 4)

        # Create document mask
        mask = np.zeros((h, w), dtype=np.uint8)
        cv2.drawContours(mask, [best_poly], -1, 255, -1)
        return norm_pts, area_ratio, mask

    return None, None, None


def analyze_cropping(img_bgr: np.ndarray, gray: np.ndarray, doc_poly: Optional[List[List[float]]]) -> Dict[str, Any]:
    """
    Detect whether text or document edges are cut off or intersecting image margins.
    Inspects border strip margins for high gradient/text density and corner intersections.
    """
    h, w = gray.shape[:2]
    # Margin strip (1.5% of boundary)
    margin_x = max(3, int(w * 0.015))
    margin_y = max(3, int(h * 0.015))

    cut_edges = []
    poly_cut = False

    # If document polygon was found, check if document corners or edges touch border
    if doc_poly:
        for pt in doc_poly:
            px, py = pt[0], pt[1]
            if px <= 1.5:
                cut_edges.append("left")
            if px >= 98.5:
                cut_edges.append("right")
            if py <= 1.5:
                cut_edges.append("top")
            if py >= 98.5:
                cut_edges.append("bottom")
        if cut_edges:
            poly_cut = True
            cut_edges = list(sorted(set(cut_edges)))
    else:
        # Full scan or close-up photo: check if actual text/graphics strokes cross the border
        canny = cv2.Canny(gray, 50, 150)
        edge_threshold = 0.08  # True high-frequency stroke density crossing margin

        if np.mean(canny[:margin_y, :] > 0) > edge_threshold:
            cut_edges.append("top")
        if np.mean(canny[-margin_y:, :] > 0) > edge_threshold:
            cut_edges.append("bottom")
        if np.mean(canny[:, :margin_x] > 0) > edge_threshold:
            cut_edges.append("left")
        if np.mean(canny[:, -margin_x:] > 0) > edge_threshold:
            cut_edges.append("right")

    is_cropped = len(cut_edges) > 0
    confidence = min(0.98, 0.78 + 0.06 * len(cut_edges)) if is_cropped else 0.95

    return {
        "is_cropped": is_cropped,
        "cropping_confidence": round(confidence, 2),
        "affected_regions": cut_edges,
        "poly_touches_frame": poly_cut
    }


def analyze_background_clutter(gray: np.ndarray, doc_mask: Optional[np.ndarray], is_scan_candidate: bool = False) -> Dict[str, Any]:
    """
    Evaluate background surrounding the document.
    Categorizes into: none, low, medium, high, uncertain.
    """
    h, w = gray.shape[:2]

    # For full scans or images where document fills the frame, there is no surrounding desk/surface
    if is_scan_candidate or (doc_mask is not None and np.count_nonzero(doc_mask) > (w * h * 0.92)):
        return {
            "background_clutter": "none",
            "clutter_score": 0.01,
            "reason": "Document fills the frame; no external background surface present"
        }

    canny = cv2.Canny(gray, 40, 120)

    if doc_mask is not None:
        # Background is everything outside the document
        bg_mask = cv2.bitwise_not(doc_mask)
        bg_pixels = np.count_nonzero(bg_mask)
        if bg_pixels < (w * h * 0.08):
            return {
                "background_clutter": "none",
                "clutter_score": 0.02,
                "reason": "Document fills virtually entire frame"
            }
        
        bg_canny = cv2.bitwise_and(canny, canny, mask=bg_mask)
        bg_edge_density = float(np.count_nonzero(bg_canny) / bg_pixels)
        bg_std = float(np.std(gray[bg_mask > 0])) if bg_pixels > 0 else 0.0
    else:
        # Sample outer 6% perimeter margin
        m_x = max(2, int(w * 0.06))
        m_y = max(2, int(h * 0.06))
        perimeter_mask = np.ones((h, w), dtype=np.uint8) * 255
        perimeter_mask[m_y:h-m_y, m_x:w-m_x] = 0
        p_pixels = np.count_nonzero(perimeter_mask)
        bg_canny = cv2.bitwise_and(canny, canny, mask=perimeter_mask)
        bg_edge_density = float(np.count_nonzero(bg_canny) / p_pixels)
        bg_std = float(np.std(gray[perimeter_mask > 0]))

    # Clutter score heuristic: clean desks/surfaces have low edge density (<0.02)
    clutter_score = (bg_edge_density * 4.5) + (bg_std / 255.0 * 0.20)

    if clutter_score < 0.10:
        category = "none" if clutter_score < 0.03 else "low"
    elif clutter_score < 0.28:
        category = "medium"
    else:
        category = "high"

    return {
        "background_clutter": category,
        "clutter_score": round(float(clutter_score), 3),
        "bg_edge_density": round(float(bg_edge_density), 4),
        "bg_std": round(float(bg_std), 2)
    }


def analyze_text_and_orientation(img_bgr: np.ndarray, gray: np.ndarray) -> Dict[str, Any]:
    """
    Detect text readability and estimate document orientation (0, 90, 180, 270)
    using OCR when available, combined with directional morphological text streak analysis.
    """
    h, w = gray.shape[:2]
    ocr_confidence = None
    ocr_word_count = 0
    ocr_text = ""
    osd_rotation = None
    osd_conf = None

    # Try pytesseract if available and configured
    if PYTESSERACT_AVAILABLE:
        try:
            rgb_img = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2RGB)
            # Try OSD for orientation
            try:
                osd_data = pytesseract.image_to_osd(rgb_img, output_type=pytesseract.Output.DICT)
                osd_rotation = int(osd_data.get("rotate", 0))
                osd_conf = float(osd_data.get("orientation_conf", 0)) / 100.0
            except Exception:
                pass

            # Extract data
            data = pytesseract.image_to_data(rgb_img, output_type=pytesseract.Output.DICT)
            confidences = [int(c) for c in data.get("conf", []) if str(c).isdigit() and int(c) > 0]
            words = [w for w in data.get("text", []) if str(w).strip()]
            ocr_word_count = len(words)
            ocr_text = " ".join(words[:50])
            if confidences:
                ocr_confidence = round(float(np.mean(confidences)), 1)
        except Exception as e:
            logger.debug(f"Pytesseract execution skipped or failed: {e}")

    # Fallback / complementary directional streak analysis for orientation
    # Text typically flows in horizontal lines: horizontal kernel (25, 1) vs vertical kernel (1, 25)
    # Threshold image with Otsu
    _, thresh = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)
    k_horiz = cv2.getStructuringElement(cv2.MORPH_RECT, (25, 1))
    k_vert = cv2.getStructuringElement(cv2.MORPH_RECT, (1, 25))
    m_horiz = cv2.morphologyEx(thresh, cv2.MORPH_OPEN, k_horiz)
    m_vert = cv2.morphologyEx(thresh, cv2.MORPH_OPEN, k_vert)

    horiz_score = float(np.count_nonzero(m_horiz))
    vert_score = float(np.count_nonzero(m_vert))

    streak_ratio = (vert_score / (horiz_score + 1e-5))

    # Orientation determination
    if osd_rotation in [0, 90, 180, 270] and (osd_conf or 0) > 0.4:
        final_rotation = osd_rotation
        rot_confidence = min(0.99, max(0.65, osd_conf or 0.8))
    elif streak_ratio > 2.2:
        # Strong vertical lines compared to horizontal => document is 90 or 270 deg
        final_rotation = 90
        rot_confidence = 0.78
    elif streak_ratio < 0.5:
        # Strong horizontal lines => upright or 180
        final_rotation = 0
        rot_confidence = 0.82
    else:
        # Uncertain
        final_rotation = 0
        rot_confidence = 0.55

    return {
        "ocr_confidence": ocr_confidence,
        "ocr_word_count": ocr_word_count,
        "ocr_detected_text": ocr_text,
        "rotation_clockwise": final_rotation,
        "rotation_confidence": round(rot_confidence, 2),
        "streak_ratio": round(streak_ratio, 3)
    }


def classify_document_type(
    img_bgr: np.ndarray,
    gray: np.ndarray,
    doc_area_ratio: Optional[float],
    metrics: Dict[str, Any]
) -> Tuple[str, float]:
    """
    Classify whether the image is a 'photo', 'scan', 'other', or 'uncertain'.
    Does not automatically classify every white background as a scan.
    """
    h, w = gray.shape[:2]
    contrast = metrics["contrast"]
    brightness = metrics["brightness"]
    blur_score = metrics["blur_score"]
    edge_density = metrics["edge_density"]

    # Sample four corner patches to evaluate background uniformity & white saturation
    patch_size = max(5, int(min(w, h) * 0.04))
    tl = gray[:patch_size, :patch_size]
    tr = gray[:patch_size, -patch_size:]
    bl = gray[-patch_size:, :patch_size]
    br = gray[-patch_size:, -patch_size:]

    corners_mean = [np.mean(p) for p in [tl, tr, bl, br]]
    corners_std = [np.std(p) for p in [tl, tr, bl, br]]
    avg_corner_brightness = float(np.mean(corners_mean))
    corner_variance = float(np.mean(corners_std))

    # Check for text or line patterns
    has_text_evidence = edge_density > 0.015 and contrast > 25

    # Calculate color saturation to separate monochrome/paper documents from nature/bokeh/colorful photos
    hsv = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2HSV)
    mean_sat = float(np.mean(hsv[:, :, 1]))

    if not has_text_evidence and edge_density < 0.008:
        aspect = float(w / h) if h > 0 else 1.0
        is_doc_aspect = (0.55 <= aspect <= 0.85) or (1.15 <= aspect <= 1.85)
        if is_doc_aspect and avg_corner_brightness > 190 and corner_variance < 15 and mean_sat < 50:
            # Paper-like aspect ratio and uniform light background, likely a blurry document
            return "photo", 0.75
        # Non-document image (e.g. natural photo, landscape, icon, solid color, bokeh)
        return "other", 0.90

    # Highly saturated colorful images (nature, garden, landscape, bokeh like blur.jpg)
    # Natural photos have very high saturation (usually > 100) and no distinct document boundary
    if mean_sat > 100 and (doc_area_ratio is None or doc_area_ratio < 0.20):
        return "other", 0.94

    # Scanner signature:
    # 1. Very flat, uniform corners (corner_variance < 10)
    # 2. Document area fills virtually full frame (doc_area_ratio > 0.92 or no outside border)
    # 3. High sharpness / low perspective distortion
    # 4. Light background with uniform lighting
    if corner_variance < 10 and avg_corner_brightness > 185 and contrast > 35 and mean_sat < 50:
        return "scan", 0.91

    # Photo signature:
    # If a document polygon or clear rectangular boundary on a surface exists, or strong text evidence
    if doc_area_ratio is not None and doc_area_ratio > 0.25 and (has_text_evidence or mean_sat < 80):
        return "photo", 0.93

    if has_text_evidence and mean_sat < 85:
        return "photo", 0.88

    if mean_sat > 85 and not has_text_evidence:
        return "other", 0.88

    return "photo", 0.75


def detect_document_category(detected_text: str, is_document: bool, filename: str = "") -> str:
    """
    Classify the specific category of document (e.g. Certificate, Invoice, ID, Form, or Non-Document).
    """
    if not is_document:
        return "Non-Document / Natural Scene"

    combined = (detected_text or "").lower() + " " + filename.lower()
    if any(k in combined for k in ["certificate", "excellence", "completion", "achievement", "award", "diploma", "conferred"]):
        return "Certificate / Award"
    elif any(k in combined for k in ["invoice", "receipt", "bill", "tax", "subtotal", "amount", "due date", "price", "payment"]):
        return "Invoice / Receipt"
    elif any(k in combined for k in ["passport", "license", "identity", "republic", "driving", "national", "birth", "driver"]):
        return "Identity Document (ID)"
    elif any(k in combined for k in ["form", "application", "applicant", "signature", "declaration", "registration"]):
        return "Official Form / Application"
    return "General Document"


def analyze_obstruction_and_screen(
    bgr: np.ndarray,
    doc_mask: Optional[np.ndarray] = None,
    policy: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    """
    Analyze document image for:
    1. Finger/hand obstruction in the outer 12% border band using YCrCb skin-tone blobs
       (Cr 133-173, Cb 77-127) larger than 1.5% of the frame that touch the document boundary.
       Returns obstruction_pct and obstruction_region (top|bottom|left|right|corner|null).
    2. Screen photo / moiré pattern: FFT magnitude of grayscale document crop (resized to 512px),
       masked center, periodic peak energy ratio, and high-frequency RGB subpixel grid correlation.
       Returns moire_score 0..1.
    """
    h, w = bgr.shape[:2]
    total_area = float(h * w) if (h > 0 and w > 0) else 1.0
    policy = policy or {}
    max_obstruction_pct = float(policy.get("max_obstruction_pct", 1.5))
    moire_max = float(policy.get("moire_max", 0.45))

    # Fast guard for colorful non-document photos
    hsv = cv2.cvtColor(bgr, cv2.COLOR_BGR2HSV)
    mean_sat = float(np.mean(hsv[:, :, 1]))
    has_explicit_doc = doc_mask is not None and np.count_nonzero(doc_mask) > 0

    if mean_sat > 90 and not has_explicit_doc:
        # Non-document image (e.g. nature, outdoors)
        return {
            "obstruction_pct": 0.0,
            "obstruction_region": None,
            "corner_detail": None,
            "has_obstruction": False,
            "is_blocking": False,
            "heatmap_coords": None,
            "moire_score": 0.0,
            "is_screen_photo": False,
            "periodic_energy_ratio": 0.0,
            "subpixel_pattern_detected": False,
            "obstruction": {
                "has_obstruction": False,
                "obstruction_pct": 0.0,
                "obstruction_region": None,
                "corner_detail": None,
                "is_blocking": False,
                "heatmap_coords": None,
            },
            "screen_capture": {
                "is_screen_photo": False,
                "moire_score": 0.0,
                "periodic_energy_ratio": 0.0,
                "subpixel_pattern_detected": False,
            }
        }

    # ---------------------------------------------------------
    # 1. OBSTRUCTION DETECTION (Finger / Hand)
    # ---------------------------------------------------------
    bx = max(1, int(w * 0.12))
    by = max(1, int(h * 0.12))

    border_mask = np.zeros((h, w), dtype=np.uint8)
    border_mask[:by, :] = 255
    border_mask[-by:, :] = 255
    border_mask[:, :bx] = 255
    border_mask[:, -bx:] = 255

    effective_doc_mask = doc_mask if has_explicit_doc else np.ones((h, w), dtype=np.uint8) * 255

    # Document boundary perimeter
    grad_kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (7, 7))
    doc_boundary = cv2.morphologyEx(effective_doc_mask, cv2.MORPH_GRADIENT, grad_kernel)
    if np.count_nonzero(doc_boundary) == 0:
        doc_boundary = border_mask

    # YCrCb skin-tone thresholding: Cr 133-173, Cb 77-127
    ycrcb = cv2.cvtColor(bgr, cv2.COLOR_BGR2YCrCb)
    skin_raw = cv2.inRange(
        ycrcb,
        np.array([0, 133, 77], dtype=np.uint8),
        np.array([255, 173, 127], dtype=np.uint8)
    )

    morph_k = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5))
    skin_clean = cv2.morphologyEx(skin_raw, cv2.MORPH_OPEN, morph_k)
    skin_clean = cv2.morphologyEx(skin_clean, cv2.MORPH_CLOSE, morph_k)

    num_labels, labels, stats, centroids = cv2.connectedComponentsWithStats(skin_clean)
    best_blob = None
    best_pct = 0.0
    heatmap_coords = None

    for i in range(1, num_labels):
        area = stats[i, cv2.CC_STAT_AREA]
        pct = (area / total_area) * 100.0
        if pct < 1.5:  # Must be larger than 1.5% of the frame
            continue

        bw, bh = stats[i, cv2.CC_STAT_WIDTH], stats[i, cv2.CC_STAT_HEIGHT]
        # Ignore outer table/desk that completely surrounds the frame (touches all 4 sides)
        if bw > 0.85 * w and bh > 0.85 * h:
            continue

        blob_mask = (labels == i).astype(np.uint8) * 255

        # Must intersect outer 12% border band
        if np.count_nonzero(cv2.bitwise_and(blob_mask, border_mask)) == 0:
            continue

        # Must touch document boundary
        # Dilate boundary slightly for robust intersection
        dilated_boundary = cv2.dilate(doc_boundary, np.ones((7, 7), np.uint8))
        if np.count_nonzero(cv2.bitwise_and(blob_mask, dilated_boundary)) == 0:
            continue

        # Must enter / cover document
        inside_doc = np.count_nonzero(cv2.bitwise_and(blob_mask, effective_doc_mask))
        if (inside_doc / total_area) < 0.004:
            continue

        if pct > best_pct:
            best_pct = pct
            best_blob = (i, pct, centroids[i], stats[i])
            # Bounding box coordinates normalized 0..100
            bx0 = round((stats[i, cv2.CC_STAT_LEFT] / w) * 100, 2)
            by0 = round((stats[i, cv2.CC_STAT_TOP] / h) * 100, 2)
            bx1 = round(((stats[i, cv2.CC_STAT_LEFT] + bw) / w) * 100, 2)
            by1 = round(((stats[i, cv2.CC_STAT_TOP] + bh) / h) * 100, 2)
            heatmap_coords = [[bx0, by0], [bx1, by0], [bx1, by1], [bx0, by1]]

    if best_blob is not None:
        _, obs_pct_val, centroid, stat = best_blob
        cx, cy = centroid
        nx, ny = cx / w, cy / h

        corner_detail = None
        if nx > 0.55 and ny < 0.45:
            obstruction_region = "corner"
            corner_detail = "top-right"
        elif nx < 0.45 and ny < 0.45:
            obstruction_region = "corner"
            corner_detail = "top-left"
        elif nx > 0.55 and ny > 0.55:
            obstruction_region = "corner"
            corner_detail = "bottom-right"
        elif nx < 0.45 and ny > 0.55:
            obstruction_region = "corner"
            corner_detail = "bottom-left"
        elif ny < 0.35:
            obstruction_region = "top"
        elif ny > 0.65:
            obstruction_region = "bottom"
        elif nx < 0.35:
            obstruction_region = "left"
        elif nx > 0.65:
            obstruction_region = "right"
        else:
            obstruction_region = "corner"

        obstruction_pct = round(obs_pct_val, 2)
        has_obstruction = obstruction_pct >= max_obstruction_pct
        # Blocking if obstruction covers substantial area or central text region
        is_blocking = (obstruction_pct > 3.8) or (ny > 0.25 and ny < 0.75 and nx > 0.25 and nx < 0.75)
    else:
        obstruction_pct = 0.0
        obstruction_region = None
        corner_detail = None
        has_obstruction = False
        is_blocking = False
        heatmap_coords = None

    # ---------------------------------------------------------
    # 2. SCREEN PHOTO / MOIRÉ PATTERN DETECTION
    # ---------------------------------------------------------
    crop_bgr = bgr
    if has_explicit_doc:
        x, y, bw, bh = cv2.boundingRect(doc_mask)
        if bw > 100 and bh > 100:
            crop_bgr = bgr[y:y+bh, x:x+bw]

    crop_gray = cv2.cvtColor(crop_bgr, cv2.COLOR_BGR2GRAY)
    g512 = cv2.resize(crop_gray, (512, 512)).astype(np.float32)

    # 2D FFT
    f = np.fft.fftshift(np.fft.fft2(g512))
    mag = np.abs(f)

    # Local box filter for periodic peak ratio
    local_mean = cv2.boxFilter(mag, -1, (11, 11))
    peak_ratio_map = mag / (local_mean + 1e-5)

    y_grid, x_grid = np.ogrid[:512, :512]
    r_grid = np.sqrt((x_grid - 256)**2 + (y_grid - 256)**2)
    # Mask center DC (r < 35) and cardinal cross-axes (|x-256| <= 4 or |y-256| <= 4)
    fft_mask = (r_grid >= 35) & (r_grid <= 245) & (np.abs(x_grid - 256) > 4) & (np.abs(y_grid - 256) > 4)

    periodic_peak_ratio = float(np.max(peak_ratio_map[fft_mask]))
    norm_peak_score = float(np.clip((periodic_peak_ratio - 8.5) / 10.0, 0.0, 1.0))

    # Visible RGB subpixel grid pattern via high-frequency color channel correlation
    bgr_512 = cv2.resize(crop_bgr, (512, 512)).astype(np.float32)
    blur_512 = cv2.GaussianBlur(bgr_512, (5, 5), 0)
    hp = bgr_512 - blur_512
    diff_color = float(np.mean(np.abs(hp[:, :, 2] - hp[:, :, 0]) + np.abs(hp[:, :, 1] - hp[:, :, 0])))
    norm_color_score = float(np.clip((diff_color - 2.5) / 6.0, 0.0, 1.0))

    subpixel_detected = norm_color_score > 0.4 or diff_color > 4.5
    moire_score = round(float(np.clip(max(norm_peak_score, norm_color_score), 0.0, 1.0)), 2)
    is_screen_photo = moire_score >= moire_max

    obstruction_data = {
        "has_obstruction": has_obstruction,
        "obstruction_pct": obstruction_pct,
        "obstruction_region": obstruction_region,
        "corner_detail": corner_detail,
        "is_blocking": is_blocking,
        "heatmap_coords": heatmap_coords,
    }

    screen_data = {
        "is_screen_photo": is_screen_photo,
        "moire_score": moire_score,
        "periodic_energy_ratio": round(periodic_peak_ratio, 2),
        "subpixel_pattern_detected": subpixel_detected,
    }

    return {
        "obstruction_pct": obstruction_pct,
        "obstruction_region": obstruction_region,
        "corner_detail": corner_detail,
        "has_obstruction": has_obstruction,
        "is_blocking": is_blocking,
        "heatmap_coords": heatmap_coords,
        "moire_score": moire_score,
        "is_screen_photo": is_screen_photo,
        "periodic_energy_ratio": round(periodic_peak_ratio, 2),
        "subpixel_pattern_detected": subpixel_detected,
        "obstruction": obstruction_data,
        "screen_capture": screen_data,
    }

