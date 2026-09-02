import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../services/api';

interface User {
  id: number;
  phone_number: string;
  first_name: string;
  last_name: string;
  email: string;
  role: 'passenger' | 'driver' | 'admin';
  status: string;
}

interface AuthStore {
  token: string | null;
  user: User | null;
  isAuthenticated: boolean;
  setAuth: (token: string, user: User) => Promise<void>;
  logout: () => Promise<void>;
  loadFromStorage: () => Promise<void>;
}

export const useAuthStore = create<AuthStore>((set, get) => ({
  token: null,
  user: null,
  isAuthenticated: false,

  setAuth: async (token, user) => {
    set({ token, user, isAuthenticated: true });
    await AsyncStorage.setItem('token', token);
    await AsyncStorage.setItem('user', JSON.stringify(user));
  },

  logout: async () => {
    // Best-effort — lets the backend take a driver offline if they log out
    // instead of toggling off first (previously this was purely local, so
    // that case left is_online stuck true forever). Not awaited before
    // clearing local state: logout must work instantly regardless of
    // network, same as goOffline's own philosophy on the driver side. The
    // token is passed explicitly (rather than going through the normal
    // request interceptor, which reads it from AsyncStorage) so this call
    // can't race against the removeItem calls right below clearing it out
    // from under that read.
    const token = get().token;
    if (token) {
      api.post('/auth/logout', {}, { headers: { Authorization: `Bearer ${token}` } }).catch(() => {});
    }
    set({ token: null, user: null, isAuthenticated: false });
    await AsyncStorage.removeItem('token');
    await AsyncStorage.removeItem('user');
  },

  loadFromStorage: async () => {
    const token = await AsyncStorage.getItem('token');
    const userStr = await AsyncStorage.getItem('user');
    if (token && userStr) {
      set({
        token,
        user: JSON.parse(userStr),
        isAuthenticated: true,
      });
    }
  },
}));