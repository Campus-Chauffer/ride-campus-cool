import React from 'react';
import { View, Image, Text, StyleSheet } from 'react-native';

export default function SplashScreen() {
  return (
    <View style={styles.container}>
      <Image
        source={require('../../assets/cc-logo.jpg')}
        style={styles.logo}
        resizeMode="contain"
      />
      <Text style={styles.tribute}>For Yos</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#C89B3C',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    width: 140,
    height: 140,
  },
  tribute: {
    position: 'absolute',
    bottom: 60,
    fontFamily: 'Georgia',
    fontStyle: 'italic',
    fontSize: 22,
    color: '#000000',
  },
});