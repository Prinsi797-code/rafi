import { Drawer } from "expo-router/drawer";
import React, { useEffect, useState } from "react";
import { I18nextProvider } from "react-i18next";
import { ActivityIndicator, Text, View } from "react-native";
import i18n, { i18nInitPromise } from "../utils/i18n";

export default function RootLayout() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    i18nInitPromise.then(() => setReady(true));
  }, []);

  if (!ready) {
    // Show loader while language is initializing
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator size="large" />
        <Text>Loading translations...</Text>
      </View>
    );
  }

  return (
    <I18nextProvider i18n={i18n}>
      <Drawer screenOptions={{ headerShown: false }}>
        <Drawer.Screen
          name="index"
          options={{ drawerLabel: () => <Text>Home</Text> }}
        />
        <Drawer.Screen
          name="support"
          options={{ drawerLabel: () => <Text>Support</Text> }}
        />
        <Drawer.Screen
          name="Winner"
          options={{ drawerLabel: () => <Text>Pick Winner</Text> }}
        />
      </Drawer>
    </I18nextProvider>
  );
}
