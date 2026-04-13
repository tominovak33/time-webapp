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
