import React, { useEffect, useRef } from 'react';
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

// If the player never reports readyToPlay within this window (corrupt
// file, a device that fails to init the decoder, anything), bail out
// rather than leave the native splash stuck on screen forever.
const READY_TIMEOUT_MS = 2000;

interface Props {
  onFinished: () => void;
}

export default function SplashScreen({ onFinished }: Props) {
  const player = useVideoPlayer(SOURCE, (p) => {
    p.loop = false;
    p.muted = true;
  });

  const settledRef = useRef(false); // native splash has been told to hide
  const finishedRef = useRef(false); // onFinished has fired

  const hideNativeSplash = () => {
    if (settledRef.current) return;
    settledRef.current = true;
    SplashScreenNative.hideAsync();
  };

  const finish = () => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    onFinished();
  };

  useEffect(() => {
    const statusSub = player.addListener('statusChange', ({ status }) => {
      if (status === 'readyToPlay') {
        hideNativeSplash();
        player.play();
      } else if (status === 'error') {
        // Couldn't load the video at all — don't block the app on it.
        hideNativeSplash();
        finish();
      }
    });

    const endSub = player.addListener('playToEnd', () => {
      finish();
    });

    const readyTimeout = setTimeout(() => {
      hideNativeSplash();
      // Give it a little longer to actually finish playing if it did
      // become ready right at the timeout boundary; otherwise just move on.
      if (!finishedRef.current) finish();
    }, READY_TIMEOUT_MS);

    return () => {
      statusSub.remove();
      endSub.remove();
      clearTimeout(readyTimeout);
    };
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
