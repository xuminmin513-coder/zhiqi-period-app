import { fromISO, toISO } from "../utils/date.js";
import { createEmptyPlanner } from "../utils/planner.js";

export const STORAGE_KEY = "zhiqi-react-state-v1";
export const LEGACY_BACKUP_KEY = "zhiqi-react-state-v1-pre-v2";
export const CURRENT_STATE_VERSION = 2;
export const MAX_HISTORY_RECORDS = 500;
export const MAX_DAILY_RECORDS = 2000;
export const MAX_BACKUP_BYTES = 2 * 1024 * 1024;
export const MAX_PLANNER_ITEMS = 1000;
export const MAX_PLANNER_GOALS = 100;
export const MAX_COMPLETION_DAYS = 3660;
export const MAX_COMPLETIONS_PER_DAY = 200;
export const MAX_NICKNAME_LENGTH = 12;
export const STORAGE_WARN_BYTES = 3 * 1024 * 1024;
export const STORAGE_LIMIT_BYTES = 5 * 1024 * 1024;

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

function isValidTime(value) {
  return typeof value === "string" && /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value);
}

function isValidId(value) {
  return typeof value === "string" && value.trim().length >= 1 && value.length <= 64;
}

function validateSettings(settings) {
  if (settings === undefined) {
    return { periodReminder: true, discreetNotifications: true, nickname: "" };
  }
  if (!settings || typeof settings !== "object" || Array.isArray(settings)) fail("设置格式无效");
  let nickname = "";
  if (settings.nickname !== undefined) {
    if (typeof settings.nickname !== "string") fail("昵称格式无效");
    nickname = settings.nickname.trim();
    if (nickname.length > MAX_NICKNAME_LENGTH) fail(`昵称不能超过 ${MAX_NICKNAME_LENGTH} 个字`);
  }
  return {
    periodReminder: typeof settings.periodReminder === "boolean" ? settings.periodReminder : true,
    discreetNotifications: typeof settings.discreetNotifications === "boolean" ? settings.discreetNotifications : true,
    nickname
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

function validateRepeat(repeat) {
  if (!repeat || typeof repeat !== "object" || Array.isArray(repeat)) fail("重复规则格式无效");
  if (repeat.type === "none") return { type: "none" };
  if (repeat.type === "daily") return { type: "daily" };
  if (repeat.type === "weekly") {
    if (!Array.isArray(repeat.weekdays) || repeat.weekdays.length === 0 || repeat.weekdays.length > 7) {
      fail("每周重复至少选择一天");
    }
    const weekdays = [...new Set(repeat.weekdays)];
    if (weekdays.some((day) => !Number.isInteger(day) || day < 1 || day > 7)) fail("每周重复星期格式无效");
    weekdays.sort((a, b) => a - b);
    return { type: "weekly", weekdays };
  }
  if (repeat.type === "monthly") {
    if (!Number.isInteger(repeat.day) || repeat.day < 1 || repeat.day > 31) fail("每月重复日期必须在 1 到 31 日之间");
    return { type: "monthly", day: repeat.day };
  }
  fail("不支持的重复规则类型");
}

function validateGoals(goals) {
  if (goals === undefined) return [];
  if (!Array.isArray(goals)) fail("目标列表格式无效");
  if (goals.length > MAX_PLANNER_GOALS) fail(`目标数量超过 ${MAX_PLANNER_GOALS} 个上限`);
  const seenIds = new Set();
  return goals.map((goal) => {
    if (!goal || typeof goal !== "object" || Array.isArray(goal)) fail("目标内容无效");
    if (!isValidId(goal.id)) fail("目标标识无效");
    if (seenIds.has(goal.id)) fail("目标标识重复");
    seenIds.add(goal.id);
    const title = typeof goal.title === "string" ? goal.title.trim() : "";
    if (!title || title.length > 40) fail("目标标题需为 1 到 40 字");
    if (goal.deadline !== null && goal.deadline !== undefined && !isValidISODate(goal.deadline)) fail("目标截止日期无效");
    if (!["active", "done", "archived"].includes(goal.status)) fail("目标状态无效");
    if (!isValidISODate(goal.createdAt)) fail("目标创建日期无效");
    return {
      id: goal.id,
      title,
      deadline: goal.deadline || null,
      status: goal.status,
      createdAt: goal.createdAt
    };
  });
}

function validateItems(items, goalIdSet) {
  if (items === undefined) return [];
  if (!Array.isArray(items)) fail("事项列表格式无效");
  if (items.length > MAX_PLANNER_ITEMS) fail(`事项数量超过 ${MAX_PLANNER_ITEMS} 条上限`);
  const seenIds = new Set();
  return items.map((item) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) fail("事项内容无效");
    if (!isValidId(item.id)) fail("事项标识无效");
    if (seenIds.has(item.id)) fail("事项标识重复");
    seenIds.add(item.id);
    const title = typeof item.title === "string" ? item.title.trim() : "";
    if (!title || title.length > 60) fail("事项标题需为 1 到 60 字");

    const repeat = validateRepeat(item.repeat || { type: "none" });
    const isRepeating = repeat.type !== "none";
    const date = item.date ?? null;
    if (date !== null && !isValidISODate(date)) fail("事项日期无效");
    if (isRepeating && !date) fail("重复事项必须设置起始日期");

    const startTime = item.startTime ?? null;
    const endTime = item.endTime ?? null;
    if (startTime !== null && !isValidTime(startTime)) fail("开始时间格式无效");
    if (endTime !== null && !isValidTime(endTime)) fail("结束时间格式无效");
    if (endTime !== null && startTime === null) fail("设置结束时间前请先填写开始时间");
    if (startTime !== null && endTime !== null && endTime <= startTime) fail("结束时间必须晚于开始时间");

    const repeatEnd = item.repeatEnd ?? null;
    if (repeatEnd !== null && !isValidISODate(repeatEnd)) fail("重复结束日期无效");
    if (!isRepeating && repeatEnd !== null) fail("非重复事项不能设置重复结束日期");
    if (isRepeating && repeatEnd !== null && repeatEnd < date) fail("重复结束日期不能早于开始日期");

    const goalId = item.goalId ?? null;
    if (goalId !== null && (!isValidId(goalId) || !goalIdSet.has(goalId))) fail("事项关联的目标不存在");

    const note = item.note === undefined ? "" : item.note;
    if (typeof note !== "string" || note.length > 300) fail("事项备注不能超过 300 字");

    const doneAt = item.doneAt ?? null;
    if (doneAt !== null && !isValidISODate(doneAt)) fail("完成日期无效");
    if (isRepeating && doneAt !== null) fail("重复事项按日记录打卡，不使用单次完成日期");

    if (item.reminder !== undefined && item.reminder !== null) fail("当前版本暂不支持提醒字段");
    if (!isValidISODate(item.createdAt)) fail("事项创建日期无效");

    return {
      id: item.id,
      title,
      date,
      startTime,
      endTime,
      repeat,
      repeatEnd,
      goalId,
      note,
      doneAt,
      reminder: null,
      createdAt: item.createdAt
    };
  });
}

function validateCompletions(completions) {
  if (completions === undefined) return {};
  if (!completions || typeof completions !== "object" || Array.isArray(completions)) fail("打卡记录格式无效");
  const entries = Object.entries(completions);
  if (entries.length > MAX_COMPLETION_DAYS) fail(`打卡天数超过 ${MAX_COMPLETION_DAYS} 天上限`);
  const result = {};
  entries.forEach(([date, ids]) => {
    if (!isValidISODate(date)) fail("打卡记录包含无效日期");
    if (!Array.isArray(ids) || ids.length > MAX_COMPLETIONS_PER_DAY || ids.some((id) => !isValidId(id))) {
      fail("单日打卡记录格式无效或超过上限");
    }
    const unique = [...new Set(ids)];
    if (unique.length) result[date] = unique;
  });
  return result;
}

function validatePlanner(planner) {
  if (planner === undefined) return createEmptyPlanner();
  if (!planner || typeof planner !== "object" || Array.isArray(planner)) fail("计划数据格式无效");
  const goals = validateGoals(planner.goals);
  const goalIdSet = new Set(goals.map((goal) => goal.id));
  const items = validateItems(planner.items, goalIdSet);
  const completions = validateCompletions(planner.completions);
  return { items, goals, completions };
}

export function validateState(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) fail("记录整体格式无效");
  if (input.version !== undefined) {
    if (!Number.isInteger(input.version) || input.version < 1) fail("记录版本格式无效");
    if (input.version > CURRENT_STATE_VERSION) fail("数据版本高于当前应用版本，请先更新应用");
  }
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
    version: CURRENT_STATE_VERSION,
    onboarded: true,
    lastPeriodStart: input.lastPeriodStart,
    periodLength: input.periodLength || 5,
    typicalCycle: input.typicalCycle || 30,
    cycles: [...cycles],
    historyStarts,
    logs: validateLogs(input.logs),
    planner: validatePlanner(input.planner),
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
  let parsed;
  let validated;
  try {
    parsed = JSON.parse(raw);
    validated = validateState(parsed);
  } catch (error) {
    if (error instanceof StateValidationError && /更新应用/.test(error.message)) throw error;
    throw new Error("本机记录无法读取：数据格式无效或已损坏。旧记录不会被自动覆盖");
  }

  if (parsed.version === undefined) {
    try {
      if (localStorage.getItem(LEGACY_BACKUP_KEY) === null) {
        localStorage.setItem(LEGACY_BACKUP_KEY, raw);
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(validated));
    } catch {
      throw new Error("旧记录升级备份失败：浏览器存储空间不足，请先导出备份");
    }
  }
  return validated;
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
    localStorage.removeItem(LEGACY_BACKUP_KEY);
  } catch {
    throw new Error("无法清除本机记录，请检查浏览器存储权限");
  }
}

export function getStorageUsage() {
  try {
    const keys = [STORAGE_KEY, LEGACY_BACKUP_KEY];
    const bytes = keys.reduce((sum, key) => {
      const value = localStorage.getItem(key);
      return sum + (value ? value.length * 2 : 0);
    }, 0);
    return {
      bytes,
      warn: bytes >= STORAGE_WARN_BYTES,
      limitBytes: STORAGE_LIMIT_BYTES
    };
  } catch {
    return { bytes: 0, warn: false, limitBytes: STORAGE_LIMIT_BYTES };
  }
}
