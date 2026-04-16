import { loadData } from './tracking.js';

const DAY_MS = 24 * 60 * 60 * 1000;

function parseNum(v) {
  return parseFloat(String(v).replace(/[^0-9.\-+]/g, '')) || 0;
}

function formatShortDate(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function formatTime(iso) {
  const d = new Date(iso);
  return d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
}

export function openChart(label, { modal, title, summary, canvas, close }) {
  const data = loadData();
  const entries = data[label];
  if (!entries || entries.length === 0) return;

  title.textContent = label;
  summary.innerHTML = buildSummary(entries);
  modal.hidden = false;

  drawChart(canvas, entries);

  const onClose = () => {
    modal.hidden = true;
    close.removeEventListener('click', onClose);
    modal.removeEventListener('click', onBackdrop);
    document.removeEventListener('keydown', onKey);
  };
  const onBackdrop = (e) => { if (e.target === modal) onClose(); };
  const onKey = (e) => { if (e.key === 'Escape') onClose(); };

  close.addEventListener('click', onClose);
  modal.addEventListener('click', onBackdrop);
  document.addEventListener('keydown', onKey);
}

function buildSummary(entries) {
  const sorted = [...entries].sort((a, b) => new Date(a.datetime) - new Date(b.datetime));
  const latest = parseNum(sorted[sorted.length - 1].value);
  const latestTime = new Date(sorted[sorted.length - 1].datetime).getTime();

  // Last 24h change: latest value minus value closest to 24h before it
  const target24 = latestTime - DAY_MS;
  let closest = sorted[0];
  let closestDist = Infinity;
  for (const e of sorted) {
    const dist = Math.abs(new Date(e.datetime).getTime() - target24);
    if (dist < closestDist) { closestDist = dist; closest = e; }
  }
  const last24 = latest - parseNum(closest.value);

  // Average 24h change: for each consecutive pair, compute the per-24h rate, then average
  let avg24 = 0;
  if (sorted.length >= 2) {
    const rates = [];
    for (let i = 1; i < sorted.length; i++) {
      const dv = parseNum(sorted[i].value) - parseNum(sorted[i - 1].value);
      const dt = new Date(sorted[i].datetime).getTime() - new Date(sorted[i - 1].datetime).getTime();
      if (dt > 0) rates.push((dv / dt) * DAY_MS);
    }
    if (rates.length > 0) avg24 = rates.reduce((s, r) => s + r, 0) / rates.length;
  }

  const fmt = (n) => (n >= 0 ? '+' : '') + n.toFixed(2).replace(/\.00$/, '');

  return `<span>Last 24h: <strong>${fmt(last24)}</strong></span>`
       + `<span>Avg/24h: <strong>${fmt(avg24)}</strong></span>`
       + `<span>Latest: <strong>${fmt(latest)}</strong></span>`;
}

function drawChart(canvas, entries) {
  const dpr = window.devicePixelRatio || 1;
  const w = canvas.parentElement.clientWidth - 48;  // modal padding
  const h = 260;
  canvas.width = w * dpr;
  canvas.height = h * dpr;
  canvas.style.width = w + 'px';
  canvas.style.height = h + 'px';

  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);
  ctx.clearRect(0, 0, w, h);

  const sorted = [...entries].sort((a, b) => new Date(a.datetime) - new Date(b.datetime));
  const vals = sorted.map(e => parseNum(e.value));

  let yMin = Math.min(0, ...vals);
  let yMax = Math.max(0, ...vals);
  if (yMin === yMax) { yMin -= 1; yMax += 1; }
  const yPad = (yMax - yMin) * 0.1;
  yMin -= yPad;
  yMax += yPad;

  const pad = { top: 20, right: 16, bottom: 44, left: 48 };
  const plotW = w - pad.left - pad.right;
  const plotH = h - pad.top - pad.bottom;

  const n = sorted.length;
  const toX = (i) => pad.left + (plotW / (n - 1 || 1)) * i;
  const toY = (v) => pad.top + plotH * (1 - (v - yMin) / (yMax - yMin));
  const zeroY = toY(0);

  // Grid lines
  ctx.strokeStyle = '#3a3a3a';
  ctx.lineWidth = 1;
  const gridSteps = 5;
  for (let i = 0; i <= gridSteps; i++) {
    const v = yMin + (yMax - yMin) * (i / gridSteps);
    const y = toY(v);
    ctx.beginPath();
    ctx.moveTo(pad.left, y);
    ctx.lineTo(w - pad.right, y);
    ctx.stroke();

    ctx.fillStyle = '#aaa';
    ctx.font = '11px system-ui, sans-serif';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    ctx.fillText(v.toFixed(1), pad.left - 6, y);
  }

  // Zero line
  ctx.strokeStyle = '#666';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(pad.left, zeroY);
  ctx.lineTo(w - pad.right, zeroY);
  ctx.stroke();

  // Line
  ctx.strokeStyle = '#7af';
  ctx.lineWidth = 2;
  ctx.beginPath();
  for (let i = 0; i < n; i++) {
    const x = toX(i);
    const y = toY(vals[i]);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();

  // Dots — colored by sign
  for (let i = 0; i < n; i++) {
    ctx.fillStyle = vals[i] >= 0 ? '#3a8' : '#c55';
    ctx.beginPath();
    ctx.arc(toX(i), toY(vals[i]), 4, 0, Math.PI * 2);
    ctx.fill();
  }

  // X-axis labels
  ctx.fillStyle = '#aaa';
  ctx.font = '10px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  const maxLabels = Math.floor(plotW / 60);
  const step = Math.max(1, Math.ceil(n / maxLabels));
  for (let i = 0; i < n; i += step) {
    const x = toX(i);
    ctx.fillText(formatShortDate(sorted[i].datetime), x, h - pad.bottom + 6);
    ctx.fillText(formatTime(sorted[i].datetime), x, h - pad.bottom + 19);
  }
}
