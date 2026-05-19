import { useTheme } from "@/hooks/useTheme";
import { clearChatHistory, sendChatMessage } from "@/services/chatService";
import { SUPPORT } from "@/utils/constants";
import { router } from "expo-router";
import {
  ArrowLeft,
  ChevronDown,
  ChevronRight,
  Mail,
  MessageCircle,
  Send,
} from "lucide-react-native";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  FlatList,
  KeyboardAvoidingView,
  Linking,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type TabValue = "faq" | "chat";

// ── FAQ Data ──

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
      "UI-Ride operates within and around the University of Ibadan campus. Both pickup and drop-off locations should be within a reasonable distance.",
  },
  {
    question: "How do I contact support?",
    answer: `You can reach our support team by email at ${SUPPORT.email}. You can also use the Chat tab to ask our AI assistant any question. We aim to respond within 24 hours on business days.`,
  },
];

// ── FAQ Components ──

function FaqRow({ item }: { item: FaqItem }) {
  const { colors, spacing, typography } = useTheme();
  const [expanded, setExpanded] = useState(false);

  return (
    <View style={{ borderBottomWidth: 1, borderBottomColor: colors.border }}>
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
          style={{ paddingHorizontal: spacing.md, paddingBottom: spacing.md }}
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

// ── Chat Types ──

interface ChatMessage {
  id: string;
  text: string;
  isUser: boolean;
}

const QUICK_QUESTIONS = [
  "How do I request a ride?",
  "How does payment work?",
  "How do I change my PIN?",
  "How do I report an issue?",
  "How do I become a driver?",
];

// ── Main Screen ──

export default function HelpScreen(): React.JSX.Element {
  const { colors, spacing, typography, borderRadius, shadows } = useTheme();
  const flatListRef = useRef<FlatList>(null);

  const [activeTab, setActiveTab] = useState<TabValue>("faq");

  // Chat state
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      text: "Hi! I'm your UI-Ride support assistant. How can I help you today?",
      isUser: false,
    },
  ]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);

  // Clear chat history
  useEffect(() => {
    clearChatHistory();
  }, []);

  const sendMessage = useCallback(
    async (text: string) => {
      if (!text.trim() || sending) return;

      const userMessage: ChatMessage = {
        id: `user_${Date.now()}`,
        text: text.trim(),
        isUser: true,
      };

      setMessages((prev) => [...prev, userMessage]);
      setInput("");
      setSending(true);

      try {
        const reply = await sendChatMessage(text.trim());

        setMessages((prev) => [
          ...prev,
          {
            id: `bot_${Date.now()}`,
            text: reply,
            isUser: false,
          },
        ]);
      } catch {
        setMessages((prev) => [
          ...prev,
          {
            id: `error_${Date.now()}`,
            text: "Sorry, I couldn't process your message. Please try again.",
            isUser: false,
          },
        ]);
      } finally {
        setSending(false);
      }
    },
    [sending],
  );

  const handleSendEmail = () => {
    Linking.openURL(`mailto:${SUPPORT.email}`);
  };

  const showQuickQuestions = messages.length <= 1 && !sending;

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
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
      fontSize: typography.sizes.lg,
      fontFamily: typography.fonts.headingSemiBold,
      color: colors.textPrimary,
    },
    tabRow: {
      flexDirection: "row",
      backgroundColor: colors.surface,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    tab: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: spacing.xs,
      paddingVertical: spacing.md,
      borderBottomWidth: 2,
      borderBottomColor: "transparent",
    },
    tabActive: {
      borderBottomColor: colors.primary,
    },
    tabText: {
      fontSize: typography.sizes.sm,
      fontFamily: typography.fonts.bodyMedium,
      color: colors.textMuted,
    },
    tabTextActive: {
      color: colors.primary,
    },

    // FAQ styles
    faqScroll: {
      padding: spacing.screenPadding,
      paddingBottom: spacing.xxl,
    },
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

    // Chat styles
    chatList: {
      padding: spacing.screenPadding,
    },
    quickSection: {
      paddingHorizontal: spacing.screenPadding,
      paddingBottom: spacing.md,
    },
    quickLabel: {
      fontSize: typography.sizes.sm,
      fontFamily: typography.fonts.bodyMedium,
      color: colors.textMuted,
      marginBottom: spacing.sm,
    },
    quickChip: {
      backgroundColor: colors.surface,
      borderRadius: borderRadius.full,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      marginBottom: spacing.sm,
      marginRight: spacing.sm,
    },
    quickChipText: {
      fontSize: typography.sizes.sm,
      fontFamily: typography.fonts.bodyRegular,
      color: colors.primary,
    },
    typingText: {
      fontSize: typography.sizes.sm,
      fontFamily: typography.fonts.bodyRegular,
      color: colors.textMuted,
      paddingHorizontal: spacing.screenPadding,
      paddingBottom: spacing.sm,
    },
    inputRow: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: spacing.screenPadding,
      paddingVertical: spacing.sm,
      backgroundColor: colors.surface,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      gap: spacing.sm,
    },
    input: {
      flex: 1,
      backgroundColor: colors.backgroundAlt,
      borderRadius: borderRadius.full,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      fontSize: typography.sizes.base,
      fontFamily: typography.fonts.bodyRegular,
      color: colors.textPrimary,
      maxHeight: 100,
    },
    sendButton: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: colors.primary,
      alignItems: "center",
      justifyContent: "center",
    },
    sendButtonDisabled: {
      opacity: 0.5,
    },
  });

  const renderChatMessage = useCallback(
    ({ item }: { item: ChatMessage }) => (
      <View
        style={{
          alignSelf: item.isUser ? "flex-end" : "flex-start",
          maxWidth: "80%",
          backgroundColor: item.isUser ? colors.primary : colors.surface,
          borderRadius: borderRadius.lg,
          padding: spacing.md,
          marginBottom: spacing.sm,
          borderWidth: item.isUser ? 0 : 1,
          borderColor: colors.border,
          ...(!item.isUser ? shadows.small : {}),
        }}
      >
        <Text
          style={{
            fontSize: typography.sizes.base,
            fontFamily: typography.fonts.bodyRegular,
            color: item.isUser ? colors.textInverse : colors.textPrimary,
            lineHeight: typography.sizes.base * 1.5,
          }}
        >
          {item.text}
        </Text>
      </View>
    ),
    [colors, spacing, typography, borderRadius, shadows],
  );

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7}>
          <ArrowLeft size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Help & Support</Text>
      </View>

      {/* Tabs */}
      <View style={styles.tabRow}>
        <TouchableOpacity
          style={[styles.tab, activeTab === "faq" && styles.tabActive]}
          onPress={() => setActiveTab("faq")}
          activeOpacity={0.7}
        >
          <ChevronDown
            size={16}
            color={activeTab === "faq" ? colors.primary : colors.textMuted}
          />
          <Text
            style={[
              styles.tabText,
              activeTab === "faq" && styles.tabTextActive,
            ]}
          >
            FAQ
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === "chat" && styles.tabActive]}
          onPress={() => setActiveTab("chat")}
          activeOpacity={0.7}
        >
          <MessageCircle
            size={16}
            color={activeTab === "chat" ? colors.primary : colors.textMuted}
          />
          <Text
            style={[
              styles.tabText,
              activeTab === "chat" && styles.tabTextActive,
            ]}
          >
            Chat with AI
          </Text>
        </TouchableOpacity>
      </View>

      {/* FAQ Tab */}
      {activeTab === "faq" && (
        <ScrollView
          contentContainerStyle={styles.faqScroll}
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.sectionTitle}>Frequently Asked Questions</Text>
          <View style={styles.faqCard}>
            {FAQ_ITEMS.map((item, idx) => (
              <FaqRow key={idx} item={item} />
            ))}
          </View>

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
      )}

      {/* Chat Tab */}
      {activeTab === "chat" && (
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 80}
        >
          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={(item) => item.id}
            renderItem={renderChatMessage}
            contentContainerStyle={styles.chatList}
            showsVerticalScrollIndicator={false}
            onContentSizeChange={() =>
              flatListRef.current?.scrollToEnd({ animated: true })
            }
          />

          {showQuickQuestions && (
            <View style={styles.quickSection}>
              <Text style={styles.quickLabel}>Common questions:</Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
                {QUICK_QUESTIONS.map((q) => (
                  <TouchableOpacity
                    key={q}
                    style={styles.quickChip}
                    onPress={() => sendMessage(q)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.quickChipText}>{q}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {sending && (
            <Text style={styles.typingText}>Assistant is typing...</Text>
          )}

          <View style={styles.inputRow}>
            <TextInput
              style={styles.input}
              placeholder="Type your question..."
              placeholderTextColor={colors.textMuted}
              value={input}
              onChangeText={setInput}
              multiline
              editable={!sending}
              returnKeyType="send"
              onSubmitEditing={() => sendMessage(input)}
              blurOnSubmit={false}
            />
            <TouchableOpacity
              style={[
                styles.sendButton,
                (!input.trim() || sending) && styles.sendButtonDisabled,
              ]}
              onPress={() => sendMessage(input)}
              disabled={!input.trim() || sending}
              activeOpacity={0.7}
            >
              <Send size={20} color={colors.textInverse} />
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      )}
    </SafeAreaView>
  );
}
