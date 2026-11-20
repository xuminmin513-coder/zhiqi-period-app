export const DAY_MS = 86400000;

export function pad(value) {
  return String(value).padStart(2, "0");
}

export function toISO(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function fromISO(value) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

export function getToday() {
  const date = new Date();
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function addDays(value, days) {
  const date = typeof value === "string" ? fromISO(value) : new Date(value);
  date.setDate(date.getDate() + days);
  return date;
}

export function diffDays(later, earlier) {
  return Math.round((fromISO(later) - fromISO(earlier)) / DAY_MS);
}

export function shortDate(value) {
  const date = fromISO(value);
  return `${date.getMonth() + 1}月${date.getDate()}日`;
}

export function fullDate(value) {
  const date = fromISO(value);
  return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`;
}

export function monthLabel(date) {
  return `${date.getFullYear()}年 ${date.getMonth() + 1}月`;
}

export function escapeHtml(value = "") {
  return String(value).replace(/[&<>'"]/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "'": "&#39;",
    '"': "&quot;"
  })[char]);
}
