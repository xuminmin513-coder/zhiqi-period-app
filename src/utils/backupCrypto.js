const FORMAT = "zhiqi-backup";
const VERSION = 1;
const ITERATIONS = 250000;

export class BackupCryptoError extends Error {
  constructor(message) {
    super(message);
    this.name = "BackupCryptoError";
  }
}

function getCrypto() {
  if (!globalThis.crypto?.subtle) {
    throw new BackupCryptoError("当前环境不支持加密备份，请使用 HTTPS 和新版浏览器");
  }
  return globalThis.crypto;
}

function toBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let offset = 0; offset < bytes.length; offset += 8192) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + 8192));
  }
  return btoa(binary);
}

function fromBase64(value) {
  const binary = atob(value);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

async function deriveKey(password, salt, iterations) {
  const crypto = getCrypto();
  const material = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveKey"]);
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", hash: "SHA-256", salt, iterations },
    material,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

export function isEncryptedBackupDocument(document) {
  return Boolean(document && document.format === FORMAT && document.version === VERSION && document.encryption && document.payload);
}

export async function encryptBackup(state, password) {
  if (typeof password !== "string" || password.length < 8) {
    throw new BackupCryptoError("请设置至少 8 个字符的备份密码");
  }
  const crypto = getCrypto();
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(password, salt, ITERATIONS);
  const payload = new TextEncoder().encode(JSON.stringify({
    app: "知期",
    version: 1,
    exportedAt: new Date().toISOString(),
    data: state
  }));
  const encrypted = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, payload);
  return {
    format: FORMAT,
    version: VERSION,
    encryption: {
      algorithm: "AES-GCM",
      keyLength: 256,
      kdf: "PBKDF2-SHA-256",
      iterations: ITERATIONS,
      salt: toBase64(salt),
      iv: toBase64(iv)
    },
    payload: toBase64(encrypted)
  };
}

export async function decryptBackup(document, password) {
  if (!isEncryptedBackupDocument(document)) throw new BackupCryptoError("这不是受支持的知期加密备份");
  if (typeof password !== "string" || !password) throw new BackupCryptoError("请输入导出备份时设置的密码");
  try {
    const { encryption } = document;
    if (encryption.algorithm !== "AES-GCM" || encryption.kdf !== "PBKDF2-SHA-256" || !Number.isInteger(encryption.iterations) || encryption.iterations < 100000 || encryption.iterations > 1000000) throw new Error("unsupported");
    const salt = fromBase64(encryption.salt);
    const iv = fromBase64(encryption.iv);
    if (salt.length !== 16 || iv.length !== 12) throw new Error("invalid");
    const key = await deriveKey(password, salt, encryption.iterations);
    const decrypted = await getCrypto().subtle.decrypt({ name: "AES-GCM", iv }, key, fromBase64(document.payload));
    const parsed = JSON.parse(new TextDecoder().decode(decrypted));
    if (!parsed.data) throw new Error("missing data");
    return parsed.data;
  } catch {
    throw new BackupCryptoError("无法解密：密码错误、文件损坏或备份格式不受支持");
  }
}
