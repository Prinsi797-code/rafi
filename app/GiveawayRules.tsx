import { Ionicons as Icon } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useNavigation, useRoute } from "@react-navigation/native";
import axios from "axios";
import * as Application from "expo-application";
import { useRouter } from "expo-router";
import { useState } from "react";
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
import GradientScreen from "../components/GradientScreen";

async function getDeviceIdSafe(): Promise<string> {
    try {
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

    const router = useRouter();

    const winnerItems = [
        { label: "1", value: "1" },
        { label: "2", value: "2" },
        { label: "3", value: "3" },
        { label: "4", value: "4" },
        { label: "5", value: "5" },
    ];

    const altWinnerItems = [
        { label: "1", value: "1" },
        { label: "2", value: "2" },
        { label: "3", value: "3" },
        { label: "4", value: "4" },
        { label: "5", value: "5" },
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

            const res = await axios.post("https://instagram.adinsignia.com/winner.php", {
                postUrl: data.post_url,
                maxComments: 100,
                winnerCount: winner,
                substitutesCount: altWinner,
                singleUser: participation ? "1" : "0",
                searchKeyword: keyword,
                device_id: deviceId,
                run: 1,
            });

            if (res.data?.success === "success") {
                // ✅ Save winner and post data
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
                alert("Error: " + errorMessage);
                setStarting(false);
            }
        } catch (err) {
            console.error("API Error:", err);
            alert("Something went wrong! Check console for details.");
            setStarting(false);
        }
    };

    return (
        <GradientScreen>
            <View style={styles.customHeader}>
                <TouchableOpacity onPress={() => router.push("/")} style={{ alignItems: "center" }}>
                    <Icon name="home" size={20} color="#333" />
                    <Text style={{ fontSize: 10 }}>Home</Text>
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Giveaway Rules</Text>

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
                    <Image
                        source={{ uri: data.media[0].thumbnail }}
                        style={styles.image}
                        onLoadStart={() => setLoading(true)}
                        onLoadEnd={() => setLoading(false)}
                    />
                    <View style={styles.overlay}>
                        <Text style={styles.username}>@{data.posted_by.username}</Text>
                        <Text style={styles.caption} numberOfLines={2}>
                            {data.caption}
                        </Text>
                    </View>
                </View>

                <View style={{ marginTop: 20 }}>
                    {/* Screen Record */}
                    <View style={styles.optionRow}>
                        <View style={styles.recordLabelContainer}>
                            <Text style={styles.optionLabel}>Screen Record</Text>
                            {isRecording && <Text style={styles.recordingStatus}>Recording...</Text>}
                        </View>

                        <Switch
                            value={screenRecordEnabled}
                            onValueChange={handleScreenRecordToggle}
                            trackColor={{ false: "#767577", true: "#8B3A99" }}
                            thumbColor={screenRecordEnabled ? "#f4f3f4" : "#f4f3f4"}
                        />
                    </View>

                    {/* Giveaway Title */}
                    <Text style={styles.label}>Giveaway Title</Text>
                    <TextInput placeholder="Holiday Giveaway" style={styles.input} placeholderTextColor="#888" value={giveawayTitle}
                        onChangeText={setGiveawayTitle}
                    />

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
                                    if (val) setOpenAltWinner(false); // close other dropdown
                                }}
                                setValue={setWinner}
                                placeholder="Select Winner"
                                style={styles.dropdown}
                                dropDownContainerStyle={styles.dropdownList}
                                textStyle={styles.dropdownText}
                                listMode="SCROLLVIEW" 
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
                                    if (val) setOpenWinner(false); // close other dropdown
                                }}
                                setValue={setAltWinner}
                                placeholder="Select Alternate"
                                style={styles.dropdown}
                                dropDownContainerStyle={styles.dropdownList}
                                textStyle={styles.dropdownText}
                                listMode="SCROLLVIEW"
                            />
                        </View>
                    </View>

                    <View style={styles.optionRow}>
                        <Text style={styles.optionLabel}>Participation</Text>
                        <Switch value={participation} onValueChange={(val) => setParticipation(val)} />
                    </View>

                    <Text style={styles.label}>Keyword (Optional)</Text>
                    <TextInput placeholder="Add keyword" style={styles.input} value={keyword} onChangeText={setKeyword} placeholderTextColor="#888" />

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

                <TouchableOpacity
                    style={styles.button}
                    onPress={startGiveawayHandler}
                    disabled={starting}
                >
                    <Text style={styles.buttonText}>
                        START GIVEAWAY
                    </Text>
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
    image: {
        width: "100%",
        height: 300,
    },
        row: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginTop: 10,
        gap: 10, // works in RN 0.71+
    },
    column: {
        flex: 1,
    },
    label: {
        fontWeight: "600",
        fontSize: 15,
        color: "#333",
        marginBottom: 6,
        marginTop: 6,
    },
    dropdown: {
        backgroundColor: "#fff",
        borderRadius: 10,
        borderColor: "#ddd",
        minHeight: 50,
    },
    dropdownList: {
        borderColor: "#ddd",
    },
    dropdownText: {
        fontSize: 15,
        color: "#000",
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
    headerTitle: {
        fontSize: 20,
        fontWeight: "bold",
        marginLeft: 10,
        color: "#333",
        textAlign: "center",
    },
    customHeader: {
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 12,
        paddingTop: 15,
        marginLeft: 15,
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
        backgroundColor: "#fff",
        borderRadius: 10,
        padding: 12,
        marginTop: 12,
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
    },
    optionLabel: {
        fontWeight: "600",
        fontSize: 15,
        color: "#333",
    },
    label: {
        fontWeight: "600",
        marginTop: 16,
        marginBottom: 6,
        fontSize: 15,
        color: "#333",
    },
    input: {
        backgroundColor: "#fff",
        borderRadius: 10,
        color: "#000",
        padding: 12,
        fontSize: 14,
    },
    dropdownContainer: {
        backgroundColor: "#fff",
        borderRadius: 10,
        marginBottom: 10,
    },
    picker: {
        height: 60,
        width: "100%",
    },
    button: {
        backgroundColor: "#8B3A99",
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
        backgroundColor: "#fff",
        borderRadius: 10,
        marginTop: 8,
        overflow: "hidden",
    },
    counterButton: {
        backgroundColor: "#eee",
        paddingHorizontal: 15,
        paddingVertical: 10,
    },
    counterText: {
        fontSize: 20,
        fontWeight: "bold",
        color: "#333",
    },
    counterInput: {
        flex: 1,
        textAlign: "center",
        fontSize: 16,
        paddingVertical: 10,
    },

});
