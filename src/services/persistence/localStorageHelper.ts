const ACTIVE_PROJECT_KEY = "presentation-editor:activeProjectId";
const UI_PREFS_KEY = "presentation-editor:uiPrefs";

export interface UiPrefs {
  sidebarCollapsed?: boolean;
  inspectorWidth?: number;
  zoom?: number;
}

export function getActiveProjectId(): string | null {
  try {
    return localStorage.getItem(ACTIVE_PROJECT_KEY);
  } catch {
    return null;
  }
}

export function setActiveProjectId(projectId: string | null): void {
  try {
    if (projectId === null) {
      localStorage.removeItem(ACTIVE_PROJECT_KEY);
    } else {
      localStorage.setItem(ACTIVE_PROJECT_KEY, projectId);
    }
  } catch {
    // localStorage may be unavailable in private mode
  }
}

export function getUiPrefs(): UiPrefs | null {
  try {
    const raw = localStorage.getItem(UI_PREFS_KEY);
    if (!raw) {
      return null;
    }
    return JSON.parse(raw) as UiPrefs;
  } catch {
    return null;
  }
}

export function setUiPrefs(prefs: UiPrefs): void {
  try {
    localStorage.setItem(UI_PREFS_KEY, JSON.stringify(prefs));
  } catch {
    // ignore
  }
}

export function clearLocalPreferences(): void {
  try {
    localStorage.removeItem(ACTIVE_PROJECT_KEY);
    localStorage.removeItem(UI_PREFS_KEY);
  } catch {
    // ignore
  }
}
