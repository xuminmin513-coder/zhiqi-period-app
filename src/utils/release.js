export const SUPPORT_EMAIL = (import.meta.env.VITE_SUPPORT_EMAIL || "").trim();
export const SUPPORT_URL = (import.meta.env.VITE_SUPPORT_URL || "").trim();
export const HAS_SUPPORT_CONTACT = Boolean(SUPPORT_EMAIL || SUPPORT_URL);
