import test from "node:test";
import assert from "node:assert/strict";
import {
  createEmptyPlanner,
  deleteGoal,
  deleteItem,
  getGoalProgress,
  getGreeting,
  getHabitGrid,
  getHabitStreak,
  getIsoWeekday,
  getTodayBuckets,
  getUpcomingGroups,
  isItemDoneOnDate,
  moveAllOverdueToToday,
  moveOverdueToToday,
  occursOnDate,
  toggleItemCompletion,
  updateGoalStatus,
  upsertGoal,
  upsertItem
} from "./planner.js";

test("每周与每月重复覆盖短月最后一天、闰年 2 月和结束日", () => {
  assert.equal(getIsoWeekday("2026-11-23"), 1);
  assert.equal(getIsoWeekday("2026-11-29"), 7);

  const weekly = {
    id: "h-week",
    title: "运动",
    date: "2026-11-01",
    startTime: "19:00",
    endTime: null,
    repeat: { type: "weekly", weekdays: [1, 3, 5] },
    repeatEnd: "2026-11-26",
    goalId: null,
    note: "",
    doneAt: null,
    reminder: null,
    createdAt: "2026-11-01"
  };
  assert.equal(occursOnDate(weekly, "2026-10-30"), false);
  assert.equal(occursOnDate(weekly, "2026-11-25"), true);
  assert.equal(occursOnDate(weekly, "2026-11-26"), false);
  assert.equal(occursOnDate(weekly, "2026-11-27"), false);

  const monthly31 = {
    ...weekly,
    id: "h-month",
    date: "2024-01-31",
    repeat: { type: "monthly", day: 31 },
    repeatEnd: null
  };
  assert.equal(occursOnDate(monthly31, "2024-02-29"), true);
  assert.equal(occursOnDate(monthly31, "2024-02-28"), false);
  assert.equal(occursOnDate(monthly31, "2025-02-28"), true);
  assert.equal(occursOnDate(monthly31, "2026-04-30"), true);
  assert.equal(occursOnDate(monthly31, "2026-05-30"), false);
  assert.equal(occursOnDate(monthly31, "2026-05-31"), true);
});

test("连续打卡支持今日未打卡不中断、非发生日不中断、跨年累计与漏打归零", () => {
  const habit = {
    id: "h-run",
    title: "晨跑",
    date: "2026-12-28",
    startTime: null,
    endTime: null,
    repeat: { type: "weekly", weekdays: [1, 3, 5] },
    repeatEnd: null,
    goalId: null,
    note: "",
    doneAt: null,
    reminder: null,
    createdAt: "2026-12-28"
  };
  const planner = {
    items: [habit],
    goals: [],
    completions: {
      "2026-12-28": ["h-run"],
      "2026-12-30": ["h-run"],
      "2027-01-01": ["h-run"]
    }
  };
  assert.equal(getHabitStreak(planner, habit, "2027-01-04"), 3);
  const checked = toggleItemCompletion(planner, "h-run", "2027-01-04");
  assert.equal(getHabitStreak(checked, habit, "2027-01-04"), 4);
  assert.equal(getHabitStreak(planner, habit, "2027-01-06"), 0);

  const grid = getHabitGrid(checked, habit, "2027-01-04", 5);
  assert.equal(grid.length, 35);
  assert.equal(grid.find((cell) => cell.dateISO === "2027-01-04")?.done, true);
});

test("目标进度仅统计非重复步骤，删除目标仅解绑事项不删事项", () => {
  let planner = createEmptyPlanner();
  planner = upsertGoal(planner, { id: "g1", title: "考下证书", deadline: "2027-03-01" }, "2026-11-27");
  planner = upsertItem(planner, { id: "s1", title: "看完第一章", date: "2026-11-27", goalId: "g1" }, "2026-11-27");
  planner = upsertItem(planner, { id: "s2", title: "刷完真题", date: "2026-11-28", goalId: "g1" }, "2026-11-27");
  planner = upsertItem(planner, {
    id: "h1",
    title: "每天背单词",
    date: "2026-11-20",
    repeat: { type: "daily" },
    goalId: "g1"
  }, "2026-11-27");

  planner = toggleItemCompletion(planner, "s1", "2026-11-27");
  const progress = getGoalProgress(planner, "g1");
  assert.equal(progress.hasSteps, true);
  assert.equal(progress.doneCount, 1);
  assert.equal(progress.totalCount, 2);
  assert.equal(progress.percent, 50);
  assert.equal(progress.habits.length, 1);

  planner = updateGoalStatus(planner, "g1", "done");
  assert.equal(planner.goals[0].status, "done");

  planner = deleteGoal(planner, "g1");
  assert.equal(planner.goals.length, 0);
  assert.equal(planner.items.length, 3);
  assert.equal(planner.items.every((item) => item.goalId === null), true);
  assert.equal(planner.items.find((item) => item.id === "s1")?.doneAt, "2026-11-27");
});

test("今天分桶严格去重计数，支持过期待办移到今天与删除事项清理打卡", () => {
  let planner = createEmptyPlanner();
  const emptyBuckets = getTodayBuckets(planner, "2026-11-27");
  assert.equal(emptyBuckets.showEmpty, true);
  assert.equal(emptyBuckets.totalToday, 0);

  planner = upsertItem(planner, { id: "old-1", title: "寄快递", date: "2026-11-25" }, "2026-11-25");
  planner = upsertItem(planner, { id: "todo-1", title: "整理桌面", date: "2026-11-27" }, "2026-11-27");
  planner = upsertItem(planner, {
    id: "combo-1",
    title: "晚间护肤",
    date: "2026-11-20",
    startTime: "21:00",
    endTime: "21:20",
    repeat: { type: "daily" }
  }, "2026-11-20");

  let buckets = getTodayBuckets(planner, "2026-11-27");
  assert.equal(buckets.showEmpty, false);
  assert.equal(buckets.overdue.length, 1);
  assert.equal(buckets.todos.length, 1);
  assert.equal(buckets.schedule.length, 1);
  assert.equal(buckets.habits.length, 1);
  assert.equal(buckets.totalToday, 2);
  assert.equal(buckets.doneToday, 0);

  planner = toggleItemCompletion(planner, "combo-1", "2026-11-27");
  assert.equal(isItemDoneOnDate(planner, planner.items.find((i) => i.id === "combo-1"), "2026-11-27"), true);
  buckets = getTodayBuckets(planner, "2026-11-27");
  assert.equal(buckets.doneToday, 1);
  assert.equal(buckets.completedToday.length, 1);
  assert.equal(buckets.schedule.length, 0);
  assert.equal(buckets.habits.length, 0);

  planner = moveOverdueToToday(planner, "old-1", "2026-11-27");
  buckets = getTodayBuckets(planner, "2026-11-27");
  assert.equal(buckets.overdue.length, 0);
  assert.equal(buckets.totalToday, 3);

  planner = upsertItem(planner, { id: "old-2", title: "回电话", date: "2026-11-20" }, "2026-11-20");
  planner = moveAllOverdueToToday(planner, "2026-11-27");
  assert.equal(getTodayBuckets(planner, "2026-11-27").overdue.length, 0);

  planner = deleteItem(planner, "combo-1");
  assert.equal(planner.completions["2026-11-27"], undefined);
});

test("全部事项分组区分未安排、接下来 14 天、更远日程与已完成，且问候语按时段变化", () => {
  let planner = createEmptyPlanner();
  planner = upsertItem(planner, { id: "u1", title: "想看的书", date: null }, "2026-11-27");
  planner = upsertItem(planner, { id: "n1", title: "周六买花", date: "2026-11-28" }, "2026-11-27");
  planner = upsertItem(planner, { id: "f1", title: "下月体检", date: "2026-12-20" }, "2026-11-27");
  planner = upsertItem(planner, { id: "d1", title: "已买牛奶", date: "2026-11-27" }, "2026-11-27");
  planner = toggleItemCompletion(planner, "d1", "2026-11-27");

  const groups = getUpcomingGroups(planner, "2026-11-27", 14);
  assert.equal(groups.unscheduled.length, 1);
  assert.equal(groups.upcoming.length, 1);
  assert.equal(groups.upcoming[0].dateISO, "2026-11-28");
  assert.equal(groups.later.length, 1);
  assert.equal(groups.completed.length, 1);

  assert.equal(getGreeting(9, ""), "早上好");
  assert.equal(getGreeting(21, "小满"), "晚上好，小满");
});
