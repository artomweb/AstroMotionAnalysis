import cv2
import os
import glob
import csv
from dt_apriltags import Detector
import matplotlib.pyplot as plt


img_path = "captures/2025-11-11T18-32-16-842.png" 
tag_family = "tagStandard41h12"

detector = Detector(families=tag_family)
image = cv2.imread(img_path)
gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)

detections = detector.detect(gray)

if detections:
    tag = detections[0]
    corners = tag.corners  # (4, 2) array
    width = int(abs(corners[1][0] - corners[0][0]))
    height = int(abs(corners[3][1] - corners[0][1]))
    print(corners)
    print(f"Tag dimensions (pixels): width={width}, height={height}")

    plt.imshow(cv2.cvtColor(image, cv2.COLOR_BGR2RGB))
    xs, ys = zip(*corners)
    plt.plot(list(xs) + [xs[0]], list(ys) + [ys[0]], 'r-', linewidth=2)
    plt.scatter(tag.center[0], tag.center[1], color='blue', s=40)
    plt.title(f"AprilTag detected: {tag.tag_id}\nWidth={width}px, Height={height}px")
    plt.axis('off')
    plt.show()
else:
    print("No AprilTag detected in the image.")