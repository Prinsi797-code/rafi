import AsyncStorage from "@react-native-async-storage/async-storage";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as Updates from 'expo-updates';
import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
    Alert,
    Animated,
    FlatList,
    Image,
    Linking,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from "react-native";
import GradientScreen from "../components/GradientScreen";

type Commenter = {
    username?: string;
    profile_pic?: string;
    profile_url?: string;
    is_verified?: boolean;
};

type WinnerUser = {
    username?: string;
    profile_pic_url?: string;
    profile_url?: string;
    is_verified?: boolean;
};

type WinnerItem = {
    user?: WinnerUser;
    text?: string;
};

const safeText = (value: unknown) => {
    if (typeof value === "string") return value;
    if (typeof value === "number") return String(value);
    return "";
};

const safeImageUri = (uri?: string) =>
    uri && /^https?:\/\//i.test(uri) ? uri : undefined;

export default function PickWinner() {
    const router = useRouter();

    const [allComments, setAllComments] = useState<Commenter[]>([]);
    const [winners, setWinners] = useState<WinnerItem[]>([]);
    const [substitutes, setSubstitutes] = useState<WinnerItem[]>([]);
    const [postData, setPostData] = useState<any>(null);
    const [isScrolling, setIsScrolling] = useState(true);

    // New state for animation
    const [revealedWinners, setRevealedWinners] = useState<WinnerItem[]>([]);
    const [revealedSubstitutes, setRevealedSubstitutes] = useState<WinnerItem[]>([]);
    const [currentWinnerIndex, setCurrentWinnerIndex] = useState(0);
    const [isRevealing, setIsRevealing] = useState(false);
    const [highlightedUsername, setHighlightedUsername] = useState<string | null>(null);
    const [showPostInfo, setShowPostInfo] = useState(false);

    const listRef = useRef<FlatList<Commenter>>(null);
    const scrollIntervalRef = useRef<NodeJS.Timer | null>(null);
    const stopTimerRef = useRef<NodeJS.Timeout | null>(null);
    const zoomAnim = useRef(new Animated.Value(1)).current;
    const { t } = useTranslation();
    const { winnersData, postData: postParam, comments: commentsParam } = useLocalSearchParams();

    useEffect(() => {
        let mounted = true;
        (async () => {
            try {
                const storedWinner = await AsyncStorage.getItem("winnerData");
                if (!mounted) return;

                if (storedWinner) {
                    const parsed = JSON.parse(storedWinner);
                    const list = Array.isArray(parsed) ? parsed : [parsed];
                    const latest = list[0];

                    setWinners(latest?.winnerResponse?.winners ?? []);
                    setSubstitutes(latest?.winnerResponse?.substitutes ?? []);
                    setPostData(latest?.postData ?? null);

                    const commenters: Commenter[] =
                        latest?.postData?.comments?.map((c: any) => ({
                            username: c?.user?.username,
                            profile_pic: c?.user?.profile_pic_url,
                            profile_url: c?.user?.profile_url,
                            is_verified: c?.user?.is_verified,
                        })) ?? [];

                    setAllComments(commenters);
                }
            } catch (e) {
                console.log("Error loading local data:", e);
            }
        })();

        return () => {
            mounted = false;
        };
    }, []);

    // Auto-scroll commenters 
    useEffect(() => {
        if (!allComments.length || !isScrolling || isRevealing) return;

        let index = 0;
        scrollIntervalRef.current = setInterval(() => {
            const size = allComments.length || 1;
            const target = index % size;
            try {
                listRef.current?.scrollToIndex({
                    index: target,
                    animated: true,
                });
            } catch {
                listRef.current?.scrollToOffset({ offset: 0, animated: true });
            }
            index++;
        }, 100);

        // Stop after 3s and reveal winner
        stopTimerRef.current = setTimeout(() => {
            if (scrollIntervalRef.current) clearInterval(scrollIntervalRef.current);
            scrollIntervalRef.current = null;
            setIsScrolling(false);
            revealWinner();
        }, 3000);

        return () => {
            if (scrollIntervalRef.current) clearInterval(scrollIntervalRef.current);
            if (stopTimerRef.current) clearTimeout(stopTimerRef.current);
            scrollIntervalRef.current = null;
            stopTimerRef.current = null;
        };
    }, [allComments, isScrolling, isRevealing, currentWinnerIndex]);

    const revealWinner = () => {
        const totalWinners = winners.length;
        const totalSubstitutes = substitutes.length;
        const totalAll = totalWinners + totalSubstitutes;

        if (currentWinnerIndex >= totalAll) {
            // All winners revealed, show post info
            setTimeout(() => {
                setShowPostInfo(true);
            }, 500);
            return;
        }

        setIsRevealing(true);

        // Determine if current is a winner or substitute
        const isWinner = currentWinnerIndex < totalWinners;
        const currentItem = isWinner
            ? winners[currentWinnerIndex]
            : substitutes[currentWinnerIndex - totalWinners];

        const username = currentItem?.user?.username ?? "";

        // Find the commenter in the list
        const commenterIndex = allComments.findIndex(
            c => c.username === username
        );

        if (commenterIndex !== -1) {
            // Scroll to the winner
            try {
                listRef.current?.scrollToIndex({
                    index: commenterIndex,
                    animated: true,
                    viewPosition: 0.5 // Center the item
                });
            } catch (e) {
                console.log("Scroll error:", e);
            }

            // Highlight and zoom animation
            setHighlightedUsername(username);

            // Zoom in animation
            Animated.sequence([
                Animated.timing(zoomAnim, {
                    toValue: 1.5,
                    duration: 400,
                    useNativeDriver: true,
                }),
                Animated.timing(zoomAnim, {
                    toValue: 1,
                    duration: 400,
                    useNativeDriver: true,
                })
            ]).start(() => {
                // Add to revealed list
                if (isWinner) {
                    setRevealedWinners(prev => [...prev, currentItem]);
                } else {
                    setRevealedSubstitutes(prev => [...prev, currentItem]);
                }

                setHighlightedUsername(null);
                setCurrentWinnerIndex(prev => prev + 1);
                setIsRevealing(false);

                // Start scrolling again for next winner
                setTimeout(() => {
                    setIsScrolling(true);
                }, 1000);
            });
        } else {
            // If winner not found in commenters, skip
            if (isWinner) {
                setRevealedWinners(prev => [...prev, currentItem]);
            } else {
                setRevealedSubstitutes(prev => [...prev, currentItem]);
            }
            setCurrentWinnerIndex(prev => prev + 1);
            setIsRevealing(false);
            setTimeout(() => {
                setIsScrolling(true);
            }, 1000);
        }
    };

    const getItemLayout = useCallback(
        (_: Commenter[] | null | undefined, index: number) => ({
            length: 84,
            offset: 84 * index,
            index,
        }),
        []
    );

    const openProfile = useCallback(async (profileUrl?: string, username?: string) => {
        try {
            const fallback = username ? `https://www.instagram.com/${username}` : undefined;
            const url = (profileUrl?.startsWith("http") ? profileUrl : fallback) ?? fallback;

            if (!url) return;

            const supported = await Linking.canOpenURL(url);
            if (!supported && Platform.OS === "android") {
                const igUrl = username ? `instagram://user?username=${username}` : undefined;
                if (igUrl) {
                    const igSupported = await Linking.canOpenURL(igUrl);
                    if (igSupported) {
                        await Linking.openURL(igUrl);
                        return;
                    }
                }
            }
            await Linking.openURL(url);
        } catch (error) {
            Alert.alert("Profile Open Error", "Could not open profile.");
        }
    }, []);

    if (!allComments.length) {
        return null;
    }

    return (
        <GradientScreen>
            <View style={{ flex: 1, paddingVertical: 12 }}>
                {/* Scrolling Section */}
                {!showPostInfo && (
                    <View style={styles.scrollSection}>
                        <FlatList
                            ref={listRef}
                            data={allComments}
                            keyExtractor={(_, i) => String(i)}
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            initialNumToRender={12}
                            windowSize={10}
                            removeClippedSubviews
                            getItemLayout={getItemLayout}
                            contentContainerStyle={{ alignItems: "center" }}
                            renderItem={({ item }) => {
                                const isHighlighted = highlightedUsername === item?.username;
                                return (
                                    <Animated.View
                                        style={[
                                            styles.profileWrapper,
                                            isHighlighted && {
                                                transform: [{ scale: zoomAnim }],
                                            }
                                        ]}
                                    >
                                        <TouchableOpacity
                                            onPress={() => openProfile(item?.profile_url, item?.username)}
                                            activeOpacity={0.7}
                                            style={[
                                                { alignItems: "center" },
                                                isHighlighted && styles.highlighted
                                            ]}
                                        >
                                            {safeImageUri(item?.profile_pic) ? (
                                                <Image
                                                    source={{ uri: item!.profile_pic! }}
                                                    style={[
                                                        styles.avatar,
                                                        isHighlighted && styles.highlightedAvatar
                                                    ]}
                                                    onError={() => { }}
                                                />
                                            ) : (
                                                <View style={[
                                                    styles.avatar,
                                                    styles.avatarFallback,
                                                    isHighlighted && styles.highlightedAvatar
                                                ]} />
                                            )}
                                            <Text style={[
                                                styles.username,
                                                isHighlighted && styles.highlightedText
                                            ]}>
                                                {safeText(item?.username)}
                                            </Text>
                                        </TouchableOpacity>
                                    </Animated.View>
                                );
                            }}
                        />
                    </View>
                )}

                {/* Winners List Section */}
                <View style={{ flex: 1, paddingHorizontal: 16 }}>
                    {showPostInfo && (
                        <>
                            <Text style={styles.doneTitle}>🎉 Giveaway Completed</Text>

                            {postData && (
                                <View style={styles.postRow}>
                                    {safeImageUri(postData?.media?.[0]?.thumbnail) && (
                                        <Image
                                            source={{ uri: postData.media[0].thumbnail }}
                                            style={styles.postImage}
                                        />
                                    )}
                                    <View style={{ flex: 1, marginLeft: 12 }}>
                                        <Text style={styles.postUser}>
                                            @{safeText(postData?.posted_by?.username)}
                                        </Text>
                                        <Text style={styles.postCaption} numberOfLines={3}>
                                            {safeText(postData?.caption)}
                                        </Text>
                                        {postData?.comments_count !== undefined && (
                                            <View style={styles.commentCountContainer}>
                                                <Text style={styles.commentIcon}>💬</Text>
                                                <Text style={styles.commentCountText}>
                                                    {postData.comments_count}
                                                </Text>
                                            </View>
                                        )}
                                    </View>
                                </View>
                            )}
                        </>
                    )}

                    <ScrollView
                        style={{ flex: 1 }}
                        contentContainerStyle={{ paddingBottom: 100 }} // space for button
                        showsVerticalScrollIndicator={false}
                    >

                        {revealedWinners.length > 0 && (
                            <>
                                <Text style={styles.sectionTitle}>🎉 Winners</Text>
                                {revealedWinners.map((w, idx) => {
                                    const username = w?.user?.username ?? "";
                                    const text = w?.text ?? "";
                                    const profileUrl =
                                        w?.user?.profile_url ?? (username ? `https://www.instagram.com/${username}` : undefined);
                                    const rank =
                                        idx + 1 === 1
                                            ? "1st"
                                            : idx + 1 === 2
                                                ? "2nd"
                                                : idx + 1 === 3
                                                    ? "3rd"
                                                    : `${idx + 1}th`;

                                    return (
                                        <View key={`win-${idx}`} style={styles.winnerContainer}>
                                            <View style={styles.winnerRow}>
                                                <TouchableOpacity
                                                    onPress={() => openProfile(profileUrl, username)}
                                                    style={styles.avatarContainer}
                                                >
                                                    {safeImageUri(w?.user?.profile_pic_url) ? (
                                                        <Image
                                                            source={{ uri: w!.user!.profile_pic_url! }}
                                                            style={styles.winnerAvatar}
                                                        />
                                                    ) : (
                                                        <View style={[styles.winnerAvatar, styles.avatarFallback]} />
                                                    )}
                                                </TouchableOpacity>

                                                <TouchableOpacity
                                                    onPress={() => openProfile(profileUrl, username)}
                                                    style={styles.winnerInfo}
                                                >
                                                    <Text style={styles.winnerName}>
                                                        {safeText(username)} {w?.user?.is_verified ? "✅" : ""}
                                                    </Text>
                                                    {!!text && (
                                                        <Text style={styles.winnerText} numberOfLines={2}>
                                                            {safeText(text)}
                                                        </Text>
                                                    )}
                                                </TouchableOpacity>

                                                <View style={styles.rankBadge}>
                                                    <Text style={styles.rankText}>{rank}</Text>
                                                </View>
                                            </View>
                                        </View>
                                    );
                                })}
                            </>
                        )}

                        {revealedSubstitutes.length > 0 && (
                            <>
                                <Text style={styles.sectionTitle}>✨ Alternate Winners</Text>
                                {revealedSubstitutes.map((w, idx) => {
                                    const username = w?.user?.username ?? "";
                                    const profileUrl =
                                        w?.user?.profile_url ??
                                        (username ? `https://www.instagram.com/${username}` : undefined);
                                    const text = w?.text ?? "";
                                    const rankNumber = revealedWinners.length + idx + 1;
                                    const rank =
                                        rankNumber === 1
                                            ? "1st"
                                            : rankNumber === 2
                                                ? "2nd"
                                                : rankNumber === 3
                                                    ? "3rd"
                                                    : `${rankNumber}th`;

                                    return (
                                        <View key={`sub-${idx}`} style={styles.winnerContainer}>
                                            <View style={styles.winnerRow}>
                                                <TouchableOpacity
                                                    onPress={() => openProfile(profileUrl, username)}
                                                    style={styles.avatarContainer}
                                                >
                                                    {safeImageUri(w?.user?.profile_pic_url) ? (
                                                        <Image
                                                            source={{ uri: w!.user!.profile_pic_url! }}
                                                            style={styles.winnerAvatar}
                                                        />
                                                    ) : (
                                                        <View style={[styles.winnerAvatar, styles.avatarFallback]} />
                                                    )}
                                                </TouchableOpacity>

                                                <TouchableOpacity
                                                    onPress={() => openProfile(profileUrl, username)}
                                                    style={styles.winnerInfo}
                                                >
                                                    <Text style={styles.winnerName}>
                                                        {safeText(username)} {w?.user?.is_verified ? "✅" : ""}
                                                    </Text>
                                                    {!!text && (
                                                        <Text style={styles.winnerText} numberOfLines={2}>
                                                            {safeText(text)}
                                                        </Text>
                                                    )}
                                                </TouchableOpacity>
                                                <View style={styles.rankBadge}>
                                                    <Text style={styles.rankText}>{rank}</Text>
                                                </View>
                                            </View>
                                        </View>
                                    );
                                })}
                            </>
                        )}
                    </ScrollView>
                    {showPostInfo && (
    <TouchableOpacity
        style={styles.endButton}
        onPress={() => {
            router.replace("/"); // Navigate to home
            setTimeout(() => {
                // Give a small delay before refreshing
                if (Platform.OS === "android") {
                    // For Android
                    Expo.Updates.reloadAsync?.();
                } else {
                    // For iOS or fallback
                    Updates.reloadAsync?.();
                }
            }, 500);
        }}
    >
        <Text style={styles.endButtonText}>End Giveaway</Text>
    </TouchableOpacity>
)}

                </View>
            </View>
        </GradientScreen>
    );
}

const styles = StyleSheet.create({
    center: { flex: 1, justifyContent: "center", alignItems: "center" },
    scrollSection: {
        height: 120,
        marginBottom: 16,
    },
    profileWrapper: {
        width: 84,
        alignItems: "center",
        paddingHorizontal: 6,
    },
    avatar: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: "#eee"
    },
    avatarFallback: { backgroundColor: "#e1e1e1" },
    username: {
        fontSize: 12,
        marginTop: 6,
        maxWidth: 72,
        textAlign: "center"
    },
    highlighted: {
        backgroundColor: "rgba(255, 215, 0, 0.3)",
        borderRadius: 12,
        padding: 8,
    },
    highlightedAvatar: {
        borderWidth: 3,
        borderColor: "#FFD700",
    },
    highlightedText: {
        fontWeight: "bold",
        color: "#8B3A99",
    },
    doneTitle: {
        fontSize: 25,
        fontWeight: "bold",
        textAlign: "center",
        marginBottom: 25,
        marginTop: 10,
    },
    postRow: {
        flexDirection: "row",
        alignItems: "flex-start",
        marginBottom: 16,
        backgroundColor: "#fff",
        borderRadius: 8,
        padding: 8,
    },
    postImage: {
        width: 90,
        height: 90,
        borderRadius: 8,
        backgroundColor: "#eee"
    },
    commentCountContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 6,
        backgroundColor: '#8B3A99', // purple bubble background
        alignSelf: 'flex-start',
        paddingHorizontal: 10,
        paddingVertical: 8,
        borderRadius: 6,
    },
    commentIcon: {
        color: '#fff',
        fontSize: 14,
        marginRight: 4,
    },
    commentCountText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '600',
    },

    postUser: {
        fontWeight: "bold",
        fontSize: 16,
        marginBottom: 4
    },
    postCaption: { color: "#555" },
    sectionTitle: {
        fontSize: 18,
        fontWeight: "bold",
        marginTop: 12,
        marginBottom: 10
    },
    winnerContainer: {
        marginBottom: 10,
        backgroundColor: "#fff",
        borderRadius: 10,
        paddingVertical: 8,
        paddingHorizontal: 10,
        shadowColor: "#000",
        shadowOpacity: 0.05,
        shadowOffset: { width: 0, height: 2 },
        shadowRadius: 4,
        elevation: 1,
    },
    winnerRow: {
        flexDirection: "row",
        alignItems: "center"
    },
    rankBadge: {
        width: 38,
        height: 38,
        borderRadius: 19,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "#E7D7FF",
        marginLeft: 10,
    },
    rankText: { fontWeight: "bold" },
    avatarContainer: { marginRight: 10 },
    winnerAvatar: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: "#eee"
    },
    winnerInfo: { flex: 1 },
    winnerName: {
        fontWeight: "bold",
        fontSize: 15
    },
    winnerText: {
        color: "#555",
        marginTop: 2
    },
    endButton: {
        marginTop: 24,
        backgroundColor: "#8B3A99",
        paddingVertical: 14,
        borderRadius: 10,
        alignItems: "center",
    },
    endButtonText: {
        color: "#fff",
        fontWeight: "bold",
        fontSize: 16
    },
});