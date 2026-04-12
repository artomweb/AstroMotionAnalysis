import matplotlib
matplotlib.use('Agg')  # This must happen BEFORE importing pyplot
import matplotlib.pyplot as plt
import cv2
from dt_apriltags import Detector

# Configuration
video_path = "MAH01867.MP4" 
tag_family = "tagStandard41h12"

# 1. Initialize Detector and Video Capture
detector = Detector(families=tag_family)
cap = cv2.VideoCapture(video_path)

if not cap.isOpened():
    print("Error: Could not open video.")
else:
    # 2. Calculate the middle frame index
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    middle_frame_idx = total_frames // 2
    
    # 3. Set the reader to the middle frame
    cap.set(cv2.CAP_PROP_POS_FRAMES, middle_frame_idx)
    ret, frame = cap.read()
    cap.release()

    if ret:
        # 4. Process the frame (Same logic as your image script)
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        detections = detector.detect(gray)

        if detections:
            tag = detections[0]
            corners = tag.corners
            width = int(abs(corners[1][0] - corners[0][0]))
            height = int(abs(corners[3][1] - corners[0][1]))
            
            print(f"Middle Frame Index: {middle_frame_idx}")
            print(f"Tag dimensions (pixels): width={width}, height={height}")


            rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            plt.imshow(rgb_frame)

            # Visualization
            xs, ys = zip(*corners)
            plt.plot(list(xs) + [xs[0]], list(ys) + [ys[0]], 'r-', linewidth=2)
            plt.scatter(tag.center[0], tag.center[1], color='blue', s=40)
            plt.title(f"Frame {middle_frame_idx} | Tag ID: {tag.tag_id}\nWidth={width}px, Height={height}px")
            plt.axis('off')
            plt.savefig("detection_result.png")
            print("Result saved as detection_result.png")
            plt.close() 
        else:
            print(f"No AprilTag detected in frame {middle_frame_idx}.")
    else:
        print("Failed to extract the middle frame.")