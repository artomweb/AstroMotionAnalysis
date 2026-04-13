import "./style.css";

import * as Comlink from "comlink";
import Plotly from "plotly.js-dist";

import { UI, initPersistentInputs } from "./ui.js";

initPersistentInputs();

const worker = new Worker("/apriltag.js", { type: "classic" });

const Apriltag = Comlink.wrap(worker);

const apriltag = await new Apriltag(
  Comlink.proxy(() => {
    console.log("ready");
  }),
);

const fileInput = document.getElementById("file-input");

let lastFile = null;
let isProcessing = false;

fileInput.addEventListener("change", (e) => {
  const file = e.target.files[0];
  if (file) handleFile(file);
  lastFile = file;
  UI.updateButtonStates(isProcessing, lastFile);
});

document.getElementById("btn-run").addEventListener("click", () => {
  if (!lastFile) {
    alert("No file loaded.");
    return;
  }

  if (isProcessing) {
    alert("Processing already in progress.");
    return;
  }

  clearOutputs();
  handleFile(lastFile);
});

document.getElementById("btn-clear").addEventListener("click", () => {
  clearOutputs();

  fileInput.value = ""; // reset file picker
  lastFile = null;
});

function clearOutputs() {
  document.querySelectorAll("canvas").forEach((c) => c.remove());

  const posDiv = document.getElementById("pos-plot-div");
  const velDiv = document.getElementById("vel-plot-div");

  Plotly.purge(posDiv);
  Plotly.purge(velDiv);

  posDiv.innerHTML = "";
  velDiv.innerHTML = "";

  document.getElementById("imageCont").innerHTML = "";

  UI.resetProgress();
  UI.hideProgress();
  UI.updateButtonStates(isProcessing, lastFile);
}

function convertToGrayscale(imageData) {
  const pixels = imageData.data;
  const grayscale = new Uint8Array(imageData.width * imageData.height);
  for (let i = 0, j = 0; i < pixels.length; i += 4, j++) {
    // Luminosity greyscale
    grayscale[j] =
      pixels[i] * 0.299 + pixels[i + 1] * 0.587 + pixels[i + 2] * 0.114;
  }
  return grayscale;
}

async function handleFile(file) {
  isProcessing = true;
  try {
    const timeStepSeconds = parseFloat(
      document.getElementById("input-time-step").value,
    );
    const tagHeightmm = parseFloat(
      document.getElementById("input-tag-height").value,
    );
    const distanceWallmm = parseFloat(
      document.getElementById("input-dist-wall").value,
    );
    const blobUrl = URL.createObjectURL(file);
    const video = document.createElement("video");
    video.src = blobUrl;
    video.muted = true;

    await new Promise((r) => (video.onloadedmetadata = r));

    const totalSteps = Math.ceil(video.duration / timeStepSeconds);
    let stepIndex = 0;
    UI.showProgress();
    UI.updateButtonStates(isProcessing, lastFile);

    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });

    document.querySelectorAll("canvas").forEach((c) => c.remove());
    // document.getElementById("file-input").after(canvas);

    document.getElementById("imageCont").appendChild(canvas);

    const trajectoryData = [];
    let currentTime = 0;

    console.log(
      `Processing ${video.duration.toFixed(2)}s video at ${timeStepSeconds}s intervals...`,
    );

    while (currentTime <= video.duration) {
      video.currentTime = currentTime;

      // seek
      await new Promise((r) => (video.onseeked = r));

      ctx.drawImage(video, 0, 0);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const grayscale = convertToGrayscale(imageData);

      // Detect apriltag
      const detections = await apriltag.detect(
        grayscale,
        canvas.width,
        canvas.height,
      );

      if (detections.length > 0) {
        const tag = detections[0];

        const leftEdge = Math.hypot(
          tag.corners[3].x - tag.corners[0].x,
          tag.corners[3].y - tag.corners[0].y,
        );
        const rightEdge = Math.hypot(
          tag.corners[2].x - tag.corners[1].x,
          tag.corners[2].y - tag.corners[1].y,
        );
        const tagHeightPx = (leftEdge + rightEdge) / 2;

        trajectoryData.push({
          t: currentTime,
          x: tag.center.x,
          y: tag.center.y,
          tagHeightPx: tagHeightPx, // Calculate scale for each frame?
        });
        UI.drawOverlay(ctx, tag);

        stepIndex++;
        UI.updateProgress(stepIndex, totalSteps);
      }

      // Increment by the input time step
      currentTime += timeStepSeconds;
    }

    console.log("Finished. Points collected:", trajectoryData.length);

    UI.renderPositionPlot(trajectoryData);

    const { velocityData, averageVelocity } = calculateVelocities(
      trajectoryData,
      tagHeightmm,
      distanceWallmm,
    );
    console.log(`Average velocity: ${averageVelocity.toFixed(2)} arcsec/s`);
    UI.renderVelocityPlot(velocityData, averageVelocity);

    URL.revokeObjectURL(blobUrl);
    UI.updateProgress(1, 1);
  } finally {
    isProcessing = false;
    UI.updateButtonStates(isProcessing, lastFile);
  }
}

function calculateVelocities(data, tagHeightmm, distanceWallmm) {
  const velocityData = [];
  let totalVelocity = 0;

  for (let i = 1; i < data.length; i++) {
    const prev = data[i - 1];
    const curr = data[i];

    const dx = curr.x - prev.x;
    const dy = curr.y - prev.y;
    const distancePx = Math.hypot(dx, dy);
    const timeDiff = curr.t - prev.t;

    // mm per pixel for this specific frame
    const mmPerPixel = tagHeightmm / curr.tagHeightPx;

    const angleChangeRad = Math.atan(
      (mmPerPixel * distancePx) / distanceWallmm,
    );
    const angleChangeDeg = angleChangeRad * (180 / Math.PI);
    const angleChangeArcsec = angleChangeDeg * 3600;

    const velocityArcsecPerSec = Math.abs(angleChangeArcsec / timeDiff);

    velocityData.push({
      t: curr.t,
      v: velocityArcsecPerSec,
    });

    totalVelocity += velocityArcsecPerSec;
  }

  const averageVelocity =
    velocityData.length > 0 ? totalVelocity / velocityData.length : 0;

  return { velocityData, averageVelocity };
}
