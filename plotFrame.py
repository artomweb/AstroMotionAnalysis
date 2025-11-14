import pandas as pd
import matplotlib.pyplot as plt

# Load CSV
df = pd.read_csv("apriltag_tracking.csv")

# Plot positions
plt.figure(figsize=(12, 8))
plt.scatter(df['center_x'], df['center_y'], s=5, c='blue')  # small dots
plt.xlim(0, 6024)
plt.ylim(0, 4024)
plt.xlabel('X Position (pixels)')
plt.ylabel('Y Position (pixels)')
plt.title('Tracked Positions in Frame')
plt.gca().invert_yaxis() 
plt.grid(True)
plt.show()
