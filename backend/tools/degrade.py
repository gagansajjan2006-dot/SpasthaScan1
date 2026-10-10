"""
degrade.py
----------
Synthetic image degradation utilities for testing quality inspectors:
- motion_blur: Simulates camera motion or document movement along an angle.
- gaussian_blur: Simulates isotropic defocus / Gaussian optical blur.
- defocus_blur: Simulates disc / out-of-focus bokeh point spread function.
"""

import cv2
import numpy as np


def motion_blur(img: np.ndarray, kernel_size: int = 15, angle_deg: float = 0.0) -> np.ndarray:
    """
    Apply directional linear motion blur to an image.
    :param img: Input image (grayscale or BGR).
    :param kernel_size: Length of motion blur kernel (must be >= 3).
    :param angle_deg: Direction of motion in degrees (0 = horizontal, 90 = vertical).
    :return: Blurred image.
    """
    k = max(3, int(kernel_size))
    if k % 2 == 0:
        k += 1

    # Create 1D horizontal line in a k x k kernel
    kernel = np.zeros((k, k), dtype=np.float32)
    center = k // 2
    kernel[center, :] = 1.0

    # Rotate kernel to desired angle
    if angle_deg != 0.0:
        rot_mat = cv2.getRotationMatrix2D((center, center), angle_deg, 1.0)
        kernel = cv2.warpAffine(kernel, rot_mat, (k, k))

    # Normalize kernel
    k_sum = kernel.sum()
    if k_sum > 0:
        kernel /= k_sum
    else:
        kernel[center, center] = 1.0

    return cv2.filter2D(img, -1, kernel)


def gaussian_blur(img: np.ndarray, ksize: int = 15, sigma: float = 0.0) -> np.ndarray:
    """
    Apply isotropic Gaussian blur (defocus approximation).
    :param img: Input image (grayscale or BGR).
    :param ksize: Kernel size (odd integer >= 3).
    :param sigma: Gaussian standard deviation (if 0, computed from ksize).
    :return: Blurred image.
    """
    k = max(3, int(ksize))
    if k % 2 == 0:
        k += 1
    s = float(sigma) if sigma > 0 else 0.3 * ((k - 1) * 0.5 - 1) + 0.8
    return cv2.GaussianBlur(img, (k, k), s)


def defocus_blur(img: np.ndarray, radius: int = 7) -> np.ndarray:
    """
    Apply circular disc defocus blur (pillbox Point Spread Function).
    :param img: Input image (grayscale or BGR).
    :param radius: Disc radius in pixels.
    :return: Defocused image.
    """
    r = max(1, int(radius))
    d = 2 * r + 1
    kernel = np.zeros((d, d), dtype=np.float32)
    cv2.circle(kernel, (r, r), r, 1.0, -1)
    k_sum = kernel.sum()
    if k_sum > 0:
        kernel /= k_sum
    return cv2.filter2D(img, -1, kernel)
