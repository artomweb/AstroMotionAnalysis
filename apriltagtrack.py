import cv2
import os
import glob
import csv
from dt_apriltags import Detector
from tqdm import tqdm  


image_folder = "captures" 
image_extension = "*.png"
output_csv = "apriltag_tracking.csv"
tag_family = "tagStandard41h12"

detector = Detector(families=tag_family, nthreads=12)

def exif_time(image_file_name: str):
    from exif import Image as exif_data
    from datetime import datetime, timezone

    base = os.path.basename(image_file_name)
    try:
        t_naive = datetime.strptime(base[:23], "%Y-%m-%dT%H-%M-%S-%f")
    except ValueError:
        return None

    return t_naive.replace(tzinfo=timezone.utc)


image_paths = sorted(glob.glob(os.path.join(image_folder, image_extension)))

with open(output_csv, mode="w", newline="") as csvfile:
    writer = csv.writer(csvfile)
    writer.writerow(["filename", "timestamp", "center_x", "center_y"])  # header

    for img_path in tqdm(image_paths, desc="Processing images"):
        # Load image in grayscale
        image = cv2.imread(img_path)
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)

        # Detect AprilTags
        detections = detector.detect(gray)

        dt_utc_obj = exif_time(img_path)
        dt_utc = dt_utc_obj.timestamp() if dt_utc_obj else None

        # Record detections
        if detections:
            writer.writerow([os.path.basename(img_path), dt_utc, detections[0].center[0], detections[0].center[1]])

print(f"Tracking complete. Results saved to {output_csv}")
