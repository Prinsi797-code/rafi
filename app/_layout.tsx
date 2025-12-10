import { fetchAppConfig } from "@/utils/firebaseConfig";
import { Drawer } from "expo-router/drawer";
import React, { useEffect, useState } from "react";
import { I18nextProvider } from "react-i18next";
import { AppState, AppStateStatus, Text, View } from "react-native";
import AdsManager from "../services/adsManager";
import i18n, { i18nInitPromise } from "../utils/i18n";

export default function RootLayout() {
  const [ready, setReady] = useState(false);
  const [firebaseReady, setFirebaseReady] = useState(false);

  useEffect(() => {
    i18nInitPromise.then(() => setReady(true));
  }, []);

  // Firestore Config Init + Ads Setup
  useEffect(() => {
    const load = async () => {
      const config = await fetchAppConfig();
      setFirebaseReady(true);

      if (config) {
        // Initialize Ads Manager
        AdsManager.setConfig(config);
        AdsManager.initializeAds();

        // Show App Open Ad on first launch
        setTimeout(() => {
          AdsManager.showAppOpenAd();
        }, 1000);
      }
    };
    load();
  }, []);

  // Show App Open Ad when app comes to foreground
  useEffect(() => {
    const subscription = AppState.addEventListener(
      "change",
      (nextAppState: AppStateStatus) => {
        if (nextAppState === "active") {
          AdsManager.showAppOpenAd();
        }
      }
    );

    return () => {
      subscription.remove();
    };
  }, []);

  if (!ready || !firebaseReady) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <Text style={{ fontSize: 18 }}>Loading…</Text>
      </View>
    );
  }

  return (
    <I18nextProvider i18n={i18n}>
      <Drawer screenOptions={{ headerShown: false }}>
        <Drawer.Screen name="index" />
        <Drawer.Screen name="support" />
        <Drawer.Screen name="Winner" />
      </Drawer>
    </I18nextProvider>
  );
}