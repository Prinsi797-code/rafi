import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { usePathname, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { Text, TouchableOpacity, View } from "react-native";

export default function Header({
    coins,
    showBack = false,
}: {
    coins?: number;
    showBack?: boolean;
}) {
    const router = useRouter();
    const pathname = usePathname();
    const { t } = useTranslation();

    const isSupportPage = pathname === "/support";

    return (
        <View
            style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
                padding: 16,
            }}
        >
            {isSupportPage ? (
                <Text style={{ fontSize: 18, fontWeight: "bold", color: "#fff" }}>
                    {t("support")}
                </Text>
            ) : showBack ? (
                <TouchableOpacity
                    style={{ alignItems: "center" }}
                    onPress={() => router.push("/")}
                >
                    <Ionicons name="arrow-back" size={28} color="#fffefeff" />
                    <Text style={{ fontSize: 10 }}>{t("back")}</Text>
                </TouchableOpacity>
            ) : (
                <TouchableOpacity
                    style={{ alignItems: "center" }}
                    onPress={() => router.push("/support")}
                >
                    <Ionicons name="menu" size={28} color="#ffffffff" />
                    <Text style={{ fontSize: 10, color: "#ffff" }}>{t("menu")}</Text>
                </TouchableOpacity>
            )}

            {isSupportPage ? (
                <TouchableOpacity
                    style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 8,
                    }}
                    onPress={() => router.push("/")}
                >
                    <Text
                        style={{
                            fontSize: 16,
                            fontWeight: "bold",
                            color: "#fffefeff",
                        }}
                    >
                        {/* {t("home")} */}
                    </Text>

                    <View
                        style={{
                            backgroundColor: "#fff",
                            padding: 7,
                            borderRadius: 12,
                            shadowColor: "#000",
                            shadowOffset: { width: 0, height: 2 },
                            shadowOpacity: 0.2,
                            shadowRadius: 3,
                            elevation: 3,
                        }}
                    >
                        <Ionicons name="home" size={20} color="#65017A" />
                    </View>
                </TouchableOpacity>
            ) : (
                <TouchableOpacity
                    style={{ alignItems: "center" }}
                    onPress={() => router.push("/Packages")}
                >
                    <MaterialCommunityIcons
                        name="gift-outline"
                        size={22}
                        color="#fffdfdff"
                    />
                    <Text style={{ fontSize: 12, fontWeight: "bold", color: "#fff" }}>
                        {coins ?? 0} {t("coins")}
                    </Text>
                </TouchableOpacity>
            )}
        </View>

    );
}
