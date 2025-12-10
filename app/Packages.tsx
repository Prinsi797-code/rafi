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
    View
} from "react-native";
import Icon from "react-native-vector-icons/Ionicons";
import GradientScreen from "../components/GradientScreen";

// Type definitions
interface PackageItem {
    id: number;
    ios_product_id: string;
    title: string;
    coins: number;
    giveaway: number;
    ios_total_price: number;
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
    const router = useRouter();
    const [giveawayCoin, setGiveawayCoin] = useState<number | null>(null);
    const { t } = useTranslation();
    useEffect(() => {
        const initializeIAP = async () => {
            try {
                await InAppPurchases.connectAsync();
                setIapConnected(true);
                console.log('IAP Connected');

                // Set up purchase listener
                InAppPurchases.setPurchaseListener(async ({ responseCode, results, errorCode }) => {
                    console.log('🔔 Purchase Listener Triggered:', responseCode);

                    if (responseCode === InAppPurchases.IAPResponseCode.OK) {
                        if (results && results.length > 0) {
                            for (const purchase of results) {
                                console.log('📦 Purchase Data:', purchase);

                                if (!purchase.acknowledged) {
                                    try {
                                        // STEP 1: Backend verification & coin update
                                        const updateSuccess = await updatePurchaseOnBackend(purchase);

                                        // STEP 2: Finish transaction ONLY after backend success
                                        if (updateSuccess) {
                                            await InAppPurchases.finishTransactionAsync(purchase, true);
                                            console.log('✅ Transaction completed & acknowledged');
                                        } else {
                                            console.log('⚠️ Backend update failed, transaction not finished');
                                            Alert.alert(
                                                '⚠️ Warning',
                                                'Purchase successful but coins not updated. Please contact support.'
                                            );
                                        }
                                    } catch (error) {
                                        console.error('❌ Purchase processing error:', error);
                                    }
                                }
                            }
                        }
                    } else if (responseCode === InAppPurchases.IAPResponseCode.USER_CANCELED) {
                        console.log('❌ User canceled purchase');
                        setPurchasing(false);
                    } else if (responseCode === InAppPurchases.IAPResponseCode.ERROR) {
                        console.log('❌ Purchase error:', errorCode);
                        Alert.alert('Error', 'Purchase failed. Please try again.');
                        setPurchasing(false);
                    }
                });
            } catch (error) {
                console.error('❌ IAP initialization error:', error);
                setIapConnected(false);
            }
        };

        initializeIAP();

        // ⚠️ Disconnect ko conditional banao
        return () => {
            if (Platform.OS !== 'ios') {
                InAppPurchases.disconnectAsync();
            }
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


    const fetchGiveawayCoin = useCallback(async () => {
        try {
            const response = await fetch("https://insta.adinsignia.com/api/giveaway-coin", {
                method: "GET",
                headers: {
                    "Content-Type": "application/json",
                    Accept: "application/json",
                },
            });

            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

            const json = await response.json();

            if (json.success === "success" && json.data?.giveaway) {
                setGiveawayCoin(Number(json.data.giveaway));
            } else {
                console.warn("Invalid response for giveaway coin:", json);
            }
        } catch (error) {
            console.error("Error fetching giveaway coin:", error);
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
                await fetchGiveawayCoin();
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

    const updatePurchaseOnBackend = async (purchase: any): Promise<boolean> => {
        try {
            const storedResponse = await AsyncStorage.getItem("register_response");
            if (!storedResponse) {
                console.log('❌ No stored response found');
                return false;
            }

            const parsed = JSON.parse(storedResponse);
            const token = parsed?.data?.bearer_token;

            const selectedPack = packs.find((p) => p.id === selected);
            if (!selectedPack) {
                console.log('❌ Selected pack not found');
                return false;
            }

            console.log('🔄 Sending to backend:', {
                ios_product_id: selectedPack.ios_product_id,
                transaction_id: purchase.transactionId,
            });

            const response = await axios.post(
                "https://insta.adinsignia.com/api/iospurchasecoin",
                {
                    ios_product_id: selectedPack.ios_product_id,
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

            console.log('📥 Backend response:', response.data);

            if (response.data?.success === "success") {
                Alert.alert(
                    "🎉 Purchase Successful",
                    response.data.message || "Coins added successfully!"
                );

                // ✅ Update coins in state & AsyncStorage
                if (response.data?.data?.coin_count !== undefined) {
                    const newCoinCount = Number(response.data.data.coin_count);
                    setCoins(newCoinCount);
                    parsed.data.coin_count = newCoinCount;
                    await AsyncStorage.setItem("register_response", JSON.stringify(parsed));
                    console.log('✅ Coins updated:', newCoinCount);
                }

                // Refresh packages
                await fetchPacks();
                setPurchasing(false);

                return true; // ✅ Success
            } else {
                console.log('⚠️ Backend returned non-success:', response.data);
                return false;
            }
        } catch (error: any) {
            console.error("❌ Backend update error:", error.response?.data || error.message);
            setPurchasing(false);
            return false; // ❌ Failed
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
                selectedPack.ios_product_id
            ]);

            console.log("📦 Products found:", results?.length);

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
                                    // ✅ Initiate purchase - Listener will handle backend call
                                    await InAppPurchases.purchaseItemAsync(selectedPack.ios_product_id);
                                    console.log('🚀 Purchase initiated');
                                } catch (error: any) {
                                    console.error("❌ Purchase error:", error);
                                    Alert.alert("❌ Error", error.message || "Purchase failed");
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
                staticColor = "#5a009e";
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
                        <Text style={styles.price}>₹{item.ios_total_price}</Text>
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
                            {t("giveaway")} : {giveawayCoin !== null ? giveawayCoin : "..."} {t("coins")}
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
        color: "#ffffffff",
        textAlign: "center",
    },
    subtitle: {
        fontSize: 18,
        color: "#dfdfdfff",
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
        color: "#fefefeff",
        textAlign: "center",
    },
    loadingText: {
        marginTop: 10,
        color: "#fbfbfbff",
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
        color: "#ffffffff",
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
        backgroundColor: "#ffffff34",
        borderRadius: 10,
        padding: 15,
        marginBottom: 15,
        elevation: 3,
        shadowColor: "#ffffffff",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        borderWidth: 2,
        borderColor: "transparent",
    },
    selectedCard: {
        borderColor: "#ffffffff",
        // backgroundColor: "#f9f5ff",
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
        color: "#ffffffff",
        marginBottom: 5,
    },
    coinGiveaway: {
        fontSize: 12,
        color: "#fdfdfdff",
        fontWeight: "500",
    },
    price: {
        fontSize: 18,
        fontWeight: "bold",
        color: "#ffffffff",
    },
    button: {
        backgroundColor: "#5a009e",
        paddingVertical: 15,
        borderRadius: 10,
        alignItems: "center",
        marginTop: 10,
        marginBottom: 20,
    },
    buttonDisabled: {
        backgroundColor: "#9573b0ff",
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