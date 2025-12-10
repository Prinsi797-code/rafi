import AdsManager from "@/services/adsManager";
import { Ionicons as Icon } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from "react-native";
import {
  BannerAdSize,
  GAMBannerAd,
} from 'react-native-google-mobile-ads';
import GradientScreen from "../components/GradientScreen";

const languages = [
  { code: "en", label: "English", flag: "🇬🇧" },
  { code: "hi", label: "हिंदी", flag: "🇮🇳" },
  { code: "ru", label: "Русский", flag: "🇷🇺" },
  { code: "af", label: "Afrikaans", flag: "🇿🇦" },
  { code: "ar", label: "العربية", flag: "🇸🇦" },
  { code: "de", label: "Deutsch", flag: "🇩🇪" },
  { code: "es", label: "Español", flag: "🇪🇸" },
  { code: "fr", label: "Français", flag: "🇫🇷" },
  { code: "id", label: "Bahasa", flag: "🇮🇩" },
  { code: "ja", label: "日本語", flag: "🇯🇵" },
  { code: "ko", label: "한국어", flag: "🇰🇷" },
  { code: "pt", label: "Português", flag: "🇵🇹" },
  { code: "vi", label: "Tiếng Việt", flag: "🇻🇳" },
  { code: "zh", label: "中文", flag: "🇨🇳" }
];

export default function ChangeLanguage() {
  const { i18n, t } = useTranslation();
  const [selected, setSelected] = useState(i18n.language);
  const router = useRouter();
  const searchParams = useLocalSearchParams();

  const [showBanner, setShowBanner] = useState(false);
  const [bannerId, setBannerId] = useState<string>('');

  const handleBackPress = async () => {
    await AdsManager.showBackButtonAd('ChangeLanguage');
    if (searchParams?.from === "support") {
      router.replace("/support");
    } else {
      router.back();
    }
  };

  useEffect(() => {
    const config = AdsManager.getBannerConfig('language');
    if (config && config.show) {
      setShowBanner(true);
      setBannerId(config.id);
      console.log('🎯 Language Banner Config:', config);
    }
  }, []);

  const selectLanguage = (code: string) => {
    setSelected(code);
  };

  const applyLanguage = async () => {
    await i18n.changeLanguage(selected);
    await AsyncStorage.setItem("appLanguage", selected);
    await AdsManager.showInterstitialAd('splash_to_language');
    router.back();
  };

  return (
    <GradientScreen>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={handleBackPress}
          style={styles.backButton}
          activeOpacity={0.7}
        >
          <View style={styles.iconWrapper}>
            <Icon name="chevron-back-outline" size={20} color="#65017A" />
          </View>
        </TouchableOpacity>

        <Text style={styles.headerTitle}>
          {t("change_language")}
        </Text>

        <TouchableOpacity
          style={styles.doneButton}
          onPress={applyLanguage}
        >
          <Text style={styles.doneButtonText}>{t("done")}</Text>
        </TouchableOpacity>
      </View>

      <View style={{ flex: 1, padding: 20 }}>
        <FlatList
          data={languages}
          keyExtractor={(item) => item.code}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={{
                backgroundColor: "#ffffff34",
                padding: 10,
                borderRadius: 10,
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 10
              }}
              onPress={() => selectLanguage(item.code)}
            >
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <Text style={{ fontSize: 28, marginRight: 12 }}>{item.flag}</Text>
                <Text style={{ fontSize: 18, fontWeight: "bold", color: "#fff" }}>
                  {item.label}
                </Text>
              </View>
              {selected === item.code && (
                <Icon name="checkmark" size={25} color="#fff" />
              )}
            </TouchableOpacity>
          )}
        />

        {/* Banner Ad */}
        {showBanner && bannerId && (
          <View style={styles.bannerContainer}>
            <GAMBannerAd
              unitId={bannerId}
              sizes={[BannerAdSize.BANNER]}
              requestOptions={{
                requestNonPersonalizedAdsOnly: true,
              }}
              onAdLoaded={() => console.log("✅ Language Banner Ad Loaded")}
              onAdFailedToLoad={(error) => console.log("❌ Language Banner Ad Failed:", error)}
            />
          </View>
        )}
      </View>
    </GradientScreen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 15,
    paddingHorizontal: 20,
  },
  backButton: {
    padding: 5,
    marginLeft: 5,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#fff",
    flex: 1,
    textAlign: "center",
  },
  doneButton: {
    backgroundColor: "#5a009e",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginTop: 3,
  },
  doneButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  iconWrapper: {
    backgroundColor: "#ffff",
    padding: 1,
    borderRadius: 50,
  },
  bannerContainer: {
    alignItems: "center",
    marginTop: 15,
    marginBottom: 10,
  },
});