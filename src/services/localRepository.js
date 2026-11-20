import { fromISO, toISO } from "../utils/date.js";

export const STORAGE_KEY = "zhiqi-react-state-v1";
export const MAX_HISTORY_RECORDS = 500;
export const MAX_DAILY_RECORDS = 2000;
export const MAX_BACKUP_BYTES = 2 * 1024 * 1024;

export class StateValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = "StateValidationError";
  }
}

function fail(message) {
  throw new StateValidationError(message);
}

function isValidISODate(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = fromISO(value);
  return !Number.isNaN(date.getTime()) && toISO(date) === value;
}

function validateSettings(settings) {
  if (settings === undefined) return { periodReminder: true, discreetNotifications: true };
  if (!settings || typeof settings !== "object" || Array.isArray(settings)) fail("设置格式无效");
  return {
    periodReminder: typeof settings.periodReminder === "boolean" ? settings.periodReminder : true,
    discreetNotifications: typeof settings.discreetNotifications === "boolean" ? settings.discreetNotifications : true
  };
}

function validateLogs(logs) {
  if (logs === undefined) return {};
  if (!logs || typeof logs !== "object" || Array.isArray(logs)) fail("身体记录格式无效");
  const entries = Object.entries(logs);
  if (entries.length > MAX_DAILY_RECORDS) fail(`身体记录超过 ${MAX_DAILY_RECORDS} 条上限`);
  return Object.fromEntries(entries.map(([date, log]) => {
    if (!isValidISODate(date)) fail("身体记录包含无效日期");
    if (!log || typeof log !== "object" || Array.isArray(log)) fail("身体记录内容无效");
    const symptoms = log.symptoms === undefined ? [] : log.symptoms;
    if (!Array.isArray(symptoms) || symptoms.length > 20 || symptoms.some((item) => typeof item !== "string" || item.length > 30)) fail("症状记录格式无效或超过上限");
    if (!["", "light", "medium", "heavy"].includes(log.flow || "")) fail("经量记录格式无效");
    if (log.note !== undefined && (typeof log.note !== "string" || log.note.length > 300)) fail("备注格式无效或超过 300 字");
    return [date, { symptoms: [...symptoms], flow: log.flow || "", note: log.note || "" }];
  }));
}

export function validateState(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) fail("记录整体格式无效");
  if (!isValidISODate(input.lastPeriodStart)) fail("最近经期开始日期无效");
  if (!Array.isArray(input.historyStarts) || input.historyStarts.length === 0) fail("经期历史不能为空");
  if (input.historyStarts.length > MAX_HISTORY_RECORDS) fail(`经期历史超过 ${MAX_HISTORY_RECORDS} 条上限`);
  if (!input.historyStarts.every(isValidISODate)) fail("经期历史包含无效日期");
  const historyStarts = [...new Set(input.historyStarts)].sort();
  if (historyStarts[historyStarts.length - 1] !== input.lastPeriodStart) fail("最近经期与历史记录不一致");
  if (input.periodLength !== undefined && (!Number.isInteger(input.periodLength) || input.periodLength < 1 || input.periodLength > 30)) fail("经期长度无效");
  if (input.typicalCycle !== undefined && (!Number.isInteger(input.typicalCycle) || input.typicalCycle < 15 || input.typicalCycle > 120)) fail("平均周期间隔无效");
  const cycles = input.cycles === undefined ? [] : input.cycles;
  if (!Array.isArray(cycles) || cycles.length > MAX_HISTORY_RECORDS || cycles.some((value) => !Number.isInteger(value) || value < 15 || value > 120)) fail("周期间隔记录无效");
  return {
    onboarded: true,
    lastPeriodStart: input.lastPeriodStart,
    periodLength: input.periodLength || 5,
    typicalCycle: input.typicalCycle || 30,
    cycles: [...cycles],
    historyStarts,
    logs: validateLogs(input.logs),
    settings: validateSettings(input.settings)
  };
}

export function loadState() {
  let raw;
  try {
    raw = localStorage.getItem(STORAGE_KEY);
  } catch {
    throw new Error("无法访问浏览器本地存储，请检查隐私模式或浏览器设置");
  }
  if (!raw) return null;
  try {
    return validateState(JSON.parse(raw));
  } catch {
    throw new Error("本机记录无法读取：数据格式无效或已损坏。旧记录不会被自动覆盖");
  }
}

export function saveState(state) {
  try {
    const validated = validateState(state);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(validated));
  } catch (error) {
    if (error instanceof StateValidationError) throw error;
    throw new Error("保存失败：浏览器存储不可用或空间不足，请先导出备份");
  }
}

export function clearState() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    throw new Error("无法清除本机记录，请检查浏览器存储权限");
  }
}
