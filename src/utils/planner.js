import { addDays, diffDays, fromISO, toISO } from "./date.js";

const MAX_STREAK_SCAN_DAYS = 3660;

export function createEmptyPlanner() {
  return { items: [], goals: [], completions: {} };
}

function makeId() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return `id-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function getIsoWeekday(dateISO) {
  const day = fromISO(dateISO).getDay();
  return day === 0 ? 7 : day;
}

export function getLastDayOfMonth(year, monthIndex) {
  return new Date(year, monthIndex + 1, 0).getDate();
}

export function occursOnDate(item, dateISO) {
  if (!item || !item.repeat || item.repeat.type === "none") {
    return item?.date === dateISO;
  }
  if (!item.date || dateISO < item.date) return false;
  if (item.repeatEnd && dateISO > item.repeatEnd) return false;
  if (item.repeat.type === "daily") return true;
  if (item.repeat.type === "weekly") {
    return Array.isArray(item.repeat.weekdays) && item.repeat.weekdays.includes(getIsoWeekday(dateISO));
  }
  if (item.repeat.type === "monthly") {
    const parsed = fromISO(dateISO);
    const effectiveDay = Math.min(item.repeat.day, getLastDayOfMonth(parsed.getFullYear(), parsed.getMonth()));
    return parsed.getDate() === effectiveDay;
  }
  return false;
}

export function isItemDoneOnDate(planner, item, dateISO) {
  if (!item) return false;
  if (!item.repeat || item.repeat.type === "none") {
    return Boolean(item.doneAt);
  }
  const dayList = planner?.completions?.[dateISO];
  return Array.isArray(dayList) && dayList.includes(item.id);
}

export function getHabitStreak(planner, item, todayISO) {
  if (!item || !item.repeat || item.repeat.type === "none" || !item.date) return 0;
  if (todayISO < item.date) return 0;
  const totalSpan = Math.min(MAX_STREAK_SCAN_DAYS, diffDays(todayISO, item.date));
  let streak = 0;
  for (let offset = 0; offset <= totalSpan; offset += 1) {
    const cursor = toISO(addDays(todayISO, -offset));
    if (!occursOnDate(item, cursor)) continue;
    const done = isItemDoneOnDate(planner, item, cursor);
    if (offset === 0 && !done) continue;
    if (done) streak += 1;
    else break;
  }
  return streak;
}

export function getHabitGrid(planner, item, todayISO, weeks = 5) {
  const weekday = getIsoWeekday(todayISO);
  const currentWeekSunday = addDays(todayISO, 7 - weekday);
  const totalCells = weeks * 7;
  const startDate = addDays(currentWeekSunday, -(totalCells - 1));
  return Array.from({ length: totalCells }, (_, index) => {
    const dateISO = toISO(addDays(startDate, index));
    const isFuture = dateISO > todayISO;
    const scheduled = occursOnDate(item, dateISO);
    const done = !isFuture && scheduled && isItemDoneOnDate(planner, item, dateISO);
    return {
      dateISO,
      dayNumber: fromISO(dateISO).getDate(),
      scheduled,
      done,
      isFuture,
      isToday: dateISO === todayISO
    };
  });
}

export function getGoalProgress(planner, goalId) {
  const linked = (planner?.items || []).filter((item) => item.goalId === goalId);
  const steps = linked.filter((item) => !item.repeat || item.repeat.type === "none");
  const habits = linked.filter((item) => item.repeat && item.repeat.type !== "none");
  const doneCount = steps.filter((item) => Boolean(item.doneAt)).length;
  const totalCount = steps.length;
  return {
    steps,
    habits,
    doneCount,
    totalCount,
    percent: totalCount ? Math.round((doneCount / totalCount) * 100) : 0,
    hasSteps: totalCount > 0
  };
}

function compareByTimeAndTitle(a, b) {
  const timeA = a.startTime || "99:99";
  const timeB = b.startTime || "99:99";
  if (timeA !== timeB) return timeA.localeCompare(timeB);
  return a.title.localeCompare(b.title, "zh-CN");
}

export function getTodayBuckets(planner, todayISO) {
  const items = planner?.items || [];
  const overdue = items
    .filter((item) => (!item.repeat || item.repeat.type === "none") && item.date && item.date < todayISO && !item.doneAt)
    .sort((a, b) => a.date.localeCompare(b.date) || compareByTimeAndTitle(a, b));

  const todayItems = items.filter((item) => occursOnDate(item, todayISO));
  const completedToday = todayItems
    .filter((item) => isItemDoneOnDate(planner, item, todayISO))
    .sort(compareByTimeAndTitle);
  const pendingToday = todayItems.filter((item) => !isItemDoneOnDate(planner, item, todayISO));

  const schedule = pendingToday
    .filter((item) => Boolean(item.startTime))
    .sort(compareByTimeAndTitle)
    .map((item) => ({
      ...item,
      isHabit: item.repeat?.type !== "none",
      streak: item.repeat?.type !== "none" ? getHabitStreak(planner, item, todayISO) : 0
    }));

  const todos = pendingToday
    .filter((item) => (!item.repeat || item.repeat.type === "none") && !item.startTime)
    .sort(compareByTimeAndTitle);

  const habits = pendingToday
    .filter((item) => item.repeat && item.repeat.type !== "none")
    .sort(compareByTimeAndTitle)
    .map((item) => ({
      ...item,
      streak: getHabitStreak(planner, item, todayISO)
    }));

  const totalToday = todayItems.length;
  const doneToday = completedToday.length;
  const showEmpty = totalToday === 0 && overdue.length === 0;

  return {
    totalToday,
    doneToday,
    percentToday: totalToday ? Math.round((doneToday / totalToday) * 100) : 0,
    overdue,
    schedule,
    todos,
    habits,
    completedToday,
    showEmpty
  };
}

export function getUpcomingGroups(planner, todayISO, horizonDays = 14) {
  const items = planner?.items || [];
  const horizonEnd = toISO(addDays(todayISO, horizonDays));
  const singleItems = items.filter((item) => !item.repeat || item.repeat.type === "none");

  const unscheduled = singleItems.filter((item) => !item.date && !item.doneAt);
  const inWindow = singleItems
    .filter((item) => item.date && item.date >= todayISO && item.date <= horizonEnd && !item.doneAt)
    .sort((a, b) => a.date.localeCompare(b.date) || compareByTimeAndTitle(a, b));

  const dateMap = new Map();
  inWindow.forEach((item) => {
    if (!dateMap.has(item.date)) dateMap.set(item.date, []);
    dateMap.get(item.date).push(item);
  });
  const upcoming = [...dateMap.entries()].map(([dateISO, groupItems]) => ({ dateISO, items: groupItems }));

  const later = singleItems
    .filter((item) => item.date && item.date > horizonEnd && !item.doneAt)
    .sort((a, b) => a.date.localeCompare(b.date) || compareByTimeAndTitle(a, b));

  const completed = singleItems
    .filter((item) => Boolean(item.doneAt))
    .sort((a, b) => b.doneAt.localeCompare(a.doneAt) || compareByTimeAndTitle(a, b));

  return { unscheduled, upcoming, later, completed };
}

export function toggleItemCompletion(planner, itemId, dateISO) {
  const target = planner.items.find((item) => item.id === itemId);
  if (!target) return planner;

  if (!target.repeat || target.repeat.type === "none") {
    return {
      ...planner,
      items: planner.items.map((item) =>
        item.id === itemId ? { ...item, doneAt: item.doneAt ? null : dateISO } : item
      )
    };
  }

  const currentDay = planner.completions[dateISO] || [];
  const exists = currentDay.includes(itemId);
  const nextDay = exists ? currentDay.filter((id) => id !== itemId) : [...currentDay, itemId];
  const nextCompletions = { ...planner.completions };
  if (nextDay.length) nextCompletions[dateISO] = nextDay;
  else delete nextCompletions[dateISO];

  return { ...planner, completions: nextCompletions };
}

export function moveOverdueToToday(planner, itemId, todayISO) {
  return {
    ...planner,
    items: planner.items.map((item) =>
      item.id === itemId && (!item.repeat || item.repeat.type === "none") && !item.doneAt
        ? { ...item, date: todayISO }
        : item
    )
  };
}

export function moveAllOverdueToToday(planner, todayISO) {
  return {
    ...planner,
    items: planner.items.map((item) =>
      (!item.repeat || item.repeat.type === "none") && item.date && item.date < todayISO && !item.doneAt
        ? { ...item, date: todayISO }
        : item
    )
  };
}

export function normalizeRepeat(repeat) {
  if (!repeat || repeat.type === "none") return { type: "none" };
  if (repeat.type === "daily") return { type: "daily" };
  if (repeat.type === "weekly") {
    const weekdays = [...new Set((repeat.weekdays || []).map(Number))].filter((d) => d >= 1 && d <= 7).sort((a, b) => a - b);
    return { type: "weekly", weekdays };
  }
  if (repeat.type === "monthly") {
    return { type: "monthly", day: Number(repeat.day) };
  }
  return { type: "none" };
}

export function upsertItem(planner, draft, todayISO) {
  const existing = draft.id ? planner.items.find((item) => item.id === draft.id) : null;
  const repeat = normalizeRepeat(draft.repeat);
  const isRepeating = repeat.type !== "none";
  const normalized = {
    id: existing ? existing.id : draft.id || makeId(),
    title: String(draft.title || "").trim(),
    date: isRepeating ? (draft.date || todayISO) : (draft.date || null),
    startTime: draft.startTime || null,
    endTime: draft.startTime && draft.endTime ? draft.endTime : null,
    repeat,
    repeatEnd: isRepeating && draft.repeatEnd ? draft.repeatEnd : null,
    goalId: draft.goalId || null,
    note: String(draft.note || "").trim(),
    doneAt: isRepeating ? null : (existing ? existing.doneAt : null),
    reminder: null,
    createdAt: existing ? existing.createdAt : todayISO
  };

  const items = existing
    ? planner.items.map((item) => (item.id === existing.id ? normalized : item))
    : [...planner.items, normalized];

  return { ...planner, items };
}

export function deleteItem(planner, itemId) {
  const nextCompletions = {};
  Object.entries(planner.completions || {}).forEach(([date, ids]) => {
    const filtered = ids.filter((id) => id !== itemId);
    if (filtered.length) nextCompletions[date] = filtered;
  });
  return {
    ...planner,
    items: planner.items.filter((item) => item.id !== itemId),
    completions: nextCompletions
  };
}

export function upsertGoal(planner, draft, todayISO) {
  const existing = draft.id ? planner.goals.find((goal) => goal.id === draft.id) : null;
  const normalized = {
    id: existing ? existing.id : draft.id || makeId(),
    title: String(draft.title || "").trim(),
    deadline: draft.deadline || null,
    status: existing ? (draft.status || existing.status) : (draft.status || "active"),
    createdAt: existing ? existing.createdAt : todayISO
  };
  const goals = existing
    ? planner.goals.map((goal) => (goal.id === existing.id ? normalized : goal))
    : [...planner.goals, normalized];
  return { ...planner, goals };
}

export function updateGoalStatus(planner, goalId, status) {
  return {
    ...planner,
    goals: planner.goals.map((goal) => (goal.id === goalId ? { ...goal, status } : goal))
  };
}

export function deleteGoal(planner, goalId) {
  return {
    ...planner,
    goals: planner.goals.filter((goal) => goal.id !== goalId),
    items: planner.items.map((item) => (item.goalId === goalId ? { ...item, goalId: null } : item))
  };
}

export function getGreeting(hour, nickname = "") {
  const prefix = hour < 6 ? "夜深了" : hour < 12 ? "早上好" : hour < 18 ? "下午好" : "晚上好";
  const trimmed = String(nickname || "").trim();
  return trimmed ? `${prefix}，${trimmed}` : prefix;
}

export function formatRepeatLabel(repeat) {
  if (!repeat || repeat.type === "none") return "";
  if (repeat.type === "daily") return "每天";
  if (repeat.type === "weekly") {
    const names = ["", "一", "二", "三", "四", "五", "六", "日"];
    return `每周${(repeat.weekdays || []).map((d) => names[d]).join("、")}`;
  }
  if (repeat.type === "monthly") return `每月 ${repeat.day} 日`;
  return "";
}
