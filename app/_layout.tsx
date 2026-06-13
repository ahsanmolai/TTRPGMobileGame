import React from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { View } from 'react-native';
import { colors } from 'src/theme/theme';

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.background.primary }}>
      <SafeAreaProvider>
        <StatusBar style="light" />
        <View style={{ flex: 1, backgroundColor: colors.background.primary }}>
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: colors.background.primary },
              animation: 'fade',
            }}
          >
            <Stack.Screen name="index" />
            <Stack.Screen name="pick-character" />
            <Stack.Screen name="create-character" />
            <Stack.Screen name="campaign" />
            <Stack.Screen
              name="combat"
              options={{ animation: 'slide_from_bottom' }}
            />
            <Stack.Screen
              name="level-up"
              options={{ animation: 'slide_from_bottom' }}
            />
            <Stack.Screen
              name="shop"
              options={{ animation: 'slide_from_right' }}
            />
            <Stack.Screen
              name="inventory"
              options={{ animation: 'slide_from_right' }}
            />
          </Stack>
        </View>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
