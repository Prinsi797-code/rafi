import { Image } from "expo-image"; // expo-image for better GIF handling
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import GradientScreen from "../components/GradientScreen";

function safeJSONParse<T>(value: string | undefined, fallback: T): T {
    try {
        return value ? (JSON.parse(value) as T) : fallback;
    } catch (e) {
        console.warn("JSON parse error:", e);
        return fallback;
    }
}

const GiveawayStart = () => {
    const router = useRouter();
    const { countdownTime, postData, winnersData, comments } =
        useLocalSearchParams();

    const [seconds, setSeconds] = useState<number>(
        countdownTime ? Number(countdownTime) || 5 : 5
    );
    const [countdownComplete, setCountdownComplete] = useState(false);
    const [parsedWinners, setParsedWinners] = useState<any[]>([]);
    const [gifLoaded, setGifLoaded] = useState(true);

    const timers = useRef<NodeJS.Timeout[]>([]);

    useEffect(() => {
        setParsedWinners(safeJSONParse<any[]>(winnersData as string, []));
    }, [winnersData]);

    useEffect(() => {
        if (seconds > 0) {
            const interval = setInterval(() => {
                setSeconds((prev) => {
                    if (prev <= 1) {
                        clearInterval(interval);
                        setCountdownComplete(true);
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
            return () => clearInterval(interval);
        }
    }, [seconds]);

    useEffect(() => {
        if (countdownComplete) {
            router.replace({
                pathname: "/Winner",
                params: {
                    winnersData: JSON.stringify(parsedWinners),
                    postData,
                    comments: comments,
                },
            });
        }
    }, [countdownComplete, parsedWinners, postData, comments]);

    useEffect(() => {
        return () => {
            timers.current.forEach((t) => clearTimeout(t));
        };
    }, []);

    return (
        <GradientScreen>
        <View style={styles.container}>
            {!countdownComplete && (
                <View style={styles.centerContent}>
                    {gifLoaded ? (
                        <Image
                            source={require("../assets/images/Gift.gif")}
                            style={styles.gif}
                            contentFit="contain"
                            onError={(error) => {
                                console.warn("GIF loading error:", error);
                                setGifLoaded(false);
                            }}
                        />
                    ) : (
                        <View style={styles.placeholderGif}>
                            <Text style={styles.giftEmoji}>🎁</Text>
                        </View>
                    )}

                    <Text style={styles.subText}>Giveaway Starts In</Text>
                    <Text style={styles.countdownText}>{seconds}</Text>
                </View>
            )}
        </View>
        </GradientScreen>
    );
};

export default GiveawayStart;

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
    },
    centerContent: {
        alignItems: "center",
        justifyContent: "center",
    },
    gif: {
        width: 150,
        height: 150,
        marginBottom: 20,
    },
    placeholderGif: {
        width: 150,
        height: 150,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#f0f0f0",
        borderRadius: 75,
        marginBottom: 20,
    },
    giftEmoji: {
        fontSize: 60,
    },
    countdownText: {
        fontSize: 80,
        fontWeight: "bold",
        color: "#ffffffff",
    },
    subText: {
        fontSize: 25,
        marginBottom: 5,
        color: "#f1f1f1ff",
        fontWeight: "bold",
    },
});
