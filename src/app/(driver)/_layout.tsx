import { useTheme } from "@/hooks/useTheme";
import { Tabs } from "expo-router";
import { Clock, DollarSign, Home, User } from "lucide-react-native";
import React from "react";

export default function DriverLayout(): React.JSX.Element {
  const { colors, typography } = useTheme();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopWidth: 1,
          borderTopColor: colors.border,
          elevation: 0,
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarLabelStyle: {
          fontSize: typography.sizes.xs,
          fontFamily: typography.fonts.bodyMedium,
          marginBottom: 4,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ color, size }) => <Home size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="earnings"
        options={{
          title: "Earnings",
          tabBarIcon: ({ color, size }) => (
            <DollarSign size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: "History",
          tabBarIcon: ({ color, size }) => <Clock size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color, size }) => <User size={size} color={color} />,
        }}
      />

      {/* Non-tab screens hidden from tab bar */}
      <Tabs.Screen name="active-ride" options={{ href: null }} />
      <Tabs.Screen name="payment-collection" options={{ href: null }} />
      <Tabs.Screen name="earnings-details" options={{ href: null }} />
      <Tabs.Screen name="reports-received" options={{ href: null }} />
    </Tabs>
  );
}
