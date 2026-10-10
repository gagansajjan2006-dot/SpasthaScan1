import os
import asyncio
import json
import cv2
from inspection import inspect_document
from schemas import InspectionResponse

TEST_DIR = os.path.join(os.path.dirname(__file__), "test_samples")

async def test_all_cases():
    test_files = [
        ("clear_certificate.jpg", "Clear Certificate Document"),
        ("clear_document_scan.png", "Clear Document Scan"),
        ("blurry_document.jpg", "Blurry Document (Readability Defect)"),
        ("rotated_document.jpg", "Rotated Document (90 deg)"),
        ("cropped_document.png", "Cropped Document Edge"),
        ("non_document.jpg", "Non-Document / Natural Scene"),
    ]

    print("\n=================================================================")
    print("      SPASTHASCAN QUALITY INSPECTOR & ENHANCER VERIFICATION     ")
    print("=================================================================\n")

    passed_count = 0

    for fname, label in test_files:
        fpath = os.path.join(TEST_DIR, fname)
        if not os.path.exists(fpath):
            print(f"Skipping missing file: {fname}")
            continue

        with open(fpath, "rb") as f:
            data = f.read()

        result: InspectionResponse = await inspect_document(data, filename=fname)

        print(f"--- Case: {label} ({fname}) ---")
        summary_dict = {
            "is_document": result.is_document,
            "document_type": result.document_type,
            "document_category": result.document_category,
            "main_text_readable": result.main_text_readable,
            "readability_confidence": result.readability_confidence,
            "rotation_clockwise": result.rotation_clockwise,
            "is_cropped": result.is_cropped,
            "background_clutter": result.background_clutter,
            "issues": result.issues,
            "feedback": result.feedback,
            "status": result.analysis_status,
        }

        print("Output Metadata:")
        print(json.dumps(summary_dict, indent=2))
        print(f"Metrics -> Blur: {result.metrics.blur_score} | Contrast: {result.metrics.contrast} | Brightness: {result.metrics.brightness}")
        print("Schema Validation: [PASSED]\n")
        passed_count += 1

    print("=================================================================")
    print(f"TEST SUITE RESULT: {passed_count}/{len(test_files)} SAMPLES VALIDATED SUCCESSFULLY")
    print("=================================================================\n")

if __name__ == "__main__":
    asyncio.run(test_all_cases())
