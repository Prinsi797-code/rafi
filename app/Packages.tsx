import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import * as InAppPurchases from 'expo-in-app-purchases';
import { useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Image,
    Platform,
    RefreshControl,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
    useWindowDimensions,
} from "react-native";
import { BannerAd, BannerAdSize, TestIds } from 'react-native-google-mobile-ads';
import Icon from "react-native-vector-icons/Ionicons";
import GradientScreen from "../components/GradientScreen";

// Type definitions
interface PackageItem {
    id: number;
    product_id: string;
    title: string;
    coins: number;
    giveaway: number;
    total_price: number;
    pkg_image_url: string;
    label_popular?: string;
    label_color?: string;
}

interface ApiResponse {
    success: string;
    data: PackageItem[];
    message?: string;
}

export default function Package() {
    const [packs, setPacks] = useState<PackageItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [selected, setSelected] = useState<number | null>(null);
    const [purchasing, setPurchasing] = useState(false);
    const [coins, setCoins] = useState<number>(0);
    const [iapConnected, setIapConnected] = useState(false);
    const isMounted = useRef(true);
    const { width } = useWindowDimensions();
    const router = useRouter();
    const { t } = useTranslation();

    // Initialize In-App Purchases
    useEffect(() => {
        const initializeIAP = async () => {
            try {
                await InAppPurchases.connectAsync();
                setIapConnected(true);
                console.log('✅ IAP Connected');

                // Set up purchase listener
                InAppPurchases.setPurchaseListener(({ responseCode, results, errorCode }) => {
                    if (responseCode === InAppPurchases.IAPResponseCode.OK) {
                        results?.forEach(async (purchase) => {
                            if (!purchase.acknowledged) {
                                console.log('✅ Purchase successful:', purchase);
                                // Finish the transaction
                                await InAppPurchases.finishTransactionAsync(purchase, true);
                                // Update your backend
                                await updatePurchaseOnBackend(purchase);
                            }
                        });
                    } else if (responseCode === InAppPurchases.IAPResponseCode.USER_CANCELED) {
                        console.log('❌ User canceled purchase');
                        Alert.alert('Cancelled', 'Purchase was cancelled');
                    } else if (responseCode === InAppPurchases.IAPResponseCode.ERROR) {
                        console.log('❌ Purchase error:', errorCode);
                        Alert.alert('Error', 'Purchase failed. Please try again.');
                    }
                });
            } catch (error) {
                console.error('❌ IAP initialization error:', error);
                setIapConnected(false);
            }
        };

        initializeIAP();

        return () => {
            InAppPurchases.disconnectAsync();
        };
    }, []);

    const fetchPacks = useCallback(async (isRefresh = false) => {
        try {
            if (!isRefresh) setLoading(true);

            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000);

            const response = await fetch("https://insta.adinsignia.com/api/getcoupon", {
                method: "GET",
                headers: {
                    "Content-Type": "application/json",
                    Accept: "application/json",
                },
                signal: controller.signal,
            });

            clearTimeout(timeoutId);

            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

            const json: ApiResponse = await response.json();

            if (json.success === "success" && Array.isArray(json.data)) {
                setPacks(json.data);
            } else {
                throw new Error(json.message || "Invalid response format");
            }
        } catch (error: any) {
            console.error("Error fetching data:", error);
            if (error.name === "AbortError") {
                Alert.alert("⏱️ Timeout", "Request timed out. Please check your connection.");
            } else {
                Alert.alert("❌ Error", "Failed to load packages. Please try again.");
            }
        } finally {
            setLoading(false);
            if (isRefresh) setRefreshing(false);
        }
    }, []);

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        fetchPacks(true);
    }, [fetchPacks]);

    useEffect(() => {
        isMounted.current = true;

        const loadData = async () => {
            if (isMounted.current) {
                await fetchPacks();
                const storedResponse = await AsyncStorage.getItem("register_response");
                if (storedResponse) {
                    const parsed = JSON.parse(storedResponse);
                    setCoins(Number(parsed.data.coin_count));
                }
            }
        };
        loadData();
        return () => {
            isMounted.current = false;
        };
    }, [fetchPacks]);

    const updatePurchaseOnBackend = async (purchase: any) => {
        try {
            const storedResponse = await AsyncStorage.getItem("register_response");
            if (!storedResponse) return;

            const parsed = JSON.parse(storedResponse);
            const token = parsed?.data?.bearer_token;

            const selectedPack = packs.find((p) => p.id === selected);
            if (!selectedPack) return;

            const response = await axios.post(
                "https://insta.adinsignia.com/api/purchasecoin",
                {
                    product_id: selectedPack.product_id,
                    transaction_id: purchase.transactionId,
                    purchase_token: purchase.purchaseToken || purchase.transactionReceipt,
                },
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                        "Content-Type": "application/json",
                        Accept: "application/json",
                    },
                    timeout: 15000,
                }
            );

            if (response.data?.success === "success") {
                Alert.alert(
                    "🎉 Purchase Successful",
                    response.data.message || "Your purchase was completed successfully!"
                );
                if (response.data?.data?.coin_count !== undefined) {
                    setCoins(Number(response.data.data.coin_count));
                    parsed.data.coin_count = Number(response.data.data.coin_count);
                    await AsyncStorage.setItem("register_response", JSON.stringify(parsed));
                }
                fetchPacks();
            }
        } catch (error) {
            console.error("Backend update error:", error);
        } finally {
            setPurchasing(false);
        }
    };

    const handlePurchase = async () => {
        
        if (purchasing || !iapConnected) {
            if (!iapConnected) {
                Alert.alert("❌ Error", "In-app purchases not available. Please restart the app.");
            }
            return;
        }
        

        try {
            setPurchasing(true);

            const storedResponse = await AsyncStorage.getItem("register_response");
            if (!storedResponse) {
                Alert.alert("❌ Error", "User not registered. Please login again.");
                setPurchasing(false);
                return;
            }

            const selectedPack = packs.find((p) => p.id === selected);
            if (!selectedPack) {
                Alert.alert("❌ Error", "Please select a package first.");
                setPurchasing(false);
                return;
            }

            // Get product details from store
            const { responseCode, results } = await InAppPurchases.getProductsAsync([
                selectedPack.product_id
            ]);
            // const { responseCode, results } = await InAppPurchases.getProductsAsync(['influencer_pack']);
            console.log("IAP responseCode:", responseCode);
            console.log("IAP products:", results);
            console.log('4. Response Code:', responseCode);
    console.log('5. Products Found:', results?.length);
    console.log('6. Product Details:', JSON.stringify(results, null, 2));

            if (responseCode === InAppPurchases.IAPResponseCode.OK && results && results.length > 0) {
                const product = results[0];

                // Show confirmation
                Alert.alert(
                    "Confirm Purchase",
                    `${product.title}\n${product.price}\n\n${selectedPack.coins} COINS + ${selectedPack.giveaway} GIVEAWAY`,
                    [
                        {
                            text: "Cancel",
                            style: "cancel",
                            onPress: () => setPurchasing(false)
                        },
                        {
                            text: "Buy",
                            onPress: async () => {
                                try {
                                    // Initiate purchase
                                    await InAppPurchases.purchaseItemAsync(selectedPack.product_id);
                                    // Purchase listener will handle the rest
                                } catch (error: any) {
                                    console.error("Purchase error:", error);
                                    Alert.alert("❌ Error", "Purchase failed. Please try again.");
                                    setPurchasing(false);
                                }
                            }
                        }
                    ]
                );
            } else {
                Alert.alert("❌ Error", "Product not found in store. Please try again.");
                setPurchasing(false);
            }
        } catch (error: any) {
            console.error("❌ Purchase error:", error);
            Alert.alert("❌ Error", "Purchase request failed. Please try again.");
            setPurchasing(false);
        }
    };

    const handleBackHome = useCallback(() => {
        router.replace("/");
    }, [router]);

    const renderPackageItem = useCallback(
        ({ item, index }: { item: PackageItem; index: number }) => {
            let staticLabel = "";
            let staticColor = "";

            if (index === 0) {
                staticLabel = "Most Popular";
                staticColor = "#65017A";
            } else if (index === 4) {
                staticLabel = "Best Value";
                staticColor = "#FFB109";
            }

            return (
                <TouchableOpacity
                    onPress={() => setSelected(item.id)}
                    style={[styles.card, selected === item.id && styles.selectedCard]}
                    activeOpacity={0.8}
                >
                    {staticLabel !== "" && (
                        <View
                            style={[
                                styles.popularBadge,
                                { backgroundColor: staticColor },
                            ]}
                        >
                            <Text style={styles.popularText}>
                                {staticLabel}
                            </Text>
                        </View>
                    )}

                    <View style={styles.cardContent}>
                        <Image
                            source={{ uri: item.pkg_image_url }}
                            style={styles.image}
                            defaultSource={require("../assets/images/place-holder.png")}
                            onError={(error) => console.log("Image load error:", error)}
                        />
                        <View style={styles.info}>
                            <Text style={styles.packTitle} numberOfLines={2}>
                                {item.title}
                            </Text>
                            <Text style={styles.coinGiveaway}>
                                {item.coins} COINS - {item.giveaway} GIVEAWAY
                            </Text>
                        </View>
                        <Text style={styles.price}>₹{item.total_price}</Text>
                    </View>
                </TouchableOpacity>
            );
        },
        [selected, coins]
    );

    return (
        <GradientScreen>
            <View style={styles.container}>
                <View
                    style={[
                        styles.responsiveContainer,
                        Platform.OS === "web" && {
                            width: "100%",
                            maxWidth: 900,
                            alignSelf: "center",
                            overflow: "hidden",
                        },
                    ]}
                >
                    <View style={styles.customHeader}>
                        <TouchableOpacity
                            onPress={handleBackHome}
                            style={styles.homeButton}
                            activeOpacity={0.7}
                        >
                            <View style={styles.iconWrapper}>
                                <Icon name="home" size={20} color="#65017A" />
                            </View>
                        </TouchableOpacity>
                    </View>

                    <View style={styles.header}>
                        <Text style={styles.mainTitle}>{t("pick_your_winners")}</Text>
                        <Text style={styles.subtitle}>
                            {t("pick_winner_subtitle")}
                        </Text>
                        <Text style={styles.giveawayText}>
                            {t("giveaway")} : 6 {t("coin")}
                        </Text>
                    </View>

                    <Text style={styles.title}>{t("get_coin_pack")}</Text>

                    {packs.length === 0 ? (
                        <View style={styles.emptyContainer}>
                            <Icon name="package-outline" size={50} color="#999" />
                            <Text style={styles.emptyText}>No packages available</Text>
                            <TouchableOpacity onPress={() => fetchPacks()} style={styles.retryButton}>
                                <Text style={styles.retryText}>Retry</Text>
                            </TouchableOpacity>
                        </View>
                    ) : (
                        <FlatList
                            data={packs}
                            keyExtractor={(item) => item.id.toString()}
                            contentContainerStyle={{ paddingBottom: 100 }}
                            renderItem={renderPackageItem}
                            refreshControl={
                                <RefreshControl
                                    refreshing={refreshing}
                                    onRefresh={onRefresh}
                                    colors={["#8B3A99"]}
                                />
                            }
                            showsVerticalScrollIndicator={false}
                            removeClippedSubviews={true}
                            maxToRenderPerBatch={10}
                            windowSize={10}
                        />
                    )}

                    <View style={styles.adContainer}>
                        <BannerAd
                            unitId={TestIds.BANNER}
                            size={BannerAdSize.BANNER}
                            requestOptions={{
                                requestNonPersonalizedAdsOnly: true,
                            }}
                        />
                    </View>

                    <TouchableOpacity
                        style={[styles.button, (!selected || purchasing) && styles.buttonDisabled]}
                        onPress={handlePurchase}
                        disabled={!selected || purchasing}
                        activeOpacity={0.8}
                    >
                        {purchasing ? (
                            <View style={styles.buttonContent}>
                                <ActivityIndicator size="small" color="#fff" />
                                <Text style={[styles.buttonText, { marginLeft: 10 }]}>
                                    Processing...
                                </Text>
                            </View>
                        ) : (
                            <Text style={styles.buttonText}>{t("purchase_package")}</Text>
                        )}
                    </TouchableOpacity>
                </View>
            </View>
        </GradientScreen>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        paddingHorizontal: 16,
    },
    adContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
        paddingVertical: 10,
    },
    centered: {
        justifyContent: "center",
        alignItems: "center",
    },
    responsiveContainer: {
        flex: 1,
    },
    customHeader: {
        paddingVertical: 10,
        paddingHorizontal: 5,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "flex-start",
    },
    homeButton: {
        flexDirection: "column",
        alignItems: "center",
    },
    iconWrapper: {
        backgroundColor: "#ffff",
        padding: 7,
        borderRadius: 12,
        marginBottom: 4,
    },
    homeText: {
        fontSize: 15,
        fontWeight: "bold",
        color: "#65017A",
    },
    header: {
        alignItems: "center",
        marginBottom: 20,
    },
    mainTitle: {
        fontSize: 30,
        fontWeight: "bold",
        color: "#333",
        textAlign: "center",
    },
    subtitle: {
        fontSize: 18,
        color: "#666",
        textAlign: "center",
        marginTop: 5,
    },
    giveawayText: {
        fontSize: 20,
        fontWeight: "bold",
        color: "#8e429bff",
        marginTop: 10,
        textAlign: "center",
        backgroundColor: "#fff",
        borderRadius: 5,
        padding: 5
    },
    title: {
        fontSize: 30,
        fontWeight: "bold",
        marginBottom: 15,
        color: "#7e1191ff",
        textAlign: "center",
    },
    loadingText: {
        marginTop: 10,
        color: "#666",
        fontSize: 16,
    },
    emptyContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        paddingVertical: 50,
    },
    emptyText: {
        fontSize: 18,
        color: "#999",
        marginTop: 10,
        textAlign: "center",
    },
    retryButton: {
        marginTop: 20,
        backgroundColor: "#8B3A99",
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 5,
    },
    retryText: {
        color: "#fff",
        fontWeight: "bold",
    },
    card: {
        backgroundColor: "#fff",
        borderRadius: 10,
        padding: 15,
        marginBottom: 15,
        elevation: 3,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        borderWidth: 2,
        borderColor: "transparent",
    },
    selectedCard: {
        borderColor: "#8B3A99",
        backgroundColor: "#f9f5ff",
    },
    popularBadge: {
        position: "absolute",
        top: -2,
        right: -2,
        paddingHorizontal: 8,
        paddingVertical: 5,
        borderTopRightRadius: 10,
        borderBottomLeftRadius: 10,
        zIndex: 1,
    },
    popularText: {
        color: "#fff",
        fontSize: 13,
        fontWeight: "bold",
    },
    cardContent: {
        flexDirection: "row",
        alignItems: "center",
    },
    image: {
        width: 50,
        height: 50,
        marginRight: 15,
        resizeMode: 'cover',
    },
    info: {
        flex: 1,
    },
    packTitle: {
        fontSize: 16,
        fontWeight: "bold",
        color: "#333",
        marginBottom: 5,
    },
    coinGiveaway: {
        fontSize: 12,
        color: "#8B3A99",
        fontWeight: "500",
    },
    price: {
        fontSize: 18,
        fontWeight: "bold",
        color: "#333",
    },
    button: {
        backgroundColor: "#8B3A99",
        paddingVertical: 15,
        borderRadius: 10,
        alignItems: "center",
        marginTop: 10,
        marginBottom: 20,
    },
    buttonDisabled: {
        backgroundColor: "#aaa",
    },
    buttonContent: {
        flexDirection: "row",
        alignItems: "center",
    },
    buttonText: {
        color: "#fff",
        fontSize: 20,
        fontWeight: "bold",
    },
});