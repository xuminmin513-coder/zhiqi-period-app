import { addDays, diffDays, getToday, toISO } from "./date.js";
import { createEmptyPlanner } from "./planner.js";

export function median(values) {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : Math.round((sorted[middle - 1] + sorted[middle]) / 2);
}

export function average(values) {
  return values.length ? Math.round(values.reduce((sum, value) => sum + value, 0) / values.length) : 0;
}

export function createDemoState() {
  const lastStart = toISO(addDays(getToday(), -18));
  const historyStarts = [lastStart];
  const gaps = [30, 28, 31, 29, 30];
  let cursor = lastStart;
  gaps.forEach((gap) => {
    cursor = toISO(addDays(cursor, -gap));
    historyStarts.unshift(cursor);
  });
  const todayISO = toISO(getToday());
  const weekAgoISO = toISO(addDays(todayISO, -7));
  const yesterdayISO = toISO(addDays(todayISO, -1));
  const nextMonthISO = toISO(addDays(todayISO, 30));
  return {
    version: 2,
    onboarded: true,
    lastPeriodStart: lastStart,
    periodLength: 5,
    typicalCycle: 30,
    cycles: gaps,
    historyStarts,
    logs: {
      [todayISO]: { symptoms: ["轻微腰酸"], flow: "", note: "" },
      [toISO(addDays(lastStart, 1))]: { symptoms: ["痛经"], flow: "medium", note: "" }
    },
    planner: {
      goals: [
        { id: "demo-goal-1", title: "读完两本喜欢的书", deadline: nextMonthISO, status: "active", createdAt: weekAgoISO }
      ],
      items: [
        {
          id: "demo-item-1",
          title: "晨间热身与拉伸",
          date: weekAgoISO,
          startTime: "08:00",
          endTime: "08:20",
          repeat: { type: "daily" },
          repeatEnd: null,
          goalId: null,
          note: "保持肩颈放松",
          doneAt: null,
          reminder: null,
          createdAt: weekAgoISO
        },
        {
          id: "demo-item-2",
          title: "阅读第 3 章并记笔记",
          date: todayISO,
          startTime: null,
          endTime: null,
          repeat: { type: "none" },
          repeatEnd: null,
          goalId: "demo-goal-1",
          note: "",
          doneAt: null,
          reminder: null,
          createdAt: todayISO
        },
        {
          id: "demo-item-3",
          title: "喝满 8 杯温水",
          date: weekAgoISO,
          startTime: null,
          endTime: null,
          repeat: { type: "daily" },
          repeatEnd: null,
          goalId: null,
          note: "",
          doneAt: null,
          reminder: null,
          createdAt: weekAgoISO
        }
      ],
      completions: {
        [yesterdayISO]: ["demo-item-1", "demo-item-3"]
      }
    },
    settings: { periodReminder: true, discreetNotifications: true, nickname: "" }
  };
}

export function createBaseState(lastPeriodStart, typicalCycle) {
  return {
    version: 2,
    onboarded: true,
    lastPeriodStart,
    periodLength: 5,
    typicalCycle: typicalCycle || 30,
    cycles: [],
    historyStarts: [lastPeriodStart],
    logs: {},
    planner: createEmptyPlanner(),
    settings: { periodReminder: true, discreetNotifications: true, nickname: "" }
  };
}

export function getPrediction(state) {
  const cycle = state.cycles.length ? median(state.cycles) : state.typicalCycle || 30;
  const spread = state.cycles.length >= 4 ? 2 : state.cycles.length >= 2 ? 3 : 4;
  const center = addDays(state.lastPeriodStart, cycle);
  return {
    cycle,
    start: toISO(addDays(center, -spread)),
    end: toISO(addDays(center, spread)),
    center: toISO(center),
    spread,
    evidenceCount: state.cycles.length,
    confidence: state.cycles.length >= 4 ? "参考依据较充足" : state.cycles.length >= 2 ? "仍需更多周期" : "当前仅为初步估算"
  };
}

export function getDateStatus(state, dateISO) {
  const prediction = getPrediction(state);
  const isActual = state.historyStarts.some((start) => {
    const elapsed = diffDays(dateISO, start);
    return elapsed >= 0 && elapsed < state.periodLength;
  });
  const isPredicted = diffDays(dateISO, prediction.start) >= 0 && diffDays(prediction.end, dateISO) >= 0;
  return { isActual, isPredicted, hasLog: Boolean(state.logs[dateISO]) };
}

export function calculateCycles(historyStarts) {
  return historyStarts
    .slice(1)
    .map((value, index) => diffDays(value, historyStarts[index]))
    .filter((value) => value >= 15 && value <= 120)
    .slice(-6);
}
