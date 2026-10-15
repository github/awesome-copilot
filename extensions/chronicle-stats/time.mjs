const dateFormatters = new Map();
const hourFormatters = new Map();

function dateFormatter(zone) {
    if (!dateFormatters.has(zone)) {
        dateFormatters.set(zone, new Intl.DateTimeFormat("en", {
            timeZone: zone, year: "numeric", month: "2-digit", day: "2-digit",
        }));
    }
    return dateFormatters.get(zone);
}

export function timeZone() {
    const zone = process.env.CHRONICLE_TIME_ZONE ||
        Intl.DateTimeFormat().resolvedOptions().timeZone;
    dateFormatter(zone);
    return zone;
}

function timestamp(value) {
    if (typeof value !== "string" || !value.trim()) return new Date(NaN);
    // SQLite's unzoned timestamps are UTC, not the viewer's local time.
    const normalized = value.trim().replace(" ", "T");
    return new Date(/[zZ]$|[+-]\d{2}:\d{2}$/.test(normalized)
        ? normalized : `${normalized}Z`);
}

export function calendarDate(value = new Date(), zone = timeZone()) {
    const date = value instanceof Date ? value : timestamp(value);
    if (!Number.isFinite(date.getTime())) return null;
    const parts = dateFormatter(zone).formatToParts(date);
    const fields = Object.fromEntries(parts.map(part => [part.type, part.value]));
    return `${fields.year}-${fields.month}-${fields.day}`;
}

export function calendarHour(value, zone = timeZone()) {
    const date = timestamp(value);
    if (!Number.isFinite(date.getTime())) return null;
    if (!hourFormatters.has(zone)) {
        hourFormatters.set(zone, new Intl.DateTimeFormat("en", {
            timeZone: zone, hour: "numeric", hourCycle: "h23",
        }));
    }
    return Number(hourFormatters.get(zone).format(date));
}

export function shiftDate(date, days) {
    const value = new Date(`${date}T12:00:00Z`);
    value.setUTCDate(value.getUTCDate() + days);
    return value.toISOString().slice(0, 10);
}

export function validDate(date) {
    return typeof date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(date) &&
        Number.isFinite(Date.parse(`${date}T12:00:00Z`)) &&
        new Date(`${date}T12:00:00Z`).toISOString().slice(0, 10) === date;
}

export function calendarDayWindow(date, zone = timeZone()) {
    if (!validDate(date)) throw new Error("A valid calendar date is required.");
    function boundary(target) {
        const midnight = Date.parse(`${target}T00:00:00Z`);
        let low = midnight - 48 * 60 * 60 * 1000;
        let high = midnight + 48 * 60 * 60 * 1000;
        while (high - low > 1) {
            const middle = Math.floor((low + high) / 2);
            if (calendarDate(new Date(middle), zone) < target) low = middle;
            else high = middle;
        }
        return new Date(high).toISOString();
    }
    return { start: boundary(date), endExclusive: boundary(shiftDate(date, 1)) };
}
