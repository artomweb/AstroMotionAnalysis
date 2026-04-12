import cv2
import csv
import os
from dt_apriltags import Detector
from tqdm import tqdm

video_path = "MAH01867.MP4"
output_csv = "MAH01867.MP4.csv"
tag_family = "tagStandard41h12"
interval_seconds = 1.0  

detector = Detector(families=tag_family, nthreads=12)

cap = cv2.VideoCapture(video_path)
if not cap.isOpened():
    print(f"Error: Could not open video file {video_path}")
    exit()

fps = cap.get(cv2.CAP_PROP_FPS)
total_duration_ms = (int(cap.get(cv2.CAP_PROP_FRAME_COUNT)) / fps) * 1000

current_target_ms = 0.0
ms_step = interval_seconds * 1000.0 

with open(output_csv, mode="w", newline="") as csvfile:
    writer = csv.writer(csvfile)
    writer.writerow(["frame_index", "timestamp", "center_x", "center_y"])

    with tqdm(total=int(total_duration_ms), desc="Analyzing Video", unit="frames") as pbar:
        while current_target_ms < total_duration_ms:
            cap.set(cv2.CAP_PROP_POS_MSEC, current_target_ms)
            
            ret, frame = cap.read()
            if not ret:
                break
            
            actual_ms = cap.get(cv2.CAP_PROP_POS_MSEC)
            actual_sec = actual_ms / 1000.0  # Convert to seconds
            current_frame_idx = int(cap.get(cv2.CAP_PROP_POS_FRAMES))

            # Process detection
            gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
            detections = detector.detect(gray)

            if detections:
                writer.writerow([
                    current_frame_idx,
                    actual_sec,
                    detections[0].center[0],
                    detections[0].center[1]
                ])
            
            # Increment target and update progress bar
            current_target_ms += ms_step
            pbar.update(int(ms_step))

cap.release()
print(f"\nProcessing complete. Results saved to: {output_csv}")