"use client";
import { useSyncExternalStore } from "react";
const key = "contentforge-workspace-theme";
const event = "contentforge:theme-changed";
function subscribe(notify: () => void) {
  window.addEventListener("storage", notify);
  window.addEventListener(event, notify);
  return () => {
    window.removeEventListener("storage", notify);
    window.removeEventListener(event, notify);
  };
}
function snapshot() {
  try {
    return localStorage.getItem(key) === "dark" ? "dark" : "light";
  } catch {
    return "light";
  }
}
export function useTheme() {
  const theme = useSyncExternalStore(subscribe, snapshot, () => "light");
  function setTheme(value: string) {
    localStorage.setItem(key, value);
    window.dispatchEvent(new Event(event));
  }
  return { theme, setTheme };
}
