import React, { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import { useVideoPlayer, VideoView } from 'expo-video';
import * as SplashScreenNative from 'expo-splash-screen';

// Prevent the native splash from auto-hiding until the animation is
// actually ready to paint its first frame — otherwise there's a blank
// navy gap between the native splash disappearing and the video starting.
SplashScreenNative.preventAutoHideAsync();

// The exact reference recording — logo, wordmark, and "For Yos" tribute
// are all baked into the video itself, so this component is just a player.
const SOURCE = require('../../assets/splash/splash-animation.mp4');

export default function SplashScreen() {
  const player = useVideoPlayer(SOURCE, (p) => {
    p.loop = false;
    p.muted = true;
  });

  useEffect(() => {
    const subscription = player.addListener('statusChange', ({ status }) => {
      if (status === 'readyToPlay') {
        SplashScreenNative.hideAsync();
        player.play();
      }
    });
    return () => subscription.remove();
  }, [player]);

  return (
    <VideoView
      player={player}
      style={styles.video}
      contentFit="contain"
      nativeControls={false}
      allowsFullscreen={false}
      allowsPictureInPicture={false}
    />
  );
}

const styles = StyleSheet.create({
  video: {
    flex: 1,
    backgroundColor: '#1A1A2E',
  },
});
