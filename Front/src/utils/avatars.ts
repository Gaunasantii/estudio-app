export interface CustomAvatar {
  id: string;
  label: string;
  src: string;
}

export const AVATAR_STORAGE_KEY = 'userAvatarId';

// Agregá aquí tus avatares personalizados (ej.: { id: 'avatar-1', label: 'Avatar 1', src: '/avatars/avatar-1.png' })
export const CUSTOM_AVATARS: { id: string; label: string; src: string }[] = [];

export function getSavedAvatarId(): string | null {
  return localStorage.getItem(AVATAR_STORAGE_KEY);
}

export function setSavedAvatarId(id: string | null): void {
  if (id) {
    localStorage.setItem(AVATAR_STORAGE_KEY, id);
  } else {
    localStorage.removeItem(AVATAR_STORAGE_KEY);
  }
  window.dispatchEvent(new CustomEvent('avatar-change', { detail: id }));
}

export function findAvatarById(id: string | null | undefined): CustomAvatar | undefined {
  if (!id) return undefined;
  return CUSTOM_AVATARS.find((avatar) => avatar.id === id);
}
