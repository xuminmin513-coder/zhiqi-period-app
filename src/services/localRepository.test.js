import test from "node:test";
import assert from "node:assert/strict";
import { createBaseState, createDemoState } from "../utils/period.js";
import {
  clearState,
  getStorageUsage,
  LEGACY_BACKUP_KEY,
  loadState,
  saveState,
  STORAGE_KEY,
  STORAGE_WARN_BYTES,
  validateState
} from "./localRepository.js";

function createStorage() {
  const values = new Map();
  return {
    getItem: (key) => (values.has(key) ? values.get(key) : null),
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: (key) => values.delete(key)
  };
}

test("本地 repository 完成 v2 保存、读取和清除闭环", () => {
  globalThis.localStorage = createStorage();
  const state = createDemoState();
  saveState(state);
  assert.deepEqual(loadState(), state);
  assert.ok(getStorageUsage().bytes > 0);
  assert.equal(getStorageUsage().warn, false);
  clearState();
  assert.equal(loadState(), null);
});

test("旧版无 version 记录首次读取时保留原始备份并无损升级至 v2，清除数据时一并清理计划、昵称和 pre-v2 备份键", () => {
  globalThis.localStorage = createStorage();
  const legacyV1 = {
    onboarded: true,
    lastPeriodStart: "2026-11-01",
    periodLength: 5,
    typicalCycle: 29,
    cycles: [29],
    historyStarts: ["2026-10-03", "2026-11-01"],
    logs: { "2026-11-01": { symptoms: ["轻微腰酸"], flow: "medium", note: "旧备注" } },
    settings: { periodReminder: false, discreetNotifications: true }
  };
  const rawLegacy = JSON.stringify(legacyV1);
  localStorage.setItem(STORAGE_KEY, rawLegacy);

  const migrated = loadState();
  assert.equal(migrated.version, 2);
  assert.equal(migrated.lastPeriodStart, "2026-11-01");
  assert.equal(migrated.logs["2026-11-01"].note, "旧备注");
  assert.equal(migrated.settings.periodReminder, false);
  assert.equal(migrated.settings.nickname, "");
  assert.deepEqual(migrated.planner, { items: [], goals: [], completions: {} });
  assert.equal(localStorage.getItem(LEGACY_BACKUP_KEY), rawLegacy);

  // 保存昵称与计划后不会覆盖首次保留的 pre-v2 快照
  saveState({
    ...migrated,
    settings: { ...migrated.settings, nickname: "阿宁" },
    planner: {
      items: [{
        id: "p1",
        title: "喝温水",
        date: "2026-11-27",
        startTime: null,
        endTime: null,
        repeat: { type: "none" },
        repeatEnd: null,
        goalId: null,
        note: "",
        doneAt: null,
        reminder: null,
        createdAt: "2026-11-27"
      }],
      goals: [],
      completions: {}
    }
  });
  assert.equal(localStorage.getItem(LEGACY_BACKUP_KEY), rawLegacy);

  // 清除数据时一并清空主存储（含计划与本地昵称）和 pre-v2 原始备份键
  clearState();
  assert.equal(localStorage.getItem(STORAGE_KEY), null);
  assert.equal(localStorage.getItem(LEGACY_BACKUP_KEY), null);
  assert.equal(getStorageUsage().bytes, 0);
});

test("状态校验补充旧记录缺省字段并拒绝高版本数据", () => {
  const state = createBaseState("2026-11-01", 30);
  delete state.version;
  delete state.settings;
  delete state.logs;
  delete state.planner;
  const validated = validateState(state);
  assert.equal(validated.version, 2);
  assert.deepEqual(validated.settings, { periodReminder: true, discreetNotifications: true, nickname: "" });
  assert.deepEqual(validated.logs, {});
  assert.deepEqual(validated.planner, { items: [], goals: [], completions: {} });
  assert.throws(() => validateState({ ...state, version: 99 }), /更新应用/);
});

test("计划、目标与昵称违反格式或上界时明确拒绝", () => {
  const base = createBaseState("2026-11-01", 30);
  assert.throws(
    () => validateState({ ...base, settings: { ...base.settings, nickname: "超过十二个字符的本地称呼测试" } }),
    /昵称/
  );
  assert.throws(
    () => validateState({
      ...base,
      planner: {
        items: [{
          id: "i1",
          title: "结束早于开始",
          date: "2026-11-27",
          startTime: "14:00",
          endTime: "13:00",
          repeat: { type: "none" },
          repeatEnd: null,
          goalId: null,
          note: "",
          doneAt: null,
          reminder: null,
          createdAt: "2026-11-27"
        }],
        goals: [],
        completions: {}
      }
    }),
    /结束时间/
  );
  assert.throws(
    () => validateState({
      ...base,
      planner: {
        items: [{
          id: "i2",
          title: "缺少起始日的习惯",
          date: null,
          startTime: null,
          endTime: null,
          repeat: { type: "daily" },
          repeatEnd: null,
          goalId: null,
          note: "",
          doneAt: null,
          reminder: null,
          createdAt: "2026-11-27"
        }],
        goals: [],
        completions: {}
      }
    }),
    /起始日期/
  );
});

test("存储用量达到 3 MB 阈值时返回预警标记", () => {
  globalThis.localStorage = createStorage();
  localStorage.setItem(STORAGE_KEY, "a".repeat(Math.ceil(STORAGE_WARN_BYTES / 2) + 10));
  assert.equal(getStorageUsage().warn, true);
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
