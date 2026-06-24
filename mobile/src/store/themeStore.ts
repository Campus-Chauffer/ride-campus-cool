import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface ThemeState {
  isDark: boolean;
  toggleTheme: () => void;
  loadTheme: () => void;
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  isDark: false,

  loadTheme: async () => {
    try {
      const saved = await AsyncStorage.getItem('theme');
      if (saved !== null) {
        set({ isDark: saved === 'dark' });
      }
    } catch (err) {
      console.log('Theme load error:', err);
    }
  },

  toggleTheme: async () => {
    const newIsDark = !get().isDark;
    set({ isDark: newIsDark });
    try {
      await AsyncStorage.setItem('theme', newIsDark ? 'dark' : 'light');
    } catch (err) {
      console.log('Theme save error:', err);
    }
  },
}));