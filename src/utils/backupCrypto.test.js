import test from "node:test";
import assert from "node:assert/strict";
import { createDemoState } from "./period.js";
import { decryptBackup, encryptBackup, isEncryptedBackupDocument } from "./backupCrypto.js";
import { loadState, saveState, validateState } from "../services/localRepository.js";

test("加密备份可用正确密码完整恢复", async () => {
  const state = createDemoState();
  const encrypted = await encryptBackup(state, "correct-horse-2026");
  assert.equal(isEncryptedBackupDocument(encrypted), true);
  assert.equal(encrypted.encryption.algorithm, "AES-GCM");
  assert.equal(encrypted.encryption.kdf, "PBKDF2-SHA-256");
  assert.notEqual(JSON.stringify(encrypted).includes("轻微腰酸"), true);
  assert.deepEqual(await decryptBackup(encrypted, "correct-horse-2026"), state);
});

test("错误密码不会恢复任何健康记录", async () => {
  const encrypted = await encryptBackup(createDemoState(), "right-password");
  await assert.rejects(() => decryptBackup(encrypted, "wrong-password"), /密码错误/);
});

test("每次加密使用不同的 salt 和 IV", async () => {
  const state = createDemoState();
  const first = await encryptBackup(state, "same-password");
  const second = await encryptBackup(state, "same-password");
  assert.notEqual(first.encryption.salt, second.encryption.salt);
  assert.notEqual(first.encryption.iv, second.encryption.iv);
  assert.notEqual(first.payload, second.payload);
});

test("短密码和损坏文件被明确拒绝", async () => {
  await assert.rejects(() => encryptBackup(createDemoState(), "short"), /至少 8 个字符/);
  const encrypted = await encryptBackup(createDemoState(), "valid-password");
  await assert.rejects(() => decryptBackup({ ...encrypted, payload: "broken" }, "valid-password"), /无法解密/);
});

test("包含计划、目标与本地昵称的状态可完整加密备份恢复，导入老版本 v1 加密备份自动无损升级到 v2", async () => {
  const values = new Map();
  globalThis.localStorage = {
    getItem: (key) => (values.has(key) ? values.get(key) : null),
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: (key) => values.delete(key)
  };

  const demo = createDemoState();
  const richState = validateState({
    ...demo,
    settings: { ...demo.settings, nickname: "小满" }
  });
  const encrypted = await encryptBackup(richState, "workbench-pass-2026");
  const restored = validateState(await decryptBackup(encrypted, "workbench-pass-2026"));
  assert.deepEqual(restored, richState);

  const legacyV1Payload = {
    onboarded: true,
    lastPeriodStart: "2026-10-10",
    periodLength: 6,
    typicalCycle: 28,
    cycles: [28, 30],
    historyStarts: ["2026-08-13", "2026-09-10", "2026-10-10"],
    logs: { "2026-10-10": { symptoms: ["疲惫"], flow: "heavy", note: "老备份备注" } },
    settings: { periodReminder: false, discreetNotifications: true }
  };
  const encryptedLegacyV1 = await encryptBackup(legacyV1Payload, "legacy-pass-2026");
  const decryptedLegacy = await decryptBackup(encryptedLegacyV1, "legacy-pass-2026");
  const migratedFromBackup = validateState(decryptedLegacy);
  saveState(migratedFromBackup);
  const persisted = loadState();

  assert.equal(persisted.version, 2);
  assert.equal(persisted.lastPeriodStart, "2026-10-10");
  assert.equal(persisted.periodLength, 6);
  assert.deepEqual(persisted.cycles, [28, 30]);
  assert.equal(persisted.logs["2026-10-10"].note, "老备份备注");
  assert.equal(persisted.settings.periodReminder, false);
  assert.equal(persisted.settings.nickname, "");
  assert.deepEqual(persisted.planner, { items: [], goals: [], completions: {} });
});
