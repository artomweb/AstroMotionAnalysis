import Plotly from "plotly.js-dist";

/**
 * Handles all UI-related updates, progress bars, and Plotly rendering.
 */
export const UI = {
  // --- Progress Management ---
  updateProgress(current, total) {
    const percent = Math.min(100, (current / total) * 100);
    const bar = document.getElementById("progress-bar");
    const text = document.getElementById("progress-text");

    if (bar) bar.value = percent;
    if (text) text.textContent = `${percent.toFixed(1)}%`;
  },

  resetProgress() {
    this.updateProgress(0, 1);
  },

  showProgress() {
    const el = document.getElementById("progress-container");
    if (el) el.classList.remove("hidden");
  },

  hideProgress() {
    const el = document.getElementById("progress-container");
    if (el) el.classList.add("hidden");
  },

  // --- Button States ---
  updateButtonStates(isProcessing, hasFile) {
    const runBtn = document.getElementById("btn-run");
    const clearBtn = document.getElementById("btn-clear");

    if (isProcessing || !hasFile) {
      runBtn.classList.add("btn-disabled");
      clearBtn.classList.add("btn-disabled");
    } else {
      runBtn.classList.remove("btn-disabled");
      clearBtn.classList.remove("btn-disabled");
    }
  },

  // --- Canvas & DOM Cleanup ---
  clearOutputs() {
    document.querySelectorAll("canvas").forEach((c) => c.remove());

    const posDiv = document.getElementById("pos-plot-div");
    const velDiv = document.getElementById("vel-plot-div");

    Plotly.purge(posDiv);
    Plotly.purge(velDiv);

    posDiv.innerHTML = "";
    velDiv.innerHTML = "";

    document.getElementById("imageCont").innerHTML = "";

    this.resetProgress();
    this.hideProgress();
  },

  drawOverlay(ctx, det) {
    ctx.strokeStyle = "red";
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(det.corners[0].x, det.corners[0].y);
    det.corners.forEach((p) => ctx.lineTo(p.x, p.y));
    ctx.closePath();
    ctx.stroke();
  },

  // --- Plotting ---
  renderPositionPlot(data) {
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
    };

    const layout = {
      title: "AprilTag Tracking Data",
      xaxis: {
        title: { text: "Time (s)" },
      },
      yaxis: {
        title: {
          text: "X Position (px)",
        },
      },
      template: "plotly_white",
      autosize: true,
    };

    Plotly.newPlot(plotDiv, [traceX, traceY], layout, { responsive: true });
  },

  renderVelocityPlot(velData, averageVelocity) {
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
      xaxis: {
        title: { text: "Time (s)" },
      },
      yaxis: {
        title: { text: "Velocity (arcsec/s)" },
      },
      template: "plotly_white",
      shapes: [
        {
          type: "line",
          x0: times[0],
          x1: times[times.length - 1],
          y0: averageVelocity,
          y1: averageVelocity,
          line: { color: "red", width: 2 },
        },
      ],
      annotations: [
        {
          x: times[times.length - 1],
          y: averageVelocity,
          text: `Mean: ${averageVelocity.toFixed(2)}`,
          showarrow: false,
          yshift: 10,
          font: { color: "red" },
        },
      ],
      autosize: true,
    };

    Plotly.newPlot(plotDiv, [traceVel], layout, { responsive: true });
  },
};

/**
 * Persists input values to localStorage
 */
export function initPersistentInputs() {
  const settings = [
    { id: "input-time-step", key: "InputTimeStep" },
    { id: "input-tag-height", key: "InputTagHeight" },
    { id: "input-dist-wall", key: "InputDistWall" },
  ];

  settings.forEach(({ id, key }) => {
    const el = document.getElementById(id);
    if (!el) return;

    const savedValue = localStorage.getItem(key);
    if (savedValue !== null) el.value = savedValue;

    el.addEventListener("input", () => {
      localStorage.setItem(key, el.value);
    });
  });
}
