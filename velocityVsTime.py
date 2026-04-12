import pandas as pd
import numpy as np
import matplotlib.pyplot as plt

import matplotlib as mpl


distToWall = 3600 #mm 3510
tagCenterHeightPx = 189 #px
tagRealHeight = 78 #mm


mmPerPixel = tagRealHeight / tagCenterHeightPx # mm per pixel in image


df = pd.read_csv("MAH01867.MP4.csv")


# Calculate differences
df['dx'] = df['center_x'].diff()
df['dy'] = df['center_y'].diff()
df['distance'] = np.sqrt(df['dx']**2 + df['dy']**2)
df['time_diff'] = df['timestamp'].diff()

df['velocity_px_s'] = df['distance'] / df['time_diff']


df['angleChange_deg'] = np.degrees(np.arctan((mmPerPixel * df['distance']) / distToWall))
df['angleChange_arcsec'] = df['angleChange_deg'] * 3600
df['angleChange_arcsec_persec'] = df['angleChange_arcsec'] / df['time_diff']

# df = df[df['angleChange_arcsec_persec'] <= 20]
# Drop first row (NaN from diff)
df = df.dropna()

df['t_from_start'] = df['timestamp'] - df['timestamp'].iloc[0]

averageVelocity = np.mean(df['angleChange_arcsec_persec'])
print(f"Average velocity: {averageVelocity:.2f} arcsec/s")
# Plot
plt.figure(figsize=(8,5))
plt.plot(df['t_from_start'], df['angleChange_arcsec_persec'], marker='o', label='Frame velocity', markersize=1, linewidth=0.5)
plt.axhline(y=averageVelocity, color='r', linestyle='-', label='Mean velocity')
# plt.plot(df['t_from_start'], df['center_x'], label='X')
# plt.plot(df['t_from_start'], df['center_y'], label='Y')
plt.xlabel('Time (s)')
# plt.ylabel('Pixel position')
# plt.title('Position vs Time')
plt.ylabel('Velocity (arcsec/s)')
plt.title('Velocity vs Time')
plt.legend()
plt.grid(True)
plt.show()

# plt.savefig("VelocityVsTime.png")

print(df['time_diff'])
