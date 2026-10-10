import os
import cv2
import numpy as np
from PIL import Image, ImageDraw, ImageFont

TEST_DIR = os.path.join(os.path.dirname(__file__), "test_samples")
os.makedirs(TEST_DIR, exist_ok=True)


def create_sample_images():
    w, h = 1000, 1400

    # 1. Clear Document Scan
    img1 = Image.new("RGB", (w, h), color=(252, 252, 252))
    draw1 = ImageDraw.Draw(img1)
    # Header & Lines of text
    draw1.rectangle([60, 60, w - 60, h - 60], outline=(220, 220, 220), width=1)
    draw1.text((100, 100), "OFFICIAL CERTIFICATE OF COMPLETION", fill=(20, 20, 30))
    draw1.text((100, 150), "Document ID: DC-98420-A1", fill=(60, 60, 70))
    for y in range(220, 1200, 45):
        draw1.line([(100, y), (w - 100, y)], fill=(40, 40, 50), width=3)
        draw1.text((100, y - 20), f"Section line paragraph entry verification record {y // 45}", fill=(30, 30, 40))
    clear_path = os.path.join(TEST_DIR, "clear_document_scan.png")
    img1.save(clear_path)
    print(f"Generated: {clear_path}")

    # 2. Rotated Document (90 degrees clockwise)
    # Rotate the clear document by 90 deg clockwise (which is 270 counter-clockwise in PIL)
    rotated_img = img1.rotate(270, expand=True)
    rotated_path = os.path.join(TEST_DIR, "rotated_document.jpg")
    rotated_img.save(rotated_path, quality=95)
    print(f"Generated: {rotated_path}")

    # 3. Blurry Document
    cv_img = cv2.imread(clear_path)
    blurred = cv2.GaussianBlur(cv_img, (31, 31), 15)
    blurry_path = os.path.join(TEST_DIR, "blurry_document.jpg")
    cv2.imwrite(blurry_path, blurred)
    print(f"Generated: {blurry_path}")

    # 4. Cropped Document (Crop off the right 35% and top 15% directly slicing through lines)
    cropped_cv = cv_img[180:h, 0:int(w * 0.70)]
    cropped_path = os.path.join(TEST_DIR, "cropped_document.png")
    cv2.imwrite(cropped_path, cropped_cv)
    print(f"Generated: {cropped_path}")

    # 5. Non-Document Image (Colorful gradient abstract scene)
    non_doc = np.zeros((800, 1000, 3), dtype=np.uint8)
    for i in range(800):
        for j in range(1000):
            non_doc[i, j] = [int(i / 800 * 255), int(j / 1000 * 255), 180]
    cv2.circle(non_doc, (500, 400), 180, (50, 120, 240), -1)
    non_doc_path = os.path.join(TEST_DIR, "non_document.jpg")
    cv2.imwrite(non_doc_path, non_doc)
    print(f"Generated: {non_doc_path}")


if __name__ == "__main__":
    create_sample_images()
