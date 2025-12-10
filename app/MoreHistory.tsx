import GradientScreen from "@/components/GradientScreen";
import AdsManager from "@/services/adsManager";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
    Alert,
    Image,
    Linking,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import {
    BannerAdSize,
    GAMBannerAd
} from 'react-native-google-mobile-ads';

const safeImage = (uri?: string) =>
    uri && uri.startsWith("http")
        ? { uri }
        : require("../assets/images/place-holder.png");

export default function MoreHistory() {
    const { data } = useLocalSearchParams();
    const [winnerData, setWinnerData] = useState<any>(null);
    const router = useRouter();
    const searchParams = useLocalSearchParams();
    const { t } = useTranslation();

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
        if (data) {
            try {
                const parsed = JSON.parse(data as string);
                setWinnerData(parsed);
            } catch (err) {
                console.error("❌ Error parsing passed data:", err);
            }
        }
    }, [data]);

    const openInstagramProfile = async (username: string) => {
        if (!username) {
            Alert.alert("Error", "Username not available");
            return;
        }

        console.log("Opening profile for:", username);

        const instagramUrl = `https://www.instagram.com/${username}`;
        const instagramAppUrl = `instagram://user?username=${username}`;

        try {
            const canOpen = await Linking.canOpenURL(instagramAppUrl);
            if (canOpen) {
                await Linking.openURL(instagramAppUrl);
            } else {
                await Linking.openURL(instagramUrl);
            }
        } catch (error) {
            console.error("Error opening Instagram profile:", error);
            Alert.alert("Error", "Unable to open Instagram profile");
        }
    };

    if (!winnerData) {
        return (
            <View style={styles.container}>
                <Text>Loading winner details...</Text>
            </View>
        );
    }

    return (
        <GradientScreen>
            <View style={styles.container}>
                <View style={styles.header}>
                    <TouchableOpacity
                        onPress={() => {
                            if (searchParams?.from === "History") {
                                router.dismissAll();
                                router.replace("/History");
                            } else {
                                router.back();
                            }
                        }}
                        style={styles.backButton}
                        activeOpacity={0.7}
                    >
                        <View style={styles.iconWrapper}>
                            <Ionicons name="chevron-back-outline" size={20} color="#65017A" />
                        </View>
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>{t("giveaway_details")}</Text>
                    <View style={{ width: 24 }} />
                </View>

                <ScrollView showsVerticalScrollIndicator={false}>
                    <View style={styles.mainCard}>
                        <View style={styles.postSection}>
                            <Image
                                source={safeImage(winnerData.postData?.media?.[0]?.thumbnail)}
                                style={styles.postImage}
                            />
                            <View style={styles.postInfo}>
                                <Text style={styles.liveTag} numberOfLines={3}>
                                    {winnerData.postData?.caption || "No caption available"}
                                </Text>
                                <View style={styles.participantsBadge}>
                                    <Ionicons name="people" size={16} color="white" />
                                    <Text style={styles.participantsCount}>
                                        {winnerData.postData?.comments_count ?? 0}
                                    </Text>
                                </View>
                            </View>
                        </View>

                        <View style={styles.winnersSection}>
                            <Text style={styles.winnersTitle}>🎉 Giveaway Winners</Text>

                            {(winnerData?.winnerResponse?.winners ?? []).length > 0 ? (
                                winnerData.winnerResponse.winners.map((item: any, index: number) => (
                                    <TouchableOpacity
                                        key={`winner-${index}`}
                                        style={styles.winnerCard}
                                        onPress={() => openInstagramProfile(item.user?.username)}
                                        activeOpacity={0.7}
                                    >
                                        <View style={styles.winnerLeft}>
                                            <Image
                                                source={safeImage(item.user?.profile_pic_url)}
                                                style={styles.winnerAvatar}
                                            />
                                            <View style={styles.winnerInfo}>
                                                <View style={styles.usernameContainer}>
                                                    <Text style={styles.winnerUsername}>
                                                        {item.user?.username || "unknown"}
                                                    </Text>
                                                    <Ionicons
                                                        name="logo-instagram"
                                                        size={16}
                                                        color="#fcaf45"
                                                        style={styles.instagramIcon}
                                                    />
                                                </View>
                                                <Text style={styles.winnerComment}>
                                                    {item.text || "Nice rcb 2025"}
                                                </Text>
                                            </View>
                                        </View>
                                    </TouchableOpacity>
                                ))
                            ) : (
                                <Text style={styles.noWinnersText}>No winners found</Text>
                            )}

                            {winnerData?.winnerResponse?.substitutes?.length > 0 && (
                                <>
                                    <Text style={styles.winnersTitle}>✨ Alternate Winners</Text>

                                    {winnerData.winnerResponse.substitutes.map((item: any, index: number) => (
                                        <TouchableOpacity
                                            key={`sub-${index}`}
                                            style={styles.winnerCard}
                                            onPress={() => openInstagramProfile(item.user?.username)}
                                            activeOpacity={0.7}
                                        >
                                            <View style={styles.winnerLeft}>
                                                <Image
                                                    source={safeImage(item.user?.profile_pic_url)}
                                                    style={styles.winnerAvatar}
                                                />
                                                <View style={styles.winnerInfo}>
                                                    <View style={styles.usernameContainer}>
                                                        <Text style={styles.winnerUsername}>
                                                            {item.user?.username || "unknown"}
                                                        </Text>
                                                        <Ionicons
                                                            name="logo-instagram"
                                                            size={16}
                                                            color="#fcaf45"
                                                            style={styles.instagramIcon}
                                                        />
                                                    </View>
                                                    <Text style={styles.winnerComment}>
                                                        {item.text || "Alternative winner"}
                                                    </Text>
                                                </View>
                                            </View>
                                        </TouchableOpacity>
                                    ))}
                                </>
                            )}
                        </View>
                    </View>
                </ScrollView>
            </View>
            {bannerConfig && bannerConfig.show && (
                <View style={styles.adContainer}>
                    <GAMBannerAd
                        unitId={bannerConfig.id}
                        sizes={[BannerAdSize.BANNER]}
                        requestOptions={{
                            requestNonPersonalizedAdsOnly: true,
                        }}
                        onAdLoaded={() => console.log("✅ Home Banner Ad Loaded")}
                        onAdFailedToLoad={(error) => console.log("❌ Home Banner Ad Failed:", error)}
                    />
                </View>
            )}
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
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 16,
    },
    backButton: {
        padding: 5,
        marginLeft: 5,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: '800',
        color: '#fff',
    },
    mainCard: {
        backgroundColor: "#ffffff34",
        borderRadius: 16,
        padding: 16,
        marginBottom: 20,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 4,
    },
    // Banner Ad Styles
    adContainer: {
        alignItems: "center",
        marginTop: 10,
        marginBottom: 10,
    },
    postSection: {
        flexDirection: 'row',
        marginBottom: 20,
    },
    iconWrapper: {
        backgroundColor: "#ffff",
        padding: 1,
        borderRadius: 50,
    },
    postImage: {
        width: 80,
        height: 80,
        borderRadius: 12,
        marginRight: 12,
    },
    postInfo: {
        flex: 1,
        justifyContent: 'space-between',
    },
    liveTag: {
        fontSize: 14,
        color: '#ffffffff',
        lineHeight: 20,
    },
    participantsBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#670878ff',
        paddingHorizontal: 8,
        paddingVertical: 5,
        borderRadius: 6,
        marginTop: 10,
        alignSelf: 'flex-start',
    },
    participantsCount: {
        color: 'white',
        fontSize: 18,
        fontWeight: "bold",
        marginLeft: 4,
    },
    winnersSection: {
        marginTop: 16,
    },
    winnersTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 12,
        color: '#ffffffff',
    },
    winnerCard: {
        backgroundColor: "#ffffff34",
        borderRadius: 12,
        padding: 12,
        marginBottom: 8,
        borderWidth: 1,
        borderColor: '#ffffff34',
    },
    winnerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    winnerAvatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        marginRight: 12,
    },
    winnerInfo: {
        flex: 1,
    },
    usernameContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 4,
    },
    winnerUsername: {
        fontSize: 16,
        fontWeight: '600',
        color: '#ffffffff',
        marginRight: 6,
    },
    instagramIcon: {
        marginLeft: 4,
    },
    winnerComment: {
        fontSize: 14,
        color: '#ffffffff',
        fontStyle: 'italic',
    },
    noWinnersText: {
        textAlign: 'center',
        color: '#ffffffff',
        fontStyle: 'italic',
        marginVertical: 20,
    },
});