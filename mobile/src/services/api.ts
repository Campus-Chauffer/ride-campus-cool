import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const BASE_URL = 'https://ride-campus-cool-production.up.railway.app/api';

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
});

// Request interceptor — attach token
api.interceptors.request.use(async (config) => {
  try {
    const token = await Promise.race([
      AsyncStorage.getItem('token'),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), 3000))
    ]);
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  } catch (err) {
    console.log('Token fetch error:', err);
  }
  return config;
});

// Response interceptor — handle 401 token expiry
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      try {
        await AsyncStorage.multiRemove(['token', 'user']);
      } catch (e) {}
      // Import dynamically to avoid circular dependency
      const { useAuthStore } = require('../store/authStore');
      useAuthStore.getState().logout();
    }
    return Promise.reject(error);
  }
);

// Retry interceptor — retry once on network errors
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const config = error.config;
    if (!error.response && !config._retry) {
      // Network error — wait 2s and retry once
      config._retry = true;
      await new Promise(resolve => setTimeout(resolve, 2000));
      return api(config);
    }
    return Promise.reject(error);
  }
);

export const authAPI = {
  requestOTP: (phone_number: string) =>
    api.post('/auth/request-otp', { phone_number }),

  verifyOTP: (phone_number: string, otp_code: string) =>
    api.post('/auth/verify-otp', { phone_number, otp_code }),

  register: (data: {
    phone_number: string;
    first_name: string;
    last_name: string;
    email: string;
    password: string;
    role: string;
  }) => api.post('/auth/register', data),

  login: (identifier: string, password: string) =>
    api.post('/auth/login', { identifier, password }),

  forgotPassword: (email: string) =>
    api.post('/auth/forgot-password', { email }),

  resetPassword: (phone_number: string, otp_code: string, new_password: string) =>
    api.post('/auth/reset-password', { phone_number, otp_code, new_password }),

  getProfile: () => api.get('/auth/profile'),

  savePushToken: (push_token: string) =>
    api.post('/auth/push-token', { push_token }),
};

export const ridesAPI = {
  requestRide: (data: {
    pickup_lat: number;
    pickup_lng: number;
    dropoff_lat: number;
    dropoff_lng: number;
    pickup_address: string;
    dropoff_address: string;
  }) => api.post('/rides/request', data),

  getHistory: () => api.get('/rides/history'),

  cancelRide: (trip_id: number) =>
    api.delete(`/rides/cancel/${trip_id}`),
};

export const driverAPI = {
  goOnline: (lat: number, lng: number) =>
    api.post('/drivers/online', { lat, lng }),

  goOffline: () => api.post('/drivers/offline'),

  updateLocation: (lat: number, lng: number) =>
    api.patch('/drivers/location', { lat, lng }),

  checkOffers: () => api.get('/drivers/offers'),

  acceptOffer: (trip_id: number) =>
    api.patch(`/drivers/accept/${trip_id}`),

  startTrip: (trip_id: number) =>
    api.patch(`/drivers/start/${trip_id}`),

  completeTrip: (trip_id: number) =>
    api.patch(`/drivers/complete/${trip_id}`),
  
  getTripStatus: (tripId: number) => api.get(`/drivers/trip/${tripId}`),
  getHistory: () => api.get('/drivers/history'),
};

export const walletAPI = {
  getWallet: () => api.get('/wallet'),
  getLedger: () => api.get('/wallet/ledger'),
};

export const driverRegistrationAPI = {
  submit: (data: any) => api.post('/driver-registration/submit', data),
  getStatus: () => api.get('/driver-registration/status'),
};

export const profileAPI = {
  getProfile: (user_id: number) => api.get(`/ratings/profile/${user_id}`),
  updateProfile: (data: any) => api.patch('/auth/profile', data),
};

export const ratingsAPI = {
  ratePassenger: (trip_id: number, rating: number, comment: string) =>
    api.post(`/ratings/${trip_id}/rate-passenger`, { rating, comment }),
  rateDriver: (trip_id: number, rating: number, comment: string) =>
    api.post(`/ratings/${trip_id}/rate-driver`, { rating, comment }),
};

export default api;