import "./style.css";

import * as Comlink from "comlink";
import Plotly from "plotly.js-dist";

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
  // Remove canvases
  document.querySelectorAll("canvas").forEach((c) => c.remove());

  // Clear Plotly plots
  const posDiv = document.getElementById("pos-plot-div");
  const velDiv = document.getElementById("vel-plot-div");

  Plotly.purge(posDiv);
  Plotly.purge(velDiv);

  posDiv.innerHTML = "";
  velDiv.innerHTML = "";

  // Optional: clear image container explicitly
  document.getElementById("imageCont").innerHTML = "";
}
function initPersistentInputs() {
  const settings = [
    { id: "input-time-step", key: "InputTimeStep" },
    { id: "input-tag-height", key: "InputTagHeight" },
    { id: "input-dist-wall", key: "InputDistWall" },
  ];

  settings.forEach(({ id, key }) => {
    const el = document.getElementById(id);
    if (!el) return;

    // Check if a value exists in storage
    const savedValue = localStorage.getItem(key);
    if (savedValue !== null) {
      el.value = savedValue;
    }

    // Update storage whenever the input changes
    el.addEventListener("input", () => {
      localStorage.setItem(key, el.value);
    });
  });
}

initPersistentInputs();

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
        drawOverlay(ctx, tag);
      }

      // Increment by the input time step
      currentTime += timeStepSeconds;
    }

    console.log("Finished. Points collected:", trajectoryData.length);

    renderPositionPlot(trajectoryData);

    const { velocityData, averageVelocity } = calculateVelocities(
      trajectoryData,
      tagHeightmm,
      distanceWallmm,
    );
    console.log(`Average velocity: ${averageVelocity.toFixed(2)} arcsec/s`);
    renderVelocityPlot(velocityData, averageVelocity);

    URL.revokeObjectURL(blobUrl);
  } finally {
    isProcessing = false;
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

    const velocityArcsecPerSec = angleChangeArcsec / timeDiff;

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

function drawOverlay(ctx, det) {
  ctx.strokeStyle = "red";
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(det.corners[0].x, det.corners[0].y);
  det.corners.forEach((p) => ctx.lineTo(p.x, p.y));
  ctx.closePath();
  ctx.stroke();
}
function renderPositionPlot(data) {
  const plotDiv = document.getElementById("pos-plot-div");

  const times = data.map((d) => d.t);
  const xValues = data.map((d) => d.x);
  const yValues = data.map((d) => d.y);

  const traceX = {
    x: times,
    y: xValues,
    name: "X Position",
    type: "scatter",
    mode: "lines+markers",
    line: { color: "#2ecc71" },
  };

  const traceY = {
    x: times,
    y: yValues,
    name: "Y Position",
    type: "scatter",
    mode: "lines+markers",
    line: { color: "#e74c3c" },
    // yaxis: "y2",
  };

  const layout = {
    title: "AprilTag Tracking Data (tagStandard41h12)",
    xaxis: { title: "Time (s)" },
    yaxis: { title: "X Position (px)", titlefont: { color: "#2ecc71" } },
    // yaxis2: {
    //   title: "Y Position (px)",
    //   titlefont: { color: "#e74c3c" },
    //   overlaying: "y",
    //   side: "right",
    // },
    template: "plotly_white",
  };

  const config = {
    responsive: true,
    toImageButtonOptions: {
      format: "png",
      filename: "trajectory_plot",
    },
  };

  Plotly.newPlot(plotDiv, [traceX, traceY], layout, config);
}

function renderVelocityPlot(velData, averageVelocity) {
  const plotDiv = document.getElementById("vel-plot-div");

  const times = velData.map((d) => d.t);
  const velocities = velData.map((d) => d.v);

  const traceVel = {
    x: times,
    y: velocities,
    name: "Frame Velocity",
    type: "scatter",
    mode: "lines+markers",
    line: { color: "#3498db", width: 1 },
    marker: { size: 4 },
  };

  const layout = {
    title: "Velocity vs Time",
    xaxis: { title: "Time (s)" },
    yaxis: { title: "Velocity (arcsec/s)" },
    template: "plotly_white",
    // Draw the red horizontal mean line
    shapes: [
      {
        type: "line",
        x0: times[0],
        x1: times[times.length - 1],
        y0: averageVelocity,
        y1: averageVelocity,
        line: {
          color: "red",
          width: 2,
          dash: "solid",
        },
      },
    ],
    annotations: [
      {
        x: times[times.length - 1],
        y: averageVelocity,
        xref: "x",
        yref: "y",
        text: `Mean: ${averageVelocity.toFixed(2)} arcsec/s`,
        showarrow: false,
        yshift: 10,
        font: { color: "red" },
      },
    ],
  };

  const config = {
    responsive: true,
    toImageButtonOptions: { format: "png", filename: "velocity_plot" },
  };

  Plotly.newPlot(plotDiv, [traceVel], layout, config);
}
