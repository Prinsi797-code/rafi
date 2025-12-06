import { fetchAppConfig } from "@/utils/firebaseConfig";
import { Drawer } from "expo-router/drawer";
import React, { useEffect, useState } from "react";
import { I18nextProvider } from "react-i18next";
import { Text, View } from "react-native";
import i18n, { i18nInitPromise } from "../utils/i18n";

export default function RootLayout() {
  const [ready, setReady] = useState(false);
  const [firebaseReady, setFirebaseReady] = useState(false);

  useEffect(() => {
    i18nInitPromise.then(() => setReady(true));
  }, []);

  // Firestore Config Init
  useEffect(() => {
    const load = async () => {
      await fetchAppConfig();
      setFirebaseReady(true);
    };
    load();
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
