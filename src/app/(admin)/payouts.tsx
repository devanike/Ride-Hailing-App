import { EmptyState } from "@/components/common/EmptyState";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { useTheme } from "@/hooks/useTheme";
import { db } from "@/services/firebaseConfig";
import { sendNotification } from "@/services/notificationService";
import { Collections } from "@/types/database";
import { Driver } from "@/types/driver";
import { PayoutStatus } from "@/types/earning";
import { Payout } from "@/types/payout";
import { showError, showSuccess } from "@/utils/toast";
import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import { Wallet } from "lucide-react-native";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  FlatList,
  Image,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type FilterTab = PayoutStatus;

const TABS: { label: string; value: FilterTab }[] = [
  { label: "Pending", value: "pending" },
  { label: "Processing", value: "processing" },
  { label: "Completed", value: "completed" },
];

interface EnrichedPayout extends Payout {
  driver?: Driver;
}

function formatDate(ts: any): string {
  const d = ts?.toDate?.();
  if (!d) return "—";
  return d.toLocaleDateString("en-NG", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
  });
}

function PayoutCard({
  payout,
  onMarkProcessing,
  onMarkPaid,
  processing,
}: {
  payout: EnrichedPayout;
  onMarkProcessing: (id: string) => Promise<void>;
  onMarkPaid: (id: string, driverId: string) => Promise<void>;
  processing: string | null;
}) {
  const { colors, spacing, typography, borderRadius, shadows } = useTheme();
  const driver = payout.driver;
  const isProcessing = processing === payout.payoutId;

  const prefBg = payout.payout_pref === "daily" ? "#D1FAE5" : "#DBEAFE";
  const prefFg = payout.payout_pref === "daily" ? "#10B981" : "#3B82F6";
  const prefLabel = payout.payout_pref === "daily" ? "Daily" : "Weekly";

  return (
    <View
      style={{
        backgroundColor: colors.surface,
        borderRadius: borderRadius.lg,
        padding: spacing.md,
        marginBottom: spacing.md,
        borderWidth: 1,
        borderColor: colors.border,
        ...shadows.medium,
      }}
    >
      {/* Top row: photo, name, pref badge */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: spacing.sm,
          marginBottom: spacing.sm,
        }}
      >
        {driver?.profilePhoto ? (
          <Image
            source={{ uri: driver.profilePhoto }}
            style={{ width: 40, height: 40, borderRadius: 20 }}
          />
        ) : (
          <View
            style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: colors.backgroundAlt,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Text
              style={{
                fontSize: typography.sizes.base,
                fontFamily: typography.fonts.heading,
                color: colors.textMuted,
              }}
            >
              {(driver?.name ?? "?")[0].toUpperCase()}
            </Text>
          </View>
        )}

        <View style={{ flex: 1 }}>
          <Text
            style={{
              fontSize: typography.sizes.base,
              fontFamily: typography.fonts.bodyMedium,
              color: colors.textPrimary,
            }}
          >
            {driver?.name ?? "Unknown Driver"}
          </Text>
        </View>

        <View
          style={{
            backgroundColor: prefBg,
            borderRadius: borderRadius.sm,
            paddingHorizontal: spacing.sm,
            paddingVertical: 3,
          }}
        >
          <Text
            style={{
              fontSize: typography.sizes.xs,
              fontFamily: typography.fonts.bodyMedium,
              color: prefFg,
            }}
          >
            {prefLabel}
          </Text>
        </View>
      </View>

      {/* Bank details */}
      <Text
        style={{
          fontSize: typography.sizes.sm,
          fontFamily: typography.fonts.bodyRegular,
          color: colors.textSecondary,
          marginBottom: 2,
        }}
      >
        {payout.bankName} — {payout.accountNumber}
      </Text>
      <Text
        style={{
          fontSize: typography.sizes.sm,
          fontFamily: typography.fonts.bodyRegular,
          color: colors.textSecondary,
          marginBottom: spacing.sm,
        }}
      >
        {payout.accountName}
      </Text>

      {/* Amount */}
      <Text
        style={{
          fontSize: typography.sizes["2xl"],
          fontFamily: typography.fonts.heading,
          color: colors.primary,
          marginBottom: 2,
        }}
      >
        NGN {(payout.totalAmount ?? 0).toLocaleString()}
      </Text>

      {/* Period and trip count */}
      <Text
        style={{
          fontSize: typography.sizes.xs,
          fontFamily: typography.fonts.bodyRegular,
          color: colors.textMuted,
          marginBottom: spacing.md,
        }}
      >
        {formatDate(payout.startDate)} – {formatDate(payout.endDate)}
        {"  "}
        {payout.numberOfRides ?? 0} trips
      </Text>

      {/* Action buttons */}
      {payout.status === "pending" && (
        <View style={{ flexDirection: "row", gap: spacing.sm }}>
          <TouchableOpacity
            style={{
              flex: 1,
              paddingVertical: spacing.sm,
              borderRadius: borderRadius.md,
              borderWidth: 1.5,
              borderColor: colors.primary,
              alignItems: "center",
              opacity: isProcessing ? 0.5 : 1,
            }}
            onPress={() => onMarkProcessing(payout.payoutId)}
            disabled={isProcessing}
            activeOpacity={0.7}
          >
            <Text
              style={{
                fontSize: typography.sizes.sm,
                fontFamily: typography.fonts.bodyMedium,
                color: colors.primary,
              }}
            >
              Mark Processing
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={{
              flex: 1,
              paddingVertical: spacing.sm,
              borderRadius: borderRadius.md,
              backgroundColor: colors.primary,
              alignItems: "center",
              opacity: isProcessing ? 0.5 : 1,
            }}
            onPress={() => onMarkPaid(payout.payoutId, payout.driverId)}
            disabled={isProcessing}
            activeOpacity={0.7}
          >
            <Text
              style={{
                fontSize: typography.sizes.sm,
                fontFamily: typography.fonts.bodyMedium,
                color: colors.textInverse,
              }}
            >
              Mark as Paid
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {payout.status === "processing" && (
        <TouchableOpacity
          style={{
            paddingVertical: spacing.sm,
            borderRadius: borderRadius.md,
            backgroundColor: colors.primary,
            alignItems: "center",
            opacity: isProcessing ? 0.5 : 1,
          }}
          onPress={() => onMarkPaid(payout.payoutId, payout.driverId)}
          disabled={isProcessing}
          activeOpacity={0.7}
        >
          <Text
            style={{
              fontSize: typography.sizes.sm,
              fontFamily: typography.fonts.bodyMedium,
              color: colors.textInverse,
            }}
          >
            Mark as Paid
          </Text>
        </TouchableOpacity>
      )}

      {payout.status === "completed" && (
        <View
          style={{
            paddingVertical: spacing.sm,
            borderRadius: borderRadius.md,
            backgroundColor: "#D1FAE5",
            alignItems: "center",
          }}
        >
          <Text
            style={{
              fontSize: typography.sizes.sm,
              fontFamily: typography.fonts.bodyMedium,
              color: "#10B981",
            }}
          >
            Paid
          </Text>
        </View>
      )}
    </View>
  );
}

export default function AdminPayoutsScreen(): React.JSX.Element {
  const { colors, spacing, typography } = useTheme();

  const [payouts, setPayouts] = useState<EnrichedPayout[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<FilterTab>("pending");
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    const q = query(
      collection(db, Collections.PAYOUTS),
      orderBy("createdAt", "desc"),
    );

    const unsub = onSnapshot(q, async (snap) => {
      const raw = snap.docs.map((d) => ({
        payoutId: d.id,
        ...d.data(),
      })) as Payout[];

      // Enrich with driver profile
      const driverIds = [...new Set(raw.map((p) => p.driverId))];
      const driverMap: Record<string, Driver> = {};

      await Promise.all(
        driverIds.map(async (uid) => {
          try {
            const snap2 = await getDoc(doc(db, Collections.DRIVERS, uid));
            if (snap2.exists()) {
              driverMap[uid] = { uid, ...snap2.data() } as Driver;
            }
          } catch {
            // ignore
          }
        }),
      );

      setPayouts(raw.map((p) => ({ ...p, driver: driverMap[p.driverId] })));
      setLoading(false);
    });

    return unsub;
  }, []);

  const filtered = useMemo(
    () => payouts.filter((p) => p.status === activeTab),
    [payouts, activeTab],
  );

  const handleMarkProcessing = useCallback(
    async (payoutId: string) => {
      setProcessingId(payoutId);
      try {
        const payout = payouts.find((p) => p.payoutId === payoutId);
        await updateDoc(doc(db, Collections.PAYOUTS, payoutId), {
          status: "processing",
          updatedAt: serverTimestamp(),
        });
        if (payout?.driverId) {
          await sendNotification(
            payout.driverId,
            "Payout Processing",
            "Your payout is being processed",
          );
        }
        showSuccess("Updated", "Payout marked as processing.");
      } catch (err) {
        console.error("Error updating payout:", err);
        showError("Error", "Could not update payout.");
      } finally {
        setProcessingId(null);
      }
    },
    [payouts],
  );

  const handleMarkPaid = useCallback(
    async (payoutId: string, driverId: string) => {
      setProcessingId(payoutId);
      try {
        await updateDoc(doc(db, Collections.PAYOUTS, payoutId), {
          status: "completed",
          processedAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        await sendNotification(
          driverId,
          "Payout Sent",
          "Your payout has been sent to your bank",
        );
        showSuccess("Paid", "Payout marked as completed.");
      } catch (err) {
        console.error("Error marking payout as paid:", err);
        showError("Error", "Could not update payout.");
      } finally {
        setProcessingId(null);
      }
    },
    [],
  );

  const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: {
      paddingHorizontal: spacing.screenPadding,
      paddingTop: spacing.md,
      backgroundColor: colors.surface,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    title: {
      fontSize: typography.sizes["2xl"],
      fontFamily: typography.fonts.heading,
      color: colors.textPrimary,
      marginBottom: spacing.md,
    },
    tabRow: {
      flexDirection: "row",
    },
    tab: {
      flex: 1,
      alignItems: "center",
      paddingBottom: spacing.sm,
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
    list: {
      padding: spacing.screenPadding,
    },
  });

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <StatusBar barStyle="dark-content" />

      <View style={styles.header}>
        <Text style={styles.title}>Driver Payouts</Text>
        <View style={styles.tabRow}>
          {TABS.map((t) => (
            <TouchableOpacity
              key={t.value}
              style={[styles.tab, activeTab === t.value && styles.tabActive]}
              onPress={() => setActiveTab(t.value)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.tabText,
                  activeTab === t.value && styles.tabTextActive,
                ]}
              >
                {t.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {loading ? (
        <LoadingSpinner message="Loading payouts..." />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<Wallet size={56} color={colors.textMuted} />}
          title="No Payouts"
          message={`No ${activeTab} payouts at the moment.`}
        />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.payoutId}
          renderItem={({ item }) => (
            <PayoutCard
              payout={item}
              onMarkProcessing={handleMarkProcessing}
              onMarkPaid={handleMarkPaid}
              processing={processingId}
            />
          )}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}
