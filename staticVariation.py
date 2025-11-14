import pandas as pd
import matplotlib.pyplot as plt

df = pd.read_csv("apriltag_tracking.csv")
print(df[["center_x", "center_y"]].std())

df["dx"] = df["center_x"].diff()
df["dy"] = df["center_y"].diff()
df['t_from_start'] = df['timestamp'] - df['timestamp'].iloc[0]

print(df)

plt.figure(figsize=(8,5))
plt.scatter(df['t_from_start'], df['dx'], marker='o', label='dx')
plt.scatter(df['t_from_start'], df['dy'], marker='o', label='dx')
plt.xlabel('Time (s)')
plt.ylabel('Pixel movement from last frame (pixels)')
plt.title('Pixel movement vs Time for no camera motion')
plt.legend()
plt.grid(True)
plt.show()