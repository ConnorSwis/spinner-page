/* ── Constants ──────────────────────────────────────── */
const COLORS = [
  '#f03e3e','#f76707','#f59f00','#2f9e44',
  '#1971c2','#7048e8','#e64980','#0ca678',
  '#1098ad','#d6336c','#e67700','#5c7cfa',
];

const CX = 185, CY = 185, R = 175;
const LS_ITEMS       = 'spinwheel_items';
const LS_AUTODISABLE = 'spinwheel_autoDisable';

/* ── State ──────────────────────────────────────────── */
// items: array of { text: string, disabled: boolean }
let items       = [];
let autoDisable = false;
let rotation    = 0;
let spinning    = false;
let pendingWinnerIdx = -1; // index into items[] of the winner

/* ── DOM refs ───────────────────────────────────────── */
const canvas           = document.getElementById('wheelCanvas');
const ctx              = canvas.getContext('2d');
const spinBtn          = document.getElementById('spinBtn');
const addBtn           = document.getElementById('addBtn');
const choiceInput      = document.getElementById('choiceInput');
const itemList         = document.getElementById('itemList');
const countPill        = document.getElementById('countPill');
const overlay          = document.getElementById('overlay');
const modalWinner      = document.getElementById('modalWinner');
const modalClose       = document.getElementById('modalClose');
const autoDisableToggle = document.getElementById('autoDisableToggle');

/* ── localStorage helpers ───────────────────────────── */
function saveState() {
  try {
    localStorage.setItem(LS_ITEMS, JSON.stringify(items));
    localStorage.setItem(LS_AUTODISABLE, autoDisable ? 'true' : 'false');
  } catch (e) { /* storage unavailable — silently ignore */ }
}

function loadState() {
  try {
    var raw = localStorage.getItem(LS_ITEMS);
    if (raw) {
      var parsed = JSON.parse(raw);
      // Validate: must be array of objects with text string
      if (Array.isArray(parsed)) {
        items = parsed.filter(function(x) {
          return x && typeof x.text === 'string' && x.text.length > 0;
        }).map(function(x) {
          return { text: x.text, disabled: x.disabled === true };
        });
      }
    }
    autoDisable = localStorage.getItem(LS_AUTODISABLE) === 'true';
  } catch (e) { /* storage unavailable */ }
}

/* ── Active items (not disabled) ────────────────────── */
function activeItems() {
  return items.filter(function(item) { return !item.disabled; });
}

/* ── Draw wheel ─────────────────────────────────────── */
function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  var active = activeItems();
  var n = active.length;

  if (n === 0) {
    ctx.beginPath();
    ctx.arc(CX, CY, R, 0, Math.PI * 2);
    ctx.fillStyle = '#ede9f8';
    ctx.fill();
    ctx.fillStyle = '#aaa';
    ctx.font = 'bold 14px Nunito, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(items.length === 0 ? 'Add choices to begin' : 'No active choices', CX, CY);
    return;
  }

  var arc = (2 * Math.PI) / n;

  for (var i = 0; i < n; i++) {
    var a0 = rotation + i * arc;
    var a1 = a0 + arc;
    // Use the item's original index in items[] for a stable color
    var colorIdx = items.indexOf(active[i]);

    // Slice
    ctx.beginPath();
    ctx.moveTo(CX, CY);
    ctx.arc(CX, CY, R, a0, a1);
    ctx.closePath();
    ctx.fillStyle = COLORS[colorIdx % COLORS.length];
    ctx.fill();
    ctx.strokeStyle = 'white';
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // Label
    ctx.save();
    ctx.translate(CX, CY);
    ctx.rotate(a0 + arc / 2);
    ctx.textAlign    = 'right';
    ctx.textBaseline = 'middle';
    ctx.fillStyle    = 'white';
    ctx.shadowColor  = 'rgba(0,0,0,0.35)';
    ctx.shadowBlur   = 4;

    var fontSize = Math.max(10, Math.min(15, Math.floor(260 / n)));
    ctx.font = 'bold ' + fontSize + 'px Nunito, sans-serif';

    var maxW = R * 0.7;
    var label = active[i].text;
    while (label.length > 1 && ctx.measureText(label).width > maxW) {
      label = label.slice(0, -1);
    }
    if (label !== active[i].text) label = label.trimEnd() + '\u2026';

    ctx.fillText(label, R * 0.9, 0);
    ctx.restore();
  }

  // Center cap
  ctx.beginPath();
  ctx.arc(CX, CY, 14, 0, Math.PI * 2);
  ctx.fillStyle   = 'white';
  ctx.shadowColor = 'transparent';
  ctx.fill();
  ctx.strokeStyle = '#ddd';
  ctx.lineWidth   = 2;
  ctx.stroke();
}

/* ── Rebuild list DOM ───────────────────────────────── */
function refreshList() {
  itemList.innerHTML = '';
  countPill.textContent = items.length;

  if (items.length === 0) {
    var p = document.createElement('p');
    p.className   = 'empty-msg';
    p.textContent = 'No choices yet. Add at least 2 to spin!';
    itemList.appendChild(p);
    spinBtn.disabled = true;
    return;
  }

  items.forEach(function(item, i) {
    var row = document.createElement('div');
    row.className = 'item-row' + (item.disabled ? ' item-row--disabled' : '');
    row.title = item.disabled ? 'Click to re-enable' : 'Click to disable';

    var dot = document.createElement('span');
    dot.className        = 'item-dot';
    dot.style.background = COLORS[i % COLORS.length];

    var name = document.createElement('span');
    name.className   = 'item-name';
    name.textContent = item.text;

    // Delete button
    var del = document.createElement('button');
    del.className   = 'del-btn';
    del.textContent = '\u2715';
    del.title       = 'Remove';
    (function(idx) {
      del.addEventListener('click', function(e) {
        e.stopPropagation(); // don't also fire the row toggle
        items.splice(idx, 1);
        saveState();
        refreshList();
        draw();
      });
    })(i);

    // Clicking the row itself (not the delete button) toggles disabled
    (function(idx) {
      row.addEventListener('click', function() {
        items[idx].disabled = !items[idx].disabled;
        saveState();
        refreshList();
        draw();
      });
    })(i);

    row.appendChild(dot);
    row.appendChild(name);
    row.appendChild(del);
    itemList.appendChild(row);
  });

  spinBtn.disabled = activeItems().length < 2;
}

/* ── Add item ───────────────────────────────────────── */
function addItem() {
  var val = choiceInput.value.trim();
  if (val === '') return;
  items.push({ text: val, disabled: false });
  choiceInput.value = '';
  choiceInput.focus();
  saveState();
  refreshList();
  draw();
}

/* ── Spin ───────────────────────────────────────────── */
function spin() {
  if (spinning || activeItems().length < 2) return;
  spinning = true;
  spinBtn.disabled = true;

  var totalSpin = ((6 + Math.random() * 4) * Math.PI * 2) + (Math.random() * Math.PI * 2);
  var startRot  = rotation;
  var duration  = 4500;
  var t0        = performance.now();

  function frame(now) {
    var elapsed  = now - t0;
    var progress = elapsed / duration;
    if (progress >= 1) progress = 1;

    var eased = 1 - Math.pow(1 - progress, 3);
    rotation = startRot + totalSpin * eased;
    draw();

    if (progress < 1) {
      requestAnimationFrame(frame);
    } else {
      spinning = false;
      spinBtn.disabled = false;
      resolveWinner();
    }
  }

  requestAnimationFrame(frame);
}

/* ── Winner detection ───────────────────────────────── */
function resolveWinner() {
  var active = activeItems();
  var n      = active.length;
  var arc    = (2 * Math.PI) / n;

  // Pointer at top = -PI/2. Normalise into the wheel's frame.
  var ptr          = ((-Math.PI / 2 - rotation) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI);
  var activeIndex  = Math.floor(ptr / arc) % n;
  var winnerItem   = active[activeIndex];

  // Remember the index in the full items array so we can disable it
  pendingWinnerIdx = items.indexOf(winnerItem);

  modalWinner.textContent = winnerItem.text;
  overlay.classList.add('show');
}

function closeModal() {
  overlay.classList.remove('show');

  // Apply auto-disable after the modal closes
  if (autoDisable && pendingWinnerIdx >= 0) {
    items[pendingWinnerIdx].disabled = true;
    saveState();
    refreshList();
    draw();
  }
  pendingWinnerIdx = -1;
}

/* ── Event listeners ────────────────────────────────── */
addBtn.addEventListener('click', addItem);

choiceInput.addEventListener('keydown', function(e) {
  if (e.key === 'Enter') addItem();
});

spinBtn.addEventListener('click', spin);
modalClose.addEventListener('click', closeModal);
overlay.addEventListener('click', function(e) {
  if (e.target === overlay) closeModal();
});

autoDisableToggle.addEventListener('change', function() {
  autoDisable = autoDisableToggle.checked;
  saveState();
});

/* ── Init ───────────────────────────────────────────── */
loadState();
autoDisableToggle.checked = autoDisable;
refreshList();
draw();
