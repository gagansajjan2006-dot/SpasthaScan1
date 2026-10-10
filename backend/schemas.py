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
