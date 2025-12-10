import AdsManager from "@/services/adsManager";
import { Ionicons as Icon } from "@expo/vector-icons";
import { Video } from "expo-av";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { JSX, memo, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Image, ImageBackground, Modal, Pressable, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { BannerAdSize, GAMBannerAd } from 'react-native-google-mobile-ads';
import GradientScreen from "../components/GradientScreen";
import { radius } from "../utils/theme";

type RowProps = {
    image: any;
    label: string;
    onPress?: () => void;
};

const Row = memo(({ image, label, onPress }: RowProps): JSX.Element => (
    <Pressable onPress={onPress} style={styles.row}>
        <View style={styles.rowLeft}>
            <Image source={image} style={styles.rowImage} />
            <Text style={styles.rowLabel}>{label}</Text>
        </View>
        <Icon name="chevron-forward" size={18} />
    </Pressable>
));

export default function HowToGiveaway() {
    const { t } = useTranslation();
    const router = useRouter();
    const [showVideo, setShowVideo] = useState(false);
    const { from } = useLocalSearchParams();

    // Banner Ad Config
    const [bannerConfig, setBannerConfig] = useState<{
        show: boolean;
        id: string;
        position: string;
    } | null>(null);

    // Load Banner Ad Config
    useEffect(() => {
        const config = AdsManager.getBannerConfig('home');
        setBannerConfig(config);
    }, []);

    const handleBackPress = async () => {
        try {
            await AdsManager.showBackButtonAd('HowToGiveaway');
            if (from === "support") {
                router.replace("/support");
            } else {
                router.replace("/");
            }
        } catch (error) {
            console.error("Error showing back ad:", error);
            if (from === "support") {
                router.replace("/support");
            } else {
                router.replace("/");
            }
        }
    };

    return (
        <GradientScreen>
            {/* Header */}
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

                <Text style={styles.headerTitle}>{t("how_to_giveaway")}</Text>
                <View style={{ width: 26 }} />
            </View>

            <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
                {/* Demo Video Thumbnail */}
                <View style={styles.container}>
                    <TouchableOpacity onPress={() => setShowVideo(true)}>
                        <ImageBackground
                            source={require("../assets/images/thumbanil1.jpeg")}
                            style={styles.demoBox}
                            imageStyle={{ borderRadius: radius.xl }}
                        >
                            <Icon name="play-circle" size={56} color="#FFFFFF" />
                            <Text style={styles.demoText}>{t("play_demo")}</Text>
                        </ImageBackground>
                    </TouchableOpacity>
                </View>

                {/* Steps */}
                {[
                    { title: t("first_step"), desc: t("first_step_desc") },
                    { title: t("second_step"), desc: t("second_step_desc") },
                    { title: t("third_step"), desc: t("third_step_desc") },
                    { title: t("fourth_step"), desc: t("fourth_step_desc") },
                ].map((step, idx) => (
                    <View key={idx} style={styles.stepBox}>
                        <Text style={styles.stepTitle}>{step.title}</Text>
                        <Text style={styles.stepDesc}>{step.desc}</Text>
                    </View>
                ))}
            </ScrollView>

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

            {/* Banner Ad */}
            {bannerConfig && bannerConfig.show && (
                <View style={styles.adContainer}>
                    <GAMBannerAd
                        unitId={bannerConfig.id}
                        sizes={[BannerAdSize.BANNER]}
                        requestOptions={{
                            requestNonPersonalizedAdsOnly: true,
                        }}
                        onAdLoaded={() => console.log("✅ HowToGiveaway Banner Ad Loaded")}
                        onAdFailedToLoad={(error) => console.log("❌ HowToGiveaway Banner Ad Failed:", error)}
                    />
                </View>
            )}
        </GradientScreen>
    );
}

const styles = StyleSheet.create({
    container: {
        width: "100%",
        maxWidth: 600,
        paddingHorizontal: 5,
    },
    backButton: {
        marginTop: 3,
    },
    iconWrapper: {
        backgroundColor: "#ffff",
        padding: 1,
        borderRadius: 50,
    },
    header: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 20,
        paddingTop: 20,
        paddingBottom: 20,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: "800",
        color: "#fff"
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
    scrollContainer: {
        padding: 20,
        alignItems: "center",
    },
    demoBox: {
        width: "100%",
        height: 160,
        borderRadius: radius.xl,
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 20,
    },
    demoText: {
        marginTop: 8,
        fontWeight: "bold",
        color: "white",
    },
    adContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
        marginTop: 20,
        marginBottom: 20,
        paddingVertical: 10,
    },
    row: {
        backgroundColor: "#ffff",
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
        color: "#000",
    },
    sectionTitle: {
        fontWeight: "900",
        marginVertical: 10,
    },
    popupOverlay: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.5)",
        justifyContent: "center",
        alignItems: "center",
    },
    stepBox: {
        backgroundColor: "#ffffff34",
        padding: 16,
        borderRadius: radius.xl,
        marginBottom: 10,
        width: "100%",
    },
    stepTitle: {
        fontWeight: "900",
        marginBottom: 4,
        color: "#fdfdfdff",
    },
    stepDesc: {
        color: "#fdfdfdff",
    },
});