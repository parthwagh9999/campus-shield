import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAppStore } from './src/store';

import LoginScreen from './src/screens/LoginScreen';
import RegisterScreen from './src/screens/RegisterScreen';
import OnboardingScreen from './src/screens/OnboardingScreen';
import HomeScreen from './src/screens/HomeScreen';
import TripScreen from './src/screens/TripScreen';
import CheckInScreen from './src/screens/CheckInScreen';
import SOSScreen from './src/screens/SOSScreen';

const Stack = createNativeStackNavigator();

export default function App() {
  const token = useAppStore((s) => s.token);
  const factorsConfigured = useAppStore((s) => s.factorsConfigured);

  return (
    <NavigationContainer>
      <StatusBar style="light" />
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: '#020617' },
          animation: 'fade',
        }}
      >
        {!token ? (
          <>
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Register" component={RegisterScreen} />
          </>
        ) : !factorsConfigured ? (
          <Stack.Screen name="Onboarding" component={OnboardingScreen} />
        ) : (
          <>
            <Stack.Screen name="Home" component={HomeScreen} />
            <Stack.Screen name="Trip" component={TripScreen} />
            <Stack.Screen name="CheckIn" component={CheckInScreen} />
            <Stack.Screen name="SOS" component={SOSScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
