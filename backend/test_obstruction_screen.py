import os
import cv2
import asyncio
import numpy as np
import time

from schemas import InspectionResponse
from inspection import inspect_document
import image_metrics

TEST_DIR = os.path.join(os.path.dirname(__file__), "test_samples")


def make_clean_synthetic_document(width=800, height=1000) -> np.ndarray:
    """Create a clean white document image with dark text lines."""
    doc = np.ones((height, width, 3), dtype=np.uint8) * 245
    for y in range(80, height - 80, 35):
        cv2.line(doc, (60, y), (width - 60, y), (40, 40, 40), 2)
    return doc


async def test_finger_covering_synthetic_corner():
    """Synthetic skin-coloured ellipse over a corner triggers FINGER_COVERING."""
    doc = make_clean_synthetic_document(800, 1000)
    h, w = doc.shape[:2]

    # Skin color in BGR: [120, 160, 215] -> YCrCb: Cr=159 (133-173), Cb=99 (77-127)
    skin_bgr = (120, 160, 215)
    # Place ellipse over top-right corner touching border (outer 12% of frame)
    cv2.ellipse(doc, (740, 80), (110, 75), 35, 0, 360, skin_bgr, -1)

    _, enc = cv2.imencode(".jpg", doc)
    res: InspectionResponse = await inspect_document(enc.tobytes(), filename="synthetic_finger.jpg")

    assert "FINGER_COVERING" in res.issues, f"Expected FINGER_COVERING in issues, got {res.issues}"
    assert res.obstruction is not None, "Expected obstruction field in response"
    assert res.obstruction.has_obstruction is True
    assert res.obstruction.obstruction_pct >= 1.5, f"Expected obstruction_pct >= 1.5%, got {res.obstruction.obstruction_pct}%"
    assert res.obstruction.obstruction_region in ["corner", "top-right", "top", "bottom", "left", "right"], (
        f"Unexpected obstruction_region: {res.obstruction.obstruction_region}"
    )
    assert "Move your finger away from the" in res.recommended_fix, f"Unexpected fix text: {res.recommended_fix}"
    assert "top-right" in res.recommended_fix or "corner" in res.recommended_fix


async def test_screen_photo_fine_grid():
    """A page with an added fine grid pattern triggers SCREEN_PHOTO."""
    doc = make_clean_synthetic_document(800, 800)
    h, w = doc.shape[:2]

    # Add high-frequency periodic grid simulating screen subpixels / moire pattern
    screen_doc = doc.copy()
    for x in range(0, w, 4):
        screen_doc[:, x, :] = np.clip(screen_doc[:, x, :].astype(int) - 50, 0, 255)
    for y in range(0, h, 4):
        screen_doc[y, :, :] = np.clip(screen_doc[y, :, :].astype(int) - 50, 0, 255)

    _, enc = cv2.imencode(".png", screen_doc)
    res: InspectionResponse = await inspect_document(enc.tobytes(), filename="synthetic_screen.png")

    assert "SCREEN_PHOTO" in res.issues, f"Expected SCREEN_PHOTO in issues, got {res.issues}"
    assert res.screen_capture is not None, "Expected screen_capture field in response"
    assert res.screen_capture.is_screen_photo is True
    assert res.screen_capture.moire_score >= 0.45, f"Expected moire_score >= 0.45, got {res.screen_capture.moire_score}"
    assert "Photograph the original paper, not a screen" in res.recommended_fix


async def test_six_samples_unaffected():
    """The six existing sample images must remain completely unaffected by obstruction/screen photo false positives."""
    sample_files = [
        "clear_certificate.jpg",
        "clear_document_scan.png",
        "blurry_document.jpg",
        "rotated_document.jpg",
        "cropped_document.png",
        "non_document.jpg",
    ]

    for fname in sample_files:
        fpath = os.path.join(TEST_DIR, fname)
        if not os.path.exists(fpath):
            continue

        with open(fpath, "rb") as f:
            data = f.read()

        res: InspectionResponse = await inspect_document(data, filename=fname)
        assert "FINGER_COVERING" not in res.issues, f"False positive FINGER_COVERING on {fname}"
        assert "SCREEN_PHOTO" not in res.issues, f"False positive SCREEN_PHOTO on {fname}"


def test_latency_under_40ms():
    """Added latency of analyze_obstruction_and_screen must be under 40 ms."""
    doc = make_clean_synthetic_document(800, 1000)
    
    # Warmup
    _ = image_metrics.analyze_obstruction_and_screen(doc)

    times = []
    for _ in range(5):
        t0 = time.perf_counter()
        _ = image_metrics.analyze_obstruction_and_screen(doc)
        dt = (time.perf_counter() - t0) * 1000.0
        times.append(dt)

    avg_ms = sum(times) / len(times)
    print(f"\nAverage analyze_obstruction_and_screen latency: {avg_ms:.2f} ms")
    assert avg_ms < 40.0, f"Average latency {avg_ms:.2f} ms exceeds 40 ms requirement"


if __name__ == "__main__":
    asyncio.run(test_finger_covering_synthetic_corner())
    asyncio.run(test_screen_photo_fine_grid())
    asyncio.run(test_six_samples_unaffected())
    test_latency_under_40ms()
    print("\nALL TASK E1 TESTS PASSED SUCCESSFULLY!")
