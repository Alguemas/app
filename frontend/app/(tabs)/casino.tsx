import React from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ImageBackground } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { colors } from "@/src/theme";
import { TopHeader } from "@/src/components/top-header";
import { AdBanner } from "@/src/components/ad-banner";

const GAMES = [
  {
    id: "crash",
    title: "Crash",
    subtitle: "Aviator · Multiplicador",
    icon: "rocket" as const,
    color: "#EF4444",
    image: "https://images.pexels.com/photos/586041/pexels-photo-586041.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940",
    route: "/crash",
    tag: "POPULAR",
  },
  {
    id: "slots",
    title: "Slots",
    subtitle: "Caça-níquel clássico",
    icon: "dice" as const,
    color: "#F59E0B",
    image: "https://images.pexels.com/photos/31379653/pexels-photo-31379653.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940",
    route: "/slots",
    tag: "QUENTE",
  },
];

export default function CasinoTab() {
  const router = useRouter();
  return (
    <View style={styles.container}>
      <TopHeader />
      <AdBanner position="top" testID="casino-ad-top" />
      <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
        <View style={styles.hero}>
          <Text style={styles.title}>Cassino</Text>
          <Text style={styles.subtitle}>Jogos rápidos com moedas virtuais</Text>
        </View>

        {GAMES.map((g) => (
          <TouchableOpacity
            key={g.id}
            style={styles.gameCard}
            onPress={() => router.push(g.route as any)}
            activeOpacity={0.9}
            testID={`casino-${g.id}`}
          >
            <ImageBackground
              source={{ uri: g.image }}
              style={styles.gameBg}
              imageStyle={{ borderRadius: 12 }}
            >
              <LinearGradient
                colors={["rgba(6,26,18,0.3)", "rgba(6,26,18,0.95)"]}
                style={styles.overlay}
              />
              <View style={styles.gameContent}>
                <View style={[styles.gameIcon, { backgroundColor: g.color + "22", borderColor: g.color }]}>
                  <Ionicons name={g.icon} size={24} color={g.color} />
                </View>
                <View style={styles.gameInfo}>
                  <View style={styles.tagRow}>
                    <Text style={styles.gameTitle}>{g.title}</Text>
                    <View style={[styles.tag, { backgroundColor: g.color }]}>
                      <Text style={styles.tagText}>{g.tag}</Text>
                    </View>
                  </View>
                  <Text style={styles.gameSub}>{g.subtitle}</Text>
                </View>
                <View style={[styles.playBtn, { backgroundColor: g.color }]}>
                  <Ionicons name="play" size={16} color="#000" />
                </View>
              </View>
            </ImageBackground>
          </TouchableOpacity>
        ))}

        <View style={styles.infoBox}>
          <Ionicons name="information-circle" size={20} color={colors.awarenessText} />
          <Text style={styles.infoText}>
            Todos os jogos usam <Text style={{ color: colors.primary, fontWeight: "800" }}>moedas virtuais</Text>.
            Impossível ganhar ou perder dinheiro real. Este é o objetivo do app.
          </Text>
        </View>
      </ScrollView>
      <AdBanner position="bottom" testID="casino-ad-bottom" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  hero: { padding: 16, paddingBottom: 8 },
  title: { color: "#FFF", fontSize: 26, fontWeight: "900", letterSpacing: -0.5 },
  subtitle: { color: colors.textSecondary, fontSize: 13, marginTop: 2 },
  gameCard: { marginHorizontal: 16, marginTop: 12 },
  gameBg: { height: 140, borderRadius: 12, overflow: "hidden", justifyContent: "flex-end" },
  overlay: { ...StyleSheet.absoluteFillObject, borderRadius: 12 },
  gameContent: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14 },
  gameIcon: {
    width: 50, height: 50, borderRadius: 10,
    alignItems: "center", justifyContent: "center", borderWidth: 1,
  },
  gameInfo: { flex: 1 },
  tagRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  gameTitle: { color: "#FFF", fontSize: 20, fontWeight: "900" },
  tag: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 3 },
  tagText: { color: "#000", fontSize: 9, fontWeight: "900", letterSpacing: 0.8 },
  gameSub: { color: colors.textSecondary, fontSize: 12, marginTop: 2 },
  playBtn: { width: 42, height: 42, borderRadius: 21, alignItems: "center", justifyContent: "center" },
  infoBox: {
    flexDirection: "row",
    gap: 10,
    marginHorizontal: 16,
    marginTop: 20,
    padding: 12,
    backgroundColor: "rgba(30,58,138,0.35)",
    borderColor: "rgba(59,130,246,0.4)",
    borderWidth: 1,
    borderRadius: 8,
    alignItems: "flex-start",
  },
  infoText: { color: colors.awarenessText, fontSize: 12, lineHeight: 16, flex: 1 },
});
