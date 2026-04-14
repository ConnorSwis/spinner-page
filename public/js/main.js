/* ── Constants ──────────────────────────────────────── */
const COLORS = [
  '#f03e3e','#f76707','#f59f00','#2f9e44',
  '#1971c2','#7048e8','#e64980','#0ca678',
  '#1098ad','#d6336c','#e67700','#5c7cfa',
];

const CX = 185, CY = 185, R = 175;
const LS_SPINNERS    = 'spinwheel_spinners';
const LS_ACTIVE_ID   = 'spinwheel_activeId';
const LS_AUTODISABLE = 'spinwheel_autoDisable';

/* ── Helpers ────────────────────────────────────────── */
function uid() {
  return Math.random().toString(36).slice(2, 9);
}

function makeSpinner(name) {
  return { id: uid(), name: name, items: [], rotation: 0 };
}

/* ── State ──────────────────────────────────────────── */
let spinners       = [makeSpinner('Spinner 1')];
let activeSpinnerId = spinners[0].id;
let autoDisable    = false;
let spinning       = false;
let pendingWinnerIdx = -1;

function currentSpinner() {
  return spinners.find(function(s) { return s.id === activeSpinnerId; });
}

/* ── DOM refs ───────────────────────────────────────── */
const canvas            = document.getElementById('wheelCanvas');
const ctx               = canvas.getContext('2d');
const spinBtn           = document.getElementById('spinBtn');
const addBtn            = document.getElementById('addBtn');
const choiceInput       = document.getElementById('choiceInput');
const itemList          = document.getElementById('itemList');
const countPill         = document.getElementById('countPill');
const overlay           = document.getElementById('overlay');
const modalWinner       = document.getElementById('modalWinner');
const modalClose        = document.getElementById('modalClose');
const autoDisableToggle = document.getElementById('autoDisableToggle');
const csvInput          = document.getElementById('csvInput');
const importBtn         = document.getElementById('importBtn');
const csvError          = document.getElementById('csvError');
const spinnerTabs       = document.getElementById('spinnerTabs');
const addSpinnerBtn     = document.getElementById('addSpinnerBtn');

/* ── localStorage ───────────────────────────────────── */
function saveState() {
  try {
    localStorage.setItem(LS_SPINNERS,    JSON.stringify(spinners));
    localStorage.setItem(LS_ACTIVE_ID,   activeSpinnerId);
    localStorage.setItem(LS_AUTODISABLE, autoDisable ? 'true' : 'false');
  } catch (e) {}
}

function loadState() {
  try {
    var raw = localStorage.getItem(LS_SPINNERS);
    if (raw) {
      var parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        spinners = parsed.map(function(s) {
          return {
            id:       s.id || uid(),
            name:     (typeof s.name === 'string' && s.name) ? s.name : 'Spinner',
            rotation: typeof s.rotation === 'number' ? s.rotation : 0,
            items:    Array.isArray(s.items) ? s.items.filter(function(x) {
              return x && typeof x.text === 'string' && x.text.length > 0;
            }).map(function(x) {
              return { text: x.text, disabled: x.disabled === true, weight: x.weight > 0 ? x.weight : 1 };
            }) : [],
          };
        });
      }
    } else {
      // Migrate from old single-spinner format
      var oldItems = localStorage.getItem('spinwheel_items');
      if (oldItems) {
        var oldParsed = JSON.parse(oldItems);
        if (Array.isArray(oldParsed)) {
          spinners[0].items = oldParsed.filter(function(x) {
            return x && typeof x.text === 'string' && x.text.length > 0;
          }).map(function(x) {
            return { text: x.text, disabled: x.disabled === true, weight: 1 };
          });
        }
      }
    }

    var savedId = localStorage.getItem(LS_ACTIVE_ID);
    if (savedId && spinners.find(function(s) { return s.id === savedId; })) {
      activeSpinnerId = savedId;
    } else {
      activeSpinnerId = spinners[0].id;
    }

    autoDisable = localStorage.getItem(LS_AUTODISABLE) === 'true';
  } catch (e) {}
}

/* ── Active items ───────────────────────────────────── */
function activeItems() {
  return currentSpinner().items.filter(function(item) { return !item.disabled; });
}

/* ── Weighted arc sizes ─────────────────────────────── */
function arcSizes(active) {
  var total = active.reduce(function(s, item) { return s + item.weight; }, 0);
  return active.map(function(item) { return (item.weight / total) * 2 * Math.PI; });
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
    ctx.fillText(currentSpinner().items.length === 0 ? 'Add choices to begin' : 'No active choices', CX, CY);
    return;
  }

  var arcs = arcSizes(active);
  var a0   = currentSpinner().rotation;
  var items = currentSpinner().items;

  for (var i = 0; i < n; i++) {
    var sliceArc = arcs[i];
    var a1       = a0 + sliceArc;
    var colorIdx = items.indexOf(active[i]);

    ctx.beginPath();
    ctx.moveTo(CX, CY);
    ctx.arc(CX, CY, R, a0, a1);
    ctx.closePath();
    ctx.fillStyle = COLORS[colorIdx % COLORS.length];
    ctx.fill();
    ctx.strokeStyle = 'white';
    ctx.lineWidth = 2.5;
    ctx.stroke();

    if (sliceArc > 0.12) {
      ctx.save();
      ctx.translate(CX, CY);
      ctx.rotate(a0 + sliceArc / 2);
      ctx.textAlign    = 'right';
      ctx.textBaseline = 'middle';
      ctx.fillStyle    = 'white';
      ctx.shadowColor  = 'rgba(0,0,0,0.35)';
      ctx.shadowBlur   = 4;

      var fontSize = Math.max(10, Math.min(15, Math.floor(260 / n)));
      ctx.font = 'bold ' + fontSize + 'px Nunito, sans-serif';

      var maxW  = R * 0.7;
      var label = active[i].text;
      while (label.length > 1 && ctx.measureText(label).width > maxW) {
        label = label.slice(0, -1);
      }
      if (label !== active[i].text) label = label.trimEnd() + '\u2026';

      ctx.fillText(label, R * 0.9, 0);
      ctx.restore();
    }

    a0 = a1;
  }

  ctx.beginPath();
  ctx.arc(CX, CY, 14, 0, Math.PI * 2);
  ctx.fillStyle   = 'white';
  ctx.shadowColor = 'transparent';
  ctx.fill();
  ctx.strokeStyle = '#ddd';
  ctx.lineWidth   = 2;
  ctx.stroke();
}

/* ── Spinner tab management ─────────────────────────── */
function refreshTabs() {
  spinnerTabs.innerHTML = '';

  spinners.forEach(function(spinner) {
    var tab = document.createElement('div');
    tab.className = 'spinner-tab' + (spinner.id === activeSpinnerId ? ' active' : '');

    var nameSpan = document.createElement('span');
    nameSpan.className   = 'tab-name';
    nameSpan.textContent = spinner.name;

    // Double-click to rename inline
    nameSpan.addEventListener('dblclick', function(e) {
      e.stopPropagation();
      var input = document.createElement('input');
      input.className = 'tab-name-input';
      input.value     = spinner.name;
      tab.replaceChild(input, nameSpan);
      input.focus();
      input.select();

      function commit() {
        spinner.name         = input.value.trim() || spinner.name;
        nameSpan.textContent = spinner.name;
        if (tab.contains(input)) tab.replaceChild(nameSpan, input);
        saveState();
      }
      input.addEventListener('blur', commit);
      input.addEventListener('keydown', function(e) {
        if (e.key === 'Enter')  { input.blur(); }
        if (e.key === 'Escape') { input.value = spinner.name; input.blur(); }
      });
    });

    tab.appendChild(nameSpan);

    if (spinners.length > 1) {
      var del = document.createElement('button');
      del.className   = 'tab-del';
      del.textContent = '\u00d7';
      del.title       = 'Delete spinner';
      (function(id) {
        del.addEventListener('click', function(e) {
          e.stopPropagation();
          deleteSpinner(id);
        });
      })(spinner.id);
      tab.appendChild(del);
    }

    (function(id) {
      tab.addEventListener('click', function() {
        if (id !== activeSpinnerId) switchSpinner(id);
      });
    })(spinner.id);

    spinnerTabs.appendChild(tab);
  });
}

function switchSpinner(id) {
  if (spinning) return;
  activeSpinnerId  = id;
  pendingWinnerIdx = -1;
  saveState();
  refreshTabs();
  refreshList();
  draw();
}

function addSpinner() {
  var n      = spinners.length + 1;
  var s      = makeSpinner('Spinner ' + n);
  spinners.push(s);
  activeSpinnerId = s.id;
  saveState();
  refreshTabs();
  refreshList();
  draw();
}

function deleteSpinner(id) {
  if (spinners.length <= 1) return;
  var idx = spinners.findIndex(function(s) { return s.id === id; });
  spinners.splice(idx, 1);
  if (activeSpinnerId === id) {
    activeSpinnerId = spinners[Math.min(idx, spinners.length - 1)].id;
  }
  saveState();
  refreshTabs();
  refreshList();
  draw();
}

/* ── Rebuild list DOM ───────────────────────────────── */
function refreshList() {
  itemList.innerHTML = '';
  var items = currentSpinner().items;
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
    row.title     = item.disabled ? 'Click to re-enable' : 'Click to disable';

    var dot = document.createElement('span');
    dot.className        = 'item-dot';
    dot.style.background = COLORS[i % COLORS.length];

    var name = document.createElement('span');
    name.className   = 'item-name';
    name.textContent = item.text;

    row.appendChild(dot);
    row.appendChild(name);

    if (item.weight > 1) {
      var badge = document.createElement('span');
      badge.className   = 'weight-badge';
      badge.textContent = '\u00d7' + item.weight;
      row.appendChild(badge);
    }

    var del = document.createElement('button');
    del.className   = 'del-btn';
    del.textContent = '\u2715';
    del.title       = 'Remove';
    (function(idx) {
      del.addEventListener('click', function(e) {
        e.stopPropagation();
        currentSpinner().items.splice(idx, 1);
        saveState();
        refreshList();
        draw();
      });
    })(i);

    (function(idx) {
      row.addEventListener('click', function() {
        currentSpinner().items[idx].disabled = !currentSpinner().items[idx].disabled;
        saveState();
        refreshList();
        draw();
      });
    })(i);

    row.appendChild(del);
    itemList.appendChild(row);
  });

  spinBtn.disabled = activeItems().length < 2;
}

/* ── Add item ───────────────────────────────────────── */
function addItem() {
  var val = choiceInput.value.trim();
  if (val === '') return;
  currentSpinner().items.push({ text: val, disabled: false, weight: 1 });
  choiceInput.value = '';
  choiceInput.focus();
  saveState();
  refreshList();
  draw();
}

/* ── Import CSV ─────────────────────────────────────── */
function importCSV() {
  var raw = csvInput.value.trim();
  if (!raw) return;

  var lines    = raw.split(/\r?\n/);
  var newItems = [];
  var errors   = [];

  lines.forEach(function(line, i) {
    line = line.trim();
    if (!line) return;

    var lastComma = line.lastIndexOf(',');
    if (lastComma === -1) { errors.push('Line ' + (i + 1) + ': missing weight'); return; }

    var name      = line.slice(0, lastComma).trim();
    var weightStr = line.slice(lastComma + 1).trim();
    var weight    = parseFloat(weightStr);

    if (!name)                        { errors.push('Line ' + (i + 1) + ': empty name'); return; }
    if (isNaN(weight) || weight <= 0) { errors.push('Line ' + (i + 1) + ': invalid weight "' + weightStr + '"'); return; }

    newItems.push({ text: name, disabled: false, weight: weight });
  });

  if (errors.length > 0) {
    csvError.textContent = errors.join('\n');
    csvError.hidden = false;
    return;
  }
  if (newItems.length === 0) return;

  csvError.hidden = true;
  currentSpinner().items = newItems;
  csvInput.value = '';
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
  var startRot  = currentSpinner().rotation;
  var duration  = 4500;
  var t0        = performance.now();
  var spinnerId = activeSpinnerId;

  function frame(now) {
    // If the user switched spinners mid-spin, abort
    if (activeSpinnerId !== spinnerId) { spinning = false; spinBtn.disabled = false; return; }

    var elapsed  = now - t0;
    var progress = Math.min(elapsed / duration, 1);
    var eased    = 1 - Math.pow(1 - progress, 3);

    currentSpinner().rotation = startRot + totalSpin * eased;
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
  var arcs   = arcSizes(active);
  var rot    = currentSpinner().rotation;

  var ptr        = ((-Math.PI / 2 - rot) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI);
  var cumulative = 0;
  var activeIndex = active.length - 1;

  for (var i = 0; i < arcs.length; i++) {
    cumulative += arcs[i];
    if (ptr < cumulative) { activeIndex = i; break; }
  }

  var winnerItem   = active[activeIndex];
  pendingWinnerIdx = currentSpinner().items.indexOf(winnerItem);

  modalWinner.textContent = winnerItem.text;
  overlay.classList.add('show');
}

function closeModal() {
  overlay.classList.remove('show');

  if (autoDisable && pendingWinnerIdx >= 0) {
    currentSpinner().items[pendingWinnerIdx].disabled = true;
    saveState();
    refreshList();
    draw();
  }
  pendingWinnerIdx = -1;
}

/* ── Event listeners ────────────────────────────────── */
addBtn.addEventListener('click', addItem);
choiceInput.addEventListener('keydown', function(e) { if (e.key === 'Enter') addItem(); });
importBtn.addEventListener('click', importCSV);
spinBtn.addEventListener('click', spin);
modalClose.addEventListener('click', closeModal);
overlay.addEventListener('click', function(e) { if (e.target === overlay) closeModal(); });
autoDisableToggle.addEventListener('change', function() { autoDisable = autoDisableToggle.checked; saveState(); });
addSpinnerBtn.addEventListener('click', addSpinner);
const csvToggle = document.getElementById('csvToggle');
const csvContent = document.getElementById('csvContent');
const csvCard = csvToggle.closest('.card');

csvToggle.addEventListener('click', () => {
  const isCollapsed = csvContent.classList.toggle('collapsed');
  csvCard.classList.toggle('open', !isCollapsed);
});

/* ── Init ───────────────────────────────────────────── */
loadState();
autoDisableToggle.checked = autoDisable;
refreshTabs();
refreshList();
draw();
