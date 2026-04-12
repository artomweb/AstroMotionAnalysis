#!/usr/bin/env python3
import os
import time
import subprocess
from datetime import datetime, timezone
from pathlib import Path
import glob


import rawpy
import imageio.v2 as imageio

CAPTURE_INTERVAL = 5     # seconds between captures
SAVE_DIR = "captures"    # directory to save images

def capture_with_gphoto2(capturesdir: str) -> str:
    """
    Use gphoto2 to take one photo and return the full path of the downloaded file.
    If prompt_before_capture is True, wait for ENTER before capturing (useful for interactive runs).
    """
    os.makedirs(capturesdir, exist_ok=True)


    ret = subprocess.run(
        ["gphoto2", "--auto-detect"], capture_output=True, text=True, check=False
    )
    lines = ret.stdout.strip().splitlines()
    if len(lines) <= 2:
        raise RuntimeError("No camera detected by gphoto2.")
    
    before = {f.name for f in Path(capturesdir).iterdir()}

    timestamp = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H-%M-%S-%f")[:-3]
    cap = subprocess.run(
        ["gphoto2", "--capture-image-and-download", "--force-overwrite"],
        cwd=capturesdir,
        capture_output=True,
        text=True,
        check=False,
    )
    if cap.returncode != 0:
        raise RuntimeError(f"gphoto2 failed: {cap.stderr}")

    after = {f.name for f in Path(capturesdir).iterdir()}
    new_files = list(after - before)
    print(before)
    print(after)
    if not new_files:
        raise RuntimeError("Capture succeeded but no file was downloaded.")

    captured_file = max([Path(capturesdir) / f for f in new_files], key=os.path.getctime)

    ext = captured_file.suffix.lower() or ".dat"
    new_name = Path(capturesdir) / f"{timestamp}{ext}"
    captured_file.rename(new_name)

    return str(new_name)

def convert_raw_to_png(raw_path: str) -> str:
    ext = os.path.splitext(raw_path)[1].lower()
    pngPath = os.path.splitext(raw_path)[0] + ".png"

    # Already JPEG
    if ext == ".png":
        return raw_path

    # Handle RAW formats
    raw_extensions = [".cr2", ".nef", ".arw", ".rw2", ".orf", ".raf", ".dng"]
    if ext in raw_extensions:
        try:
            with rawpy.imread(raw_path) as raw:
                rgb = raw.postprocess()
            imageio.imsave(pngPath, rgb)
            return pngPath
        except Exception as e:
            raise RuntimeError(f"Failed to convert RAW file {raw_path} to JPEG: {e}")

    # Fallback: non-RAW image (e.g., PNG, TIFF, BMP)
    from PIL import Image
    try:
        with Image.open(raw_path) as img:
            rgb_img = img.convert("RGB")
            rgb_img.save(pngPath, "PNG")
        return pngPath
    except Exception as e:
        raise RuntimeError(f"Failed to convert image {raw_path} to PNG: {e}")

def main():
    print(f"Starting capture every {CAPTURE_INTERVAL}s → saving to '{SAVE_DIR}'")
    print("Press Ctrl+C to stop.")
    count = 0
    try:
        while True:
            try:
                fname = capture_with_gphoto2(SAVE_DIR)
                print(f"[OK] Captured {fname}")
                converted_path = convert_raw_to_png(fname)
                print(f"[OK] Converted to {converted_path}")
            except Exception as e:
                print(f"[ERROR] {e}")
            count += 1
            time.sleep(CAPTURE_INTERVAL)
    except KeyboardInterrupt:
        print("\nStopped by user.")
    finally:
        print(f"Total captured: {count}")

if __name__ == "__main__":
    main()
