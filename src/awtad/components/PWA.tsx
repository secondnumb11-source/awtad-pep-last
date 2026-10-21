import { useEffect } from "react";
// تسجيل عامل الخدمة ليصبح الموقع قابلًا للتثبيت كتطبيق على الجوال
export function PWA() { useEffect(() => { if ("serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js").catch(() => {}); }, []); return null; }
