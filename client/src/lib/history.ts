const HISTORY_KEY = "sf_watch_history";
const MAX_HISTORY = 20;

export interface HistoryItem {
  id: string;
  name: string;
  poster?: string;
  provider: string;
  watchedAt: number;
}

export function getHistory(): HistoryItem[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function addToHistory(item: Omit<HistoryItem, "watchedAt">) {
  try {
    const history = getHistory().filter((h) => h.id !== item.id);
    const updated = [{ ...item, watchedAt: Date.now() }, ...history].slice(0, MAX_HISTORY);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
  } catch {}
}

export function removeFromHistory(id: string) {
  try {
    const updated = getHistory().filter((h) => h.id !== id);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
  } catch {}
}

export function clearHistory() {
  try {
    localStorage.removeItem(HISTORY_KEY);
  } catch {}
}
