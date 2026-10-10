# SpasthaScan AI — Document Image Quality Inspector & Clarity Enhancer

[![System Status](https://img.shields.io/badge/System%20Status-Live%20%26%20Operational-emerald?style=for-the-badge)]()
[![Frontend](https://img.shields.io/badge/Frontend-React%2019%20%7C%20TypeScript%20%7C%20Vite%20%7C%20Tailwind%20v4-indigo?style=for-the-badge)]()
[![Backend](https://img.shields.io/badge/Backend-FastAPI%20%7C%20OpenCV%20%7C%20NumPy-blue?style=for-the-badge)]()
[![License](https://img.shields.io/badge/License-MIT%20Enterprise-purple?style=for-the-badge)]()

**SpasthaScan AI** is an automated, zero-hallucination document image quality inspector and real-time clarity enhancement web application. Designed as an automated gatekeeper for document processing, identity verification (KYC), invoice auditing, and archival indexing pipelines, SpasthaScan evaluates uploaded photographs and live camera scans across 6 deterministic quality dimensions. It validates readability, corrects orientation, detects edge clipping, measures background surface clutter, classifies document taxonomy, and provides instant interactive image deblurring.

---

## 📑 Core Documentation Index

This repository includes full enterprise engineering specifications:
* **[PDR.md (Product Design Requirements)](file:///c:/Users/google/SpasthaScan1/PDR.md)** — Comprehensive Product Definition Document covering business rationale, personas, functional requirements (FR-01 to FR-16), non-functional requirements, edge case matrices, accessibility standards, and UX flowcharts.
* **[DDR.md (Detailed Design Report)](file:///c:/Users/google/SpasthaScan1/DDR.md)** — In-depth Technical Architecture Document covering system decomposition, mathematical formulations of all CV algorithms (Laplacian variance, RMS contrast, directional morphological text streaks, RDP contour fitting, CLAHE unsharp masking, adaptive binarization), REST API contracts, and benchmark assertions.

---

## 🔍 In-Depth Analysis of Each and Every Feature

Below is an exhaustive, technical and functional analysis of every feature implemented in SpasthaScan AI:

### Feature 1: Dual Document Ingestion Engine (File Browser & Drag-and-Drop)
* **Purpose & Value**: Provides an intuitive, error-tolerant ingestion entry point that accommodates both mobile and desktop users.
* **Functional Behavior**:
  * Users can drag and drop any supported image file directly onto the dashed interactive zone or click the explicit **Upload File or Document** button to trigger the native file selector.
  * Instant client-side validation evaluates the file's binary MIME type (`image/jpeg`, `image/png`, `image/webp`) and file size prior to network transmission.
  * Rejection alerts appear instantaneously with user-friendly guidance if an unsupported format or a file larger than 25 MB is supplied.
* **Technical Implementation**:
  * Located in [UploadZone.tsx](file:///c:/Users/google/SpasthaScan1/frontend/src/components/UploadZone.tsx).
  * Uses standard HTML5 drag-and-drop events (`onDragOver`, `onDragLeave`, `onDrop`) with visual state feedback (indigo highlight border and subtle scale pulse).
  * Supported extensions: `.jpg`, `.jpeg`, `.png`, `.webp`.

---

### Feature 2: Real-Time Live Document Camera Scanner
* **Purpose & Value**: Eliminates the friction of taking a photo on a separate device and manually transferring files. Enables direct document scanning from smartphones, laptops, and webcams.
* **Functional Behavior**:
  * Clicking **Scan with Camera** opens a full-screen viewfinder modal ([CameraCaptureModal.tsx](file:///c:/Users/google/SpasthaScan1/frontend/src/components/CameraCaptureModal.tsx)).
  * Displays an animated viewfinder framing box with high-contrast corner brackets (`indigo-400`) and centering guidance text to help the user position their document flat and unskewed.
  * Features a **Flip Camera** button allowing switching between front-facing cameras and high-resolution rear lenses on mobile devices.
  * Clicking **Capture Photo** grabs a full-resolution snapshot from the video stream into an off-screen canvas, closes the stream to save battery and camera resources, and presents a confirmation screen where the user can inspect the photo, click **Retake**, or click **Use This Document** to begin analysis.
* **Technical Implementation**:
  * WebRTC `navigator.mediaDevices.getUserMedia` with video constraints `{ facingMode: { ideal: 'environment' }, width: { ideal: 1920 }, height: { ideal: 1080 } }`.
  * Renders on an offscreen HTML5 Canvas with JPEG quality `0.95`.
  * Gracefully catches and displays human-readable errors for `NotAllowedError` (camera permissions denied) and `NotFoundError` (no camera device found).

---

### Feature 3: Standardized One-Click Test Case Presets
* **Purpose & Value**: Allows instant testing and regression auditing of all common defect scenarios without preparing real documents.
* **Functional Behavior**:
  * One-click chips located directly below the upload dropzone automatically fetch, blob-convert, and stage realistic document samples:
    1. **Clear Certificate**: High-resolution official award certificate on a wooden desk.
    2. **Clear Scan**: Perfectly illuminated, upright flatbed scan with clean margins.
    3. **Rotated 90°**: Clean document photo turned 90 degrees clockwise.
    4. **Blurry Doc**: Degraded document featuring severe optical and motion blur.
    5. **Cropped Doc**: Document with text boundaries clipped by the camera frame.
    6. **Non-Document**: Natural photograph (landscape/bokeh) without any document text.
* **Technical Implementation**:
  * Stored in `frontend/public/samples/` and `backend/test_samples/`.
  * Loaded via asynchronous `fetch()` and constructed into native browser `File` objects.

---

### Feature 4: Document Presence & Scan vs. Photo vs. Non-Document Classifier
* **Purpose & Value**: Prevents the critical industry error of running OCR extraction on random photos, while discerning between flatbed scans and physical camera photos.
* **Functional Behavior**:
  * Returns `is_document: true` only when actual paper/text structures exist.
  * Classifies into:
    * `scan`: Flatbed digitized scan (flat background, pure illumination, frame-filling paper).
    * `photo`: Physical document placed on a surface (desk, table, fabric).
    * `other`: Non-document images (landscapes, icons, pets, nature).
    * `uncertain`: Low-confidence borderline cases.
* **Technical Implementation**:
  * Located in [image_metrics.py](file:///c:/Users/google/SpasthaScan1/backend/image_metrics.py#L305-L375) (`classify_document_type`).
  * Evaluates corner patches ($4\%$ margin corners) for luminance dispersion ($\sigma_{corner} < 10 \implies$ scan).
  * Analyzes HSV color saturation: natural scenes typically exhibit saturation $> 100$ and absence of document contours, correctly flagging `document_type: "other"` and `is_document: false`.

---

### Feature 5: Automated Document Category & Taxonomy Detector
* **Purpose & Value**: Directs incoming documents to the appropriate business workflows (e.g., invoices to Accounts Payable, IDs to KYC).
* **Taxonomy Categories**:
  1. **Certificate / Award**: Academic degrees, completion certificates, diplomas, professional accreditations.
  2. **Invoice / Receipt**: Commercial bills, tax invoices, point-of-sale receipts, order summaries.
  3. **Identity Document (ID)**: Passports, national identification cards, driver's licenses.
  4. **Official Form / Application**: Legal declarations, government applications, questionnaires.
  5. **General Document**: Typed manuscripts, letters, memos, corporate notices.
  6. **Non-Document / Natural Scene**: Scenery, objects, artwork.
* **Technical Implementation**:
  * Located in [image_metrics.py](file:///c:/Users/google/SpasthaScan1/backend/image_metrics.py#L375-L395) (`detect_document_category`).
  * Synthesizes detected OCR keyword tokens, aspect ratio heuristics, and filename metadata.
  * Rendered on Card 6 of [ResultCard.tsx](file:///c:/Users/google/SpasthaScan1/frontend/src/components/ResultCard.tsx) and as a filterable column in [History.tsx](file:///c:/Users/google/SpasthaScan1/frontend/src/pages/History.tsx).

---

### Feature 6: Directional Streak Orientation & Rotation Engine
* **Purpose & Value**: Detects sideways or inverted documents that cause OCR extractors to fail or hallucinate.
* **Functional Behavior**:
  * Reports clockwise rotation required: `0` (upright), `90`, `180`, or `270`.
  * Outputs rotation confidence from `0.0` to `1.0`.
  * Provides an **Apply Rotation Preview** button in the preview window to immediately verify the upright fix.
* **Technical Implementation**:
  * Located in [image_metrics.py](file:///c:/Users/google/SpasthaScan1/backend/image_metrics.py#L225-L300) (`analyze_text_and_orientation`).
  * Morphological streak analysis using orthogonal kernels ($K_H \in \mathbb{R}^{25 \times 1}$ vs $K_V \in \mathbb{R}^{1 \times 25}$) to measure horizontal vs. vertical text flow.
  * Verified against Tesseract OSD (Orientation and Script Detection) when available.

---

### Feature 7: Text Readability, Laplacian Blur Variance & RMS Contrast Analysis
* **Purpose & Value**: Prevents degraded, out-of-focus, or low-contrast photos from entering digitizers where text cannot be legibly recovered.
* **Functional Behavior**:
  * Evaluates text sharpness, contrast, and minimum resolution ($>600\text{px}$).
  * Outputs `main_text_readable: true` or `false`, accompanied by a calibrated percentage confidence bar (e.g., $94\%$).
* **Technical Implementation**:
  * Formulated using discrete 2D Laplacian operator variance: $\text{Var}(\nabla^2 I) = \frac{1}{N} \sum ((\nabla^2 I)(x,y) - \mu)^2$.
  * RMS contrast: $C_{RMS} = \sqrt{\frac{1}{N} \sum (I_i - \bar{I})^2}$.
  * Thresholds: Blur score $\ge 100.0$ and contrast $\ge 35.0 \implies$ High confidence readability ($0.94$). Blur score $< 45.0 \implies$ Flagged as `blurry_text` and unreadable.

---

### Feature 8: Document Margin & Cropping Boundary Inspector
* **Purpose & Value**: Flags documents where signatures, account numbers, headers, or outer borders are cut off by the edge of the image frame.
* **Functional Behavior**:
  * Evaluates whether all four physical edges of the paper are completely captured inside the frame.
  * Reports affected regions: `top`, `bottom`, `left`, `right`.
* **Technical Implementation**:
  * Located in [image_metrics.py](file:///c:/Users/google/SpasthaScan1/backend/image_metrics.py#L118-L165) (`analyze_cropping`).
  * Extracts document contour using bilateral filtering, Canny edges, and Ramer-Douglas-Peucker polygon approximation ($\epsilon = 0.02 \cdot \text{Perimeter}$).
  * Checks if any polygon corner or edge touches within $1.5\%$ of the image frame boundaries ($x \le 1.5$, $x \ge 98.5$, $y \le 1.5$, $y \ge 98.5$).
  * For full scans, checks high-frequency edge stroke density crossing border strips ($\rho_{margin} > 0.08$).

---

### Feature 9: Dual-Zone Background Surface Clutter Segmentation
* **Purpose & Value**: Ensures the background does not distract optical character recognizers or document layout parsers.
* **Functional Behavior**:
  * Categorizes background clutter into `none`, `low`, `medium`, `high`, or `uncertain`.
  * A document filling the frame receives `none`. A clean, solid desk surface receives `low`. Multiple objects (cups, keyboards, papers) trigger `high`.
* **Technical Implementation**:
  * Inverts the document mask: $B = \neg D$.
  * Analyzes outer perimeter Canny edge density $\rho_{bg}$ and luminance variance $\sigma_{bg}$:
    $$S_{clutter} = 4.5 \cdot \rho_{bg} + 0.20 \cdot \frac{\sigma_{bg}}{255}$$
  * Score $< 0.03 \implies \text{None}$; $< 0.10 \implies \text{Low}$; $< 0.28 \implies \text{Medium}$; $\ge 0.28 \implies \text{High}$.

---

### Feature 10: Zero-Hallucination Plain-English Feedback Synthesizer
* **Purpose & Value**: Translates raw numerical computer vision metrics into clear, actionable human advice.
* **Functional Behavior**:
  * Generates exactly 1-2 friendly sentences summarizing the overall document condition.
  * Supplies exactly one practical, actionable fix (e.g., *"Hold camera steady and refocus on the text"*, *"Capture the full document with all edges inside the frame"*, *"No changes needed"*).
  * **Zero Hallucinations Guarantee**: Never invents problems when an image is clean, and never claims non-documents are readable.

---

### Feature 11: Real-Time Clarity Enhancement & Deblurring Engine
* **Purpose & Value**: Allows users to recover readability and visually inspect faint or degraded text without needing to re-photograph the physical document.
* **Modes**:
  * **Clear / Sharpen (✨)**: High-frequency unsharp masking ($I_{sharp} = 2.2 \cdot I - 1.2 \cdot G$) combined with CLAHE (Contrast Limited Adaptive Histogram Equalization, clip limit $2.2$, tile grid $8\times 8$) in CIE-LAB color space.
  * **B&W Scan (📄)**: Converts noisy, shadowed photos into clean, binarized scanner pages (pure black text on white paper) via local adaptive Gaussian thresholding.
* **Technical Implementation**:
  * Backend endpoint: [`POST /api/enhance?mode=clarity|bw_scan`](file:///c:/Users/google/SpasthaScan1/backend/main.py#L162-L200).
  * Client-side HTML5 Canvas fallback providing 0ms latency in the browser.

---

### Feature 12: Interactive Before/After Split Comparison Slider
* **Purpose & Value**: Delivers an intuitive visual comparison between the original blurry document and the deblurred clear version.
* **Functional Behavior**:
  * The user can drag a center slider divider handle (`◀ ▶`) horizontally from 0% to 100% across the image.
  * The left side reveals the original blurry document, while the right side displays the sharpened clear document.
  * Smooth touch and mouse event listeners with auto-cleanup ensure zero lag on mobile and desktop devices.
* **UI Location**: Located in [ImagePreview.tsx](file:///c:/Users/google/SpasthaScan1/frontend/src/components/ImagePreview.tsx#L250-L310).

---

### Feature 13: Interactive Viewport & Document Boundary Polygon Visualizer
* **Purpose & Value**: Allows users to inspect fine text details and verify exactly where the algorithm detected the document's edges.
* **Controls**:
  * **Zoom**: Zoom In and Zoom Out from 50% to 300%.
  * **Fit-to-Screen**: Resets zoom to 100% and rotation to 0°.
  * **Manual Rotate**: 90° clockwise preview step button.
  * **Boundary Toggle**: Overlays a semi-transparent blue-indigo polygon with dashed borders and circular anchor points over the detected corners of the document.

---

### Feature 14: Diagnostic Quality Cards (6 Dimension Grid)
* **Purpose & Value**: Displays high-level status across all 6 quality criteria at a glance.
* **Visual Hierarchy**:
  * Card 1: **Document Type** (Digital Scan, Document Photo, Non-Document).
  * Card 2: **Orientation** (Upright 0°, or Needs Rotation).
  * Card 3: **Readability** (Readable vs Unreadable with animated confidence progress bar).
  * Card 4: **Cropping** (Well Framed vs Cropped edges with affected borders).
  * Card 5: **Background** (Clean, Low, Medium, High Clutter).
  * Card 6: **Category & Status** (Taxonomy badge and Pipeline Status).
  * Uses traffic-light color coding: Emerald (Pass), Amber (Warning), Rose (Defect).

---

### Feature 15: Technical Metrics Diagnostic Panel & Charting
* **Purpose & Value**: Provides engineers and compliance auditors with exact numeric telemetry.
* **Components**:
  * Interactive **Recharts Bar Chart** visualizing normalized scores for Blur, Brightness, Contrast, and Edge Density.
  * Telemetry table displaying dimensions, aspect ratio, Laplacian score, brightness mean, RMS contrast, and document area ratio.
  * Collapsible **Raw Inspection JSON Payload** viewer with syntax highlighting and 1-click clipboard copy.

---

### Feature 16: Multi-Format Report Export Engine
* **Purpose & Value**: Facilitates compliance recordkeeping and downstream API integration.
* **Export Actions**:
  1. **Download JSON**: Generates a `.json` file containing the full inspection telemetry payload.
  2. **Copy JSON**: Copies compliant schema JSON to the OS clipboard with an animated confirmation checkmark.
  3. **Download Text Report**: Generates a formatted text summary with timestamps, filenames, dimensions, detected defects, and recommended fixes.

---

### Feature 17: Privacy-Preserving Local Audit History
* **Purpose & Value**: Allows operators to review session inspections without storing sensitive customer documents on the server.
* **Features**:
  * History table tracking Date/Time, Filename, Document Type, Category, Readability, Cropping, Clutter, and Status.
  * Real-time search filter by filename or defect keyword.
  * Dropdown filter by document type (`photo`, `scan`, `other`, `uncertain`).
  * 1-click **Clear History** button.
  * **Privacy Guarantee**: Operates via client-side storage; raw document image binaries are never retained on disk.

---

### Feature 19: Finger & Hand Obstruction Detection
* **Purpose & Value**: Detects fingers or hands holding or covering document margins and text, preventing illegible captures before submission.
* **Functional Behavior**:
  * Scans the outer 12% border band of the frame for skin-tone blobs using calibrated YCrCb thresholds (`Cr: 133–173`, `Cb: 77–127`).
  * Filters out noise and verifies blobs larger than 1.5% of the frame that touch the document boundary.
  * Localizes the obstruction into directional regions (`top`, `bottom`, `left`, `right`, `corner`).
  * Triggers issue code `FINGER_COVERING` (warning, or blocking if covering text regions) with clear directional fix text: *"Move your finger away from the top-right corner"*.
  * Returns structured `ObstructionDetail` with `has_obstruction`, `obstruction_pct`, `obstruction_region`, and `is_blocking`.

---

### Feature 20: Photo-of-Screen & Moiré Artifact Detection
* **Purpose & Value**: Prevents fraudulent or degraded submissions where a user photographs an electronic display (monitor, phone, laptop) rather than an original paper document.
* **Functional Behavior**:
  * Resizes the document crop to 512×512 and executes a 2D Fast Fourier Transform (FFT).
  * Masks center DC components and cardinal cross-axes, then measures periodic spectral peak energy ratios from pixel pitch harmonics.
  * Checks for visible RGB subpixel color grid patterns via high-frequency color channel correlation.
  * Triggers issue code `SCREEN_PHOTO` when `moire_score >= moire_max` with exact fix text: *"Photograph the original paper, not a screen"*.
  * Interactive **Defect Heatmap Layer** toggle in the preview highlights obstruction blobs and moiré patterns directly over the image.

---

## 📐 Strict Output JSON Schema

Every inspection returns valid JSON conforming to:

```json
{
  "is_document": true,
  "document_type": "photo",
  "document_category": "Certificate / Award",
  "rotation_clockwise": 0,
  "rotation_confidence": 0.94,
  "main_text_readable": true,
  "readability_confidence": 0.94,
  "is_cropped": false,
  "cropping_confidence": 0.95,
  "background_clutter": "none",
  "feedback": "Your document looks clear and easy to read. No changes are needed.",
  "recommended_fix": "No changes needed.",
  "analysis_status": "completed",
  "metrics": {
    "image_width": 896,
    "image_height": 1200,
    "aspect_ratio": 0.7467,
    "blur_score": 2281.5,
    "brightness": 187.28,
    "contrast": 50.66,
    "edge_density": 0.0907,
    "ocr_confidence": null,
    "ocr_word_count": 0,
    "ocr_detected_text": "",
    "document_area_ratio": 0.6462,
    "skew_angle_deg": null
  },
  "issues": [],
  "document_boundary": [
    [89.84, 3.0],
    [13.95, 12.67],
    [13.62, 88.75],
    [99.11, 86.42]
  ],
  "cropping_details": {
    "is_cropped": false,
    "cropping_confidence": 0.95,
    "affected_regions": [],
    "poly_touches_frame": false
  },
  "obstruction": {
    "has_obstruction": false,
    "obstruction_pct": 0.0,
    "obstruction_region": null,
    "corner_detail": null,
    "is_blocking": false
  },
  "screen_capture": {
    "is_screen_photo": false,
    "moire_score": 0.0,
    "periodic_energy_ratio": 3.54,
    "subpixel_pattern_detected": false
  },
  "processing_time_ms": 169.5,
  "filename": "clear_certificate.jpg",
  "timestamp": "2026-10-10T14:27:27.570554Z"
}
```

---

## 🚀 Running & Verification Instructions

### Prerequisites
* **Python 3.10+**
* **Node.js 18+** & **npm**

---

### Step 1: Launch Backend Engine

```bash
cd backend
python -m uvicorn main:app --host 127.0.0.1 --port 8000
```
* **API Server**: [http://127.0.0.1:8000](http://127.0.0.1:8000)
* **Swagger Interactive Docs**: [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)
* **Health Check**: [http://127.0.0.1:8000/api/health](http://127.0.0.1:8000/api/health)

---

### Step 2: Launch Frontend Application

```bash
cd frontend
npm run dev -- --host 127.0.0.1 --port 5174
```
* **Web Dashboard**: [http://127.0.0.1:5174](http://127.0.0.1:5174) (or [http://localhost:5174](http://localhost:5174))

---

### Step 3: Run Automated Pipeline Assertions

```bash
cd backend
python verify_pipeline.py
```
Validates all 6 sample cases:
1. `clear_certificate.jpg` &rarr; `Certificate / Award`, `is_document: true`, `main_text_readable: true`
2. `clear_document_scan.png` &rarr; `General Document`, `is_document: true`, `main_text_readable: true`
3. `blurry_document.jpg` &rarr; `General Document`, `is_document: true`, `main_text_readable: false`
4. `rotated_document.jpg` &rarr; `General Document`, `rotation_clockwise: 90`
5. `cropped_document.png` &rarr; `General Document`, `is_cropped: true`
6. `non_document.jpg` &rarr; `Non-Document / Natural Scene`, `is_document: false`

---

## 🔒 Security & Privacy Commitments
* **Zero Disk Persistence**: Raw image buffers are processed in RAM and released upon HTTP response completion.
* **Client-Side Retention**: History audit entries remain in browser storage and can be wiped with 1 click.
* **No Telemetry Leakage**: No documents are transmitted to external cloud providers unless explicit opt-in vision AI is configured.
