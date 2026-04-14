const STORAGE_KEY = "spinner_v3";
let items = [];
let currentRotation = 0;
let isSpinning = false;
let lastWinner = null;

const canvas = document.getElementById("wheel");
const ctx = canvas.getContext("2d");
const centerX = 600,
  centerY = 600,
  radius = 597;

window.onload = () => {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    items = JSON.parse(saved);
    updateUI();
  } else {
    drawEmpty();
  }
};

function loadCSV() {
  const raw = document.getElementById("csv-input").value.trim();
  if (!raw) return;
  const newItems = raw
    .split("\n")
    .map((line, i) => {
      const parts = line.split(",");
      const weight = parseInt(parts.pop());
      const name = parts.join(",").trim();
      return {
        id: Date.now() + i,
        name,
        initialWeight: weight,
        currentWeight: weight,
        color: `hsl(${(i * 137.5) % 360}, 60%, 50%)`,
      };
    })
    .filter((item) => item.name && !isNaN(item.currentWeight));

  items = newItems;
  save();
  updateUI();
  document.getElementById("csv-input").value = "";
  document.querySelector("details").open = false;
}

function save() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

function updateUI() {
  const list = document.getElementById("inventory-list");
  list.innerHTML = items
    .map(
      (item, i) => `
                <div class="inventory-item" style="opacity: ${item.currentWeight ? 1 : 0.3}">
                    <div class="item-dot" style="background:${item.color}"></div>
                    <div class="item-info">${item.name}</div>
                    <div class="item-count">${item.currentWeight}/${item.initialWeight}</div>
                    <button class="mini-btn" onclick="resetOne(${i})">Reset</button>
                </div>
            `,
    )
    .join("");
  draw();
  document.getElementById("spin-btn").disabled = items.every(
    (i) => i.currentWeight <= 0,
  );
}

function resetOne(i) {
  items[i].currentWeight = items[i].initialWeight;
  save();
  updateUI();
}
function resetAll() {
  if (confirm("Reset all?")) {
    items.forEach((i) => (i.currentWeight = i.initialWeight));
    save();
    updateUI();
  }
}

function draw(rot = currentRotation) {
  const active = items.filter((i) => i.currentWeight > 0);
  const total = active.reduce((s, i) => s + i.currentWeight, 0);
  ctx.clearRect(0, 0, 1200, 1200);
  if (!total) {
    drawEmpty();
    return;
  }

  ctx.save();
  ctx.translate(centerX, centerY);
  ctx.rotate(rot);

  // FIX: Draw a solid base circle first.
  // This prevents "seams" or "yellow fringes" between slices.
  ctx.beginPath();
  ctx.arc(0, 0, radius, 0, Math.PI * 2);
  ctx.fillStyle = active[0].color; // Use the first item's color as a base
  ctx.fill();

  let currentAngle = 0;
  active.forEach((item) => {
    const slice = (item.currentWeight / total) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, radius, currentAngle, currentAngle + slice);
    ctx.fillStyle = item.color;
    ctx.fill();

    // Use a slightly more opaque white for the divider lines
    ctx.strokeStyle = "rgba(255,255,255,0.3)";
    ctx.lineWidth = 3;
    ctx.stroke();

    ctx.save();
    ctx.rotate(currentAngle + slice / 2);
    ctx.fillStyle = "white";
    ctx.font = "bold 26px sans-serif";
    ctx.textAlign = "right";
    if (!isSpinning) {
      ctx.shadowColor = "rgba(0,0,0,0.8)";
      ctx.shadowBlur = 10;
    }
    ctx.fillText(
      item.name.length > 30 ? item.name.slice(0, 27) + "..." : item.name,
      radius - 50,
      10,
    );
    ctx.restore();

    currentAngle += slice;
  });
  ctx.restore();
}

function drawEmpty() {
  ctx.fillStyle = "#1e293b";
  ctx.beginPath();
  ctx.arc(600, 600, 600, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#475569";
  ctx.font = "40px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("Add items to start", 600, 600);
}

function spin() {
  if (isSpinning) return;
  isSpinning = true;
  document.getElementById("spin-btn").disabled = true;

  const duration = 8000; // 8 Seconds - much slower and more dramatic
  const startRot = currentRotation;
  const extraRots = Math.PI * 2 * (4 + Math.random() * 2);
  const endRot = startRot + extraRots;
  const startTime = performance.now();

  function animate(now) {
    const elapsed = now - startTime;
    const t = Math.min(elapsed / duration, 1);

    // quintic ease out for a VERY long crawl at the end
    const ease = 1 - Math.pow(1 - t, 5);

    currentRotation = startRot + (endRot - startRot) * ease;
    draw();

    if (t < 1) {
      requestAnimationFrame(animate);
    } else {
      isSpinning = false;
      currentRotation %= Math.PI * 2;
      showWinner();
    }
  }
  requestAnimationFrame(animate);
}

function showWinner() {
  const active = items.filter((i) => i.currentWeight > 0);
  const total = active.reduce((s, i) => s + i.currentWeight, 0);

  let stopAngle =
    (Math.PI * 2 - (currentRotation % (Math.PI * 2))) % (Math.PI * 2);
  let currentAngle = 0;

  for (let item of active) {
    const slice = (item.currentWeight / total) * Math.PI * 2;
    if (stopAngle >= currentAngle && stopAngle <= currentAngle + slice) {
      lastWinner = item;
      break;
    }
    currentAngle += slice;
  }

  if (lastWinner) {
    document.getElementById("winner-text").innerText = lastWinner.name;
    document.getElementById("winner-overlay").style.display = "flex";
  }
}

function confirmWin() {
  const idx = items.findIndex((i) => i.id === lastWinner.id);
  if (idx !== -1) {
    items[idx].currentWeight = Math.max(0, items[idx].currentWeight - 1);
    save();
  }
  document.getElementById("winner-overlay").style.display = "none";
  updateUI();
}
