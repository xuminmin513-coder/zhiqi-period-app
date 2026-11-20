import test from "node:test";
import assert from "node:assert/strict";
import { createDemoState } from "./period.js";
import { decryptBackup, encryptBackup, isEncryptedBackupDocument } from "./backupCrypto.js";

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
