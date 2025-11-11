import { Ionicons } from "@expo/vector-icons";
import { Video } from "expo-av";
import { useRouter } from "expo-router";
import React, { JSX, memo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Image, ImageBackground, Modal, Pressable, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
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
        <Ionicons name="chevron-forward" size={18} />
    </Pressable>
));

export default function HowToGiveaway() {
    const { t } = useTranslation();
    const router = useRouter();
    const [showVideo, setShowVideo] = useState(false);

    return (
        <GradientScreen>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()}>
                    <Ionicons name="arrow-back" size={26} color="#000" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>{t("how_to_giveaway")}</Text>
                <View style={{ width: 26 }} />
            </View>

            <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
                {/* Demo Video Thumbnail */}
                {/* <TouchableOpacity onPress={() => setShowVideo(true)}>
                                    <ImageBackground
                                        source={require("../assets/images/thumbanil1.png")}
                                        style={styles.demoBox}
                                        imageStyle={{ borderRadius: radius.xl }}
                                    >
                                        <Ionicons name="play-circle" size={56} color="#FFFFFF" />
                                        <Text style={styles.demoText}>{t("play_demo")}</Text>
                                    </ImageBackground>
                                </TouchableOpacity> */}
                <View style={styles.container}>
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
        </GradientScreen>

    );
}

const styles = StyleSheet.create({
    container: {
        width: "100%",
        maxWidth: 600,
        paddingHorizontal: 20,
        // backgroundColor: "#fff",
    },
    header: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 20,
        paddingTop: 20,
        paddingBottom: 20,
        // backgroundColor: "#fddde6",
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: "900",
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
        backgroundColor: "white",
        padding: 16,
        borderRadius: radius.xl,
        marginBottom: 10,
        width: "100%",
    },
    stepTitle: {
        fontWeight: "900",
        marginBottom: 4,
    },
    stepDesc: {
        color: "#333",
    },
});
