import { EmptyState } from "@/components/common/EmptyState";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { useTheme } from "@/hooks/useTheme";
import { db } from "@/services/firebaseConfig";
import { Collections } from "@/types/database";
import { Driver } from "@/types/driver";
import { Passenger } from "@/types/passenger";
import { showError, showSuccess } from "@/utils/toast";
import {
  collection,
  doc,
  onSnapshot,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import { Users } from "lucide-react-native";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  FlatList,
  Image,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type UserFilter = "all" | "passengers" | "drivers";

const FILTERS: { label: string; value: UserFilter }[] = [
  { label: "All", value: "all" },
  { label: "Passengers", value: "passengers" },
  { label: "Drivers", value: "drivers" },
];

interface UserRow {
  uid: string;
  name: string;
  phone: string;
  profilePhoto: string | null;
  status: string;
  userType: "passenger" | "driver";
  collection: string;
}

function UserCard({
  user,
  onSuspend,
  onReactivate,
  actionLoading,
}: {
  user: UserRow;
  onSuspend: (user: UserRow) => void;
  onReactivate: (user: UserRow) => void;
  actionLoading: string | null;
}) {
  const { colors, spacing, typography, borderRadius, shadows } = useTheme();
  const isSuspended = user.status === "suspended";
  const isLoading = actionLoading === user.uid;

  const typeBg = user.userType === "driver" ? "#DBEAFE" : "#D1FAE5";
  const typeFg = user.userType === "driver" ? "#3B82F6" : "#10B981";
  const typeLabel = user.userType === "driver" ? "Driver" : "Passenger";

  return (
    <View
      style={{
        backgroundColor: colors.surface,
        borderRadius: borderRadius.lg,
        padding: spacing.md,
        marginBottom: spacing.sm,
        borderWidth: 1,
        borderColor: colors.border,
        flexDirection: "row",
        alignItems: "center",
        gap: spacing.sm,
        ...shadows.small,
      }}
    >
      {/* Avatar */}
      {user.profilePhoto ? (
        <Image
          source={{ uri: user.profilePhoto }}
          style={{ width: 48, height: 48, borderRadius: 24 }}
        />
      ) : (
        <View
          style={{
            width: 48,
            height: 48,
            borderRadius: 24,
            backgroundColor: colors.backgroundAlt,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Text
            style={{
              fontSize: typography.sizes.lg,
              fontFamily: typography.fonts.heading,
              color: colors.textMuted,
            }}
          >
            {(user.name ?? "?")[0].toUpperCase()}
          </Text>
        </View>
      )}

      {/* Info */}
      <View style={{ flex: 1 }}>
        <Text
          style={{
            fontSize: typography.sizes.base,
            fontFamily: typography.fonts.bodyMedium,
            color: colors.textPrimary,
            marginBottom: 2,
          }}
          numberOfLines={1}
        >
          {user.name}
        </Text>
        <Text
          style={{
            fontSize: typography.sizes.sm,
            fontFamily: typography.fonts.bodyRegular,
            color: colors.textSecondary,
            marginBottom: spacing.xs,
          }}
        >
          {user.phone}
        </Text>
        <View style={{ flexDirection: "row", gap: spacing.xs }}>
          {/* Type badge */}
          <View
            style={{
              backgroundColor: typeBg,
              borderRadius: borderRadius.sm,
              paddingHorizontal: spacing.xs + 2,
              paddingVertical: 2,
            }}
          >
            <Text
              style={{
                fontSize: typography.sizes.xs,
                fontFamily: typography.fonts.bodyMedium,
                color: typeFg,
              }}
            >
              {typeLabel}
            </Text>
          </View>
          {/* Status badge */}
          <View
            style={{
              backgroundColor: isSuspended ? "#FEE2E2" : "#D1FAE5",
              borderRadius: borderRadius.sm,
              paddingHorizontal: spacing.xs + 2,
              paddingVertical: 2,
            }}
          >
            <Text
              style={{
                fontSize: typography.sizes.xs,
                fontFamily: typography.fonts.bodyMedium,
                color: isSuspended ? "#EF4444" : "#10B981",
              }}
            >
              {isSuspended ? "Suspended" : "Active"}
            </Text>
          </View>
        </View>
      </View>

      {/* Action button */}
      <TouchableOpacity
        style={{
          paddingHorizontal: spacing.sm,
          paddingVertical: spacing.xs,
          borderRadius: borderRadius.md,
          borderWidth: 1.5,
          borderColor: isSuspended ? colors.primary : colors.error,
          opacity: isLoading ? 0.5 : 1,
        }}
        onPress={() => (isSuspended ? onReactivate(user) : onSuspend(user))}
        disabled={isLoading}
        activeOpacity={0.7}
      >
        <Text
          style={{
            fontSize: typography.sizes.sm,
            fontFamily: typography.fonts.bodyMedium,
            color: isSuspended ? colors.primary : colors.error,
          }}
        >
          {isSuspended ? "Reactivate" : "Suspend"}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

export default function AdminUsersScreen(): React.JSX.Element {
  const { colors, spacing, typography, borderRadius } = useTheme();

  const [passengers, setPassengers] = useState<UserRow[]>([]);
  const [drivers, setDrivers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<UserFilter>("all");
  const [search, setSearch] = useState("");
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Real-time listeners for both collections
  useEffect(() => {
    let loadedCount = 0;
    const markLoaded = () => {
      loadedCount++;
      if (loadedCount >= 2) setLoading(false);
    };

    const unsubPassengers = onSnapshot(
      collection(db, Collections.PASSENGERS),
      (snap) => {
        setPassengers(
          snap.docs.map((d) => {
            const data = d.data() as Passenger;
            return {
              uid: d.id,
              name: data.name ?? "Unknown",
              phone: data.phone ?? "—",
              profilePhoto: data.profilePhoto ?? null,
              status: (data as any).status ?? "active",
              userType: "passenger",
              collection: Collections.PASSENGERS,
            };
          }),
        );
        markLoaded();
      },
    );

    const unsubDrivers = onSnapshot(
      collection(db, Collections.DRIVERS),
      (snap) => {
        setDrivers(
          snap.docs.map((d) => {
            const data = d.data() as Driver;
            return {
              uid: d.id,
              name: data.name ?? "Unknown",
              phone: data.phone ?? "—",
              profilePhoto: data.profilePhoto ?? null,
              status: data.status ?? "active",
              userType: "driver",
              collection: Collections.DRIVERS,
            };
          }),
        );
        markLoaded();
      },
    );

    return () => {
      unsubPassengers();
      unsubDrivers();
    };
  }, []);

  const allUsers = useMemo(() => {
    if (filter === "passengers") return passengers;
    if (filter === "drivers") return drivers;
    return [...passengers, ...drivers];
  }, [filter, passengers, drivers]);

  const displayed = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return allUsers;
    return allUsers.filter(
      (u) =>
        u.name.toLowerCase().includes(q) || u.phone.toLowerCase().includes(q),
    );
  }, [allUsers, search]);

  const handleSuspend = useCallback((user: UserRow) => {
    Alert.alert(
      `Suspend ${user.name}?`,
      "They will not be able to use the app until reactivated.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Suspend",
          style: "destructive",
          onPress: async () => {
            setActionLoading(user.uid);
            try {
              await updateDoc(doc(db, user.collection, user.uid), {
                status: "suspended",
                updatedAt: serverTimestamp(),
              });
              showSuccess("Suspended", `${user.name} has been suspended.`);
            } catch (err) {
              console.error("Error suspending user:", err);
              showError("Error", "Could not suspend user.");
            } finally {
              setActionLoading(null);
            }
          },
        },
      ],
    );
  }, []);

  const handleReactivate = useCallback(async (user: UserRow) => {
    setActionLoading(user.uid);
    try {
      await updateDoc(doc(db, user.collection, user.uid), {
        status: "active",
        updatedAt: serverTimestamp(),
      });
      showSuccess("Reactivated", `${user.name} has been reactivated.`);
    } catch (err) {
      console.error("Error reactivating user:", err);
      showError("Error", "Could not reactivate user.");
    } finally {
      setActionLoading(null);
    }
  }, []);

  const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: {
      paddingHorizontal: spacing.screenPadding,
      paddingTop: spacing.md,
      paddingBottom: spacing.md,
      backgroundColor: colors.surface,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      gap: spacing.md,
    },
    title: {
      fontSize: typography.sizes["2xl"],
      fontFamily: typography.fonts.heading,
      color: colors.textPrimary,
    },
    searchInput: {
      backgroundColor: colors.backgroundAlt,
      borderRadius: borderRadius.md,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      fontSize: typography.sizes.base,
      fontFamily: typography.fonts.bodyRegular,
      color: colors.textPrimary,
      borderWidth: 1,
      borderColor: colors.border,
    },
    filterRow: {
      flexDirection: "row",
      gap: spacing.sm,
    },
    pill: {
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.xs,
      borderRadius: borderRadius.full,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.background,
    },
    pillActive: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    pillText: {
      fontSize: typography.sizes.sm,
      fontFamily: typography.fonts.bodyMedium,
      color: colors.textSecondary,
    },
    pillTextActive: {
      color: colors.textInverse,
    },
    list: {
      padding: spacing.screenPadding,
    },
  });

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <StatusBar barStyle="dark-content" />

      <View style={styles.header}>
        <Text style={styles.title}>Manage Users</Text>
        <TextInput
          style={styles.searchInput}
          placeholder="Search name or phone..."
          placeholderTextColor={colors.textMuted}
          value={search}
          onChangeText={setSearch}
          clearButtonMode="while-editing"
        />
        <View style={styles.filterRow}>
          {FILTERS.map((f) => (
            <TouchableOpacity
              key={f.value}
              style={[styles.pill, filter === f.value && styles.pillActive]}
              onPress={() => setFilter(f.value)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.pillText,
                  filter === f.value && styles.pillTextActive,
                ]}
              >
                {f.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {loading ? (
        <LoadingSpinner message="Loading users..." />
      ) : displayed.length === 0 ? (
        <EmptyState
          icon={<Users size={56} color={colors.textMuted} />}
          title="No Users Found"
          message={
            search
              ? "No users match your search."
              : "No users in this category."
          }
        />
      ) : (
        <FlatList
          data={displayed}
          keyExtractor={(item) => `${item.userType}-${item.uid}`}
          renderItem={({ item }) => (
            <UserCard
              user={item}
              onSuspend={handleSuspend}
              onReactivate={handleReactivate}
              actionLoading={actionLoading}
            />
          )}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}
