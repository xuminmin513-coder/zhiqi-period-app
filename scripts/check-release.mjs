import { readFile, access } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
if (typeof process.loadEnvFile === "function") {
  try {
    process.loadEnvFile(path.join(root, ".env"));
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
}
const requiredFiles = [
  "dist/index.html",
  "dist/manifest.webmanifest",
  "dist/sw.js",
  "dist/icon-192.png",
  "dist/icon-512.png",
  "dist/apple-touch-icon.png"
];

for (const file of requiredFiles) {
  await access(path.join(root, file));
}

const html = await readFile(path.join(root, "dist/index.html"), "utf8");
if (/(?:src|href)="\/assets\//.test(html)) {
  throw new Error("构建包含根路径资源引用，无法安全部署到 GitHub Pages 子路径");
}

const manifest = JSON.parse(await readFile(path.join(root, "dist/manifest.webmanifest"), "utf8"));
if (manifest.display !== "standalone" || !Array.isArray(manifest.icons) || manifest.icons.length < 2) {
  throw new Error("PWA 清单缺少独立显示模式或必要图标");
}

const serviceWorker = await readFile(path.join(root, "dist/sw.js"), "utf8");
if (!serviceWorker.includes("precacheApplication") || !serviceWorker.includes('event.request.mode === "navigate"')) {
  throw new Error("Service Worker 缺少构建资源预缓存或安全导航回退");
}

const email = (process.env.VITE_SUPPORT_EMAIL || "").trim();
const supportUrl = (process.env.VITE_SUPPORT_URL || "").trim();
if (!email && !supportUrl) {
  throw new Error("正式发布被阻止：请配置 VITE_SUPPORT_EMAIL 或 VITE_SUPPORT_URL 作为真实支持入口");
}
if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
  throw new Error("VITE_SUPPORT_EMAIL 格式无效");
}
if (supportUrl) {
  const parsed = new URL(supportUrl);
  if (parsed.protocol !== "https:") throw new Error("VITE_SUPPORT_URL 必须使用 HTTPS");
}

console.log("发布检查通过：构建资源、PWA 清单、相对路径和支持入口均已验证。");
