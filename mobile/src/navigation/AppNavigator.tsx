import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { useAuthStore } from '../store/authStore';
import { useThemeStore } from '../store/themeStore';
import { driverRegistrationAPI } from '../services/api';
import { colors } from '../utils/theme';

import LandingScreen from '../screens/LandingScreen';
import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import ForgotPasswordScreen from '../screens/ForgotPasswordScreen';
import StudentHomeScreen from '../screens/student/HomeScreen';
import RideMatchingScreen from '../screens/student/RideMatchingScreen';
import RideRatingScreen from '../screens/student/RideRatingScreen';
import DriverHomeScreen from '../screens/driver/DriverHomeScreen';
import DriverRegistrationScreen from '../screens/driver/DriverRegistrationScreen';
import DriverVehicleScreen from '../screens/driver/DriverVehicleScreen';
import DriverPendingScreen from '../screens/driver/DriverPendingScreen';
import ProfileScreen from '../screens/shared/ProfileScreen';
import EditProfileScreen from '../screens/shared/EditProfileScreen';
import SettingsScreen from '../screens/shared/SettingsScreen';
import RideHistoryScreen from '../screens/shared/RideHistoryScreen';
import EarningsScreen from '../screens/driver/EarningsScreen';
import { registerPushToken } from '../utils/registerPushToken';

const Stack = createStackNavigator();

function AuthScreens() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Landing" component={LandingScreen} />
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} />
      <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
    </Stack.Navigator>
  );
}

function StudentScreens() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="StudentHome" component={StudentHomeScreen} />
      <Stack.Screen name="RideMatching" component={RideMatchingScreen} />
      <Stack.Screen name="RideRating" component={RideRatingScreen} />
      <Stack.Screen name="Profile" component={ProfileScreen} />
      <Stack.Screen name="EditProfile" component={EditProfileScreen} />
      <Stack.Screen name="Settings" component={SettingsScreen} />
      <Stack.Screen name="RideHistory" component={RideHistoryScreen} />
    </Stack.Navigator>
  );
}

function DriverScreens({ initialRoute }: { initialRoute: string }) {
  return (
    <Stack.Navigator
      screenOptions={{ headerShown: false }}
      initialRouteName={initialRoute}
    >
      <Stack.Screen name="DriverHome" component={DriverHomeScreen} />
      <Stack.Screen name="DriverRegistration" component={DriverRegistrationScreen} />
      <Stack.Screen name="DriverVehicle" component={DriverVehicleScreen} />
      <Stack.Screen name="DriverPending" component={DriverPendingScreen} />
      <Stack.Screen name="Profile" component={ProfileScreen} />
      <Stack.Screen name="EditProfile" component={EditProfileScreen} />
      <Stack.Screen name="Settings" component={SettingsScreen} />
      <Stack.Screen name="RideHistory" component={RideHistoryScreen} />
      <Stack.Screen name="Earnings" component={EarningsScreen} />
    </Stack.Navigator>
  );
}

function AppScreens() {
  const { isAuthenticated, user } = useAuthStore();
  const [driverInitialRoute, setDriverInitialRoute] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      registerPushToken();
    }
    if (isAuthenticated && user?.role === 'driver') {
      checkDriverStatus();
    }
  }, [isAuthenticated, user]);

  const checkDriverStatus = async () => {
    setChecking(true);
    try {
      const res = await driverRegistrationAPI.getStatus();
      const { approval_status, submission_date } = res.data;
      if (!submission_date) {
        setDriverInitialRoute('DriverRegistration');
      } else if (approval_status === 'pending') {
        setDriverInitialRoute('DriverPending');
      } else {
        setDriverInitialRoute('DriverHome');
      }
    } catch (err) {
      setDriverInitialRoute('DriverRegistration');
    } finally {
      setChecking(false);
    }
  };

  if (checking || (isAuthenticated && user?.role === 'driver' && !driverInitialRoute)) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.dark }}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  if (!isAuthenticated) return <AuthScreens />;
  if (user?.role === 'driver') return <DriverScreens initialRoute={driverInitialRoute!} />;
  return <StudentScreens />;
}

export default function AppNavigator() {
  const { loadFromStorage } = useAuthStore();
  const { loadTheme } = useThemeStore();

  useEffect(() => {
    loadFromStorage();
    loadTheme();
  }, []);

  return (
    <NavigationContainer>
      <AppScreens />
    </NavigationContainer>
  );
}