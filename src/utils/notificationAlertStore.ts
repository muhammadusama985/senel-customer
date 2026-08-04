// Shared store that tracks notification IDs the user has already seen as a
// popup alert. Both the global Header popup and the per-page Notifications
// popup use this so the same notification never fires a popup twice.

const STORAGE_KEY = 'senel.seenNotificationAlertIds';

const readFromStorage = (): Set<string> => {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? new Set<string>(parsed) : new Set();
  } catch {
    return new Set();
  }
};

const writeToStorage = (ids: Set<string>) => {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(ids)));
  } catch {
    /* swallow */
  }
};

let seenIds: Set<string> = readFromStorage();

export const markNotificationAlertSeen = (id: string): void => {
  if (!id) return;
  seenIds.add(id);
  writeToStorage(seenIds);
};

export const hasNotificationAlertBeenSeen = (id: string): boolean => {
  if (!id) return false;
  return seenIds.has(id);
};

export const resetNotificationAlertSeen = (): void => {
  seenIds = new Set();
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    /* swallow */
  }
};