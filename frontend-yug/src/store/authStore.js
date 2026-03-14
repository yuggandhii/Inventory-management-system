import { create } from 'zustand';

export const useAuthStore = create((set, get) => ({
  accessToken: null,
  user: null,
  get isAuthenticated() {
    return !!get().accessToken;
  },
  setAuth: (accessToken, user) => set({ accessToken, user }),
  clearAuth: () => set({ accessToken: null, user: null }),
}));
