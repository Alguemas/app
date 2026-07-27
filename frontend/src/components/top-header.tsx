import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, Image } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { colors } from "@/src/theme";
import { useAuth } from "@/src/contexts/auth-context";

export function TopHeader({ testID = "top-header" }: { testID?: string }) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();

  return (
    <View
      style={[styles.header, { paddingTop: insets.top + 8 }]}
      testID={testID}
    >
      <View style={styles.logoWrap}>
        <Text style={styles.logo}>
          SIM<Text style={{ color: colors.primary }}>BET</Text>
        </Text>
      </View>

      <View style={styles.right}>
        <View style={styles.balancePill} testID="balance-pill">
          <Ionicons name="cash" size={14} color="#000" />
          <Text style={styles.balanceText}>
            {user?.virtual_coins?.toLocaleString("pt-BR") ?? "0"}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.depositBtn}
          onPress={() => router.push("/deposit")}
          testID="header-deposit-btn"
        >
          <Ionicons name="add" size={16} color="#FFF" />
          <Text style={styles.depositBtnText}>Depositar</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: "#0A0F0C",
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  logoWrap: { flexDirection: "row", alignItems: "center", gap: 8 },
  logo: { color: "#FFF", fontSize: 20, fontWeight: "900", letterSpacing: -0.5 },
  right: { flexDirection: "row", alignItems: "center", gap: 8 },
  balancePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: colors.primary,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  balanceText: { color: "#000", fontWeight: "900", fontSize: 14, letterSpacing: 0.3 },
  depositBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: colors.accentRed,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
  },
  depositBtnText: { color: "#FFF", fontWeight: "800", fontSize: 12, letterSpacing: 0.3 },
});
