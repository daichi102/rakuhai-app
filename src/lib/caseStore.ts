export type PendingCase = {
  id: string;
  subject: string;
  sender: string;
  receivedAt: string;
  preview: string;
  body?: string;
  importedAt: string;
};

export type ManagedCase = PendingCase & {
  transferredAt: string;
};

const PENDING_CASES_KEY = "rakuhai_pending_cases";
const MANAGED_CASES_KEY = "rakuhai_managed_cases";

const parseStorage = <T>(key: string): T[] => {
  if (typeof window === "undefined") {
    return [];
  }

  const raw = window.localStorage.getItem(key);
  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw) as T[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const writeStorage = <T>(key: string, value: T[]) => {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(key, JSON.stringify(value));
};

export const getPendingCases = () => parseStorage<PendingCase>(PENDING_CASES_KEY);

export const savePendingCases = (items: PendingCase[]) => {
  writeStorage(PENDING_CASES_KEY, items);
};

export const getManagedCases = () => parseStorage<ManagedCase>(MANAGED_CASES_KEY);

export const saveManagedCases = (items: ManagedCase[]) => {
  writeStorage(MANAGED_CASES_KEY, items);
};
