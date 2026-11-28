import { addDays, diffDays, fromISO, fullDate, pad, shortDate, toISO } from "./date.js";
import { getPrediction } from "./period.js";
import {
  getHabitStreak,
  getIsoWeekday,
  getLastDayOfMonth,
  isItemDoneOnDate,
  occursOnDate,
  upsertGoal,
  upsertItem
} from "./planner.js";

const MAX_PLANNER_ITEMS = 1000;
const MAX_PLANNER_GOALS = 100;
const MAX_SNAPSHOT_TITLES = 50;

export const MOOD_OPTIONS = [
  { value: 1, emoji: "😞", label: "低落" },
  { value: 2, emoji: "😕", label: "疲惫" },
  { value: 3, emoji: "🙂", label: "平稳" },
  { value: 4, emoji: "😊", label: "愉快" },
  { value: 5, emoji: "✨", label: "充实" }
];

export const CYCLE_PHASE_LABELS = {
  period: "经期中",
  pre: "经期前 3 天",
  other: "其他阶段"
};

export function createEmptyReviews() {
  return { daily: {}, weekly: {}, monthly: {}, yearly: {} };
}

function makeId() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return `id-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function isValidDateKey(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = fromISO(value);
  return !Number.isNaN(date.getTime()) && toISO(date) === value;
}

export function getIsoWeekKey(dateISO) {
  const date = fromISO(dateISO);
  const weekday = getIsoWeekday(dateISO);
  const monday = addDays(date, 1 - weekday);
  const thursday = addDays(monday, 3);
  const isoYear = thursday.getFullYear();
  const jan4 = new Date(isoYear, 0, 4);
  const jan4Weekday = jan4.getDay() === 0 ? 7 : jan4.getDay();
  const week1Monday = addDays(jan4, 1 - jan4Weekday);
  const weekNo = Math.round(diffDays(toISO(monday), toISO(week1Monday)) / 7) + 1;
  return `${isoYear}-W${pad(weekNo)}`;
}

export function parseIsoWeekKey(weekKey) {
  if (typeof weekKey !== "string") return null;
  const match = weekKey.match(/^(\d{4})-W(0[1-9]|[1-4]\d|5[0-3])$/);
  if (!match) return null;
  const year = Number(match[1]);
  const week = Number(match[2]);
  const jan4 = new Date(year, 0, 4);
  const jan4Weekday = jan4.getDay() === 0 ? 7 : jan4.getDay();
  const week1Monday = addDays(jan4, 1 - jan4Weekday);
  const monday = addDays(week1Monday, (week - 1) * 7);
  const startISO = toISO(monday);
  if (getIsoWeekKey(startISO) !== weekKey) return null;
  const endISO = toISO(addDays(monday, 6));
  return { year, week, startISO, endISO };
}

export function getMonthRange(monthKey) {
  if (typeof monthKey !== "string") return null;
  const match = monthKey.match(/^(\d{4})-(0[1-9]|1[0-2])$/);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const days = getLastDayOfMonth(year, month - 1);
  return {
    year,
    month,
    days,
    startISO: `${year}-${pad(month)}-01`,
    endISO: `${year}-${pad(month)}-${pad(days)}`
  };
}

export function getYearRange(yearKey) {
  if (typeof yearKey !== "string" || !/^\d{4}$/.test(yearKey)) return null;
  const year = Number(yearKey);
  if (year < 1970 || year > 2100) return null;
  return { year, startISO: `${yearKey}-01-01`, endISO: `${yearKey}-12-31` };
}

export function isValidPeriodKey(type, key) {
  if (type === "daily") return isValidDateKey(key);
  if (type === "weekly") return Boolean(parseIsoWeekKey(key));
  if (type === "monthly") return Boolean(getMonthRange(key));
  if (type === "yearly") return Boolean(getYearRange(key));
  return false;
}

export function getCurrentPeriodKey(type, todayISO) {
  if (type === "daily") return todayISO;
  if (type === "weekly") return getIsoWeekKey(todayISO);
  if (type === "monthly") return todayISO.slice(0, 7);
  return todayISO.slice(0, 4);
}

export function shiftPeriodKey(type, key, delta) {
  if (type === "daily") return toISO(addDays(key, delta));
  if (type === "weekly") {
    const parsed = parseIsoWeekKey(key);
    return parsed ? getIsoWeekKey(toISO(addDays(parsed.startISO, delta * 7))) : key;
  }
  if (type === "monthly") {
    const [year, month] = key.split("-").map(Number);
    const next = new Date(year, month - 1 + delta, 1);
    return `${next.getFullYear()}-${pad(next.getMonth() + 1)}`;
  }
  return String(Number(key) + delta);
}

export function isFuturePeriod(type, key, todayISO) {
  if (!isValidPeriodKey(type, key)) return true;
  if (type === "daily") return key > todayISO;
  if (type === "weekly") {
    const parsed = parseIsoWeekKey(key);
    return !parsed || parsed.startISO > todayISO;
  }
  if (type === "monthly") return key > todayISO.slice(0, 7);
  if (type === "yearly") return Number(key) > Number(todayISO.slice(0, 4));
  return true;
}

export function formatPeriodLabel(type, key) {
  if (type === "daily") return isValidDateKey(key) ? fullDate(key) : key;
  if (type === "weekly") {
    const parsed = parseIsoWeekKey(key);
    return parsed ? `${parsed.year}年第${parsed.week}周（${shortDate(parsed.startISO)}—${shortDate(parsed.endISO)}）` : key;
  }
  if (type === "monthly") {
    const parsed = getMonthRange(key);
    return parsed ? `${parsed.year}年${parsed.month}月` : key;
  }
  if (type === "yearly") return `${key}年`;
  return key;
}

export function getCyclePhaseOnDate(state, dateISO) {
  const periodLength = state.periodLength || 5;
  const starts = state.historyStarts || [];
  const inActual = starts.some((start) => {
    const elapsed = diffDays(dateISO, start);
    return elapsed >= 0 && elapsed < periodLength;
  });
  if (inActual) return "period";

  const beforeRecorded = starts.some((start) => {
    const until = diffDays(start, dateISO);
    return until >= 1 && until <= 3;
  });
  if (beforeRecorded) return "pre";

  if (state.lastPeriodStart && dateISO > state.lastPeriodStart) {
    const prediction = getPrediction(state);
    const untilPredicted = diffDays(prediction.center, dateISO);
    if (untilPredicted >= 1 && untilPredicted <= 3) return "pre";
  }
  return "other";
}

function evaluateDay(planner, dateISO) {
  const items = planner?.items || [];
  const completedTitles = [];
  const pendingTitles = [];

  items.forEach((item) => {
    const isRepeat = item.repeat && item.repeat.type !== "none";
    if (isRepeat) {
      if (!occursOnDate(item, dateISO)) return;
      if (isItemDoneOnDate(planner, item, dateISO)) completedTitles.push(item.title);
      else pendingTitles.push(item.title);
      return;
    }
    if (item.date === dateISO) {
      if (item.doneAt) completedTitles.push(item.title);
      else pendingTitles.push(item.title);
    } else if (!item.date && item.doneAt === dateISO) {
      completedTitles.push(item.title);
    }
  });

  const plannedCount = completedTitles.length + pendingTitles.length;
  const doneCount = completedTitles.length;
  return {
    plannedCount,
    doneCount,
    completionRate: plannedCount ? Math.round((doneCount / plannedCount) * 100) : 0,
    completedTitles: completedTitles.slice(0, MAX_SNAPSHOT_TITLES),
    pendingTitles: pendingTitles.slice(0, MAX_SNAPSHOT_TITLES)
  };
}

function listDatesBetween(startISO, endISO) {
  const count = diffDays(endISO, startISO) + 1;
  if (count <= 0) return [];
  return Array.from({ length: count }, (_, idx) => toISO(addDays(startISO, idx)));
}

function meanRounded(values, decimals = 0) {
  if (!values.length) return null;
  const raw = values.reduce((sum, v) => sum + v, 0) / values.length;
  if (decimals === 0) return Math.round(raw);
  const factor = 10 ** decimals;
  return Math.round(raw * factor) / factor;
}

function computeCycleComparison(state, startISO, endISO) {
  const empty = {
    sufficient: false,
    cycleDaysRate: null,
    otherDaysRate: null,
    cycleDaysEnergy: null,
    otherDaysEnergy: null
  };
  if ((state.cycles || []).length < 2) return empty;

  const cycleRates = [];
  const otherRates = [];
  const cycleEnergies = [];
  const otherEnergies = [];
  const dailyReviews = state.reviews?.daily || {};

  listDatesBetween(startISO, endISO).forEach((dateISO) => {
    const phase = getCyclePhaseOnDate(state, dateISO);
    const inCycleWindow = phase === "period" || phase === "pre";
    const dayStats = evaluateDay(state.planner, dateISO);
    if (dayStats.plannedCount > 0) {
      if (inCycleWindow) cycleRates.push(dayStats.completionRate);
      else otherRates.push(dayStats.completionRate);
    }
    const review = dailyReviews[dateISO];
    if (Number.isInteger(review?.energy)) {
      if (inCycleWindow) cycleEnergies.push(review.energy);
      else otherEnergies.push(review.energy);
    }
  });

  const hasRatePair = cycleRates.length > 0 && otherRates.length > 0;
  const hasEnergyPair = cycleEnergies.length > 0 && otherEnergies.length > 0;
  if (!hasRatePair && !hasEnergyPair) return empty;

  return {
    sufficient: true,
    cycleDaysRate: hasRatePair ? meanRounded(cycleRates, 0) : null,
    otherDaysRate: hasRatePair ? meanRounded(otherRates, 0) : null,
    cycleDaysEnergy: hasEnergyPair ? meanRounded(cycleEnergies, 1) : null,
    otherDaysEnergy: hasEnergyPair ? meanRounded(otherEnergies, 1) : null
  };
}

function findCompletedGoalsInWindow(planner, startISO, endISO) {
  const goals = planner?.goals || [];
  const items = planner?.items || [];
  return goals.filter((goal) => {
    if (goal.status !== "done") return false;
    const stepDoneDates = items
      .filter((item) => item.goalId === goal.id && (!item.repeat || item.repeat.type === "none") && item.doneAt)
      .map((item) => item.doneAt)
      .sort();
    const anchorDate = stepDoneDates.length ? stepDoneDates[stepDoneDates.length - 1] : goal.createdAt;
    return anchorDate >= startISO && anchorDate <= endISO;
  });
}

export function computeReviewSnapshot(state, type, key) {
  const planner = state.planner || { items: [], goals: [], completions: {} };
  const dailyReviews = state.reviews?.daily || {};
  const monthlyReviews = state.reviews?.monthly || {};

  if (type === "daily") {
    const dayStats = evaluateDay(planner, key);
    return {
      ...dayStats,
      cyclePhase: getCyclePhaseOnDate(state, key)
    };
  }

  if (type === "weekly") {
    const parsed = parseIsoWeekKey(key);
    if (!parsed) throw new Error("无效的周复盘标识");
    const days = listDatesBetween(parsed.startISO, parsed.endISO);
    let plannedCount = 0;
    let doneCount = 0;
    const moods = [];
    const energies = [];

    const dailyRates = days.map((dateISO) => {
      const stats = evaluateDay(planner, dateISO);
      plannedCount += stats.plannedCount;
      doneCount += stats.doneCount;
      const rev = dailyReviews[dateISO];
      if (Number.isInteger(rev?.mood)) moods.push(rev.mood);
      if (Number.isInteger(rev?.energy)) energies.push(rev.energy);
      return {
        date: dateISO,
        planned: stats.plannedCount,
        done: stats.doneCount,
        rate: stats.completionRate
      };
    });

    const habits = (planner.items || [])
      .filter((item) => item.repeat && item.repeat.type !== "none")
      .slice(0, 100)
      .map((habit) => {
        const scheduledDays = days.filter((d) => occursOnDate(habit, d));
        const doneDays = scheduledDays.filter((d) => isItemDoneOnDate(planner, habit, d));
        return {
          id: habit.id,
          title: habit.title,
          scheduled: scheduledDays.length,
          done: doneDays.length,
          rate: scheduledDays.length ? Math.round((doneDays.length / scheduledDays.length) * 100) : 0,
          streak: getHabitStreak(planner, habit, parsed.endISO)
        };
      });

    const goals = (planner.goals || [])
      .filter((goal) => goal.status !== "archived" && goal.createdAt <= parsed.endISO)
      .slice(0, 100)
      .map((goal) => {
        const steps = (planner.items || []).filter((i) => i.goalId === goal.id && (!i.repeat || i.repeat.type === "none"));
        const doneByEnd = steps.filter((s) => s.doneAt && s.doneAt <= parsed.endISO).length;
        const doneBefore = steps.filter((s) => s.doneAt && s.doneAt < parsed.startISO).length;
        return {
          id: goal.id,
          title: goal.title,
          doneCount: doneByEnd,
          totalCount: steps.length,
          deltaDone: Math.max(0, doneByEnd - doneBefore),
          percent: steps.length ? Math.round((doneByEnd / steps.length) * 100) : 0,
          status: goal.status
        };
      });

    return {
      plannedCount,
      doneCount,
      completionRate: plannedCount ? Math.round((doneCount / plannedCount) * 100) : 0,
      dailyRates,
      habits,
      goals,
      avgMood: meanRounded(moods, 1),
      avgEnergy: meanRounded(energies, 1)
    };
  }

  if (type === "monthly") {
    const range = getMonthRange(key);
    if (!range) throw new Error("无效的月复盘标识");
    const days = listDatesBetween(range.startISO, range.endISO);
    let plannedCount = 0;
    let doneCount = 0;
    const moodDistribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    const highlights = [];

    days.forEach((dateISO) => {
      const stats = evaluateDay(planner, dateISO);
      plannedCount += stats.plannedCount;
      doneCount += stats.doneCount;
      const rev = dailyReviews[dateISO];
      if (Number.isInteger(rev?.mood) && moodDistribution[rev.mood] !== undefined) {
        moodDistribution[rev.mood] += 1;
      }
      if (rev?.bestThing?.trim()) {
        highlights.push({ date: dateISO, text: rev.bestThing.trim() });
      }
    });

    const weeklyRates = [];
    for (let idx = 0; idx < days.length; idx += 7) {
      const chunk = days.slice(idx, idx + 7);
      let wPlanned = 0;
      let wDone = 0;
      chunk.forEach((d) => {
        const s = evaluateDay(planner, d);
        wPlanned += s.plannedCount;
        wDone += s.doneCount;
      });
      weeklyRates.push({
        label: `第${Math.floor(idx / 7) + 1}段`,
        startDate: chunk[0],
        endDate: chunk[chunk.length - 1],
        planned: wPlanned,
        done: wDone,
        rate: wPlanned ? Math.round((wDone / wPlanned) * 100) : 0
      });
    }

    const habits = (planner.items || [])
      .filter((item) => item.repeat && item.repeat.type !== "none")
      .slice(0, 100)
      .map((habit) => {
        const scheduledDays = days.filter((d) => occursOnDate(habit, d));
        const doneDays = scheduledDays.filter((d) => isItemDoneOnDate(planner, habit, d));
        return {
          id: habit.id,
          title: habit.title,
          scheduled: scheduledDays.length,
          done: doneDays.length,
          rate: scheduledDays.length ? Math.round((doneDays.length / scheduledDays.length) * 100) : 0
        };
      });

    const completedGoals = findCompletedGoalsInWindow(planner, range.startISO, range.endISO);

    return {
      plannedCount,
      doneCount,
      completionRate: plannedCount ? Math.round((doneCount / plannedCount) * 100) : 0,
      weeklyRates,
      habits,
      completedGoalsCount: completedGoals.length,
      completedGoalTitles: completedGoals.slice(0, MAX_SNAPSHOT_TITLES).map((g) => g.title),
      moodDistribution,
      highlights: highlights.slice(0, 31),
      cycleComparison: computeCycleComparison(state, range.startISO, range.endISO)
    };
  }

  if (type === "yearly") {
    const range = getYearRange(key);
    if (!range) throw new Error("无效的年复盘标识");
    let plannedCount = 0;
    let doneCount = 0;

    const monthlyRates = Array.from({ length: 12 }, (_, idx) => {
      const month = idx + 1;
      const mKey = `${key}-${pad(month)}`;
      const mRange = getMonthRange(mKey);
      let mPlanned = 0;
      let mDone = 0;
      listDatesBetween(mRange.startISO, mRange.endISO).forEach((d) => {
        const s = evaluateDay(planner, d);
        mPlanned += s.plannedCount;
        mDone += s.doneCount;
      });
      plannedCount += mPlanned;
      doneCount += mDone;
      return {
        month,
        key: mKey,
        planned: mPlanned,
        done: mDone,
        rate: mPlanned ? Math.round((mDone / mPlanned) * 100) : 0
      };
    });

    const yearDays = listDatesBetween(range.startISO, range.endISO);
    let longestStreak = null;
    (planner.items || [])
      .filter((item) => item.repeat && item.repeat.type !== "none")
      .forEach((habit) => {
        let current = 0;
        let best = 0;
        yearDays.forEach((d) => {
          if (!occursOnDate(habit, d)) return;
          if (isItemDoneOnDate(planner, habit, d)) {
            current += 1;
            if (current > best) best = current;
          } else {
            current = 0;
          }
        });
        if (best > 0 && (!longestStreak || best > longestStreak.days)) {
          longestStreak = { title: habit.title, days: best };
        }
      });

    const reviewedDaysCount = Object.keys(dailyReviews).filter((d) => d.startsWith(`${key}-`)).length;
    const highlights = Array.from({ length: 12 }, (_, idx) => `${key}-${pad(idx + 1)}`)
      .map((mKey) => (monthlyReviews[mKey]?.gain?.trim() ? { month: mKey, text: monthlyReviews[mKey].gain.trim() } : null))
      .filter(Boolean);

    const completedGoals = findCompletedGoalsInWindow(planner, range.startISO, range.endISO);

    return {
      plannedCount,
      doneCount,
      completionRate: plannedCount ? Math.round((doneCount / plannedCount) * 100) : 0,
      monthlyRates,
      completedGoalTitles: completedGoals.slice(0, 100).map((g) => g.title),
      longestStreak,
      reviewedDaysCount,
      highlights,
      cycleComparison: computeCycleComparison(state, range.startISO, range.endISO)
    };
  }

  throw new Error("不支持的复盘类型");
}

function cleanText(value, maxLength = 500) {
  return String(value || "").trim().slice(0, maxLength);
}

export function upsertReview(state, type, key, draft, todayISO) {
  if (!isValidPeriodKey(type, key)) throw new Error("复盘周期标识无效");
  if (isFuturePeriod(type, key, todayISO)) throw new Error("不能提前创建未来周期的复盘");

  const reviews = state.reviews || createEmptyReviews();
  const existing = reviews[type]?.[key] || null;
  const snapshot = existing ? existing.snapshot : computeReviewSnapshot(state, type, key);
  const savedAt = existing ? existing.savedAt : todayISO;

  let record;
  if (type === "daily") {
    const mood = Number.isInteger(draft.mood) && draft.mood >= 1 && draft.mood <= 5 ? draft.mood : null;
    const energy = Number.isInteger(draft.energy) && draft.energy >= 1 && draft.energy <= 5 ? draft.energy : null;
    record = {
      key,
      mood,
      energy,
      bestThing: cleanText(draft.bestThing, 500),
      obstacle: cleanText(draft.obstacle, 500),
      tomorrowFocus: cleanText(draft.tomorrowFocus, 500),
      convertedTomorrow: existing?.convertedTomorrow || null,
      snapshot,
      savedAt,
      updatedAt: todayISO
    };
  } else if (type === "weekly") {
    const parsed = parseIsoWeekKey(key);
    const priorities = Array.isArray(draft.nextWeekPriorities)
      ? draft.nextWeekPriorities.map((item) => cleanText(item, 60)).filter(Boolean).slice(0, 3)
      : [];
    record = {
      key,
      startDate: parsed.startISO,
      endDate: parsed.endISO,
      wins: cleanText(draft.wins, 500),
      improvements: cleanText(draft.improvements, 500),
      nextWeekPriorities: priorities,
      convertedPriorities: existing?.convertedPriorities ? [...existing.convertedPriorities] : [],
      snapshot,
      savedAt,
      updatedAt: todayISO
    };
  } else if (type === "monthly") {
    record = {
      key,
      gain: cleanText(draft.gain, 500),
      regret: cleanText(draft.regret, 500),
      nextMonthGoal: cleanText(draft.nextMonthGoal, 500),
      convertedGoal: existing?.convertedGoal || null,
      snapshot,
      savedAt,
      updatedAt: todayISO
    };
  } else if (type === "yearly") {
    record = {
      key,
      keywords: cleanText(draft.keywords, 100),
      proudest: cleanText(draft.proudest, 500),
      nextYearVision: cleanText(draft.nextYearVision, 500),
      snapshot,
      savedAt,
      updatedAt: todayISO
    };
  }

  return {
    ...state,
    reviews: {
      ...reviews,
      [type]: {
        ...reviews[type],
        [key]: record
      }
    }
  };
}

export function deleteReview(state, type, key) {
  const reviews = state.reviews || createEmptyReviews();
  const nextBucket = { ...reviews[type] };
  delete nextBucket[key];
  return {
    ...state,
    reviews: {
      ...reviews,
      [type]: nextBucket
    }
  };
}

export function getConversionTargetInfo(type, key) {
  if (type === "daily") {
    const targetDate = toISO(addDays(key, 1));
    return {
      targetDate,
      buttonLabel: `转入 ${shortDate(targetDate)} 待办`,
      doneLabel: `✓ 已转入 ${shortDate(targetDate)} 待办`
    };
  }
  if (type === "weekly") {
    const parsed = parseIsoWeekKey(key);
    const targetDate = parsed ? toISO(addDays(parsed.endISO, 1)) : "";
    return {
      targetDate,
      buttonLabel: targetDate ? `转入 ${shortDate(targetDate)}（下周一）计划` : "转入下周计划",
      doneLabel: targetDate ? `✓ 已转入 ${shortDate(targetDate)} 计划` : "✓ 已转入下周计划"
    };
  }
  if (type === "monthly") {
    const [year, month] = key.split("-").map(Number);
    const nextFirst = new Date(year, month, 1);
    const ny = nextFirst.getFullYear();
    const nm = nextFirst.getMonth() + 1;
    const lastDay = getLastDayOfMonth(ny, nm - 1);
    return {
      deadline: `${ny}-${pad(nm)}-${pad(lastDay)}`,
      monthLabel: `${ny}年${nm}月`,
      buttonLabel: `转为 ${ny}年${nm}月 长期目标`,
      doneLabel: `✓ 已转为 ${ny}年${nm}月 目标`
    };
  }
  return null;
}

export function convertReviewToPlan(state, type, key, todayISO) {
  const reviews = state.reviews || createEmptyReviews();
  const entry = reviews[type]?.[key];
  if (!entry) return { state, createdCount: 0 };

  if (type === "daily") {
    const text = (entry.tomorrowFocus || "").trim();
    if (!text) return { state, createdCount: 0 };
    if (entry.convertedTomorrow && entry.convertedTomorrow.sourceText === text) {
      return { state, createdCount: 0 };
    }
    if ((state.planner?.items || []).length >= MAX_PLANNER_ITEMS) {
      throw new Error(`事项数量已达 ${MAX_PLANNER_ITEMS} 条上限，无法转入计划`);
    }
    const { targetDate } = getConversionTargetInfo("daily", key);
    const itemId = makeId();
    const nextPlanner = upsertItem(state.planner, {
      id: itemId,
      title: text.slice(0, 60),
      date: targetDate,
      note: text.length > 60 ? text.slice(0, 300) : ""
    }, todayISO);

    return {
      createdCount: 1,
      state: {
        ...state,
        planner: nextPlanner,
        reviews: {
          ...reviews,
          daily: {
            ...reviews.daily,
            [key]: {
              ...entry,
              convertedTomorrow: { itemId, sourceText: text }
            }
          }
        }
      }
    };
  }

  if (type === "weekly") {
    const priorities = [...new Set((entry.nextWeekPriorities || []).map((s) => s.trim()).filter(Boolean))];
    if (!priorities.length) return { state, createdCount: 0 };
    const existingList = entry.convertedPriorities || [];
    const existingSet = new Set(existingList.map((p) => p.text));
    const pendingTexts = priorities.filter((text) => !existingSet.has(text));
    if (!pendingTexts.length) return { state, createdCount: 0 };

    if ((state.planner?.items || []).length + pendingTexts.length > MAX_PLANNER_ITEMS) {
      throw new Error(`事项数量已达 ${MAX_PLANNER_ITEMS} 条上限，无法转入计划`);
    }

    const { targetDate } = getConversionTargetInfo("weekly", key);
    let nextPlanner = state.planner;
    const addedRecords = [];
    pendingTexts.forEach((text) => {
      const itemId = makeId();
      nextPlanner = upsertItem(nextPlanner, {
        id: itemId,
        title: text.slice(0, 60),
        date: targetDate
      }, todayISO);
      addedRecords.push({ text, itemId });
    });

    return {
      createdCount: addedRecords.length,
      state: {
        ...state,
        planner: nextPlanner,
        reviews: {
          ...reviews,
          weekly: {
            ...reviews.weekly,
            [key]: {
              ...entry,
              convertedPriorities: [...existingList, ...addedRecords].slice(-10)
            }
          }
        }
      }
    };
  }

  if (type === "monthly") {
    const text = (entry.nextMonthGoal || "").trim();
    if (!text) return { state, createdCount: 0 };
    if (entry.convertedGoal && entry.convertedGoal.sourceText === text) {
      return { state, createdCount: 0 };
    }
    if ((state.planner?.goals || []).length >= MAX_PLANNER_GOALS) {
      throw new Error(`长期目标已达 ${MAX_PLANNER_GOALS} 个上限，无法创建新目标`);
    }
    const { deadline } = getConversionTargetInfo("monthly", key);
    const goalId = makeId();
    const nextPlanner = upsertGoal(state.planner, {
      id: goalId,
      title: text.slice(0, 40),
      deadline,
      status: "active"
    }, todayISO);

    return {
      createdCount: 1,
      state: {
        ...state,
        planner: nextPlanner,
        reviews: {
          ...reviews,
          monthly: {
            ...reviews.monthly,
            [key]: {
              ...entry,
              convertedGoal: { goalId, sourceText: text }
            }
          }
        }
      }
    };
  }

  return { state, createdCount: 0 };
}

export function getPendingReviewPrompts(stateOrReviews, todayISO) {
  const reviews = stateOrReviews?.reviews ? stateOrReviews.reviews : (stateOrReviews || createEmptyReviews());
  const planner = stateOrReviews?.planner || null;
  const prompts = [];

  // 1. 日维度：仅检查今天（不堆叠历史欠账）
  if (!reviews.daily?.[todayISO]) {
    prompts.push({
      type: "daily",
      key: todayISO,
      title: "今天还没复盘",
      subtitle: `${shortDate(todayISO)} · 1 分钟记录今日收获与明日重点`
    });
  }

  // 2. 周维度：仅检查上一完整 ISO 周
  const prevWeekKey = getIsoWeekKey(toISO(addDays(todayISO, -7)));
  if (!reviews.weekly?.[prevWeekKey]) {
    prompts.push({
      type: "weekly",
      key: prevWeekKey,
      title: "上周复盘待完成",
      subtitle: formatPeriodLabel("weekly", prevWeekKey)
    });
  }

  // 3. 月维度：仅检查上一个自然月
  const prevMonthKey = shiftPeriodKey("monthly", todayISO.slice(0, 7), -1);
  if (!reviews.monthly?.[prevMonthKey]) {
    prompts.push({
      type: "monthly",
      key: prevMonthKey,
      title: "上月复盘待完成",
      subtitle: `${formatPeriodLabel("monthly", prevMonthKey)} · 回顾月度节奏与收获`
    });
  }

  // 4. 年维度：仅在 1 月或去年存在记录时检查上一年
  const todayDate = fromISO(todayISO);
  const prevYearKey = String(todayDate.getFullYear() - 1);
  const hasPrevYearData =
    todayDate.getMonth() === 0 ||
    Object.keys(reviews.daily || {}).some((k) => k.startsWith(`${prevYearKey}-`)) ||
    Object.keys(reviews.monthly || {}).some((k) => k.startsWith(`${prevYearKey}-`)) ||
    Boolean(planner?.items?.some((item) => item.date?.startsWith(`${prevYearKey}-`)));

  if (hasPrevYearData && !reviews.yearly?.[prevYearKey]) {
    prompts.push({
      type: "yearly",
      key: prevYearKey,
      title: `${prevYearKey} 年度复盘待完成`,
      subtitle: "汇总全年高光时刻与成长关键词"
    });
  }

  return prompts.slice(0, 2);
}
