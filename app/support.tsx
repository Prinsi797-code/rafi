import { fetchAppConfig } from "@/utils/firebaseConfig"; // UPDATED ✔
import { Ionicons } from "@expo/vector-icons";
import { Video } from "expo-av";
import { useRouter } from "expo-router";
import React, { JSX, memo, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
    Alert,
    Image,
    ImageBackground,
    Linking,
    Modal,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { BannerAd, BannerAdSize, InterstitialAd } from 'react-native-google-mobile-ads';
import GradientScreen from "../components/GradientScreen";
import Header from "../components/Header";
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
        { opacity: pressed ? 0.6 : 1 } // smooth tap feedback
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
    const [bannerId, setBannerId] = useState("");
    const [showAds, setShowAds] = useState(false);
    const [adsLoaded, setAdsLoaded] = useState(false);
    const interstitial = InterstitialAd.createForAdRequest('ca-app-pub-3940256099942544/1033173712');

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

                        <Text style={styles.sectionTitle}>{t("support")}</Text>
                        <Row
                            image={require("../assets/images/howto.png")}
                            label={t("how_to_giveaway")}
                            onPress={() => router.push("/howToGiveaway")}
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
                        <Row image={require("../assets/images/rateus.png")} label={t("rate_us")} />
                        <Row image={require("../assets/images/shareus.png")} label={t("share_app")} />


                        <Text style={styles.sectionTitle}>{t("history")}</Text>
                        <Row
                            image={require("../assets/images/givehistory.png")}
                            label={t("giveaway_history")}
                            onPress={() => router.push("/History")}

                        />

                        <Text style={styles.sectionTitle}>{t("preferences")}</Text>
                        <Row
                            image={require("../assets/images/language.png")}
                            label={t("change_language")}
                            onPress={() => router.push("/ChangeLanguage")}
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
                {/* <View style={styles.adContainer}>
                    <BannerAd
                        unitId={TestIds.BANNER}
                        size={BannerAdSize.BANNER}
                        requestOptions={{
                            requestNonPersonalizedAdsOnly: true,
                        }}
                    />
                </View> */}
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

            {/* Giveaway Modal */}
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

            {/* Video Modal */}
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
        </>
    );
}

const styles = StyleSheet.create({
    scrollContent: {
        paddingBottom: 40,
        alignItems: "center",
    },
    adContainer: {
        alignItems: 'center',        // Horizontal center
        justifyContent: 'center',    // Vertical center
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
});
