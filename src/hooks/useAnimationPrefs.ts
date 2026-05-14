"use client";

import { useEffect, useState, useCallback } from "react";

export interface AnimationPrefs {
  pageTransition: boolean;   // Fade + slide khi chuyển trang
  sidebarMotion:  boolean;   // Slide/width animation của sidebar
}

const STORAGE_KEY = "app_animation_prefs";

const DEFAULTS: AnimationPrefs = {
  pageTransition: true,
  sidebarMotion:  true,
};

function readPrefs(): AnimationPrefs {
  if (typeof window === "undefined") return DEFAULTS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULTS;
    return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch {
    return DEFAULTS;
  }
}

function writePrefs(prefs: AnimationPrefs) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs)); } catch { /* ignore */ }
}

// Sự kiện custom để đồng bộ giữa các component trong cùng tab
const EVENT = "app:animprefs";

export function useAnimationPrefs() {
  // Khởi tạo bằng DEFAULTS để SSR và client render đầu tiên giống nhau → không hydration mismatch
  const [prefs, setPrefsState] = useState<AnimationPrefs>(DEFAULTS);

  // Sau khi mount (client-only), sync giá trị thực từ localStorage
  useEffect(() => {
    setPrefsState(readPrefs());
  }, []);

  // Lắng nghe thay đổi từ component khác (AccountSettingsModal)
  useEffect(() => {
    const handler = () => setPrefsState(readPrefs());
    window.addEventListener(EVENT, handler);
    return () => window.removeEventListener(EVENT, handler);
  }, []);

  const setPrefs = useCallback((next: Partial<AnimationPrefs>) => {
    setPrefsState(prev => {
      const merged = { ...prev, ...next };
      writePrefs(merged);
      // Dispatch sau render cycle hiện tại để tránh "setState in render" warning
      setTimeout(() => window.dispatchEvent(new Event(EVENT)), 0);
      return merged;
    });
  }, []);

  return { prefs, setPrefs };
}
