import { create } from 'zustand';

interface Trip {
  id: number;
  passenger_id: number;
  driver_id: number | null;
  pickup_lat: number;
  pickup_lng: number;
  dropoff_lat: number;
  dropoff_lng: number;
  pickup_address: string;
  dropoff_address: string;
  fare: string;
  commission: string;
  status: string;
  created_at: string;
}

interface DriverLocation {
  latitude: number;
  longitude: number;
}

interface RideStore {
  activeRide: Trip | null;
  pendingOffer: Trip | null;
  history: Trip[];
  driverLocation: DriverLocation | null;
  setActiveRide: (ride: Trip | null) => void;
  setPendingOffer: (offer: Trip | null) => void;
  setHistory: (history: Trip[]) => void;
  setDriverLocation: (location: DriverLocation) => void;
  clearRide: () => void;
}

export const useRideStore = create<RideStore>((set) => ({
  activeRide: null,
  pendingOffer: null,
  history: [],
  driverLocation: null,

  setActiveRide: (ride) => set({ activeRide: ride }),
  setPendingOffer: (offer) => set({ pendingOffer: offer }),
  setHistory: (history) => set({ history }),
  setDriverLocation: (location) => set({ driverLocation: location }),
  clearRide: () => set({
    activeRide: null,
    pendingOffer: null,
    driverLocation: null,
  }),
}));