export type DocumentType = 'photo' | 'scan' | 'other' | 'uncertain';
export type RotationClockwise = 0 | 90 | 180 | 270 | null;
export type BackgroundClutter = 'none' | 'low' | 'medium' | 'high' | 'uncertain';
export type AnalysisStatus = 'completed' | 'partial' | 'failed';

export interface ImageMetrics {
  image_width: number;
  image_height: number;
  aspect_ratio: number;
  blur_score: number;
  brightness: number;
  contrast: number;
  edge_density?: number;
  ocr_confidence?: number | null;
  ocr_word_count?: number;
  ocr_detected_text?: string | null;
  document_area_ratio?: number | null;
  skew_angle_deg?: number | null;
}

export interface CroppingDetails {
  is_cropped: boolean;
  cropping_confidence: number;
  affected_regions?: string[];
  poly_touches_frame?: boolean;
}

export interface InspectionResult {
  is_document: boolean;
  document_type: DocumentType;
  document_category?: string;
  rotation_clockwise: RotationClockwise;
  rotation_confidence: number | null;
  main_text_readable: boolean | null;
  readability_confidence: number | null;
  is_cropped: boolean | null;
  cropping_confidence: number | null;
  background_clutter: BackgroundClutter;
  feedback: string;
  recommended_fix: string;
  analysis_status: AnalysisStatus;

  // Supplementary details
  metrics?: ImageMetrics;
  issues?: string[];
  document_boundary?: [number, number][] | null;
  cropping_details?: CroppingDetails;
  processing_time_ms?: number;
  filename?: string;
  timestamp?: string;
}

export interface HistoryRecord {
  id: string;
  timestamp: string;
  filename: string;
  document_type: DocumentType;
  document_category?: string;
  is_document: boolean;
  main_text_readable: boolean | null;
  is_cropped: boolean | null;
  background_clutter: BackgroundClutter;
  analysis_status: AnalysisStatus;
  feedback: string;
  recommended_fix: string;
  readability_confidence: number | null;
  rotation_clockwise: RotationClockwise;
  results: InspectionResult;
}

export interface HealthStatus {
  status: string;
  service: string;
  timestamp: string;
  vision_ai_enabled: boolean;
  ocr_available: boolean;
  max_upload_size_mb: number;
  supported_formats: string[];
}
