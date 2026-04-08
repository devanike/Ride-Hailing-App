import { useTheme } from "@/hooks/useTheme";
import { SUPPORT } from "@/utils/constants";
import { router } from "expo-router";
import {
  ArrowLeft,
  ChevronDown,
  ChevronRight,
  Mail,
} from "lucide-react-native";
import React, { useState } from "react";
import {
  Linking,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

interface FaqItem {
  question: string;
  answer: string;
}

const FAQ_ITEMS: FaqItem[] = [
  {
    question: "How do I request a ride?",
    answer:
      'From the home screen, tap "Where are you going?" to open the ride planner. Select your pickup and drop-off locations, enter the fare you want to offer, then tap Continue. Nearby drivers will see your request and can accept or make a counter-offer.',
  },
  {
    question: "How does fare negotiation work?",
    answer:
      "You propose a fare when booking. Drivers can accept your offered price immediately or submit their own bid. You will see all driver bids in real time and can accept whichever suits you. Once you accept, that becomes the agreed fare for the trip.",
  },
  {
    question: "What payment methods are accepted?",
    answer:
      "UI-Ride currently accepts cash (paid directly to your driver at the end of the trip) and card payments via Paystack. You choose your preferred method at the payment screen after the trip is completed.",
  },
  {
    question: "How do I report an issue?",
    answer:
      'You can report an issue from your ride history — open any completed trip and tap "Report an Issue". Choose the category that best describes the problem, write a description, and optionally attach photos. Your report will be reviewed by our admin team.',
  },
  {
    question: "How do I change my PIN?",
    answer:
      'Go to your Profile tab, then tap Security Settings. In the PIN section, tap "Change PIN". You will be asked to enter your current PIN, then set and confirm a new 6-digit PIN.',
  },
  {
    question: "How do drivers get paid?",
    answer:
      "Cash fares are collected directly by drivers from passengers. For card payments, funds are held and transferred to the driver's bank account according to their payout preference (daily or weekly). Admins process payouts from the dashboard.",
  },
  {
    question: "What areas does UI-Ride cover?",
    answer:
      "UI-Ride operates exclusively within the University of Ibadan campus boundaries. Both pickup and drop-off locations must be within the campus. If you try to select a location outside campus, you will see a warning prompt.",
  },
  {
    question: "How do I contact support?",
    answer: `You can reach our support team by email at ${SUPPORT.email}. We aim to respond within 24 hours on business days.`,
  },
];

function FaqRow({ item }: { item: FaqItem }) {
  const { colors, spacing, typography } = useTheme();
  const [expanded, setExpanded] = useState(false);

  return (
    <View
      style={{
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
      }}
    >
      <TouchableOpacity
        style={{
          flexDirection: "row",
          alignItems: "center",
          paddingVertical: spacing.md,
          paddingHorizontal: spacing.md,
          gap: spacing.sm,
        }}
        onPress={() => setExpanded((v) => !v)}
        activeOpacity={0.7}
      >
        <Text
          style={{
            flex: 1,
            fontSize: typography.sizes.base,
            fontFamily: typography.fonts.bodyMedium,
            color: colors.textPrimary,
          }}
        >
          {item.question}
        </Text>
        {expanded ? (
          <ChevronDown size={18} color={colors.textMuted} />
        ) : (
          <ChevronRight size={18} color={colors.textMuted} />
        )}
      </TouchableOpacity>

      {expanded && (
        <View
          style={{
            paddingHorizontal: spacing.md,
            paddingBottom: spacing.md,
          }}
        >
          <Text
            style={{
              fontSize: typography.sizes.base,
              fontFamily: typography.fonts.bodyRegular,
              color: colors.textSecondary,
              lineHeight:
                typography.sizes.base * typography.lineHeights.relaxed,
            }}
          >
            {item.answer}
          </Text>
        </View>
      )}
    </View>
  );
}

export default function HelpScreen(): React.JSX.Element {
  const { colors, spacing, typography, borderRadius, shadows } = useTheme();

  const handleSendEmail = () => {
    Linking.openURL(`mailto:${SUPPORT.email}`);
  };

  const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.backgroundAlt },
    header: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.md,
      paddingHorizontal: spacing.screenPadding,
      paddingVertical: spacing.md,
      backgroundColor: colors.surface,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    headerTitle: {
      fontSize: typography.sizes["2xl"],
      fontFamily: typography.fonts.heading,
      color: colors.textPrimary,
    },
    scroll: { padding: spacing.screenPadding, paddingBottom: spacing.xxl },
    sectionTitle: {
      fontSize: typography.sizes.base,
      fontFamily: typography.fonts.headingSemiBold,
      color: colors.textPrimary,
      marginBottom: spacing.sm,
    },
    faqCard: {
      backgroundColor: colors.surface,
      borderRadius: borderRadius.lg,
      overflow: "hidden",
      marginBottom: spacing.xl,
      borderWidth: 1,
      borderColor: colors.border,
      ...shadows.small,
    },
    contactCard: {
      backgroundColor: colors.surface,
      borderRadius: borderRadius.lg,
      padding: spacing.md,
      borderWidth: 1,
      borderColor: colors.border,
      ...shadows.small,
    },
    contactEmail: {
      fontSize: typography.sizes.base,
      fontFamily: typography.fonts.bodyMedium,
      color: colors.textPrimary,
      marginBottom: spacing.md,
    },
  });

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <StatusBar barStyle="dark-content" />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7}>
          <ArrowLeft size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Help &amp; Support</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* FAQ section */}
        <Text style={styles.sectionTitle}>Frequently Asked Questions</Text>
        <View style={styles.faqCard}>
          {FAQ_ITEMS.map((item, idx) => (
            <FaqRow key={idx} item={item} />
          ))}
        </View>

        {/* Contact section */}
        <Text style={styles.sectionTitle}>Contact Support</Text>
        <View style={styles.contactCard}>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: spacing.sm,
              marginBottom: spacing.md,
            }}
          >
            <Mail size={20} color={colors.textMuted} />
            <Text style={styles.contactEmail}>{SUPPORT.email}</Text>
          </View>
          <TouchableOpacity
            style={{
              backgroundColor: colors.primary,
              borderRadius: borderRadius.md,
              paddingVertical: spacing.sm + 2,
              alignItems: "center",
            }}
            onPress={handleSendEmail}
            activeOpacity={0.8}
          >
            <Text
              style={{
                fontSize: typography.sizes.base,
                fontFamily: typography.fonts.bodyMedium,
                color: colors.textInverse,
              }}
            >
              Send Email
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
