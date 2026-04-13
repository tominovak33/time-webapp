const TIME_API = 'https://time.now/developer/api/timezone/UTC';
const DRIFT_THRESHOLD_MS = 10_000;

let timeWarning = null;
let timeDriftMs = null;

async function checkTimeDrift() {
  const browserTime = Date.now();

  try {
    const response = await fetch(TIME_API);
    const data = await response.json();
    const serverTime = data.unixtime * 1000;
    const drift = serverTime - browserTime; // signed: positive = browser is behind

    timeDriftMs = drift;
    console.log(`[time-sync] browser vs ${TIME_API}: ${drift > 0 ? '+' : ''}${drift}ms (${(drift / 1000).toFixed(2)}s)`);

    if (Math.abs(drift) > DRIFT_THRESHOLD_MS) {
      timeWarning = `⚠️ System clock may be inaccurate (${Math.round(Math.abs(drift) / 1000)}s off)`;
      console.warn(timeWarning);
    } else {
      timeWarning = null;
    }
  } catch (err) {
    // API failed — silently continue using browser time
    console.warn('Time sync check failed:', err);
  }
}

export function getTime() {
  return new Date();
}

export function getTimeWarning() {
  return timeWarning;
}

export function getTimeDrift() {
  return timeDriftMs;
}

export { checkTimeDrift };

// Run check on load, does not block anything
checkTimeDrift();
