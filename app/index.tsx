import GradientScreen from "@/components/GradientScreen";
import Header from "@/components/Header";
import PrimaryButton from "@/components/PrimaryButton";
import AdsManager from "@/services/adsManager";
import { colors } from "@/utils/theme";
import { Ionicons as Icon } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import axios from "axios";
import * as Clipboard from "expo-clipboard";
import { router } from "expo-router";
import React, { JSX, useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";
import {
  BannerAdSize,
  GAMBannerAd
} from 'react-native-google-mobile-ads';
import { getDeviceIdSafe } from '../utils/deviceIdHelper';

const { width: screenWidth } = Dimensions.get("window");

const radius = {
  sm: 4,
  md: 8,
  lg: 12,
  xl: 20,
  pill: 999,
};

// async function getDeviceIdSafe(): Promise<string> {
//   try {
//     if (Platform.OS === "android") {
//       const id = await Application.getAndroidId();
//       return id || `android_${Date.now()}`;
//     } else if (Platform.OS === "ios") {
//       const id = await Application.getIosIdForVendorAsync();
//       return id || `ios_${Date.now()}`;
//     } else if (Platform.OS === "web") {
//       return `web_${Date.now()}`;
//     } else {
//       return `device_${Date.now()}`;
//     }
//   } catch (error) {
//     console.warn("Device ID fetch failed:", error);
//     return `fallback_${Date.now()}_${Math.random()
//       .toString(36)
//       .substr(2, 9)}`;
//   }
// }

export default function Giveaway(): JSX.Element {
  const [link, setLink] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [coins, setCoins] = useState<number>(0);
  const [token, setToken] = useState<string | null>(null);
  const [showRewardModal, setShowRewardModal] = useState(false);
  const [rewardedCoins, setRewardedCoins] = useState<number>(0);

  // Banner Ad Config
  const [bannerConfig, setBannerConfig] = useState<{
    show: boolean;
    id: string;
    position: string;
  } | null>(null);

  const navigation = useNavigation();
  const { t } = useTranslation();
  const isMounted = useRef(true);

  useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);

  // Load Banner Ad Config
  useEffect(() => {
    const config = AdsManager.getBannerConfig('home');
    setBannerConfig(config);
  }, []);

  const extractPromoCodeFromURL = async () => {
    try {
      const initialURL = await Linking.getInitialURL();
      if (initialURL) {
        const url = new URL(initialURL);
        const promoCode = url.searchParams.get('code');
        return promoCode;
      }
      return null;
    } catch (error) {
      console.log("Error extracting promo code:", error);
      return null;
    }
  };

  // Apply promo code
  const applyPromoCode = async (promoCode: string, deviceId: string) => {
    try {
      const response = await axios.post(
        "https://insta.adinsignia.com/api/promocode",
        {
          promo_code: promoCode,
          device_id: deviceId,
          name: ""
        }
      );

      console.log("Promo Code Response:", response.data);

      if (response?.data?.success && isMounted.current) {
        const coinsAdded = response.data.coins_added || 5;
        setRewardedCoins(coinsAdded);
        setShowRewardModal(true);

        setCoins(prev => prev + coinsAdded);

        const saved = await AsyncStorage.getItem("register_response");
        if (saved) {
          const parsed = JSON.parse(saved);
          parsed.data.coin_count = (Number(parsed.data.coin_count) + coinsAdded).toString();
          await AsyncStorage.setItem("register_response", JSON.stringify(parsed));
        }
      }
    } catch (error) {
      console.log("Promo code application failed:", error);
    }
  };

  useFocusEffect(
    useCallback(() => {
      const initRegister = async () => {
        try {
          const deviceId = await getDeviceIdSafe();
          console.log("📱 Device ID (Persistent):", deviceId);

          const res = await axios.post(
            "https://insta.adinsignia.com/api/register",
            { device_id: deviceId }
          );

          console.log("Auto Register Response:", res.data);

          if (res?.data?.success === "success" && isMounted.current) {
            const fullResponse = res.data;
            setToken(fullResponse.data.bearer_token);
            setCoins(Number(fullResponse.data.coin_count));
            await AsyncStorage.setItem(
              "register_response",
              JSON.stringify(fullResponse)
            );
            // Check if app was opened via promo code link
            const promoCode = await extractPromoCodeFromURL();
            if (promoCode) {
              console.log("Promo code detected:", promoCode);
              // Apply promo code silently
              await applyPromoCode(promoCode, deviceId);
            }
          }
        } catch (err) {
          console.log("Auto register failed:", err);
        }
      };

      initRegister();
    }, [])
  );

  const startGiveaway = async () => {
    try {
      setLoading(true);

      const saved = await AsyncStorage.getItem("register_response");
      if (!saved) {
        setLoading(false);
        Alert.alert("Error", "User not registered");
        return;
      }
      const parsed = JSON.parse(saved);
      setToken(parsed.data.bearer_token);

      const res = await axios.post(
        "https://newinsta.adinsignia.com/new-instragram.php",
        {
          postUrl: link,
          maxComments: 100,
        }
      );
      if (!isMounted.current) return;
      setLoading(false);
      if (res.data?.success === "success") {
        const comments = res.data?.data?.comments || [];
        const postData = res.data?.data?.post || {};

        try {
          const storedData = await AsyncStorage.getItem("giveawayData");
          let parsedData = storedData ? JSON.parse(storedData) : [];

          if (!Array.isArray(parsedData)) {
            parsedData = [parsedData];
          }
          const newGiveaway = {
            id: Date.now(),
            postUrl: link,
            comments,
            postData,
            token,
            fullResponse: res.data,
          };
          parsedData.unshift(newGiveaway);
          await AsyncStorage.setItem(
            "giveawayData",
            JSON.stringify(parsedData)
          );
        } catch (storageErr) {
          console.log("Error saving data:", storageErr);
        }

        // Show Interstitial Ad before navigation
        await AdsManager.showInterstitialAd('language_to_home');

        navigation.navigate("GiveawayRules", {
          data: { ...res.data, post_url: link },
          comments,
          token,
        } as any);
      } else {
        Alert.alert("Error", res.data?.message || "Unknown error");
      }
    } catch (err) {
      if (isMounted.current) {
        setLoading(false);
        Alert.alert("Error", "Something went wrong!");
      }
    }
  };

  const handlePaste = async () => {
    try {
      const text = await Clipboard.getStringAsync();
      setLink(text);
    } catch (err) {
      Alert.alert("Error", "Failed to get clipboard text");
    }
  };

  const isWeb = Platform.OS === "web";
  const containerMaxWidth = isWeb ? Math.min(screenWidth * 0.9, 500) : "100%";

  return (
    <GradientScreen>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 80 : 0}
      >
        <Header title="MENU" coins={coins} />
        <ScrollView
          contentContainerStyle={{ flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.container}>
            <View style={styles.winnersWrapper}>
              <View style={[styles.winnerBox, styles.secondWinner]}>
                <Image source={require("../assets/images/u2.jpg")} style={[styles.avatar, styles.secondAvatar]} />
                <View style={[styles.messageBox, styles.secondMessageBox]}>
                  <View style={[styles.badge, { backgroundColor: "#C0C0C0" }]}>
                    <Text style={styles.badgeText}>2</Text>
                  </View>
                  <View style={styles.linesContainer}>
                    <View style={[styles.line, styles.longLine]} />
                    <View style={[styles.line, styles.shortLine]} />
                  </View>
                </View>
              </View>

              <View style={[styles.winnerBox, styles.firstWinner]}>
                <Image source={require("../assets/images/u1.jpg")} style={[styles.avatar, styles.firstAvatar]} />
                <View style={[styles.messageBox, styles.firstMessageBox]}>
                  <View style={[styles.badge, { backgroundColor: "#FFD700" }]}>
                    <Text style={styles.badgeText}>1</Text>
                  </View>
                  <View style={styles.linesContainer}>
                    <View style={[styles.line, styles.longLine]} />
                    <View style={[styles.line, styles.shortLine]} />
                  </View>
                </View>
              </View>

              <View style={[styles.winnerBox, styles.thirdWinner]}>
                <Image source={require("../assets/images/u3.jpg")} style={[styles.avatar, styles.thirdAvatar]} />
                <View style={[styles.messageBox, styles.thirdMessageBox]}>
                  <View style={[styles.badge, { backgroundColor: "#CD7F32" }]}>
                    <Text style={styles.badgeText}>3</Text>
                  </View>
                  <View style={styles.linesContainer}>
                    <View style={[styles.line, styles.longLine]} />
                    <View style={[styles.line, styles.shortLine]} />
                  </View>
                </View>
              </View>
            </View>
          </View>

          <View style={styles.mainContainer}>
            <View
              style={[
                styles.contentCard,
                {
                  maxWidth: containerMaxWidth,
                  alignSelf: "center",
                  width: "100%",
                },
              ]}
            >
              <Text style={styles.main_title}>{t("main_title")}</Text>
              <Text style={styles.title}>{t("past_post_link")}</Text>

              <View style={styles.inputContainer}>
                <TextInput
                  placeholder="https://www.instagram.com/..."
                  placeholderTextColor="#fbfbfbff"
                  value={link}
                  onChangeText={setLink}
                  autoCapitalize="none"
                  autoCorrect={false}
                  style={styles.textInput}
                />
                <PrimaryButton
                  title={t("paste")}
                  onPress={handlePaste}
                  style={styles.pasteButton}
                  textStyle={styles.pasteButtonText}
                />
              </View>

              {loading ? (
                <ActivityIndicator
                  size="large"
                  color={colors.purple}
                  style={{ marginTop: 20 }}
                />
              ) : (
                <PrimaryButton
                  title={t("next_step")}
                  onPress={startGiveaway}
                  style={[
                    styles.nextButton,
                    !link && { backgroundColor: '#5a009e', opacity: 0.6 }
                  ]}
                  disabled={!link}
                />
              )}
              <Text style={styles.disclaimerText}>
                {t("small_text_home")}
              </Text>
              <View style={styles.centerInline}>
                <TouchableOpacity
                  style={styles.inlineButton}
                  onPress={() =>
                    router.push({
                      pathname: "/howToGiveaway",
                      params: { from: "home" },
                    })
                  }
                >
                  <Icon
                    name="help-circle-outline"
                    size={18}
                    color="#65017A"
                    style={{ marginRight: 6, backgroundColor: "#fff", borderRadius: 50 }}
                  />

                  <Text style={[styles.disclaimerText, { marginTop: 0, fontWeight: 700, color: "#cdecf4bc" }]}>{t("how_to_giveaway")}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </ScrollView>
        {bannerConfig && bannerConfig.show && (
          <View style={styles.stickyAdContainer}>
            <GAMBannerAd
              unitId={bannerConfig.id}
              sizes={[BannerAdSize.BANNER]}
              requestOptions={{
                requestNonPersonalizedAdsOnly: true,
              }}
              onAdLoaded={() => console.log("Home Banner Ad Loaded")}
              onAdFailedToLoad={(error) => console.log("Home Banner Ad Failed:", error)}
            />
          </View>
        )}
        {/* Reward Modal */}
        <Modal
          visible={showRewardModal}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowRewardModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Image
                source={require("../assets/images/coin1.png")}
                style={styles.coinImage}
              />
              <Text style={styles.modalTitle}>{rewardedCoins} COINS REWARDED</Text>
              <Text style={styles.modalSubtitle}>Reward Unlocked!</Text>
              <Text style={styles.modalDescription}>
                Refer coins are now added to your wallet. Use it across the app.
              </Text>
              <TouchableOpacity
                style={styles.doneButton}
                onPress={() => setShowRewardModal(false)}
              >
                <Text style={styles.doneButtonText}>Done</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </KeyboardAvoidingView>
    </GradientScreen>
  );
}
const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#B84FC7',
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
    width: '90%',
    maxWidth: 400,
  },
  coinImage: {
    width: 120,
    height: 120,
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 12,
  },
  modalSubtitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  modalDescription: {
    fontSize: 14,
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 24,
    opacity: 0.9,
  },
  doneButton: {
    backgroundColor: '#4A0066',
    paddingVertical: 16,
    paddingHorizontal: 80,
    borderRadius: 12,
    width: '100%',
  },
  doneButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  mainContainer: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: Platform.OS === "web" ? 20 : 16,
    paddingVertical: 20,
  },
  adContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    marginTop: 20,
    marginBottom: 20,
    paddingVertical: 10,
  },
  contentCard: {
    borderRadius: radius.xl,
    padding: Platform.OS === "web" ? 24 : 16,
    marginBottom: 22,
  },
  main_title: {
    fontWeight: "900",
    fontSize: Platform.OS === "web" ? 30 : 40,
    marginBottom: 16,
    textAlign: "left",
    color: "#fff",
  },
  title: {
    fontWeight: "400",
    fontSize: Platform.OS === "web" ? 20 : 15,
    marginBottom: 16,
    textAlign: "left",
    color: "#fff",
  },
  stickyAdContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    marginTop: 6,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
    zIndex: 1000,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  centerInline: {
    width: "100%",
    alignItems: "center",
    marginTop: 10,
    marginBottom: 10,
  },

  inlineButton: {
    flexDirection: "row",
    alignItems: "center",
  },

  inlineContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
  },

  textInput: {
    flex: 1,
    borderRadius: radius.md,
    paddingHorizontal: 14,
    height: 48,
    borderColor: "#F7F7F7",
    borderWidth: 2,
    fontSize: 14,
    color: "#fff",
  },
  container: {
    paddingVertical: 20,
    paddingHorizontal: 16,
    alignItems: "center",
  },
  winnersWrapper: {
    width: 320,
    height: 200,
    position: "relative",
    marginBottom: 20,
  },
  winnerBox: {
    position: "absolute",
    alignItems: "center",
  },
  firstWinner: {
    top: 0,
    left: "50%",
    marginLeft: -60,
    zIndex: 3,
  },
  secondWinner: {
    top: 120,
    left: 20,
    zIndex: 2,
  },
  thirdWinner: {
    top: 180,
    right: 90,
    zIndex: 2,
  },
  messageBox: {
    backgroundColor: "#ffffffe8",
    borderRadius: 20,
    height: 35,
    paddingHorizontal: 12,
    paddingRight: 15,
    justifyContent: "center",
    position: "absolute",
    shadowColor: "#000000ff",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    flexDirection: "row",
    alignItems: "center",
  },
  firstMessageBox: {
    width: 120,
    left: 50,
    top: -3,
  },
  secondMessageBox: {
    width: 110,
    left: 50,
    top: -3,
  },
  thirdMessageBox: {
    width: 110,
    left: 40,
    top: -1,
  },
  badge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    position: "absolute",
    left: 5,
    top: 5.5,
  },
  linesContainer: {
    marginLeft: 20,
    justifyContent: "center",
  },
  line: {
    backgroundColor: "#c2c2f6ff",
    marginVertical: 1.5,
    borderRadius: 2,
  },
  longLine: {
    width: 60,
    height: 4,
  },
  shortLine: {
    width: 40,
    height: 4,
  },
  badgeText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 14,
  },
  avatar: {
    borderRadius: 25,
    borderWidth: 3,
    borderColor: "#fff",
  },
  firstAvatar: {
    width: 90,
    height: 90,
    borderRadius: 50,
  },
  secondAvatar: {
    width: 80,
    height: 80,
    borderRadius: 50,
  },
  thirdAvatar: {
    width: 70,
    height: 70,
    borderRadius: 50,
  },
  pasteButton: {
    paddingHorizontal: 16,
    paddingVertical: 3,
    borderRadius: radius.pill,
    minWidth: 70,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  pasteButtonText: {
    fontSize: 13,
    fontWeight: "600",
    textAlign: "center",
    includeFontPadding: false,
    textAlignVertical: "center",
  },
  nextButton: {
    marginTop: 20,
    borderRadius: radius.pill,
  },
  disclaimerText: {
    marginTop: 12,
    textAlign: "center",
    color: "#ffffffff",
    fontSize: 13,
  },
  winnersContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    marginBottom: 20,
  },
  winnerItem: {
    position: "relative",
    alignItems: "center",
  },
  winnerImage: {
    width: 70,
    height: 70,
    borderRadius: 35,
    resizeMode: "cover",
  },
  rankBadge: {
    position: "absolute",
    top: -5,
    right: -5,
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  rankText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 12,
  },

});
