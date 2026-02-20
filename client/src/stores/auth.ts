import { create } from 'zustand';
import type { User } from '@/types';
import { api } from '@/lib/api';

interface AuthState {
  user: User | null;
  loading: boolean;
  initialized: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, name: string) => Promise<void>;
  logout: () => void;
  loadUser: () => Promise<void>;
  updateProfile: (data: Partial<User>) => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  loading: false,
  initialized: false,

  login: async (email, password) => {
    set({ loading: true });
    try {
      const { user, token } = await api.login({ email, password });
      api.setToken(token);
      set({ user, loading: false });
    } catch (err) {
      set({ loading: false });
      throw err;
    }
  },

  signup: async (email, password, name) => {
    set({ loading: true });
    try {
      const { user, token } = await api.signup({ email, password, name });
      api.setToken(token);
      set({ user, loading: false });
    } catch (err) {
      set({ loading: false });
      throw err;
    }
  },

  logout: () => {
    api.setToken(null);
    set({ user: null });
  },

  loadUser: async () => {
    const token = api.getToken();
    if (!token) {
      set({ initialized: true });
      return;
    }
    try {
      const { user } = await api.getMe();
      set({ user, initialized: true });
    } catch {
      api.setToken(null);
      set({ initialized: true });
    }
  },

  updateProfile: async (data) => {
    const { user } = await api.updateProfile(data);
    set({ user });
  },
}));
