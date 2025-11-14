# Astrophotography Tracker motion analysis

As part of a University group project we are creating a star tracker for astrophotography. To be able to benchmark our design against commercial mounts we needed a way to track the mount's movement over time.

For tracking the stars, the required angular velocity is 15 arcsec/sec.

You can see our results in the `graphs/` folder.

## How it works

1. An Apriltag is placed on the wall and the mount is setup so the camera can capture as many frames as possible with the tag visible.
2. `captureInterval.py` captures an image every few seconds.
3. `apriltagtrack.py` extracts the position of the tag in each frame.
4. `velocityVsTime.py` plots the velocity in arcsec/sec over time.

Distances on the wall are calculated by dividing the real world height of the tag in mm by the height in pixels of the image found by `findDimensions.py`. With the distance to the wall, a right angle triangle is formed with the distance between each frame. This can be used to find the angular distance between each image. Which divided by the time between the frame is the angular velocity.

## Additional scripts

`plotFrame.py` plots each tag center on the frame's x,y coordinates.

`positionVsTime.py` plots position instead of velocity.

`staticVariation.py` plots the sub-pixel movements of the tag finder over time when the mount wasn't moving. This is trying to prove that the tag motion is purely from the mount and not from variation in the tracking accuracy.
