import AdsManager from "@/services/adsManager";
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
import { BannerAdSize, GAMBannerAd } from 'react-native-google-mobile-ads';
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

    const [revealedWinners, setRevealedWinners] = useState<WinnerItem[]>([]);
    const [revealedSubstitutes, setRevealedSubstitutes] = useState<WinnerItem[]>([]);
    const [currentWinnerIndex, setCurrentWinnerIndex] = useState(0);
    const [isRevealing, setIsRevealing] = useState(false);
    const [highlightedUsername, setHighlightedUsername] = useState<string | null>(null);
    const [showPostInfo, setShowPostInfo] = useState(false);

    const listRef = useRef<FlatList<Commenter>>(null);
    const scrollIntervalRef = useRef<NodeJS.Timer | null>(null);
    const stopTimerRef = useRef<NodeJS.Timeout | null>(null);
    const scrollIndexRef = useRef(0);
    const zoomAnim = useRef(new Animated.Value(1)).current;
    const { t } = useTranslation();
    const { winnersData, postData: postParam, comments: commentsParam } = useLocalSearchParams();
    const [circularComments, setCircularComments] = useState<Commenter[]>([]);

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
                    if (commenters.length > 0) {
                        const circular = [...commenters, ...commenters, ...commenters];
                        setCircularComments(circular);
                    }
                }
            } catch (e) {
                console.log("Error loading local data:", e);
            }
        })();
        return () => {
            mounted = false;
        };
    }, []);
    useEffect(() => {
        if (!circularComments.length || !isScrolling || isRevealing) return;
        if (scrollIndexRef.current === 0 && allComments.length > 0) {
            scrollIndexRef.current = allComments.length;
            try {
                listRef.current?.scrollToIndex({
                    index: scrollIndexRef.current,
                    animated: false,
                });
            } catch (e) {
                console.log("Initial scroll error:", e);
            }
        }
        scrollIntervalRef.current = setInterval(() => {
            scrollIndexRef.current += 1;
            if (scrollIndexRef.current >= allComments.length * 2) {
                scrollIndexRef.current = allComments.length;
                try {
                    listRef.current?.scrollToIndex({
                        index: scrollIndexRef.current,
                        animated: false,
                    });
                } catch (e) {
                    console.log("Reset scroll error:", e);
                }
            }
            try {
                listRef.current?.scrollToIndex({
                    index: scrollIndexRef.current,
                    animated: true,
                });
            } catch (e) {
                console.log("Scroll error:", e);
            }
        }, 200); // PEHLE 100 tha, AB 200 (SLOW)

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
    }, [circularComments, allComments, isScrolling, isRevealing, currentWinnerIndex]);

    const revealWinner = () => {
        const totalWinners = winners.length;
        const totalSubstitutes = substitutes.length;
        const totalAll = totalWinners + totalSubstitutes;

        if (currentWinnerIndex >= totalAll) {
            console.log("All winners revealed, showing post info");
            setIsScrolling(false);
            setTimeout(() => {
                setShowPostInfo(true);
            }, 500);
            return;
        }

        setIsRevealing(true);
        const isWinner = currentWinnerIndex < totalWinners;
        const currentItem = isWinner
            ? winners[currentWinnerIndex]
            : substitutes[currentWinnerIndex - totalWinners];

        const username = currentItem?.user?.username ?? "";
        const commenterIndex = allComments.findIndex(
            c => c.username === username
        );

        if (commenterIndex !== -1) {
            const scrollToWinner = () => {
                const currentModulo = scrollIndexRef.current % allComments.length;
                const targetPosition = (commenterIndex + allComments.length - 2) % allComments.length;
                const isAtTargetPosition = currentModulo === targetPosition;

                if (!isAtTargetPosition) {
                    scrollIndexRef.current += 1;
                    if (scrollIndexRef.current >= allComments.length * 2) {
                        scrollIndexRef.current = allComments.length;
                        try {
                            listRef.current?.scrollToIndex({
                                index: scrollIndexRef.current,
                                animated: false,
                            });
                        } catch (e) { }
                    }

                    try {
                        listRef.current?.scrollToIndex({
                            index: scrollIndexRef.current,
                            animated: true,
                        });
                    } catch (e) { }
                    setTimeout(scrollToWinner, 150);
                } else {
                    setHighlightedUsername(username);
                    setTimeout(() => {
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
                            if (isWinner) {
                                setRevealedWinners(prev => [...prev, currentItem]);
                            } else {
                                setRevealedSubstitutes(prev => [...prev, currentItem]);
                            }

                            setTimeout(() => {
                                setHighlightedUsername(null);
                                const newIndex = currentWinnerIndex + 1;
                                setCurrentWinnerIndex(newIndex);
                                setIsRevealing(false);

                                if (newIndex >= totalAll) {
                                    console.log("Last winner added, showing post info");
                                    setIsScrolling(false);
                                    setTimeout(() => {
                                        setShowPostInfo(true);
                                    }, 1000);
                                } else {
                                    setTimeout(() => {
                                        setIsScrolling(true);
                                    }, 1000);
                                }
                            }, 500);
                        });
                    }, 500);
                }
            };
            scrollToWinner();
        } else {
            if (isWinner) {
                setRevealedWinners(prev => [...prev, currentItem]);
            } else {
                setRevealedSubstitutes(prev => [...prev, currentItem]);
            }
            const newIndex = currentWinnerIndex + 1;
            setCurrentWinnerIndex(newIndex);
            setIsRevealing(false);

            if (newIndex >= totalAll) {
                console.log("Last winner added (not found), showing post info");
                setIsScrolling(false);
                setTimeout(() => {
                    setShowPostInfo(true);
                }, 500);
            } else {
                setTimeout(() => {
                    setIsScrolling(true);
                }, 500);
            }
        }
    };
    const getItemLayout = useCallback(
        (_: Commenter[] | null | undefined, index: number) => ({
            length: 120,
            offset: 120 * index,
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

    if (!circularComments.length) {
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
                            data={circularComments}
                            keyExtractor={(item, i) => `${item?.username}-${i}`}
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            initialNumToRender={5} 
                            maxToRenderPerBatch={3}
                            windowSize={3}
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
                        contentContainerStyle={{ paddingBottom: 100 }}
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
                                router.replace("/");
                                setTimeout(() => {
                                    if (Platform.OS === "android") {
                                        Expo.Updates.reloadAsync?.();
                                    } else {
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
        </GradientScreen>
    );
}
const styles = StyleSheet.create({
    center: { flex: 1, justifyContent: "center", alignItems: "center" },
    scrollSection: {
        height: 150,
        marginBottom: 16,
    },
    profileWrapper: {
        marginHorizontal: 12,
        width: 84,
        alignItems: "center",
        paddingHorizontal: 6,
    },
    avatar: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: "#eee"
    },
    avatarFallback: { backgroundColor: "#e1e1e1" },
    username: {
        fontSize: 12,
        marginTop: 6,
        maxWidth: 72,
        textAlign: "center",
        color: "#fff",
    },
    highlighted: {
        backgroundColor: "rgba(255, 215, 0, 0.3)",
        borderRadius: 12,
        padding: 8,
    },
    highlightedAvatar: {
        borderWidth: 5,
        borderColor: '#FFD700',
        shadowColor: '#FFD700',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 1,
        shadowRadius: 12,
        elevation: 10,
    },
    highlightedText: {
        fontWeight: "bold",
        color: "#ffffffff",
    },
    doneTitle: {
        fontSize: 25,
        fontWeight: "bold",
        textAlign: "center",
        marginBottom: 25,
        marginTop: 10,
        color: "#fff",
    },
    adContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
        marginTop: 20,
        marginBottom: 20,
        paddingVertical: 10,
    },
    postRow: {
        flexDirection: "row",
        alignItems: "flex-start",
        marginBottom: 16,
        backgroundColor: "#ffffff34",
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
        backgroundColor: '#8B3A99',
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
        marginBottom: 4,
        color: "#fff",
    },
    postCaption: { color: "#ffffffff" },
    sectionTitle: {
        fontSize: 18,
        fontWeight: "bold",
        marginTop: 12,
        marginBottom: 10,
        color: "#fff",
    },
    winnerContainer: {
        marginBottom: 10,
        backgroundColor: "#ffffff34",
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
        backgroundColor: "#ffffff51",
        marginLeft: 10,
    },
    rankText: { fontWeight: "500", color: "#fff" },
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
        fontSize: 15,
        color: "#fff",
    },
    winnerText: {
        color: "#ffffffff",
        marginTop: 2
    },
    endButton: {
        marginTop: 24,
        backgroundColor: "#5a009e",
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