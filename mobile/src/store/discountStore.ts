import { create } from 'zustand';

export interface DiscountCode {
  id: number;
  code: string;
  type: 'percent' | 'flat';
  value: string | number;
  min_fare_condition: string | number | null;
  time_condition: 'day' | 'night' | null;
}

interface DiscountState {
  // Set when a listed code is picked from the Discounts tab — the full
  // object is known, so HomeScreen can show an accurate discounted-fare
  // preview before the ride is even requested.
  selected: DiscountCode | null;
  // Set either way (listed pick or manual entry) — this is what actually
  // gets sent with the ride request. For a manually typed hidden code,
  // `selected` stays null since its value/conditions aren't known
  // client-side; the server is always the real source of truth regardless.
  selectedCodeString: string | null;
  setSelectedCode: (code: DiscountCode) => void;
  setManualCode: (codeString: string) => void;
  clear: () => void;
}

export const useDiscountStore = create<DiscountState>((set) => ({
  selected: null,
  selectedCodeString: null,
  setSelectedCode: (code) => set({ selected: code, selectedCodeString: code.code }),
  setManualCode: (codeString) => set({ selected: null, selectedCodeString: codeString.trim().toUpperCase() }),
  clear: () => set({ selected: null, selectedCodeString: null }),
}));
