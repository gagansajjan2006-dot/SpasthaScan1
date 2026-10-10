from typing import Optional, List, Dict, Any, Literal
# pyrefly: ignore [missing-import]
from pydantic import BaseModel, Field

class ImageMetrics(BaseModel):
    image_width: int
    image_height: int
    aspect_ratio: float
    blur_score: float
    brightness: float
    contrast: float
    edge_density: Optional[float] = None
    ocr_confidence: Optional[float] = None
    ocr_word_count: Optional[int] = 0
    ocr_detected_text: Optional[str] = None
    document_area_ratio: Optional[float] = None
    skew_angle_deg: Optional[float] = None

class ObstructionDetail(BaseModel):
    has_obstruction: bool
    obstruction_pct: float
    obstruction_region: Optional[str] = Field(default=None, description="top, bottom, left, right, corner, or null")
    corner_detail: Optional[str] = None
    is_blocking: bool = False
    heatmap_coords: Optional[List[List[float]]] = None

class ScreenCaptureDetail(BaseModel):
    is_screen_photo: bool
    moire_score: float = Field(ge=0.0, le=1.0, description="Periodic energy ratio and subpixel grid pattern score 0..1")
    periodic_energy_ratio: Optional[float] = None
    subpixel_pattern_detected: Optional[bool] = None

class IdChecks(BaseModel):
    """Physical validation checks specific to ID-type documents (Aadhaar, PAN, DL, etc.)"""
    aspect_ratio: float = Field(description="Measured width/height ratio")
    aspect_ratio_ok: bool = Field(description="True if within tolerance of CR80 standard (1.586)")
    corners_visible: bool = Field(description="True if all four document corners were detected")
    glare_central_pct: float = Field(description="Percentage of the central 40% area that is overexposed/glare")
    glare_central_ok: bool = Field(description="True if glare is below the configured threshold (40%)")
    face_visible: bool = Field(description="True if a face was detected via Haar cascade (no identification, not stored)")
    face_cascade_available: bool = Field(description="True if the Haar cascade XML was found at runtime")


class DetectedScriptInfo(BaseModel):
    """OCR script detection results for multilingual support (eng/hin/kan)."""
    detected_script: str = Field(description="Dominant Unicode script: Devanagari, Kannada, Tamil, Telugu, Arabic, Latin, or Unknown")
    lang_used: str = Field(description="Tesseract language string actually used for OCR")
    lang_note: Optional[str] = Field(default=None, description="Warning message if language pack fallback occurred")


class InspectionResponse(BaseModel):
    is_document: bool
    document_type: Literal["photo", "scan", "other", "uncertain"]
    document_category: str = Field(default="General Document", description="Category: Certificate, Invoice, Identity Document, Official Form, or Non-Document")
    rotation_clockwise: Optional[int] = Field(default=None, description="0, 90, 180, 270 or null")
    rotation_confidence: Optional[float] = Field(default=None, ge=0.0, le=1.0)
    main_text_readable: Optional[bool] = None
    readability_confidence: Optional[float] = Field(default=None, ge=0.0, le=1.0)
    is_cropped: Optional[bool] = None
    cropping_confidence: Optional[float] = Field(default=None, ge=0.0, le=1.0)
    background_clutter: Literal["none", "low", "medium", "high", "uncertain"]
    feedback: str
    recommended_fix: str
    analysis_status: Literal["completed", "partial", "failed"]

    # Supplementary structured details for the frontend results dashboard
    metrics: Optional[ImageMetrics] = None
    issues: List[str] = []
    document_boundary: Optional[List[List[float]]] = None  # Normalized points [[x1, y1], [x2, y2], ...]
    cropping_details: Optional[Dict[str, Any]] = None
    obstruction: Optional[ObstructionDetail] = None
    screen_capture: Optional[ScreenCaptureDetail] = None
    detected_script: Optional[DetectedScriptInfo] = None
    id_checks: Optional[IdChecks] = None
    processing_time_ms: Optional[float] = None
    filename: Optional[str] = None
    timestamp: Optional[str] = None

class HistoryItem(BaseModel):
    id: str
    timestamp: str
    filename: str
    document_type: str
    document_category: str = "General Document"
    is_document: bool
    main_text_readable: Optional[bool]
    is_cropped: Optional[bool]
    background_clutter: str
    analysis_status: str
    feedback: str
    recommended_fix: str
    readability_confidence: Optional[float]
    rotation_clockwise: Optional[int]
    results: InspectionResponse
