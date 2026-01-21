import { fetchAppConfig } from "@/utils/firebaseConfig";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "@react-navigation/native";
import { Video } from "expo-av";
import * as Clipboard from 'expo-clipboard';
import { useRouter } from "expo-router";
import React, { JSX, memo, useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
    ActivityIndicator,
    Alert,
    Image,
    ImageBackground,
    Linking,
    Modal,
    Platform,
    Pressable,
    ScrollView,
    Share,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from "react-native";
import { BannerAd, BannerAdSize, InterstitialAd } from 'react-native-google-mobile-ads';
import GradientScreen from "../components/GradientScreen";
import Header from "../components/Header";
import { getDeviceIdSafe } from '../utils/deviceIdHelper';
import { colors, radius } from "../utils/theme";

type RowProps = {
    image: any;
    label: string;
    arrowColor: string;
    onPress?: () => void;
};

const Row = memo(({ image, label, onPress, arrowColor = "#fff" }: RowProps): JSX.Element => (
    <Pressable onPress={onPress} style={({ pressed }) => [
        styles.row,
        { opacity: pressed ? 0.6 : 1 }
    ]}>
        <View style={styles.rowLeft}>
            <Image source={image} style={styles.rowImage} />
            <Text style={styles.rowLabel}>{label}</Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color={arrowColor} />
    </Pressable>
));


export default function Support(): JSX.Element {
    const [showGiveaway, setShowGiveaway] = useState(false);
    const [showVideo, setShowVideo] = useState(false);
    const router = useRouter();
    const { t } = useTranslation();
    const [showPromoModal, setShowPromoModal] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showViewPromoModal, setShowViewPromoModal] = useState(false);
    const [promoCode, setPromoCode] = useState("");
    const [bannerId, setBannerId] = useState("");
    const [showAds, setShowAds] = useState(false);
    const [userPromoCode, setUserPromoCode] = useState("");
    const [adsLoaded, setAdsLoaded] = useState(false);
    const interstitial = InterstitialAd.createForAdRequest('ca-app-pub-3940256099942544/1033173712');

    // User Details States
    const [showUserDetailsModal, setShowUserDetailsModal] = useState(false);
    const [userName, setUserName] = useState("");
    const [userEmail, setUserEmail] = useState("");
    const [isSubmittingUserDetails, setIsSubmittingUserDetails] = useState(false);
    const [isLoadingUserDetails, setIsLoadingUserDetails] = useState(false);

    useEffect(() => {
        const loadConfig = async () => {
            const config = await fetchAppConfig();

            if (config) {
                setShowAds(config.picker_ads === true);
                setBannerId(
                    Platform.OS === "ios"
                        ? config.ios_banner_id
                        : config.android_banner_id
                );
            }
            setAdsLoaded(true);
        };
        loadConfig();
    }, []);

    useFocusEffect(
        useCallback(() => {
            loadUserPromoCode();
        }, [])
    );

    const loadUserPromoCode = async () => {
        try {
            const saved = await AsyncStorage.getItem("register_response");
            console.log("Register Response:", saved);

            if (saved) {
                const parsed = JSON.parse(saved);
                const code = parsed.data?.promo_code || "";
                setUserPromoCode(code);
                console.log("User Promo Code Set:", code);
            } else {
                console.log("No register_response found in AsyncStorage");
            }
        } catch (error) {
            console.log("Error loading promo code:", error);
        }
    };

    // Fetch user details from API
    const fetchUserDetailsFromAPI = async () => {
        setIsLoadingUserDetails(true);
        try {
            const saved = await AsyncStorage.getItem("register_response");
            if (!saved) {
                console.log("No register_response found");
                setIsLoadingUserDetails(false);
                return;
            }

            const parsed = JSON.parse(saved);
            const bearerToken = parsed.data?.bearer_token;

            if (!bearerToken) {
                console.log("No bearer token found");
                setIsLoadingUserDetails(false);
                return;
            }

            const response = await fetch("https://insta.adinsignia.com/api/user", {
                method: "GET",
                headers: {
                    "Content-Type": "application/json",
                    "Accept": "application/json",
                    "Authorization": `Bearer ${bearerToken}`,
                },
            });

            const responseText = await response.text();
            console.log("User Details GET Response:", responseText);

            let data;
            try {
                data = JSON.parse(responseText);
            } catch (parseError) {
                console.error("JSON Parse Error:", parseError);
                throw new Error("Invalid response from server");
            }

            if (data.success && data.data) {
                // Set the user details in state
                setUserName(data.data.name || "");
                setUserEmail(data.data.email || "");
                console.log("User details fetched - Name:", data.data.name, "Email:", data.data.email);
            } else {
                console.log("No user details available or failed to fetch");
                setUserName("");
                setUserEmail("");
            }
        } catch (error) {
            console.error("Error fetching user details:", error);
            // Set empty values on error
            setUserName("");
            setUserEmail("");
        } finally {
            setIsLoadingUserDetails(false);
        }
    };

    // Handle opening user details modal
    const handleOpenUserDetailsModal = async () => {
        setShowUserDetailsModal(true);
        await fetchUserDetailsFromAPI();
    };

    const handleUserDetailsSubmit = async () => {
        if (!userName.trim()) {
            Alert.alert("Error", "Please enter your name");
            return;
        }

        setIsSubmittingUserDetails(true);

        try {
            const saved = await AsyncStorage.getItem("register_response");
            if (!saved) {
                Alert.alert("Error", "Authentication token not found. Please restart the app.");
                setIsSubmittingUserDetails(false);
                return;
            }

            const parsed = JSON.parse(saved);
            const bearerToken = parsed.data?.bearer_token;

            if (!bearerToken) {
                Alert.alert("Error", "Authentication token not found. Please restart the app.");
                setIsSubmittingUserDetails(false);
                return;
            }

            const requestBody = {
                name: userName.trim(),
                email: userEmail.trim() || "",
            };

            const response = await fetch("https://insta.adinsignia.com/api/user/details", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Accept": "application/json",
                    "Authorization": `Bearer ${bearerToken}`,
                },
                body: JSON.stringify(requestBody),
            });

            const responseText = await response.text();
            console.log("User Details POST Response:", responseText);

            let data;
            try {
                data = JSON.parse(responseText);
            } catch (parseError) {
                console.error("JSON Parse Error:", parseError);
                throw new Error("Invalid response from server");
            }

            if (data.success) {
                const currentSaved = await AsyncStorage.getItem("register_response");
                if (currentSaved) {
                    const currentParsed = JSON.parse(currentSaved);
                    const updatedResponse = {
                        ...currentParsed,
                        data: {
                            ...currentParsed.data,
                            name: userName.trim(),
                            email: userEmail.trim() || null,
                        }
                    };

                    await AsyncStorage.setItem("register_response", JSON.stringify(updatedResponse));
                    console.log("Updated register_response with user details");
                }
                
                setShowUserDetailsModal(false);
                Alert.alert(
                    "Success",
                    data.message || "User details updated successfully"
                );
            } else {
                Alert.alert("Error", data.message || "Failed to update user details");
            }
        } catch (error) {
            console.error("User details error:", error);
            Alert.alert("Error", "Failed to update user details. Please try again.");
        } finally {
            setIsSubmittingUserDetails(false);
        }
    };

    const handleShareApp = async () => {
        try {
            const result = await Share.share({
                message: "Try this awesome app: https://apps.apple.com/in/app/epick-comment-picker/id6754905789"
            });
            if (result.action === Share.sharedAction) {
                console.log("Shared successfully");
            }
        } catch (error) {
            console.log("Error sharing:", error);
        }
    };

    const handlePromoCodeSubmit = async () => {
        if (!promoCode.trim()) {
            Alert.alert("Error", "Please enter a promo code");
            return;
        }

        setIsSubmitting(true);

        try {
            const deviceId = await getDeviceIdSafe();

            const response = await fetch("https://insta.adinsignia.com/api/promocode", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    promo_code: promoCode.trim(),
                    device_id: deviceId,
                    name: "",
                }),
            });

            const data = await response.json();
            console.log("Promo Code API Response:", data);

            if (data.success) {
                const saved = await AsyncStorage.getItem("register_response");
                if (saved) {
                    const parsed = JSON.parse(saved);
                    const updatedResponse = {
                        ...parsed,
                        data: {
                            ...parsed.data,
                            promo_code: data.promo_code || "",
                            promo_used_count: data.promo_used_count || 0,
                            coins_added: data.coins_added || 0,
                            total_coins: data.total_coins || parsed.data.coin_count || 0,
                        }
                    };
                    await AsyncStorage.setItem("register_response", JSON.stringify(updatedResponse));
                }

                setShowPromoModal(false);
                setPromoCode("");
                await loadUserPromoCode();

                Alert.alert(
                    "Success",
                    data.message || "Your promo code applied successfully",
                    [
                        {
                            text: "OK",
                            onPress: () => {
                                router.push("/");
                            }
                        }
                    ]
                );
            } else {
                Alert.alert("Error", data.message || "Failed to apply promo code");
            }
        } catch (error) {
            console.error("Promo code error:", error);
            Alert.alert("Error", "Failed to apply promo code. Please try again.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleCopyPromoCode = async () => {
        if (!userPromoCode) {
            Alert.alert("Error", "No promo code available to copy");
            return;
        }

        try {
            await Clipboard.setStringAsync(userPromoCode);
            Alert.alert("Success", "Promo code copied to clipboard!");
        } catch (error) {
            console.log("Copy error:", error);
            Alert.alert("Error", "Failed to copy promo code");
        }
    };

    const handleSharePromoCode = async () => {
        if (!userPromoCode) {
            Alert.alert("Error", "No promo code available to share");
            return;
        }
        try {
            const message = `Epick - Comment picker
🚀 Use our powerful Epick - Comment Picker app to pick winners from post comments automatically. No more manual work — just a quick, fair, and random selection process! 🎯
Your referral code:
code: "${userPromoCode}"
Download & Install👇
https://apps.apple.com/in/app/epick-comment-picker/id6754905789?referrer=code=${userPromoCode}`;

            const result = await Share.share({
                message: message
            });

            if (result.action === Share.sharedAction) {
                console.log("Promo code shared successfully");
            }
        } catch (error) {
            console.log("Share error:", error);
            Alert.alert("Error", "Failed to share promo code");
        }
    };

    return (
        <>
            <GradientScreen>
                <Header coins={15} />
                <ScrollView
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                >
                    <View style={styles.container}>
                        <TouchableOpacity onPress={() => setShowVideo(true)}>
                            <ImageBackground
                                source={require("../assets/images/thumbanil1.jpeg")}
                                style={styles.demoBox}
                                imageStyle={{ borderRadius: radius.xl }}
                            >
                                <Ionicons name="play-circle" size={56} color="#FFFFFF" />
                                <Text style={styles.demoText}>{t("play_demo")}</Text>
                            </ImageBackground>
                        </TouchableOpacity>

                        <Row
                            image={require("../assets/images/howto.png")}
                            label={t("how_to_giveaway")}
                            onPress={() =>
                                router.push({
                                    pathname: "/howToGiveaway",
                                    params: { from: "support" },
                                })
                            }
                        />
                        <Row
                            image={require("../assets/images/help.png")}
                            label={t("help")}
                            onPress={() =>
                                Linking.openURL(
                                    "mailto:tempocodee@gmail.com?subject=Comment%20Picker%20Feedback"
                                )
                            }
                        />
                        <Row
                            image={require("../assets/images/rateus.png")}
                            label={t("rate_us")}
                            onPress={() => {
                                Linking.openURL("https://apps.apple.com/in/app/epick-comment-picker/id6754905789");
                            }}
                        />
                        <Row
                            image={require("../assets/images/shareus.png")}
                            label={t("share_app")}
                            onPress={handleShareApp}
                        />

                        <Text style={styles.sectionTitle}>{t("promo_code")}</Text>

                        <Row
                            image={require("../assets/images/addPromocode.png")}
                            label={t("add_promo_code")}
                            onPress={() => setShowPromoModal(true)}
                        />

                        <Row
                            image={require("../assets/images/viewcoupon.png")}
                            label={t("view_promo_code")}
                            onPress={() => setShowViewPromoModal(true)}
                        />

                        <Text style={styles.sectionTitle}>{t("user_details")}</Text>

                        <Row
                            image={require("../assets/images/User.png")}
                            label={t("add_user_details")}
                            onPress={handleOpenUserDetailsModal}
                        />

                        <Text style={styles.sectionTitle}>{t("history")}</Text>

                        <Row
                            image={require("../assets/images/givehistory.png")}
                            label={t("giveaway_history")}
                            onPress={() =>
                                router.push({
                                    pathname: "/History",
                                    params: { from: "support" },
                                })
                            }
                        />

                        <Text style={styles.sectionTitle}>{t("preferences")}</Text>

                        <Row
                            image={require("../assets/images/language.png")}
                            label={t("change_language")}
                            onPress={() => router.push({
                                pathname: "/ChangeLanguage",
                                params: { from: "support" },
                            })
                            }
                        />

                        <Text style={styles.sectionTitle}>{t("premium")}</Text>
                        <Row
                            image={require("../assets/images/coin.png")}
                            label={t("get_coins")}
                            onPress={() => router.push("/Packages")}
                        />

                        <Text style={styles.sectionTitle}>{t("terms_conditions")}</Text>

                        <Row
                            image={require("../assets/images/privacy.png")}
                            label={t("privacy_policy")}
                            onPress={async () => {
                                const url = "https://sites.google.com/view/comment-pick/home";
                                const supported = await Linking.canOpenURL(url);
                                if (supported) {
                                    await Linking.openURL(url);
                                } else {
                                    Alert.alert("Cannot open this URL:", url);
                                }
                            }}
                        />

                        <Row
                            image={require("../assets/images/termandcondition.png")}
                            label={t("terms_conditions")}
                            onPress={async () => {
                                const url = "https://sites.google.com/view/comment-pick/home";
                                const supported = await Linking.canOpenURL(url);
                                if (supported) {
                                    await Linking.openURL(url);
                                } else {
                                    Alert.alert("Cannot open this URL:", url);
                                }
                            }}
                        />
                    </View>
                </ScrollView>
                {adsLoaded && showAds && bannerId && (
                    <View style={styles.adContainer}>
                        <BannerAd
                            unitId={bannerId}
                            size={BannerAdSize.BANNER}
                            requestOptions={{
                                requestNonPersonalizedAdsOnly: true,
                            }}
                            onAdLoaded={() => console.log("Ad Loaded:", bannerId)}
                            onAdFailedToLoad={(e) => console.log("Ad Failed:", e)}
                        />
                    </View>
                )}
            </GradientScreen>

            <Modal visible={showGiveaway} animationType="slide">
                <View style={styles.modalContainer}>
                    <TouchableOpacity
                        onPress={() => setShowGiveaway(false)}
                        style={styles.modalClose}
                    >
                        <Ionicons name="close" size={28} />
                    </TouchableOpacity>

                    <Text style={styles.modalTitle}>{t("how_to_giveaway")}</Text>

                    <TouchableOpacity onPress={() => setShowVideo(true)}>
                        <ImageBackground
                            source={require("../assets/images/thumbanil1.png")}
                            style={styles.demoBox}
                            imageStyle={{ borderRadius: radius.xl }}
                        >
                            <Ionicons name="play-circle" size={56} color="#FFFFFF" />
                            <Text style={styles.demoText}>{t("play_demo")}</Text>
                        </ImageBackground>
                    </TouchableOpacity>

                    {[
                        { title: t("first_step"), desc: t("first_step_desc") },
                        { title: t("second_step"), desc: t("second_step_desc") },
                        { title: t("third_step"), desc: t("third_step_desc") },
                        { title: t("fourth_step"), desc: t("fourth_step_desc") },
                    ].map((step, idx) => (
                        <View key={idx} style={styles.stepBox}>
                            <Text style={styles.stepTitle}>{step.title}</Text>
                            <Text>{step.desc}</Text>
                        </View>
                    ))}
                </View>
            </Modal>

            <Modal visible={showVideo} transparent animationType="fade">
                <Pressable
                    style={styles.popupOverlay}
                    onPress={() => setShowVideo(false)}
                >
                    <Pressable style={styles.videoCard} onPress={() => { }}>
                        <Video
                            source={require("../assets/images/preview.mp4")}
                            style={styles.videoBox}
                            resizeMode="contain"
                            useNativeControls
                            shouldPlay
                        />
                    </Pressable>
                </Pressable>
            </Modal>

            <Modal visible={showPromoModal} transparent animationType="fade">
                <Pressable
                    style={styles.popupOverlay}
                    onPress={() => !isSubmitting && setShowPromoModal(false)}
                >
                    <Pressable style={styles.promoCard} onPress={() => { }}>
                        <View style={styles.promoHeader}>
                            <Text style={styles.promoTitle}>{t("add_promo_code")}</Text>
                            <TouchableOpacity
                                onPress={() => !isSubmitting && setShowPromoModal(false)}
                                style={styles.promoCloseButton}
                                disabled={isSubmitting}
                            >
                                <Ionicons name="close-circle" size={28} color="#fff" />
                            </TouchableOpacity>
                        </View>

                        <TextInput
                            style={styles.promoInput}
                            placeholder="Enter promo code"
                            placeholderTextColor="#ffffff80"
                            value={promoCode}
                            onChangeText={setPromoCode}
                            autoCapitalize="characters"
                            editable={!isSubmitting}
                        />

                        <TouchableOpacity
                            style={[styles.doneButton, isSubmitting && styles.doneButtonDisabled]}
                            onPress={handlePromoCodeSubmit}
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? (
                                <ActivityIndicator color="#fff" />
                            ) : (
                                <Text style={styles.doneButtonText}>{t("done")}</Text>
                            )}
                        </TouchableOpacity>
                    </Pressable>
                </Pressable>
            </Modal>

            <Modal visible={showViewPromoModal} transparent animationType="fade">
                <Pressable
                    style={styles.popupOverlay}
                    onPress={() => setShowViewPromoModal(false)}
                >
                    <Pressable style={styles.promoCard} onPress={() => { }}>
                        <View style={styles.promoHeader}>
                            <Text style={styles.promoTitle}>{t("view_promo_code")}</Text>
                            <TouchableOpacity
                                onPress={() => setShowViewPromoModal(false)}
                                style={styles.promoCloseButton}
                            >
                                <Ionicons name="close-circle" size={28} color="#fff" />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.promoCodeDisplay}>
                            <Text style={styles.promoCodeText}>
                                {userPromoCode || "No promo code available"}
                            </Text>
                        </View>

                        <View style={styles.promoButtonRow}>
                            <TouchableOpacity
                                style={styles.promoActionButton}
                                onPress={handleCopyPromoCode}
                                disabled={!userPromoCode}
                            >
                                <Text style={styles.promoActionButtonText}>{t("copy")}</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={styles.promoActionButton}
                                onPress={handleSharePromoCode}
                                disabled={!userPromoCode}
                            >
                                <Text style={styles.promoActionButtonText}>{t("share")}</Text>
                            </TouchableOpacity>
                        </View>
                    </Pressable>
                </Pressable>
            </Modal>

            <Modal visible={showUserDetailsModal} transparent animationType="fade">
                <Pressable
                    style={styles.popupOverlay}
                    onPress={() => !isSubmittingUserDetails && !isLoadingUserDetails && setShowUserDetailsModal(false)}
                >
                    <Pressable style={styles.promoCard} onPress={() => { }}>
                        <View style={styles.promoHeader}>
                            <Text style={styles.promoTitle}>{t("user_details")}</Text>
                            <TouchableOpacity
                                onPress={() => !isSubmittingUserDetails && !isLoadingUserDetails && setShowUserDetailsModal(false)}
                                style={styles.promoCloseButton}
                                disabled={isSubmittingUserDetails || isLoadingUserDetails}
                            >
                                <Ionicons name="close-circle" size={28} color="#fff" />
                            </TouchableOpacity>
                        </View>

                        {isLoadingUserDetails ? (
                            <View style={{ padding: 20, alignItems: 'center' }}>
                                <ActivityIndicator color="#fff" size="large" />
                                <Text style={{ color: '#fff', marginTop: 10 }}>Loading details...</Text>
                            </View>
                        ) : (
                            <>
                                <TextInput
                                    style={[styles.promoInput, { color: '#FFFFFF' }]}
                                    placeholder="Enter your name"
                                    placeholderTextColor="#ffffff80"
                                    value={userName}
                                    onChangeText={setUserName}
                                    editable={!isSubmittingUserDetails}
                                />

                                <TextInput
                                    style={[styles.promoInput, { marginTop: 15, color: '#FFFFFF' }]}
                                    placeholder="Enter your email (optional)"
                                    placeholderTextColor="#ffffff80"
                                    value={userEmail}
                                    onChangeText={setUserEmail}
                                    keyboardType="email-address"
                                    autoCapitalize="none"
                                    editable={!isSubmittingUserDetails}
                                />

                                <TouchableOpacity
                                    style={[styles.doneButton, isSubmittingUserDetails && styles.doneButtonDisabled]}
                                    onPress={handleUserDetailsSubmit}
                                    disabled={isSubmittingUserDetails}
                                >
                                    {isSubmittingUserDetails ? (
                                        <ActivityIndicator color="#fff" />
                                    ) : (
                                        <Text style={styles.doneButtonText}>{t("submit")}</Text>
                                    )}
                                </TouchableOpacity>
                            </>
                        )}
                    </Pressable>
                </Pressable>
            </Modal>
        </>
    );
}
const styles = StyleSheet.create({
    scrollContent: {
        paddingBottom: 40,
        alignItems: "center",
    },
    adContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
        paddingVertical: 10,
    },
    container: {
        width: "100%",
        maxWidth: 600,
        paddingHorizontal: 20,
    },
    popupOverlay: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.5)",
        justifyContent: "center",
        alignItems: "center",
    },
    row: {
        backgroundColor: "#ffffff34",
        padding: 16,
        borderRadius: radius.xl,
        marginBottom: 12,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
    },
    rowLeft: {
        flexDirection: "row",
        alignItems: "center",
    },
    rowImage: {
        width: 22,
        height: 22,
        marginRight: 12,
        resizeMode: "contain",
    },
    rowLabel: {
        fontWeight: "700",
        color: "#f8f6f6ff",
    },
    videoCard: {
        width: "90%",
        backgroundColor: "white",
        borderRadius: 20,
        padding: 10,
        alignItems: "center",
    },
    videoBox: {
        width: "100%",
        height: 250,
        borderRadius: 12,
        backgroundColor: "black",
    },
    demoBox: {
        backgroundColor: colors.white,
        height: 160,
        borderRadius: radius.xl,
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 18,
    },
    demoText: {
        marginTop: 8,
        fontWeight: "bold",
        color: "white",
    },
    sectionTitle: {
        fontWeight: "900",
        marginVertical: 10,
        color: "#fff",
    },
    modalContainer: {
        flex: 1,
        backgroundColor: "#fddde6",
        padding: 20,
        paddingTop: 50,
    },
    modalTitle: {
        fontWeight: "900",
        fontSize: 22,
        marginBottom: 20,
    },
    modalClose: {
        position: "absolute",
        top: 40,
        right: 20,
    },
    stepBox: {
        backgroundColor: "white",
        padding: 16,
        borderRadius: radius.xl,
        marginBottom: 10,
    },
    stepTitle: {
        fontWeight: "900",
        marginBottom: 4,
    },
    promoCard: {
        width: "85%",
        backgroundColor: "#C74FD6",
        borderRadius: 20,
        padding: 24,
        alignItems: "center",
    },
    promoHeader: {
        width: "100%",
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 20,
    },
    promoTitle: {
        fontSize: 20,
        fontWeight: "bold",
        color: "#fff",
    },
    promoCloseButton: {
        padding: 4,
    },
    promoInput: {
        width: "100%",
        backgroundColor: "#ffffff34",
        borderRadius: 12,
        padding: 16,
        fontSize: 16,
        color: "#333",
        marginBottom: 5,
    },
    doneButton: {
        width: "100%",
        backgroundColor: "#6B1B9A",
        borderRadius: 12,
        padding: 16,
        marginTop: 20,
        alignItems: "center",
    },
    doneButtonDisabled: {
        opacity: 0.6,
    },
    doneButtonText: {
        color: "#fff",
        fontSize: 16,
        fontWeight: "bold",
    },
    promoCodeDisplay: {
        width: "100%",
        backgroundColor: "#ffffff34",
        borderRadius: 12,
        padding: 20,
        alignItems: "center",
        marginBottom: 20,
    },
    promoCodeText: {
        fontSize: 18,
        fontWeight: "bold",
        color: "#f0f0f0",
        letterSpacing: 2,
    },
    promoButtonRow: {
        width: "100%",
        flexDirection: "row",
        justifyContent: "space-between",
        gap: 12,
    },
    promoActionButton: {
        flex: 1,
        backgroundColor: "#6B1B9A",
        borderRadius: 12,
        padding: 16,
        alignItems: "center",
    },
    promoActionButtonText: {
        color: "#fff",
        fontSize: 16,
        fontWeight: "bold",
    },


});
