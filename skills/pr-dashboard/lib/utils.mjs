export function dateToYMD(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function parseDateRange(text) {
  const now = new Date();
  const todayStr = dateToYMD(now);
  const lower = (text || '').toLowerCase();
  let match;

  if ((match = lower.match(/last\s+(\d+)\s+days?/))) {
    const n = parseInt(match[1], 10);
    const start = new Date();
    start.setDate(start.getDate() - (n - 1));
    return { start: dateToYMD(start), end: todayStr, label: `Last ${n} days` };
  }

  if ((match = lower.match(/last\s+(\d+)\s+weeks?/))) {
    const n = parseInt(match[1], 10);
    const start = new Date();
    start.setDate(start.getDate() - (n * 7 - 1));
    return { start: dateToYMD(start), end: todayStr, label: `Last ${n} weeks` };
  }

  if (lower.includes('this week')) {
    const d = new Date();
    const day = d.getDay();
    const diff = (day + 6) % 7;
    const start = new Date();
    start.setDate(start.getDate() - diff);
    return { start: dateToYMD(start), end: todayStr, label: 'This week' };
  }

  if (lower.includes('last week')) {
    const currentWeekStart = new Date();
    const day = currentWeekStart.getDay();
    const diff = (day + 6) % 7;
    currentWeekStart.setDate(currentWeekStart.getDate() - diff);

    const end = new Date(currentWeekStart);
    end.setDate(end.getDate() - 1);

    const start = new Date(end);
    start.setDate(start.getDate() - 6);

    return { start: dateToYMD(start), end: dateToYMD(end), label: 'Last week' };
  }

  if (lower.includes('this month')) {
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    return { start: dateToYMD(start), end: todayStr, label: 'This month' };
  }

  if (lower.includes('last month')) {
    const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const end = new Date(now.getFullYear(), now.getMonth(), 0);
    return { start: dateToYMD(start), end: dateToYMD(end), label: 'Last month' };
  }

  if (lower.includes('next month')) {
    const start = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 2, 0);
    return { start: dateToYMD(start), end: dateToYMD(end), label: 'Next month' };
  }

  // month-year like "february 2006" or "feb 2006"
  if ((match = lower.match(/\b(january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)\s+(\d{4})\b/))) {
    const monthStr = match[1];
    const year = parseInt(match[2], 10);
    const months = { january:0, jan:0, february:1, feb:1, march:2, mar:2, april:3, apr:3, may:4, june:5, jun:5, july:6, jul:6, august:7, aug:7, september:8, sep:8, sept:8, october:9, oct:9, november:10, nov:10, december:11, dec:11 };
    const mIdx = months[monthStr];
    if (mIdx !== undefined && !isNaN(year)) {
      const start = new Date(year, mIdx, 1);
      const end = new Date(year, mIdx + 1, 0);
      const label = `${monthStr.charAt(0).toUpperCase()}${monthStr.slice(1)} ${year}`;
      return { start: dateToYMD(start), end: dateToYMD(end), label };
    }
  }

  // explicit YYYY-MM-DD - YYYY-MM-DD or YYYY-MM-DD to YYYY-MM-DD
  if ((match = text.match(/(\d{4}-\d{2}-\d{2})(?:\s*-\s*|\s+to\s+)(\d{4}-\d{2}-\d{2})/))) {
    return { start: match[1], end: match[2], label: `${match[1]} → ${match[2]}` };
  }

  // explicit like "Apr 1 - Apr 5" or "Apr 1 to Apr 5"
  if ((match = text.match(/([A-Za-z]{3,}\s+\d{1,2}(?:,\s*\d{4})?)(?:\s*-\s*|\s+to\s+)([A-Za-z]{3,}\s+\d{1,2}(?:,\s*\d{4})?)/))) {
    const s = new Date(match[1]);
    const e = new Date(match[2]);
    if (!isNaN(s) && !isNaN(e)) {
      return { start: dateToYMD(s), end: dateToYMD(e), label: `${match[1]} → ${match[2]}` };
    }
  }

  // year-only like "2006"
  if ((match = lower.match(/\b(\d{4})\b/))) {
    const y = parseInt(match[1], 10);
    const start = new Date(y, 0, 1);
    const end = new Date(y, 11, 31);
    return { start: dateToYMD(start), end: dateToYMD(end), label: `${y}` };
  }

  // month-only like "february" or "feb" (assume current year)
  if ((match = lower.match(/\b(january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)\b/))) {
    const monthStr = match[1];
    const months = { january:0, jan:0, february:1, feb:1, march:2, mar:2, april:3, apr:3, may:4, june:5, jun:5, july:6, jul:6, august:7, aug:7, september:8, sep:8, sept:8, october:9, oct:9, november:10, nov:10, december:11, dec:11 };
    const mIdx = months[monthStr];
    if (mIdx !== undefined) {
      const start = new Date(now.getFullYear(), mIdx, 1);
      const end = new Date(now.getFullYear(), mIdx + 1, 0);
      const label = `${monthStr.charAt(0).toUpperCase()}${monthStr.slice(1)} ${now.getFullYear()}`;
      return { start: dateToYMD(start), end: dateToYMD(end), label };
    }
  }

  const start = new Date();
  start.setDate(start.getDate() - 6);
  return { start: dateToYMD(start), end: todayStr, label: 'Last 7 days' };
}
