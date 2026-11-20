import test from "node:test";
import assert from "node:assert/strict";
import { createBaseState, createDemoState } from "../utils/period.js";
import { clearState, loadState, saveState, STORAGE_KEY, validateState } from "./localRepository.js";

function createStorage() {
  const values = new Map();
  return {
    getItem: (key) => values.has(key) ? values.get(key) : null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: (key) => values.delete(key)
  };
}

test("本地 repository 完成保存、读取和清除闭环", () => {
  globalThis.localStorage = createStorage();
  const state = createDemoState();
  saveState(state);
  assert.deepEqual(loadState(), state);
  clearState();
  assert.equal(loadState(), null);
});

test("状态校验补充旧记录缺省字段", () => {
  const state = createBaseState("2026-11-01", 30);
  delete state.settings;
  delete state.logs;
  const validated = validateState(state);
  assert.deepEqual(validated.settings, { periodReminder: true, discreetNotifications: true });
  assert.deepEqual(validated.logs, {});
});

test("无效日期和不一致的最近经期会被拒绝", () => {
  const state = createBaseState("2026-11-01", 30);
  assert.throws(() => validateState({ ...state, lastPeriodStart: "2026-02-30" }), /日期无效/);
  assert.throws(() => validateState({ ...state, lastPeriodStart: "2026-11-02" }), /不一致/);
});

test("损坏的本地 JSON 不会被静默当成空记录", () => {
  globalThis.localStorage = createStorage();
  localStorage.setItem(STORAGE_KEY, "{broken");
  assert.throws(() => loadState(), /无法读取/);
});

test("本地保存异常会返回可见错误", () => {
  globalThis.localStorage = { ...createStorage(), setItem: () => { throw new Error("quota"); } };
  assert.throws(() => saveState(createDemoState()), /保存失败/);
});
