const STORAGE_KEY = 'tracked-data';

export function loadData() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) ?? {};
  } catch {
    return {};
  }
}

function persist(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function saveEntry(label, value) {
  const data = loadData();
  if (!data[label]) data[label] = [];
  data[label].push({ value, datetime: new Date().toISOString() });
  persist(data);
}

export function deleteEntry(label, index) {
  const data = loadData();
  if (!data[label]) return;
  data[label].splice(index, 1);
  if (data[label].length === 0) delete data[label];
  persist(data);
}

export function exportJSON() {
  const blob = new Blob([JSON.stringify(loadData(), null, 2)], { type: 'application/json' });
  downloadBlob(blob, 'tracked-data.json');
}

export function exportCSV() {
  const data = loadData();
  const rows = ['label,value,datetime'];
  for (const [label, entries] of Object.entries(data)) {
    for (const e of entries) {
      rows.push(`${csvEscape(label)},${csvEscape(e.value)},${e.datetime}`);
    }
  }
  const blob = new Blob([rows.join('\n')], { type: 'text/csv' });
  downloadBlob(blob, 'tracked-data.csv');
}

function csvEscape(str) {
  if (/[,"\n]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
  return str;
}

function downloadBlob(blob, filename) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}

export function importFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const text = reader.result;
        const merged = file.name.endsWith('.csv') ? parseCSV(text) : JSON.parse(text);
        const data = loadData();
        for (const [label, entries] of Object.entries(merged)) {
          if (!data[label]) data[label] = [];
          data[label].push(...entries);
        }
        persist(data);
        resolve();
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file);
  });
}

function parseCSV(text) {
  const lines = text.trim().split('\n');
  const data = {};
  for (let i = 1; i < lines.length; i++) {
    const cols = parseCSVLine(lines[i]);
    if (cols.length < 3) continue;
    const [label, value, datetime] = cols;
    if (!data[label]) data[label] = [];
    data[label].push({ value, datetime });
  }
  return data;
}

function parseCSVLine(line) {
  const cols = [];
  let cur = '', inQuote = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuote) {
      if (ch === '"' && line[i + 1] === '"') { cur += '"'; i++; }
      else if (ch === '"') inQuote = false;
      else cur += ch;
    } else {
      if (ch === '"') inQuote = true;
      else if (ch === ',') { cols.push(cur); cur = ''; }
      else cur += ch;
    }
  }
  cols.push(cur);
  return cols;
}

function formatDate(iso) {
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  });
}

export function renderData(containerEl) {
  const data = loadData();
  const labels = Object.keys(data);

  if (labels.length === 0) {
    containerEl.innerHTML = '';
    return;
  }

  containerEl.innerHTML = labels.map(label => {
    const entries = [...data[label]].reverse(); // newest first
    const rows = entries.map((e, i) => {
      const originalIndex = data[label].length - 1 - i;
      return `<div class="track-entry">
        <span class="track-value">${e.value}</span>
        <span class="track-date">${formatDate(e.datetime)}</span>
        <button class="track-delete" data-label="${label}" data-index="${originalIndex}" aria-label="Delete entry">&times;</button>
      </div>`;
    }).join('');

    return `<div class="track-group">
      <div class="track-label">${label}</div>
      ${rows}
    </div>`;
  }).join('');
}
