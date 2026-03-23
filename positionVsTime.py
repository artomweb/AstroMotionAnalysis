import pandas as pd
import numpy as np
import matplotlib.pyplot as plt

distToWall = 3500 #mm 3510
tagCenterHeightPx = 495.59 #px
tagRealHeight = 78 #mm


mmPerPixel = tagRealHeight / tagCenterHeightPx # mm per pixel in image



df = pd.read_csv("apriltag_C0009.csv")


df['t_from_start'] = df['timestamp'] - df['timestamp'].iloc[0]

# Plot
plt.figure(figsize=(8,5))
plt.scatter(df['t_from_start'], df['center_x'], label='X', s=2)
plt.scatter(df['t_from_start'], df['center_y'], label='Y', s=2)
# plt.plot(df['t_from_start'], df['center_x'], label='X', marker='o', markersize=2)
# plt.plot(df['t_from_start'], df['center_y'], label='Y', marker='o', markersize=2)
plt.xlabel('Time (s)')
plt.ylabel('Pixel position')
plt.title('Position vs Time')
plt.legend()
plt.grid(True)
plt.show()

print(df.head(5))
