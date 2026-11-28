import test from "node:test";
import assert from "node:assert/strict";
import { createBaseState } from "./period.js";
import { deleteItem, toggleItemCompletion, upsertGoal, upsertItem } from "./planner.js";
import {
  computeReviewSnapshot,
  convertReviewToPlan,
  createEmptyReviews,
  deleteReview,
  getConversionTargetInfo,
  getCyclePhaseOnDate,
  getIsoWeekKey,
  getMonthRange,
  getPendingReviewPrompts,
  isFuturePeriod,
  parseIsoWeekKey,
  upsertReview
} from "./review.js";

test("ISO 8601 周换算准确处理跨年周与非法第 53 周，月区间覆盖闰年 2 月，且识别未来周期", () => {
  assert.equal(getIsoWeekKey("2026-12-28"), "2026-W53");
  assert.equal(getIsoWeekKey("2027-01-03"), "2026-W53");
  assert.equal(getIsoWeekKey("2027-01-04"), "2027-W01");
  assert.equal(getIsoWeekKey("2026-01-01"), "2026-W01");

  const w53 = parseIsoWeekKey("2026-W53");
  assert.deepEqual(w53, { year: 2026, week: 53, startISO: "2026-12-28", endISO: "2027-01-03" });
  assert.equal(parseIsoWeekKey("2025-W53"), null);

  assert.deepEqual(getMonthRange("2024-02"), { year: 2024, month: 2, startISO: "2024-02-01", endISO: "2024-02-29", days: 29 });
  assert.deepEqual(getMonthRange("2025-02"), { year: 2025, month: 2, startISO: "2025-02-01", endISO: "2025-02-28", days: 28 });

  assert.equal(isFuturePeriod("daily", "2026-11-29", "2026-11-28"), true);
  assert.equal(isFuturePeriod("daily", "2026-11-28", "2026-11-28"), false);
  assert.equal(isFuturePeriod("weekly", "2026-W49", "2026-11-28"), true);
  assert.equal(isFuturePeriod("weekly", "2026-W48", "2026-11-28"), false);
  assert.equal(isFuturePeriod("monthly", "2026-12", "2026-11-28"), true);
  assert.equal(isFuturePeriod("yearly", "2027", "2026-11-28"), true);

  const state = { ...createBaseState("2026-11-10", 28), reviews: createEmptyReviews() };
  assert.throws(() => upsertReview(state, "daily", "2026-11-29", { bestThing: "未来" }, "2026-11-28"), /未来周期/);
});

test("无数据时四类复盘快照均为零值安全结构，待复盘提示每个维度只看最近 1 期且最多展示 2 张", () => {
  const state = { ...createBaseState("2026-11-10", 28), reviews: createEmptyReviews() };
  const daily = computeReviewSnapshot(state, "daily", "2026-11-28");
  assert.equal(daily.plannedCount, 0);
  assert.equal(daily.doneCount, 0);
  assert.equal(daily.completionRate, 0);

  const weekly = computeReviewSnapshot(state, "weekly", "2026-W48");
  assert.equal(weekly.dailyRates.length, 7);
  assert.equal(weekly.avgMood, null);

  const monthly = computeReviewSnapshot(state, "monthly", "2026-11");
  assert.equal(monthly.highlights.length, 0);
  assert.equal(monthly.cycleComparison.sufficient, false);

  const yearly = computeReviewSnapshot(state, "yearly", "2026");
  assert.equal(yearly.monthlyRates.length, 12);
  assert.equal(yearly.longestStreak, null);

  // 未完成任何复盘时最多返回 2 张（今天 + 上周），不堆叠更早历史欠账
  const prompts = getPendingReviewPrompts(state, "2026-11-28");
  assert.equal(prompts.length, 2);
  assert.equal(prompts[0].type, "daily");
  assert.equal(prompts[0].key, "2026-11-28");
  assert.equal(prompts[1].type, "weekly");
  assert.equal(prompts[1].key, "2026-W47");

  // 当今天和上周都已完成时，顺延提示上月（2026-10），不会去翻更早的周或日欠账
  let filled = upsertReview(state, "daily", "2026-11-28", { bestThing: "好" }, "2026-11-28");
  filled = upsertReview(filled, "weekly", "2026-W47", { wins: "稳" }, "2026-11-28");
  const nextPrompts = getPendingReviewPrompts(filled, "2026-11-28");
  assert.equal(nextPrompts.some((p) => p.type === "daily"), false);
  assert.equal(nextPrompts.some((p) => p.type === "weekly"), false);
  assert.equal(nextPrompts[0].type, "monthly");
  assert.equal(nextPrompts[0].key, "2026-10");
});

test("历史补写按对应区间统计，保存后删除事项或修改复盘文字均不改变已冻结快照", () => {
  let state = { ...createBaseState("2026-11-01", 28), reviews: createEmptyReviews() };
  state.planner = upsertItem(state.planner, { id: "t1", title: "十月旧任务A", date: "2026-10-15" }, "2026-10-15");
  state.planner = upsertItem(state.planner, { id: "t2", title: "十月旧任务B", date: "2026-10-15" }, "2026-10-15");
  state.planner = toggleItemCompletion(state.planner, "t1", "2026-10-15");

  state = upsertReview(state, "daily", "2026-10-15", {
    mood: 4,
    energy: 5,
    bestThing: "按时完成了核心报告",
    obstacle: "下午有点犯困",
    tomorrowFocus: "整理归档文件夹"
  }, "2026-11-28");

  assert.equal(state.reviews.daily["2026-10-15"].snapshot.plannedCount, 2);
  assert.equal(state.reviews.daily["2026-10-15"].snapshot.doneCount, 1);
  assert.equal(state.reviews.daily["2026-10-15"].snapshot.completionRate, 50);

  // 删除旧事项 t1 和 t2 后，已保存的复盘快照不变
  state = { ...state, planner: deleteItem(deleteItem(state.planner, "t1"), "t2") };
  assert.equal(state.reviews.daily["2026-10-15"].snapshot.plannedCount, 2);
  assert.equal(state.reviews.daily["2026-10-15"].snapshot.completionRate, 50);

  // 二次编辑该日复盘文字与心情并保存，已冻结的统计快照仍保持 2 与 50% 不变
  state = upsertReview(state, "daily", "2026-10-15", {
    mood: 5,
    energy: 4,
    bestThing: "按时完成了核心报告（补充感悟）",
    obstacle: "已调整午休节奏",
    tomorrowFocus: "整理归档文件夹"
  }, "2026-11-28");
  assert.equal(state.reviews.daily["2026-10-15"].bestThing, "按时完成了核心报告（补充感悟）");
  assert.equal(state.reviews.daily["2026-10-15"].snapshot.plannedCount, 2);
  assert.equal(state.reviews.daily["2026-10-15"].snapshot.doneCount, 1);
  assert.equal(state.reviews.daily["2026-10-15"].snapshot.completionRate, 50);

  const afterDelete = deleteReview(state, "daily", "2026-10-15");
  assert.equal(afterDelete.reviews.daily["2026-10-15"], undefined);
});

test("一键转入计划标明目标日期/月份，防重复生成，且触及数量上限时不写入已转入标记", () => {
  let state = { ...createBaseState("2026-11-01", 28), reviews: createEmptyReviews() };

  assert.equal(getConversionTargetInfo("daily", "2026-11-28").targetDate, "2026-11-29");
  assert.match(getConversionTargetInfo("daily", "2026-11-28").buttonLabel, /11月29日/);
  assert.equal(getConversionTargetInfo("weekly", "2026-W48").targetDate, "2026-11-30");
  assert.match(getConversionTargetInfo("monthly", "2024-01").buttonLabel, /2024年2月/);

  // 1. 日复盘转次日待办
  state = upsertReview(state, "daily", "2026-11-28", {
    mood: 4,
    energy: 4,
    bestThing: "专注两小时",
    obstacle: "",
    tomorrowFocus: "周日去买冬装"
  }, "2026-11-28");

  let res = convertReviewToPlan(state, "daily", "2026-11-28", "2026-11-28");
  assert.equal(res.createdCount, 1);
  state = res.state;
  assert.equal(state.planner.items.length, 1);
  assert.equal(state.planner.items[0].date, "2026-11-29");
  assert.ok(state.reviews.daily["2026-11-28"].convertedTomorrow?.itemId);

  // 重复点击与二次编辑保存后点击均不重复生成
  assert.equal(convertReviewToPlan(state, "daily", "2026-11-28", "2026-11-28").createdCount, 0);
  state = upsertReview(state, "daily", "2026-11-28", {
    mood: 5,
    energy: 4,
    bestThing: "专注两小时，状态很好",
    obstacle: "",
    tomorrowFocus: "周日去买冬装"
  }, "2026-11-28");
  assert.equal(convertReviewToPlan(state, "daily", "2026-11-28", "2026-11-28").createdCount, 0);
  assert.equal(state.planner.items.length, 1);

  // 2. 周复盘转下周一待办
  state = upsertReview(state, "weekly", "2026-W48", {
    wins: "作息稳定",
    improvements: "少刷手机",
    nextWeekPriorities: ["预约牙医", "完成月度预算"]
  }, "2026-11-28");
  res = convertReviewToPlan(state, "weekly", "2026-W48", "2026-11-28");
  assert.equal(res.createdCount, 2);
  state = res.state;
  assert.equal(state.planner.items.filter((i) => i.date === "2026-11-30").length, 2);
  assert.equal(convertReviewToPlan(state, "weekly", "2026-W48", "2026-11-28").createdCount, 0);

  // 3. 月复盘（2024-01）转下月（2024-02-29 截止）长期目标
  state = upsertReview(state, "monthly", "2024-01", {
    gain: "坚持晨读",
    regret: "",
    nextMonthGoal: "二月读完两本历史书"
  }, "2026-11-28");
  res = convertReviewToPlan(state, "monthly", "2024-01", "2026-11-28");
  assert.equal(res.createdCount, 1);
  state = res.state;
  assert.equal(state.planner.goals.length, 1);
  assert.equal(state.planner.goals[0].deadline, "2024-02-29");
  assert.equal(convertReviewToPlan(state, "monthly", "2024-01", "2026-11-28").createdCount, 0);

  // 4. 触及目标 100 个上限时抛错，且绝不写入 convertedGoal 标记
  const fullGoals = Array.from({ length: 100 }, (_, idx) => ({
    id: `g-${idx}`,
    title: `目标${idx}`,
    deadline: null,
    status: "active",
    createdAt: "2026-11-01"
  }));
  let fullGoalState = { ...state, planner: { ...state.planner, goals: fullGoals } };
  fullGoalState = upsertReview(fullGoalState, "monthly", "2026-10", {
    gain: "充实",
    regret: "",
    nextMonthGoal: "十一月新目标"
  }, "2026-11-28");
  assert.throws(() => convertReviewToPlan(fullGoalState, "monthly", "2026-10", "2026-11-28"), /100 个上限/);
  assert.equal(fullGoalState.reviews.monthly["2026-10"].convertedGoal, null);
});

test("结合经期统计在满 2 个周期时输出经期及前 3 天与其他日子的对比，月度和年度汇总高光摘录", () => {
  let state = {
    ...createBaseState("2026-11-10", 28),
    cycles: [28, 29],
    historyStarts: ["2026-09-14", "2026-10-13", "2026-11-10"],
    periodLength: 5,
    reviews: createEmptyReviews()
  };
  assert.equal(getCyclePhaseOnDate(state, "2026-11-11"), "period");
  assert.equal(getCyclePhaseOnDate(state, "2026-11-08"), "pre");
  assert.equal(getCyclePhaseOnDate(state, "2026-11-20"), "other");

  state.planner = upsertItem(state.planner, { id: "a1", title: "任务1", date: "2026-11-10" }, "2026-11-10");
  state.planner = upsertItem(state.planner, { id: "a2", title: "任务2", date: "2026-11-10" }, "2026-11-10");
  state.planner = toggleItemCompletion(state.planner, "a1", "2026-11-10");
  state = upsertReview(state, "daily", "2026-11-10", {
    mood: 3,
    energy: 2,
    bestThing: "早睡休息好",
    obstacle: "",
    tomorrowFocus: ""
  }, "2026-11-10");

  state.planner = upsertGoal(state.planner, { id: "g-nov", title: "十一月小目标", status: "done" }, "2026-11-01");
  state.planner = upsertItem(state.planner, { id: "b1", title: "任务3", date: "2026-11-20", goalId: "g-nov" }, "2026-11-20");
  state.planner = upsertItem(state.planner, { id: "b2", title: "任务4", date: "2026-11-20" }, "2026-11-20");
  state.planner = toggleItemCompletion(state.planner, "b1", "2026-11-20");
  state.planner = toggleItemCompletion(state.planner, "b2", "2026-11-20");
  state = upsertReview(state, "daily", "2026-11-20", {
    mood: 5,
    energy: 5,
    bestThing: "高效推进项目",
    obstacle: "",
    tomorrowFocus: ""
  }, "2026-11-20");

  state = upsertReview(state, "monthly", "2026-11", {
    gain: "学会顺应身体节奏安排重点",
    regret: "",
    nextMonthGoal: ""
  }, "2026-11-30");

  const novSnap = state.reviews.monthly["2026-11"].snapshot;
  assert.equal(novSnap.highlights.length, 2);
  assert.equal(novSnap.completedGoalsCount, 1);
  assert.equal(novSnap.cycleComparison.sufficient, true);
  assert.equal(novSnap.cycleComparison.cycleDaysRate, 50);
  assert.equal(novSnap.cycleComparison.otherDaysRate, 100);
  assert.equal(novSnap.cycleComparison.cycleDaysEnergy, 2);
  assert.equal(novSnap.cycleComparison.otherDaysEnergy, 5);

  const yearSnap = computeReviewSnapshot(state, "yearly", "2026");
  assert.equal(yearSnap.reviewedDaysCount, 2);
  assert.equal(yearSnap.highlights.length, 1);
  assert.equal(yearSnap.highlights[0].text, "学会顺应身体节奏安排重点");
});
