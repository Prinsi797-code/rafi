import AdsManager from "@/services/adsManager";
import { Ionicons as Icon } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useNavigation, useRoute } from "@react-navigation/native";
import axios from "axios";
import * as Application from "expo-application";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Image,
    Platform,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import DropDownPicker from "react-native-dropdown-picker";
import { BannerAdSize, GAMBannerAd } from 'react-native-google-mobile-ads';
import GradientScreen from "../components/GradientScreen";

async function getDeviceIdSafe(): Promise<string> {
    try {
        // First, try to get device_id from AsyncStorage (from register_response)
        const saved = await AsyncStorage.getItem("register_response");
        if (saved) {
            const parsed = JSON.parse(saved);
            const deviceId = parsed.data?.device_id;

            if (deviceId) {
                console.log("Device ID from register_response:", deviceId);
                return deviceId;
            }
        }

        // Fallback to platform-specific device ID if not found in AsyncStorage
        if (Platform.OS === "android") {
            const id = await Application.getAndroidId();
            return id || `android_${Date.now()}`;
        } else if (Platform.OS === "ios") {
            const id = await Application.getIosIdForVendorAsync();
            return id || `ios_${Date.now()}`;
        } else {
            return `web_${Date.now()}`;
        }
    } catch (error) {
        console.warn("Device ID fetch failed:", error);
        return `fallback_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
}

export default function GiveawayRules() {
    const route = useRoute();
    const navigation = useNavigation();
    const { data }: any = route.params;

    const [winner, setWinner] = useState("1");
    const [altWinner, setAltWinner] = useState("0");
    const [openWinner, setOpenWinner] = useState(false);
    const [openAltWinner, setOpenAltWinner] = useState(false);

    const [loading, setLoading] = useState(true);
    const [countdown, setCountdown] = useState(3);
    const [participation, setParticipation] = useState(false);
    const [keyword, setKeyword] = useState("");
    const [starting, setStarting] = useState(false);
    const [giveawayTitle, setGiveawayTitle] = useState("");

    const [isRecording, setIsRecording] = useState(false);
    const [screenRecordEnabled, setScreenRecordEnabled] = useState(false);
    const [thumbError, setThumbError] = useState(false);
    const [imgError, setImgError] = useState(false);
    const router = useRouter();

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

    const winnerItems = [
        { label: "1", value: "1" },
        { label: "2", value: "2" },
        { label: "3", value: "3" },
        { label: "4", value: "4" },
        { label: "5", value: "5" },
        { label: "6", value: "6" },
        { label: "7", value: "7" },
        { label: "8", value: "8" },
        { label: "9", value: "9" },
        { label: "10", value: "10" },
        { label: "11", value: "11" },
        { label: "12", value: "12" },
        { label: "13", value: "13" },
        { label: "14", value: "14" },
        { label: "15", value: "15" },
        { label: "16", value: "16" },
        { label: "17", value: "17" },
        { label: "18", value: "18" },
        { label: "19", value: "19" },
        { label: "20", value: "20" },
    ];

    const altWinnerItems = [
        { label: "1", value: "1" },
        { label: "2", value: "2" },
        { label: "3", value: "3" },
        { label: "4", value: "4" },
        { label: "5", value: "5" },
        { label: "6", value: "6" },
        { label: "7", value: "7" },
        { label: "8", value: "8" },
        { label: "9", value: "9" },
        { label: "10", value: "10" },
        { label: "11", value: "11" },
        { label: "12", value: "12" },
        { label: "13", value: "13" },
        { label: "14", value: "14" },
        { label: "15", value: "15" },
        { label: "16", value: "16" },
        { label: "17", value: "17" },
        { label: "18", value: "18" },
        { label: "19", value: "19" },
        { label: "20", value: "20" },
    ];

    const handleScreenRecordToggle = async (value: boolean) => {
        setScreenRecordEnabled(value);
        setIsRecording(value);
        if (value) {
            Alert.alert("Screen recording", "Screen recording is temporarily disabled in this dev build.");
        } else {
            Alert.alert("Screen recording", "Recording stopped (disabled in dev build).");
        }
    };

    const startGiveawayHandler = async () => {
        if (!giveawayTitle.trim()) {
            Alert.alert("Validation Error", "Please enter a giveaway title.");
            return;
        }

        if (!winner || Number(winner) < 1) {
            Alert.alert("Validation Error", "Please select at least 1 winner.");
            return;
        }

        try {
            setStarting(true);
            if (isRecording) {
                setIsRecording(false);
                setScreenRecordEnabled(false);
            }

            let deviceId = "unknown-device";
            try {
                deviceId = await getDeviceIdSafe();
            } catch (e) {
                console.warn("Device ID fetch failed:", e);
            }

            const res = await axios.post("https://newinsta.adinsignia.com/winner.php", {
                postUrl: data.post_url,
                maxComments: 100,
                winnerCount: winner,
                substitutesCount: altWinner,
                singleUser: participation ? "1" : "0",
                searchKeyword: keyword,
                device_id: deviceId,
                run: 1,
            });

            if (res.data?.error === true) {
                Alert.alert("Request Failed", res.data?.message || "Something went wrong!");
                setStarting(false);
                return;
            }

            if (res.data?.success === "success") {
                const storedWinner = await AsyncStorage.getItem("winnerData");
                let parsedWinners = storedWinner ? JSON.parse(storedWinner) : [];
                if (!Array.isArray(parsedWinners)) parsedWinners = [parsedWinners];

                parsedWinners.unshift({
                    id: Date.now(),
                    postUrl: data.post_url,
                    postData: data,
                    winnerResponse: res.data,
                    createdAt: new Date().toISOString(),
                });

                await AsyncStorage.setItem("winnerData", JSON.stringify(parsedWinners));

                const storedPosts = await AsyncStorage.getItem("postData");
                let parsedPosts = storedPosts ? JSON.parse(storedPosts) : [];
                if (!Array.isArray(parsedPosts)) parsedPosts = [parsedPosts];

                parsedPosts.unshift({ id: Date.now(), ...data });
                await AsyncStorage.setItem("postData", JSON.stringify(parsedPosts));

                setStarting(false);

                navigation.navigate("GiveawayStart", {
                    countdownTime: countdown,
                    winnersData: JSON.stringify(res.data),
                    postData: JSON.stringify(data),
                } as any);
            } else {
                const errorMessage = res.data?.message || "Unexpected error from API";
                Alert.alert("Request Failed", errorMessage);
                setStarting(false);
            }
        } catch (err: any) {
            if (err.response) {
                const errorData = err.response.data;

                if (errorData?.error === true && errorData?.message) {
                    Alert.alert("Request Failed", errorData.message);
                } else if (err.response.status === 404) {
                    Alert.alert("Request Failed", "Service not found. Please try again later.");
                } else {
                    Alert.alert("Request Failed", errorData?.message || "An error occurred. Please try again.");
                }
            } else if (err.request) {
                Alert.alert("Network Error", "Unable to connect. Please check your internet connection.");
            } else {
                Alert.alert("Error", "Something went wrong! Please try again.");
            }
            setStarting(false);
        }
    };

    const handleBackHome = useCallback(() => {
        router.replace("/");
    }, [router]);

    return (
        <GradientScreen>
            <View style={styles.customHeader}>

                {/* Back Button */}
                <TouchableOpacity
                    onPress={handleBackHome}
                    style={styles.backButton}
                    activeOpacity={0.7}
                >
                    <View style={styles.iconWrapper}>
                        <Icon name="chevron-back-outline" size={20} color="#65017A" />
                    </View>
                </TouchableOpacity>

                {/* Center Title */}
                <Text style={styles.headerTitle}>Giveaway Rules</Text>

                {/* Recording Indicator */}
                {isRecording && (
                    <View style={styles.recordingIndicator}>
                        <View style={styles.recordingDot} />
                        <Text style={styles.recordingText}>REC</Text>
                    </View>
                )}

            </View>

            <ScrollView
                style={{ flex: 1, padding: 16 }}
                contentContainerStyle={{ paddingBottom: 40 }}
                showsVerticalScrollIndicator={false}
                nestedScrollEnabled={true}
            >
                <View style={styles.imageWrapper}>
                    {loading && (
                        <View style={styles.placeholder}>
                            <ActivityIndicator size="large" color="#8B3A99" />
                        </View>
                    )}
                    <Image source={{ uri: data.media[0].thumbnail }} style={styles.image} onLoadStart={() => setLoading(true)} onLoadEnd={() => setLoading(false)} />

                    <View style={styles.overlay}>
                        <Text style={styles.username}>@{data.posted_by.username}</Text>
                        <Text style={styles.caption} numberOfLines={2}>
                            {data.caption}
                        </Text>
                    </View>
                </View>

                <View style={{ marginTop: 20 }}>
                    {/* Giveaway Title */}
                    {bannerConfig && bannerConfig.show && (
                        <View style={styles.adContainer}>
                            <GAMBannerAd
                                unitId={bannerConfig.id}
                                sizes={[BannerAdSize.BANNER]}
                                requestOptions={{
                                    requestNonPersonalizedAdsOnly: true,
                                }}
                                onAdLoaded={() => console.log("Giveaway Rules Ad Loaded")}
                                onAdFailedToLoad={(error) => console.log("Home Banner Ad Failed:", error)}
                            />
                        </View>
                    )}
                    <View style={styles.titlegiveaway}>
                        <Text style={styles.label}>Giveaway Title</Text>
                        <TextInput placeholder="Holiday Giveaway" style={styles.input} placeholderTextColor="#ffffffff" value={giveawayTitle}
                            onChangeText={setGiveawayTitle}
                        />
                    </View>
                    <View style={styles.titlegiveaway}>
                        <View style={styles.row}>
                            {/* LEFT - Winners */}
                            <View style={styles.column}>
                                <Text style={styles.label}>Winners</Text>
                                <DropDownPicker
                                    open={openWinner}
                                    value={winner}
                                    items={winnerItems}
                                    setOpen={(val) => {
                                        setOpenWinner(val);
                                        if (val) setOpenAltWinner(false);
                                    }}
                                    setValue={setWinner}
                                    placeholder="Select Winner"
                                    style={styles.dropdown}
                                    dropDownContainerStyle={styles.dropdownList}
                                    textStyle={styles.dropdownText}
                                    listMode="SCROLLVIEW"
                                    arrowIconStyle={{ tintColor: "#fff" }}
                                    tickIconStyle={{ tintColor: "#fff" }}
                                />
                            </View>

                            {/* RIGHT - Alternate Winners */}
                            <View style={styles.column}>
                                <Text style={styles.label}>Alternate Winners</Text>
                                <DropDownPicker
                                    open={openAltWinner}
                                    value={altWinner}
                                    items={altWinnerItems}
                                    setOpen={(val) => {
                                        setOpenAltWinner(val);
                                        if (val) setOpenWinner(false);
                                    }}
                                    setValue={setAltWinner}
                                    placeholder="Select Alternate"
                                    style={styles.dropdown}
                                    dropDownContainerStyle={styles.dropdownList}
                                    textStyle={styles.dropdownText}
                                    listMode="SCROLLVIEW"
                                    arrowIconStyle={{ tintColor: "#fff" }}
                                    tickIconStyle={{ tintColor: "#fff" }}
                                />
                            </View>
                        </View>
                    </View>

                    <View style={styles.optionRow}>
                        <Text style={styles.optionLabel}>Participation</Text><Text style={styles.smalltext}>Eliminate similar IDs</Text>
                        <Switch value={participation} onValueChange={(val) => setParticipation(val)} trackColor={{ false: "#777", true: "#420aa2ff" }} ios_backgroundColor="#858080ff" />
                    </View>

                    <View style={styles.titlegiveaway}>
                        <Text style={styles.label}>Keyword (Optional)</Text>
                        <TextInput placeholder="Add keyword" style={styles.input} value={keyword} onChangeText={setKeyword} placeholderTextColor="#f0f0f0ff" />
                    </View>

                    <View style={styles.titlegiveaway}>
                        <Text style={styles.label}>Countdown</Text>
                        <View style={styles.counterBox}>
                            <TouchableOpacity
                                style={styles.counterButton}
                                onPress={() => setCountdown(Math.max(3, countdown - 2))}
                            >
                                <Text style={styles.counterText}>-</Text>
                            </TouchableOpacity>

                            <TextInput
                                style={styles.counterInput}
                                keyboardType="numeric"
                                value={countdown.toString()}
                                onChangeText={(val) => {
                                    let num = parseInt(val) || 3;
                                    if (num < 3) num = 3;
                                    setCountdown(num);
                                }}
                            />

                            <TouchableOpacity
                                style={styles.counterButton}
                                onPress={() => setCountdown(countdown + 2)}
                            >
                                <Text style={styles.counterText}>+</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>

                <TouchableOpacity
                    style={[
                        styles.button,
                        starting && styles.buttonDisabled
                    ]}
                    onPress={startGiveawayHandler}
                    disabled={starting}
                    activeOpacity={starting ? 1 : 0.7}
                >
                    {starting ? (
                        <View style={styles.buttonContent}>
                            <ActivityIndicator size="small" color="#fff" />
                            <Text style={[styles.buttonText, { marginLeft: 10 }]}>
                                STARTING...
                            </Text>
                        </View>
                    ) : (
                        <Text style={styles.buttonText}>START GIVEAWAY</Text>
                    )}
                </TouchableOpacity>
            </ScrollView>
        </GradientScreen>
    );
}
const styles = StyleSheet.create({
    imageWrapper: {
        position: "relative",
        borderRadius: 5,
        overflow: "hidden",
    },
    iconWrapper: {
        backgroundColor: "#ffff",
        padding: 1,
        borderRadius: 50,
    },
    image: {
        width: "100%",
        height: 300,
    },
    row: {
        flexDirection: "row",
        justifyContent: "space-between",
        gap: 10,
    },
    column: {
        flex: 1,
    },

    label: {
        fontWeight: "800",
        marginBottom: 6,
        fontSize: 16,
        color: "#ffffffff",

    },
    buttonDisabled: {
        backgroundColor: "#A67DB1",
        opacity: 0.8,
    },

    buttonContent: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
    },

    titlegiveaway: {
        backgroundColor: "#ffffff34",
        padding: 10,
        borderRadius: 10,
        marginTop: 10,
    },
    smalltext: {
        color: "#c3c3c3b1",
        marginRight: 35,
    },

    dropdown: {
        backgroundColor: "#ffffff34",
        borderRadius: 10,
        borderColor: "#ffffff34",
        minHeight: 50,
    },
    dropdownList: {
        borderColor: "#ffffff34",
        backgroundColor: "#d85aebff",

    },
    dropdownText: {
        fontSize: 15,
        color: "#ffffffff",
    },
    homeButton: {
        flexDirection: "column",
        alignItems: "center",
    },
    adContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
        paddingVertical: 10,
    },
    recordingIndicator: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FF0000',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
    },
    recordingDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#FFFFFF',
        marginRight: 4,
    },
    recordingText: {
        color: '#FFFFFF',
        fontSize: 10,
        fontWeight: 'bold',
    },
    recordLabelContainer: {
        flexDirection: 'column',
    },
    recordingStatus: {
        fontSize: 12,
        color: '#FF0000',
        fontWeight: '500',
        marginTop: 2,
    },
    placeholder: {
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#f0f0f0",
        zIndex: 1,
    },
    customHeader: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 16,
        paddingVertical: 12,
    },

    backButton: {
        marginTop: 3,
        marginLeft: 5,
    },

    headerTitle: {
        flex: 1,
        textAlign: "center",
        fontSize: 20,
        fontWeight: "800",
        color: "#fff",
        marginRight: 40,
    },
    overlay: {
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: "rgba(0,0,0,0.6)",
        padding: 10,
    },
    username: {
        color: "#fff",
        fontWeight: "bold",
        fontSize: 16,
    },
    caption: {
        color: "#ddd",
        fontSize: 14,
        marginTop: 2,
    },
    optionRow: {
        backgroundColor: "#ffffff34",
        borderRadius: 10,
        padding: 12,
        marginTop: 12,
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
    },
    optionLabel: {
        fontWeight: "800",
        fontSize: 16,
        color: "#ffffffff",
    },
    input: {
        backgroundColor: "#ffffff34",
        borderRadius: 10,
        color: "#fff",
        padding: 12,
        fontSize: 14,
    },
    dropdownContainer: {
        backgroundColor: "#ffffff34",
        borderRadius: 10,
        marginBottom: 10,
    },
    picker: {
        height: 60,
        width: "100%",
    },
    button: {
        backgroundColor: "#5a009e",
        padding: 16,
        borderRadius: 12,
        alignItems: "center",
        marginTop: 30,
    },
    buttonText: {
        color: "#fff",
        fontWeight: "bold",
        fontSize: 16,
    },
    counterBox: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#ffffff34",
        borderRadius: 10,
        marginTop: 8,
        overflow: "hidden",
    },
    counterButton: {
        backgroundColor: "#ffffff34",
        paddingHorizontal: 15,
        paddingVertical: 10,
    },
    counterText: {
        fontSize: 20,
        fontWeight: "bold",
        color: "#fff",
    },
    counterInput: {
        flex: 1,
        textAlign: "center",
        fontSize: 16,
        paddingVertical: 10,
        color: "#fff",
    },

});
