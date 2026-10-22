import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
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
    // The login token (and the user object it's paired with) now lives in
    // the OS keychain/keystore via SecureStore instead of plain AsyncStorage
    // — AsyncStorage is unencrypted on-device storage, readable by anything
    // with filesystem access (a rooted/jailbroken device, certain backup
    // extraction tools), which was the actual exposure for a value that
    // authenticates as the user for up to 30 days.
    await SecureStore.setItemAsync('token', token);
    await SecureStore.setItemAsync('user', JSON.stringify(user));
  },

  logout: async () => {
    // Best-effort — lets the backend take a driver offline if they log out
    // instead of toggling off first (previously this was purely local, so
    // that case left is_online stuck true forever). Not awaited before
    // clearing local state: logout must work instantly regardless of
    // network, same as goOffline's own philosophy on the driver side. The
    // token is passed explicitly (rather than going through the normal
    // request interceptor, which reads it from SecureStore) so this call
    // can't race against the delete calls right below clearing it out
    // from under that read.
    const token = get().token;
    if (token) {
      api.post('/auth/logout', {}, { headers: { Authorization: `Bearer ${token}` } }).catch(() => {});
    }
    set({ token: null, user: null, isAuthenticated: false });
    await SecureStore.deleteItemAsync('token');
    await SecureStore.deleteItemAsync('user');
    // Also clear any pre-migration copy (see loadFromStorage) in case this
    // account logged out before ever triggering that one-time migration —
    // otherwise a stale, unencrypted copy of the token would keep sitting
    // in AsyncStorage indefinitely after "logging out."
    await AsyncStorage.multiRemove(['token', 'user']);
  },

  loadFromStorage: async () => {
    let token = await SecureStore.getItemAsync('token');
    let userStr = await SecureStore.getItemAsync('user');

    if (!token || !userStr) {
      // One-time migration for sessions that were created before SecureStore
      // was wired up — without this, everyone already logged in would be
      // silently signed out the moment they update, since the AsyncStorage
      // key the app used to read is now never checked again on its own.
      const legacyToken = await AsyncStorage.getItem('token');
      const legacyUserStr = await AsyncStorage.getItem('user');
      if (legacyToken && legacyUserStr) {
        token = legacyToken;
        userStr = legacyUserStr;
        await SecureStore.setItemAsync('token', legacyToken);
        await SecureStore.setItemAsync('user', legacyUserStr);
        await AsyncStorage.multiRemove(['token', 'user']);
      }
    }

    if (token && userStr) {
      set({
        token,
        user: JSON.parse(userStr),
        isAuthenticated: true,
      });
    }
  },
}));
