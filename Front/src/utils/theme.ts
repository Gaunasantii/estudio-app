export type ThemeMode = 'light' | 'dark';

export const THEME_STORAGE_KEY = 'estudioapp-theme';

export function getSavedTheme(): ThemeMode {
  if (typeof window === 'undefined') return 'light';
  const stored = localStorage.getItem(THEME_STORAGE_KEY);
  if (stored === 'dark' || stored === 'light') {
    return stored;
  }
  return 'light';
}

export function applyThemeToDocument(theme: ThemeMode): void {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  if (theme === 'dark') {
    root.classList.add('dark');
    root.style.colorScheme = 'dark';
  } else {
    root.classList.remove('dark');
    root.style.colorScheme = 'light';
  }
}

export function setTheme(theme: ThemeMode): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(THEME_STORAGE_KEY, theme);
  applyThemeToDocument(theme);
  window.dispatchEvent(new CustomEvent<ThemeMode>('theme-change', { detail: theme }));
}

export function toggleTheme(): ThemeMode {
  const next: ThemeMode = getSavedTheme() === 'dark' ? 'light' : 'dark';
  setTheme(next);
  return next;
}

export function initTheme(): ThemeMode {
  const current = getSavedTheme();
  applyThemeToDocument(current);
  return current;
}

// Aplicar la clase dark sobre document.documentElement desde el arranque
if (typeof window !== 'undefined') {
  initTheme();
}
