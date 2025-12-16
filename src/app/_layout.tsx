import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { toastConfig } from '@/utils/toastConfig';
import Toast from 'react-native-toast-message';

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    // <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
    //   <Stack>
    //     <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
    //     <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
    //   </Stack>
    //   <StatusBar style="auto" />
    // </ThemeProvider>
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack screenOptions={{ headerShown: false }}>
        {/* Auth flow - login, signup, etc. */}
        <Stack.Screen name="(auth)" />
        
        {/* Passenger app */}
        <Stack.Screen name="(passenger)" />
        
        {/* Driver app */}
        <Stack.Screen name="(driver)" />
        
        {/* Admin panel */}
        <Stack.Screen name="(admin)" />
        
        {/* Shared modals */}
        <Stack.Screen 
          name="location-selection" 
          options={{ presentation: 'modal', title: 'Select Location' }} 
        />
        <Stack.Screen 
          name="report-incident" 
          options={{ presentation: 'modal', title: 'Report Issue' }} 
        />
      </Stack>
      
      <StatusBar style="auto" />

      <Toast config={toastConfig} />
    </ThemeProvider>
  );
}
