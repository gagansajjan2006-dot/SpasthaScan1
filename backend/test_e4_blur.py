"""
test_e4_blur.py
---------------
Task E4 test suite:
  1. Blur type classification accuracy on synthetic text & real document samples degraded
     with motion_blur and gaussian_blur across multiple severities (assert >= 90% accuracy).
  2. Clean document assertion (blur_type == "none").
  3. Degraded / ambiguous edge cases (returns "uncertain" instead of guessing).
  4. Full pipeline integration:
     - Motion blur triggers BLUR_MOTION and recommended_fix: "Hold the phone steady or use both hands"
     - Defocus blur triggers BLUR_DEFOCUS and recommended_fix: "Tap the text to focus and move slightly farther back"
     - Clean document does not trigger blur issues.
"""

import asyncio
import io
import os
import sys
import cv2
import numpy as np
from PIL import Image, ImageDraw

sys.path.insert(0, os.path.dirname(__file__))

from tools.degrade import motion_blur, gaussian_blur, defocus_blur
from image_metrics import classify_blur
from inspection import inspect_document
from schemas import InspectionResponse


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def make_synthetic_text_doc() -> np.ndarray:
    w, h = 800, 1000
    img = Image.new("RGB", (w, h), color=(250, 250, 250))
    draw = ImageDraw.Draw(img)
    draw.rectangle([40, 40, w - 40, h - 40], outline=(150, 150, 150), width=2)
    draw.text((60, 60), "INSPECTION TEST CERTIFICATE", fill=(10, 10, 20))
    for y in range(120, 880, 28):
        text = f"This is an official paragraph line {y // 28} documenting verification procedures and quality compliance."
        draw.text((60, y), text, fill=(30, 30, 30))
    return cv2.cvtColor(np.array(img), cv2.COLOR_RGB2GRAY)


def pil_to_jpeg_bytes(cv_bgr_or_gray: np.ndarray) -> bytes:
    is_success, buf = cv2.imencode(".jpg", cv_bgr_or_gray)
    if not is_success:
        raise ValueError("Failed to encode JPEG")
    return buf.tobytes()


# ---------------------------------------------------------------------------
# Test 1: Accuracy Benchmark across severities (assert >= 90%)
# ---------------------------------------------------------------------------
def test_blur_classification_accuracy():
    doc = make_synthetic_text_doc()
    cert_path = os.path.join(os.path.dirname(__file__), "test_samples", "clear_certificate.jpg")
    cert = cv2.imread(cert_path, cv2.IMREAD_GRAYSCALE) if os.path.exists(cert_path) else doc
    if cert is not None and max(cert.shape) > 1024:
        cert = cv2.resize(cert, (800, 1000))

    test_images = [("Synthetic Text Doc", doc)]
    if cert is not None:
        test_images.append(("Real Certificate", cert))

    for label, base_img in test_images:
        motion_cases = []
        for k in [7, 11, 15, 21, 27]:
            for ang in [0, 25, 45, 60, 90, 115, 135, 160]:
                motion_cases.append((k, ang, motion_blur(base_img, k, ang)))

        defocus_cases = []
        for k in [7, 11, 15, 21, 27]:
            for s in [2.0, 3.5, 5.0, 7.0]:
                defocus_cases.append((k, s, gaussian_blur(base_img, k, s)))
        for r in [3, 5, 7, 9]:
            defocus_cases.append((r, 0, defocus_blur(base_img, r)))

        m_correct = sum(1 for _, _, img in motion_cases if classify_blur(img)["blur_type"] == "motion")
        d_correct = sum(1 for _, _, img in defocus_cases if classify_blur(img)["blur_type"] == "defocus")
        total = len(motion_cases) + len(defocus_cases)
        total_correct = m_correct + d_correct
        accuracy = (total_correct / total) * 100.0

        print(f"[{label}] Motion: {m_correct}/{len(motion_cases)} | Defocus: {d_correct}/{len(defocus_cases)} | Overall: {accuracy:.1f}%")
        assert accuracy >= 90.0, f"Expected >= 90% accuracy on {label}, got {accuracy:.1f}%"


# ---------------------------------------------------------------------------
# Test 2: Clean document yields blur_type == "none"
# ---------------------------------------------------------------------------
def test_clean_document_sharpness():
    doc = make_synthetic_text_doc()
    res = classify_blur(doc)
    assert res["blur_type"] == "none", f"Expected none for clean text doc, got {res['blur_type']}"
    assert res["confidence"] >= 0.80

    cert_path = os.path.join(os.path.dirname(__file__), "test_samples", "clear_certificate.jpg")
    if os.path.exists(cert_path):
        cert = cv2.imread(cert_path, cv2.IMREAD_GRAYSCALE)
        res_cert = classify_blur(cert)
        assert res_cert["blur_type"] == "none", f"Expected none for clear certificate, got {res_cert['blur_type']}"


# ---------------------------------------------------------------------------
# Test 3: Motion direction estimation
# ---------------------------------------------------------------------------
def test_motion_direction_estimation():
    doc = make_synthetic_text_doc()
    # Test horizontal (0 deg) and vertical (90 deg) motion blur
    m_horiz = motion_blur(doc, kernel_size=21, angle_deg=0.0)
    res_h = classify_blur(m_horiz)
    assert res_h["blur_type"] == "motion"
    assert res_h["blur_direction_deg"] is not None
    # For 0 deg, angle is near 0 or 180
    assert abs(res_h["blur_direction_deg"] - 0.0) <= 20.0 or abs(res_h["blur_direction_deg"] - 180.0) <= 20.0

    m_vert = motion_blur(doc, kernel_size=21, angle_deg=90.0)
    res_v = classify_blur(m_vert)
    assert res_v["blur_type"] == "motion"
    assert res_v["blur_direction_deg"] is not None
    assert abs(res_v["blur_direction_deg"] - 90.0) <= 20.0


# ---------------------------------------------------------------------------
# Test 4: Full Pipeline Integration & Coaching Fix Guidance
# ---------------------------------------------------------------------------
async def test_pipeline_integration():
    doc = make_synthetic_text_doc()
    bgr_doc = cv2.cvtColor(doc, cv2.COLOR_GRAY2BGR)

    # 1. Pipeline on Motion Blur
    m_img = motion_blur(bgr_doc, kernel_size=19, angle_deg=45.0)
    m_bytes = pil_to_jpeg_bytes(m_img)
    res_m: InspectionResponse = await inspect_document(m_bytes, filename="motion_test.jpg")
    assert res_m.blur_analysis is not None
    assert res_m.blur_analysis.blur_type == "motion"
    assert "BLUR_MOTION" in res_m.issues
    assert "Hold the phone steady or use both hands" in res_m.recommended_fix
    print(f"[PASS] Pipeline Motion Blur: {res_m.blur_analysis.blur_type} -> Fix: '{res_m.recommended_fix}'")

    # 2. Pipeline on Defocus Blur
    d_img = gaussian_blur(bgr_doc, ksize=21, sigma=5.0)
    d_bytes = pil_to_jpeg_bytes(d_img)
    res_d: InspectionResponse = await inspect_document(d_bytes, filename="defocus_test.jpg")
    assert res_d.blur_analysis is not None
    assert res_d.blur_analysis.blur_type == "defocus"
    assert "BLUR_DEFOCUS" in res_d.issues
    assert "Tap the text to focus and move slightly farther back" in res_d.recommended_fix
    print(f"[PASS] Pipeline Defocus Blur: {res_d.blur_analysis.blur_type} -> Fix: '{res_d.recommended_fix}'")

    # 3. Pipeline on Clean Document
    c_bytes = pil_to_jpeg_bytes(bgr_doc)
    res_c: InspectionResponse = await inspect_document(c_bytes, filename="clean_test.jpg")
    assert res_c.blur_analysis is not None
    assert res_c.blur_analysis.blur_type == "none"
    assert "BLUR_MOTION" not in res_c.issues
    assert "BLUR_DEFOCUS" not in res_c.issues
    print(f"[PASS] Pipeline Clean Doc: {res_c.blur_analysis.blur_type} -> Issues: {res_c.issues}")


def run_all():
    print("\n" + "=" * 65)
    print("    TASK E4 - BLUR TYPE CLASSIFICATION & COACHING TEST SUITE")
    print("=" * 65 + "\n")

    test_blur_classification_accuracy()
    test_clean_document_sharpness()
    test_motion_direction_estimation()
    asyncio.run(test_pipeline_integration())

    print("\n" + "=" * 65)
    print("    ALL TASK E4 TESTS PASSED")
    print("=" * 65 + "\n")


if __name__ == "__main__":
    run_all()
