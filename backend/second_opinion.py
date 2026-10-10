"""
second_opinion.py  --  Task E2 multilingual support module
===========================================================
Provides:
  - run_multilingual_ocr()   : Tesseract with eng+hin+kan (configurable via
                                OCR_LANGS env or policy), graceful fallback.
  - detect_script_from_text(): Unicode-range-based dominant script detection.
  - categorize_document()    : Keyword + aspect-ratio based category (no filename).
  - run_id_card_checks()     : CR80 aspect, corners, glare, face (Haar cascade).

Policy keys (all optional):
  ocr_langs                  str   default from OCR_LANGS env ("eng+hin+kan")
  min_word_conf_latin        float 60.0
  min_word_conf_nonlatin     float 45.0
  id_aspect_ratio_target     float 1.586
  id_aspect_ratio_tolerance  float 0.08
  id_glare_max_central_pct   float 0.40
  face_cascade_path          str   "" (auto-detect bundled)
"""

import os
import logging
from typing import Dict, Any, List, Optional, Tuple

import cv2
import numpy as np

logger = logging.getLogger("docucheck.second_opinion")

# ---------------------------------------------------------------------------
# Tesseract availability guard
# ---------------------------------------------------------------------------
try:
    import pytesseract
    from pytesseract import Output as TessOutput
    PYTESSERACT_AVAILABLE = True
except ImportError:
    PYTESSERACT_AVAILABLE = False

# ---------------------------------------------------------------------------
# Unicode block ranges for script detection
# ---------------------------------------------------------------------------
_DEVANAGARI_RANGE = (0x0900, 0x097F)   # Hindi, Marathi, Sanskrit, Nepali
_KANNADA_RANGE    = (0x0C80, 0x0CFF)
_TAMIL_RANGE      = (0x0B80, 0x0BFF)
_TELUGU_RANGE     = (0x0C00, 0x0C7F)
_ARABIC_RANGE     = (0x0600, 0x06FF)
_LATIN_RANGE      = (0x0041, 0x024F)   # Basic Latin + Latin Extended-B


def _count_chars_in_range(text: str, lo: int, hi: int) -> int:
    return sum(1 for ch in text if lo <= ord(ch) <= hi)


def detect_script_from_text(text: str) -> str:
    """
    Return the dominant Unicode script found in *text*.
    Returns one of: Devanagari | Kannada | Tamil | Telugu | Arabic | Latin | Unknown
    """
    if not text.strip():
        return "Unknown"
    counts: Dict[str, int] = {
        "Devanagari": _count_chars_in_range(text, *_DEVANAGARI_RANGE),
        "Kannada":    _count_chars_in_range(text, *_KANNADA_RANGE),
        "Tamil":      _count_chars_in_range(text, *_TAMIL_RANGE),
        "Telugu":     _count_chars_in_range(text, *_TELUGU_RANGE),
        "Arabic":     _count_chars_in_range(text, *_ARABIC_RANGE),
        "Latin":      _count_chars_in_range(text, *_LATIN_RANGE),
    }
    total = max(sum(counts.values()), 1)
    best = max(counts, key=lambda k: counts[k])
    if counts[best] / total < 0.10:
        return "Unknown"
    return best


# ---------------------------------------------------------------------------
# Multilingual OCR
# ---------------------------------------------------------------------------

def run_multilingual_ocr(
    img_bgr: np.ndarray,
    policy: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    """
    Run Tesseract OCR with multilingual support.

    Language packs are taken from the OCR_LANGS env var (default "eng+hin+kan")
    or overridden via policy["ocr_langs"]. If the requested pack is unavailable,
    falls back gracefully to "eng" and sets lang_note in the result.

    Confidence thresholds for readability scoring are script-aware:
      - Latin/Unknown scripts  -> policy["min_word_conf_latin"]    (default 60)
      - Non-Latin scripts      -> policy["min_word_conf_nonlatin"] (default 45)
    """
    policy = policy or {}
    env_langs = os.getenv("OCR_LANGS", "eng+hin+kan")
    req_langs: str = str(policy.get("ocr_langs", env_langs))
    min_conf_latin    = float(policy.get("min_word_conf_latin",    60.0))
    min_conf_nonlatin = float(policy.get("min_word_conf_nonlatin", 45.0))

    default_result: Dict[str, Any] = {
        "ocr_text": "",
        "ocr_confidence": None,
        "ocr_word_count": 0,
        "detected_script": "Unknown",
        "lang_used": req_langs,
        "lang_note": None,
        "word_confidences": [],
    }

    if not PYTESSERACT_AVAILABLE:
        default_result["lang_note"] = "pytesseract not installed"
        return default_result

    rgb = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2RGB)

    def _run_tess(lang: str) -> Dict[str, Any]:
        data = pytesseract.image_to_data(rgb, lang=lang, output_type=TessOutput.DICT)
        confs: List[float] = []
        words: List[str] = []
        for i, conf_raw in enumerate(data.get("conf", [])):
            try:
                c = int(conf_raw)
            except (ValueError, TypeError):
                continue
            if c > 0:
                confs.append(float(c))
                word = str(data["text"][i]).strip()
                if word:
                    words.append(word)
        return {"confs": confs, "words": words}

    lang_used: str = req_langs
    lang_note: Optional[str] = None

    try:
        raw = _run_tess(req_langs)
    except Exception as exc:
        logger.warning(
            "OCR language pack '%s' unavailable (%s); falling back to 'eng'.",
            req_langs, exc,
        )
        lang_used = "eng"
        lang_note = (
            f"Requested language pack '{req_langs}' not installed. "
            "Fell back to English. "
            "Install tesseract-ocr-hin / tesseract-ocr-kan for full support."
        )
        try:
            raw = _run_tess("eng")
        except Exception as exc2:
            logger.error("Fallback English OCR also failed: %s", exc2)
            default_result["lang_note"] = lang_note
            return default_result

    confs = raw["confs"]
    words = raw["words"]
    full_text = " ".join(words[:80])
    detected_script = detect_script_from_text(full_text)

    # Use lower threshold for non-Latin scripts (policy-driven, not hard-coded)
    is_latin_script = detected_script in ("Latin", "Unknown")
    min_conf = min_conf_latin if is_latin_script else min_conf_nonlatin

    quality_confs = [c for c in confs if c >= min_conf]
    ocr_confidence: Optional[float] = (
        round(float(np.mean(quality_confs)), 1) if quality_confs else None
    )

    return {
        "ocr_text": full_text,
        "ocr_confidence": ocr_confidence,
        "ocr_word_count": len(words),
        "detected_script": detected_script,
        "lang_used": lang_used,
        "lang_note": lang_note,
        "word_confidences": confs[:200],
    }


# ---------------------------------------------------------------------------
# Document Category Detection  (OCR text + aspect-ratio, NOT filename)
# ---------------------------------------------------------------------------

_AADHAAR_KEYS   = ["aadhaar", "uidai", "unique identification",
                   "\u0906\u0927\u093e\u0930", "\u0c86\u0ca7\u0cbe\u0cb0\u0ccd",
                   "enrolment no", "vid"]
_PAN_KEYS       = ["income tax", "pan", "permanent account",
                   "\u0906\u092f\u0915\u0930", "govt. of india"]
_DL_KEYS        = ["driving licence", "driving license", "motor vehicle",
                   "dl no", "transport department", "validity", "cov",
                   "\u0921\u094d\u0930\u093e\u0907\u0935\u093f\u0902\u0917 \u0932\u093e\u0907\u0938\u0947\u0902\u0938",
                   "\u0c9a\u0cbe\u0cb2\u0ca8\u0cbe \u0caa\u0cb0\u0cb5\u0cbe\u0ca8\u0c97\u0cbf"]
_MARKSHEET_KEYS = ["marksheet", "mark sheet", "grade card", "result",
                   "semester", "cgpa", "sgpa", "roll no",
                   "marks obtained", "board of", "university",
                   "\u0905\u0902\u0915 \u092a\u0924\u094d\u0930"]
_INVOICE_KEYS   = ["invoice", "bill", "receipt", "tax", "subtotal",
                   "amount due", "gst", "hsn", "total", "payment",
                   "\u092c\u093f\u0932", "\u091a\u093e\u0932\u093e\u0928"]
_CERT_KEYS      = ["certificate", "certify", "award", "diploma",
                   "excellence", "completion", "conferred",
                   "\u092a\u094d\u0930\u092e\u093e\u0923 \u092a\u0924\u094d\u0930",
                   "\u0caa\u0ccd\u0cb0\u0cae\u0cbe\u0a23 \u0caa\u0ca4\u0ccd\u0cb0"]
_FORM_KEYS      = ["application", "declaration", "applicant",
                   "signature", "registration", "form no",
                   "\u0906\u0935\u0947\u0926\u0928"]

# CR80 standard card  85.6 mm x 53.98 mm  => aspect 1.5857
_ID_CARD_ASPECT = 85.6 / 53.98


def categorize_document(
    detected_text: str,
    aspect_ratio: float,
    is_document: bool,
) -> Tuple[str, bool]:
    """
    Return (category_label, is_id_card_type).
    Uses OCR text keywords and aspect-ratio hint only — filename is never used.
    """
    if not is_document:
        return "Non-Document / Natural Scene", False

    txt = (detected_text or "").lower()

    def _hits(keys: List[str]) -> bool:
        return any(k.lower() in txt for k in keys)

    if _hits(_AADHAAR_KEYS):
        return "Aadhaar Card", True
    if _hits(_PAN_KEYS) and ("pan" in txt or "permanent" in txt):
        return "PAN Card", True
    if _hits(_DL_KEYS):
        return "Driving Licence", True
    if _hits(_MARKSHEET_KEYS):
        return "Marksheet / Grade Card", False
    if _hits(_INVOICE_KEYS):
        return "Invoice / Receipt", False
    if _hits(_CERT_KEYS):
        return "Certificate / Award", False
    if _hits(_FORM_KEYS):
        return "Official Form / Application", False

    # Aspect-ratio hint: CR80 card +-12%  (no strong text evidence)
    if abs(aspect_ratio - _ID_CARD_ASPECT) <= 0.12:
        return "Identity Document (ID)", True

    return "General Document", False


# ---------------------------------------------------------------------------
# ID-card physical checks
# ---------------------------------------------------------------------------

def _load_face_cascade(policy: Dict[str, Any]) -> Optional[cv2.CascadeClassifier]:
    custom = str(policy.get("face_cascade_path", ""))
    if custom and os.path.exists(custom):
        cc = cv2.CascadeClassifier(custom)
        if not cc.empty():
            return cc
    try:
        bundled = cv2.data.haarcascades + "haarcascade_frontalface_default.xml"  # type: ignore[attr-defined]
        if os.path.exists(bundled):
            cc = cv2.CascadeClassifier(bundled)
            if not cc.empty():
                return cc
    except Exception:
        pass
    return None


def run_id_card_checks(
    img_bgr: np.ndarray,
    doc_boundary: Optional[List[List[float]]],
    policy: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    """
    Physical checks for ID-type documents:

    1. aspect_ratio_ok  — width/height close to CR80 standard (1.586 +/- tol).
    2. corners_visible  — doc_boundary contains >= 4 detected corner points.
    3. glare_central_ok — fraction of overexposed pixels in central 40% <= threshold.
    4. face_visible     — Haar-cascade face detected (detection only; image not stored).

    All thresholds come from policy, not hard-coded.
    """
    policy = policy or {}
    h, w = img_bgr.shape[:2]

    # --- 1. Aspect ratio ---
    aspect = round(w / h, 3) if h > 0 else 0.0
    target = float(policy.get("id_aspect_ratio_target", _ID_CARD_ASPECT))
    tol    = float(policy.get("id_aspect_ratio_tolerance", 0.08))
    aspect_ok = abs(aspect - target) <= tol

    # --- 2. Four corners visible ---
    corners_visible = doc_boundary is not None and len(doc_boundary) >= 4

    # --- 3. Glare in central 40% region ---
    glare_max_frac = float(policy.get("id_glare_max_central_pct", 0.40))
    cy0, cy1 = int(h * 0.30), int(h * 0.70)
    cx0, cx1 = int(w * 0.30), int(w * 0.70)
    central_crop = img_bgr[cy0:cy1, cx0:cx1]
    gray_c    = cv2.cvtColor(central_crop, cv2.COLOR_BGR2GRAY)
    glare_px  = int(np.count_nonzero(gray_c >= 240))
    total_px  = max(gray_c.size, 1)
    glare_pct = round((glare_px / total_px) * 100, 2)
    glare_ok  = (glare_pct / 100.0) <= glare_max_frac

    # --- 4. Face detection (Haar cascade, no identification, no storage) ---
    face_visible = False
    face_cascade = _load_face_cascade(policy)
    if face_cascade is not None:
        gray_full = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2GRAY)
        small     = cv2.resize(gray_full, (0, 0), fx=0.5, fy=0.5)
        faces     = face_cascade.detectMultiScale(
            small, scaleFactor=1.1, minNeighbors=4, minSize=(20, 20)
        )
        face_visible = len(faces) > 0
    else:
        logger.debug("Haar cascade XML not found; face check skipped.")

    return {
        "aspect_ratio":          aspect,
        "aspect_ratio_ok":       aspect_ok,
        "corners_visible":       corners_visible,
        "glare_central_pct":     glare_pct,
        "glare_central_ok":      glare_ok,
        "face_visible":          face_visible,
        "face_cascade_available": face_cascade is not None,
    }
