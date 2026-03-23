import cv2
import numpy as np
from dt_apriltags import Detector
import matplotlib.pyplot as plt

# --- Settings ---
video_path = "captures/C0009.mp4"
tag_family = "tagStandard41h12"
target_ms = 5000.0  # The specific timestamp you want to analyze (in ms)

# Initialize Detector
detector = Detector(families=tag_family)

# Open Video
cap = cv2.VideoCapture(video_path)
if not cap.isOpened():
    print(f"Error: Could not open {video_path}")
    exit()

# Jump to the specific time
cap.set(cv2.CAP_PROP_POS_MSEC, target_ms)
ret, frame = cap.read()
actual_ms = cap.get(cv2.CAP_PROP_POS_MSEC)

if ret:
    gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
    detections = detector.detect(gray)

    if detections:
        tag = detections[0]
        c = tag.corners  # Array of (x, y) for 4 corners
        
        # Calculate side lengths using Euclidean distance for better accuracy
        # dist = sqrt((x2-x1)^2 + (y2-y1)^2)
        width = np.linalg.norm(c[0] - c[1])
        height = np.linalg.norm(c[1] - c[2])

        print(f"Detection at {actual_ms:.2f}ms")
        print(f"Tag ID: {tag.tag_id}")
        print(f"Measured Dimensions: Width={width:.2f}px, Height={height:.2f}px")

        # Visualization
        plt.figure(figsize=(10, 6))
        plt.imshow(cv2.cvtColor(frame, cv2.COLOR_BGR2RGB))
        
        # Draw bounding box
        xs, ys = zip(*c)
        plt.plot(list(xs) + [xs[0]], list(ys) + [ys[0]], 'r-', linewidth=2, label='Tag Boundary')
        
        # Mark center
        plt.scatter(tag.center[0], tag.center[1], color='blue', s=100, label='Center')
        
        plt.title(f"Video Frame at {actual_ms/1000:.2f}s\nWidth: {width:.1f}px | Height: {height:.1f}px")
        plt.legend()
        plt.axis('off')
        plt.show()
    else:
        print(f"No AprilTag found at {target_ms}ms.")
else:
    print("Could not read frame from video.")

cap.release()