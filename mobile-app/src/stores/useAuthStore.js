// Zustand store for auth state
import { create } from 'zustand';

const useAuthStore = create((set) => ({
  user: null,
  accessToken: null,
  refreshToken: null,
  setAuth: (payload) => set(payload),
  logout: () => set({ user: null, accessToken: null, refreshToken: null }),
}));

export default useAuthStore;
