import test from "node:test";
import assert from "node:assert/strict";
import { addDays, diffDays, getToday, toISO } from "./date.js";
import { calculateCycles, createBaseState, createDemoState, getPrediction } from "./period.js";

test("演示状态包含完整历史与本地设置", () => {
  const state = createDemoState();
  assert.equal(state.historyStarts.length, 6);
  assert.equal(state.cycles.length, 5);
  assert.equal(state.settings.discreetNotifications, true);
});

test("有历史时使用中位周期间隔并输出两天浮动区间", () => {
  const state = createDemoState();
  const prediction = getPrediction(state);
  assert.equal(prediction.cycle, 30);
  assert.equal(prediction.spread, 2);
  assert.equal(prediction.evidenceCount, 5);
  assert.equal(prediction.center, toISO(addDays(state.lastPeriodStart, 30)));
  assert.equal(diffDays(prediction.end, prediction.start), 4);
});

test("数据不足时扩大区间并明确初步估算", () => {
  const state = createBaseState("2026-11-01", 30);
  const prediction = getPrediction(state);
  assert.equal(prediction.spread, 4);
  assert.equal(prediction.evidenceCount, 0);
  assert.equal(prediction.confidence, "当前仅为初步估算");
});

test("从历史经期开始日计算有效周期间隔", () => {
  assert.deepEqual(calculateCycles(["2026-08-01", "2026-08-30", "2026-09-30"]), [29, 31]);
});

test("日期计算覆盖闰年且不受 UTC 换算影响", () => {
  assert.equal(diffDays("2024-03-01", "2024-02-28"), 2);
  assert.equal(toISO(addDays(getToday(), 0)).length, 10);
});
