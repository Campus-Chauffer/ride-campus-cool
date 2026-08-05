import React, { useEffect, useState } from 'react';
import { View, Image, Text, StyleSheet } from 'react-native';
import * as Font from 'expo-font';
import * as SplashScreenNative from 'expo-splash-screen';

// Prevent the native splash from auto-hiding until our fonts are ready —
// otherwise there's a flash of unstyled text before Dancing Script loads.
SplashScreenNative.preventAutoHideAsync();

export default function SplashScreen() {
  const [fontsLoaded, setFontsLoaded] = useState(false);

  useEffect(() => {
    async function loadFonts() {
      await Font.loadAsync({
        'DancingScript-Regular': require('../../assets/fonts/DancingScript-Regular.ttf'),
      });
      setFontsLoaded(true);
      await SplashScreenNative.hideAsync();
    }
    loadFonts();
  }, []);

  if (!fontsLoaded) {
    // Render a plain black view while the font loads — avoids a flash of
    // Georgia/system-default text before Dancing Script is ready.
    return <View style={styles.container} />;
  }

  return (
    <View style={styles.container}>
      <Image
        source={require('../../assets/cc-logo.jpg')}
        style={styles.logo}
        resizeMode="contain"
      />
      <Text style={styles.brandName}>Campus Chauffeur</Text>
      <Text style={styles.tribute}>For Yos</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    width: 140,
    height: 140,
  },
  brandName: {
    marginTop: 16,
    fontSize: 24,
    fontWeight: '700',
    color: '#FBBF24',
    letterSpacing: 0.5,
  },
  tribute: {
    position: 'absolute',
    bottom: 60,
    fontFamily: 'DancingScript-Regular',
    fontSize: 28,
    color: '#FBBF24',
  },
});