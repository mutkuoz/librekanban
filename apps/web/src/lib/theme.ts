/**
 * Client-side theme preferences (mirrors the localStorage pattern in api.ts).
 * `applyTheme()` toggles the `.dark` class on <html> and applies the accent
 * override; call it once on boot (before render) and again whenever a setting
 * changes.
 */

export type ThemeMode = 'light' | 'dark' | 'auto';

const MODE_KEY = 'lk_theme';
const ACCENT_KEY = 'lk_accent';

/** Accent presets → `--color-brand` value (null = use the theme default). */
export const ACCENTS: Record<string, string | null> = {
  default: null,
  blue: 'oklch(0.62 0.19 264)',
  violet: 'oklch(0.60 0.22 300)',
  green: 'oklch(0.60 0.17 155)',
  rose: 'oklch(0.62 0.22 12)',
  amber: 'oklch(0.70 0.17 70)',
};

const read = (k: string): string | null => {
  try {
    return localStorage.getItem(k);
  } catch {
    return null;
  }
};
const write = (k: string, v: string): void => {
  try {
    localStorage.setItem(k, v);
  } catch {}
};

export function getThemeMode(): ThemeMode {
  const v = read(MODE_KEY);
  return v === 'light' || v === 'dark' || v === 'auto' ? v : 'dark';
}

export function getAccent(): string {
  const v = read(ACCENT_KEY);
  return v && v in ACCENTS ? v : 'default';
}

const prefersDark = (): boolean =>
  window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? true;

/** Reconcile the DOM with the stored preferences. */
export function applyTheme(): void {
  const mode = getThemeMode();
  const dark = mode === 'dark' || (mode === 'auto' && prefersDark());
  document.documentElement.classList.toggle('dark', dark);

  const accent = ACCENTS[getAccent()] ?? null;
  if (accent) document.documentElement.style.setProperty('--color-brand', accent);
  else document.documentElement.style.removeProperty('--color-brand');
}

export function setThemeMode(mode: ThemeMode): void {
  write(MODE_KEY, mode);
  applyTheme();
}

export function setAccent(name: string): void {
  write(ACCENT_KEY, name);
  applyTheme();
}
