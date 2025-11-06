import GradientScreen from "@/components/GradientScreen";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
    FlatList,
    Image,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";

const safeJSONParse = (value: string | null) => {
    try {
        return value ? JSON.parse(value) : [];
    } catch (err) {
        console.warn("⚠️ Error parsing AsyncStorage JSON:", err);
        return [];
    }
};

export default function History() {
    const [historyData, setHistoryData] = useState<any[]>([]);
    const router = useRouter();
    const { t } = useTranslation();

    useEffect(() => {
        const fetchHistory = async () => {
            try {
                const storedData = await AsyncStorage.getItem("winnerData");
                const parsed = safeJSONParse(storedData);

                const formatted = Array.isArray(parsed)
                    ? parsed
                    : parsed
                        ? [parsed]
                        : [];

                setHistoryData(
                    formatted.map((entry: any, index: number) => ({
                        id: entry?.id || index.toString(),
                        postData: entry?.postData || {},
                        winnerResponse: entry?.winnerResponse || {},
                    }))
                );
            } catch (error) {
                console.error("❌ Error fetching history:", error);
            }
        };

        fetchHistory();
    }, []);

    const renderItem = ({ item }: { item: any }) => {
        const thumbnail =
            item?.postData?.media?.[0]?.thumbnail ??
            item?.postData?.media_url ??
            null;

        const winnersCount = item?.winnerResponse?.winners?.length || 0;
        const substitutesCount = item?.winnerResponse?.substitutes?.length || 0;
        const totalWinners = winnersCount + substitutesCount;

        return (
            <TouchableOpacity
                style={styles.card}
                activeOpacity={0.8}
                onPress={() =>
                    router.push({
                        pathname: "/MoreHistory",
                        params: {
                            giveawayId: String(item.id),
                            data: JSON.stringify(item),
                        },
                    })
                }
            >
                <View style={styles.cardContent}>
                    <Image
                        source={
                            thumbnail
                                ? { uri: thumbnail }
                                : require("../assets/images/place-holder.png")
                        }
                        style={styles.thumbnail}
                        resizeMode="cover"
                    />
                    <View style={styles.textContainer}>
                        <Text style={styles.username}>
                            {item?.postData?.posted_by?.username || "Unknown User"}
                        </Text>
                        <Text style={styles.caption} numberOfLines={2}>
                            {item?.postData?.caption || "No caption available"}
                        </Text>

                        <View style={styles.statsContainer}>
                            <View style={styles.statItem}>
                                <Ionicons name="trophy" size={14} color="#8B5CF6" />
                                <Text style={styles.statText}>
                                    {winnersCount} winners
                                </Text>
                            </View>
                            {substitutesCount > 0 && (
                                <View style={styles.statItem}>
                                    <Ionicons name="people" size={14} color="#9CA3AF" />
                                    <Text style={styles.statText}>
                                        {substitutesCount} alternates
                                    </Text>
                                </View>
                            )}
                        </View>
                    </View>

                    <View style={styles.arrowContainer}>
                        <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
                    </View>
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <GradientScreen>
            <View style={styles.container}>

                <View style={styles.header}>
                    <TouchableOpacity
                        onPress={() => router.back()}
                        style={styles.backButton}
                    >
                        <Ionicons name="arrow-back" size={24} color="black" />
                    </TouchableOpacity>
                    <Text style={styles.title}>{t("giveaway_history")}</Text>
                    <View style={{ width: 24 }} />
                </View>

                {historyData.length > 0 ? (
                    <FlatList
                        data={historyData}
                        keyExtractor={(item, index) => `${item.id}-${index}`}
                        renderItem={renderItem}
                        showsVerticalScrollIndicator={false}
                        contentContainerStyle={styles.listContainer}
                        ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
                    />
                ) : (
                    <View style={styles.emptyState}>
                        <Ionicons name="time-outline" size={60} color="#9CA3AF" />
                        <Text style={styles.emptyTitle}>No History Yet</Text>
                        <Text style={styles.emptyText}>
                            Your giveaway history will appear here once you start creating giveaways.
                        </Text>
                    </View>
                )}
            </View>
        </GradientScreen>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        paddingLeft: 10,
        paddingRight: 10,
    },
    header: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: 20,
        paddingTop: 10,
    },
    backButton: {
        width: 24,
    },
    title: {
        fontSize: 25,
        fontWeight: "600",
        textAlign: "center",
        flex: 1,
        color: "#333",
    },
    listContainer: {
        paddingBottom: 20,
    },
    card: {
        backgroundColor: "#fff",
        borderRadius: 16,
        marginHorizontal: 2,
        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.08,
        shadowRadius: 8,
        elevation: 4,
        borderWidth: 1,
        borderColor: "#F1F5F9",
    },
    cardContent: {
        flexDirection: "row",
        alignItems: "center",
        padding: 16,
    },
    thumbnail: {
        width: 60,
        height: 60,
        borderRadius: 12,
        marginRight: 16,
        backgroundColor: "#F8F9FA",
    },
    textContainer: {
        flex: 1,
        paddingRight: 8,
    },
    username: {
        fontSize: 16,
        fontWeight: "600",
        color: "#1F2937",
        marginBottom: 4,
    },
    caption: {
        fontSize: 14,
        color: "#6B7280",
        lineHeight: 18,
        marginBottom: 8,
    },
    statsContainer: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
    },
    statItem: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
    },
    statText: {
        fontSize: 12,
        color: "#6B7280",
        fontWeight: "500",
    },
    arrowContainer: {
        paddingLeft: 8,
    },
    emptyState: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        paddingHorizontal: 32,
    },
    emptyTitle: {
        fontSize: 20,
        fontWeight: "600",
        color: "#374151",
        marginTop: 16,
        marginBottom: 8,
    },
    emptyText: {
        fontSize: 16,
        color: "#6B7280",
        textAlign: "center",
        lineHeight: 22,
    },
});