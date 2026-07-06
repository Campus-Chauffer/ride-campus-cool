import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { driverAPI } from '../services/api';

export const BACKGROUND_LOCATION_TASK = 'background-location-task';

// Define the background task — this runs even when app is closed
TaskManager.defineTask(BACKGROUND_LOCATION_TASK, async ({ data, error }: any) => {
  if (error) {
    console.log('Background location error:', error);
    return;
  }
  if (data) {
    const { locations } = data;
    const location = locations[0];
    if (location) {
      try {
        // Send location to backend silently in background
        await driverAPI.updateLocation(
          location.coords.latitude,
          location.coords.longitude
        );
      } catch (err) {
        // Silently fail — don't crash the background task
      }
    }
  }
});

export const startBackgroundLocation = async () => {
  try {
    // Request background location permission
    const { status } = await Location.requestBackgroundPermissionsAsync();
    if (status !== 'granted') {
      console.log('Background location permission denied');
      return;
    }

    const isRunning = await Location.hasStartedLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
    if (isRunning) return; // already running

    await Location.startLocationUpdatesAsync(BACKGROUND_LOCATION_TASK, {
      accuracy: Location.Accuracy.Balanced,
      timeInterval: 2 * 60 * 1000,   // every 2 minutes — matches your foreground interval
      distanceInterval: 50,            // or if moved 50 metres, whichever comes first
      foregroundService: {             // Android requires this to show a notification
        notificationTitle: 'Campus Chauffeur',
        notificationBody: 'You are online and available for rides',
        notificationColor: '#FF6B00',
      },
      pausesUpdatesAutomatically: false,
      showsBackgroundLocationIndicator: true, // iOS blue bar
    });

    console.log('Background location started');
  } catch (err) {
    console.log('Background location start error:', err);
  }
};

export const stopBackgroundLocation = async () => {
  try {
    const isRunning = await Location.hasStartedLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
    if (isRunning) {
      await Location.stopLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
      console.log('Background location stopped');
    }
  } catch (err) {
    console.log('Background location stop error:', err);
  }
};