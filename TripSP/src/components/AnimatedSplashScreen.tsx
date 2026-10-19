import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet, ActivityIndicator } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';

interface AnimatedSplashScreenProps {
  onAnimationComplete: () => void;
}

export default function AnimatedSplashScreen({ onAnimationComplete }: AnimatedSplashScreenProps) {
  const opacityAnim = useRef(new Animated.Value(0)).current;
  
  useEffect(() => {
    // Hide the native splash screen immediately when this component mounts
    SplashScreen.hideAsync().catch(() => {});

    // Start animation immediately upon mount
    Animated.timing(opacityAnim, {
      toValue: 1,
      duration: 1000,
      useNativeDriver: true,
    }).start();

    // Total visibility exactly 2.5s
    const timer = setTimeout(() => {
      Animated.timing(opacityAnim, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }).start(() => {
        onAnimationComplete();
      });
    }, 2500);

    return () => clearTimeout(timer);
  }, [opacityAnim, onAnimationComplete]);

  return (
    <View style={styles.container}>
      <Animated.Image
        source={require('../../assets/images/TripSP_App_Loading_Screen.png')}
        style={[
          styles.image,
          { opacity: opacityAnim },
        ]}
        resizeMode="cover"
      />
      
      <Animated.View style={[styles.bottomContainer, { opacity: opacityAnim }]}>
        <ActivityIndicator size="large" color="#C5955D" />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#030F13',
  },
  image: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
  },
  bottomContainer: {
    position: 'absolute',
    bottom: 80,
    left: 0,
    right: 0,
    alignItems: 'center',
  }
});
