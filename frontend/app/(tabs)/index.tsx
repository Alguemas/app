import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, ImageBackground } from "react-native";
import Ionicons from "@react-native-vector-icons/ionicons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { colors } from "@/src/theme";
import { TopHeader } from "@/src/components/top-header";
import { AdBanner } from "@/src/components/ad-banner";
import { AwarenessModal } from "@/src/components/awareness-modal";
import { useAuth } from "@/src/contexts/auth-context";
import { storage } from "@/src/utils/storage";

const AWARE_KEY = "simbet_last_awareness_ts";

export default function HomeTab() {
  const router = useRouter();
  const { user } = useAuth();
  const [showAware, setShowAware] = useState(false);

  useEffect(() => {
    (async () => {
      const last = await storage.getItem<number>(AWARE_KEY, 0);
      const now = Date.now();
      // Show at first login and then every 5 minutes on home
      if (!last || now - (last || 0) > 5 * 60 * 1000) {
        setTimeout(() => setShowAware(true), 800);
        await storage.setItem(AWARE_KEY, now);
      }
    })();
  }, []);

  return (
    <View style={styles.container}>
      <TopHeader />
      <AdBanner position="top" testID="home-ad-top" />
      <ScrollView contentContainerStyle={{ paddingBottom: 24 }} showsVerticalScrollIndicator={false}>
        {/* Welcome */}
        <View style={styles.welcome} testID="home-welcome">
          <Text style={styles.hello}>Olá, {user?.name?.split(" ")[0] || "Jogador"}</Text>
          <Text style={styles.helloSub}>Tudo pronto para as apostas de hoje</Text>
        </View>

        {/* Hero Banner */}
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={() => router.push("/(tabs)/sports")}
          testID="home-hero-banner"
        >
          <ImageBackground
            source={{ uri: "https://images.unsplash.com/photo-1762013315117-1c8005ad2b41?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjA2MDV8MHwxfHNlYXJjaHwxfHxzb2NjZXIlMjBtYXRjaCUyMG5pZ2h0JTIwc3RhZGl1bXxlbnwwfHx8fDE3ODI1NzYyOTJ8MA&ixlib=rb-4.1.0&q=85" }}
            style={styles.hero}
            imageStyle={{ borderRadius: 12 }}
          >
            <LinearGradient
              colors={["transparent", "rgba(6,26,18,0.95)"]}
              style={styles.heroOverlay}
            />
            <View style={styles.heroContent}>
              <View style={styles.heroBadge}>
                <View style={styles.liveDot} />
                <Text style={styles.heroBadgeText}>AO VIVO</Text>
              </View>
              <Text style={styles.heroTitle}>Brasileirão</Text>
              <Text style={styles.heroSubtitle}>Flamengo vs Palmeiras · Hoje 21:30</Text>
              <View style={styles.heroCta}>
                <Text style={styles.heroCtaText}>APOSTAR AGORA</Text>
                <Ionicons name="arrow-forward" size={14} color="#000" />
              </View>
            </View>
          </ImageBackground>
        </TouchableOpacity>

        {/* Quick Games */}
        <Text style={styles.sectionTitle}>Jogos Populares</Text>
        <View style={styles.grid}>
          <GameCard
            title="Crash"
            subtitle="Aviator"
            color="#EF4444"
            icon="rocket"
            onPress={() => router.push("/crash")}
            testID="quick-crash"
          />
          <GameCard
            title="Slots"
            subtitle="Caça-níquel"
            color="#F59E0B"
            icon="dice"
            onPress={() => router.push("/slots")}
            testID="quick-slots"
          />
          <GameCard
            title="Esportes"
            subtitle="Apostas"
            color="#22C55E"
            icon="football"
            onPress={() => router.push("/(tabs)/sports")}
            testID="quick-sports"
          />
          <GameCard
            title="Cassino"
            subtitle="Ao vivo"
            color="#8B5CF6"
            icon="cafe"
            onPress={() => router.push("/(tabs)/casino")}
            testID="quick-casino"
          />
        </View>

        {/* Awareness card */}
        <TouchableOpacity
          style={styles.helpCard}
          onPress={() => router.push("/help")}
          testID="home-help-card"
        >
          <View style={styles.helpIcon}>
            <Ionicons name="heart" size={22} color="#BFDBFE" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.helpTitle}>Precisa de ajuda?</Text>
            <Text style={styles.helpText}>
              Este app é uma simulação. Se você luta contra o vício em apostas, saiba que há tratamento.
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#BFDBFE" />
        </TouchableOpacity>
      </ScrollView>

      <AdBanner position="bottom" testID="home-ad-bottom" />

      <AwarenessModal
        visible={showAware}
        onClose={() => setShowAware(false)}
        variant="loss"
      />
    </View>
  );
}

function GameCard({ title, subtitle, color, icon, onPress, testID }: any) {
  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.8} testID={testID}>
      <View style={[styles.cardIcon, { backgroundColor: color + "22", borderColor: color }]}>
        <Ionicons name={icon} size={26} color={color} />
      </View>
      <Text style={styles.cardTitle}>{title}</Text>
      <Text style={styles.cardSubtitle}>{subtitle}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  welcome: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 12 },
  hello: { color: "#FFF", fontSize: 22, fontWeight: "900", letterSpacing: -0.5 },
  helloSub: { color: colors.textSecondary, fontSize: 13, marginTop: 2 },
  hero: {
    marginHorizontal: 16,
    height: 170,
    borderRadius: 12,
    overflow: "hidden",
    justifyContent: "flex-end",
  },
  heroOverlay: { ...StyleSheet.absoluteFillObject, borderRadius: 12 },
  heroContent: { padding: 16 },
  heroBadge: {
    flexDirection: "row", alignItems: "center", gap: 5,
    alignSelf: "flex-start",
    backgroundColor: "rgba(239,68,68,0.9)",
    paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: 3, marginBottom: 8,
  },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#FFF" },
  heroBadgeText: { color: "#FFF", fontSize: 10, fontWeight: "900", letterSpacing: 1 },
  heroTitle: { color: "#FFF", fontSize: 26, fontWeight: "900", letterSpacing: -0.5 },
  heroSubtitle: { color: colors.textSecondary, fontSize: 13, marginTop: 2, marginBottom: 12 },
  heroCta: {
    flexDirection: "row", alignItems: "center", gap: 6,
    alignSelf: "flex-start",
    backgroundColor: colors.primary,
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 4,
  },
  heroCtaText: { color: "#000", fontWeight: "900", fontSize: 12, letterSpacing: 0.5 },
  sectionTitle: { color: "#FFF", fontSize: 16, fontWeight: "900", letterSpacing: 0.5, paddingHorizontal: 16, marginTop: 24, marginBottom: 12, textTransform: "uppercase" },
  grid: { flexDirection: "row", flexWrap: "wrap", paddingHorizontal: 12, gap: 8 },
  card: {
    width: "48%",
    backgroundColor: colors.surface,
    borderRadius: 10,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "flex-start",
  },
  cardIcon: {
    width: 46, height: 46, borderRadius: 10,
    alignItems: "center", justifyContent: "center",
    borderWidth: 1,
    marginBottom: 10,
  },
  cardTitle: { color: "#FFF", fontSize: 15, fontWeight: "800" },
  cardSubtitle: { color: colors.textSecondary, fontSize: 12, marginTop: 2 },
  helpCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginHorizontal: 16,
    marginTop: 20,
    padding: 14,
    backgroundColor: "rgba(30,58,138,0.35)",
    borderColor: "rgba(59,130,246,0.4)",
    borderWidth: 1,
    borderRadius: 10,
  },
  helpIcon: {
    width: 40, height: 40, borderRadius: 10,
    backgroundColor: "rgba(191,219,254,0.15)",
    alignItems: "center", justifyContent: "center",
  },
  helpTitle: { color: "#FFF", fontWeight: "800", fontSize: 14, marginBottom: 2 },
  helpText: { color: colors.awarenessText, fontSize: 12, lineHeight: 16 },
});
