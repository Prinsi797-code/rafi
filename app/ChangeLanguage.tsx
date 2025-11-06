import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { FlatList, Text, TouchableOpacity, View } from "react-native";

const languages = [
    { code: "en", label: "English", flag: "🇬🇧" },
    { code: "hi", label: "हिंदी", flag: "🇮🇳" },
    { code: "ru", label: "Русский", flag: "🇷🇺" },
    { code: "af", label: "Afrikaans", flag: "🇿🇦" },
    { code: "ar", label: "العربية", flag: "🇸🇦" },
    { code: "de", label: "Deutsch", flag: "🇩🇪" },
    { code: "es", label: "Español", flag: "🇪🇸" },
    { code: "fr", label: "Français", flag: "🇫🇷" },
    { code: "id", label: "Bahasa", flag: "🇮🇩" },
    { code: "ja", label: "日本語", flag: "🇯🇵" },
    { code: "ko", label: "한국어", flag: "🇰🇷" },
    { code: "pt", label: "Português", flag: "🇵🇹" },
    { code: "vi", label: "Tiếng Việt", flag: "🇻🇳" },
    { code: "zh", label: "中文", flag: "🇨🇳" }
];

export default function ChangeLanguage() {
    const { i18n, t } = useTranslation();
    const [selected, setSelected] = useState(i18n.language);
    const router = useRouter();

    const selectLanguage = (code: string) => {
        setSelected(code);
    };

    const applyLanguage = async () => {
        await i18n.changeLanguage(selected);
        await AsyncStorage.setItem("appLanguage", selected);
        router.back();
    };

    return (
        <View style={{ flex: 1, backgroundColor: "#fce4ec", paddingLeft: "5", paddingRight: "5" }} >

            <View
                style={{
                    flexDirection: "row",
                    alignItems: "center",
                    paddingVertical: 15,
                    paddingHorizontal: 5,
                    marginTop: 50,
                }}
            >
                <TouchableOpacity onPress={() => router.back()} style={{}}>
                    <Ionicons name="arrow-back" size={24} color="black" />
                </TouchableOpacity>

                <View style={{ flex: 1, alignItems: "center", marginRight: 30 }}>
                    <Text style={{ fontSize: 25, fontWeight: "bold" }}>
                        {t("change_language")}
                    </Text>
                </View>
            </View>

            <View style={{ flex: 1, padding: 20 }}>
                <FlatList
                    data={languages}
                    keyExtractor={(item) => item.code}
                    showsVerticalScrollIndicator={false}
                    renderItem={({ item }) => (
                        <TouchableOpacity
                            style={{
                                backgroundColor: "white",
                                padding: 10,
                                borderRadius: 10,
                                flexDirection: "row",
                                justifyContent: "space-between",
                                alignItems: "center",
                                marginBottom: 10
                            }}
                            onPress={() => selectLanguage(item.code)}
                        >
                            <View style={{ flexDirection: "row", alignItems: "center" }}>

                                <Text style={{ fontSize: 28, marginRight: 12 }}>{item.flag}</Text>

                                <Text style={{ fontSize: 18, fontWeight: "bold", color: "#8B3A99" }}>
                                    {item.label}
                                </Text>
                            </View>
                            {selected === item.code && (
                                <Ionicons name="checkmark" size={25} color="#8B3A99" />
                            )}
                        </TouchableOpacity>
                    )}
                />

                <TouchableOpacity
                    style={{
                        backgroundColor: "#8B3A99",
                        padding: 15,
                        borderRadius: 10,
                        alignItems: "center",
                        marginTop: 20,
                        marginBottom: 30
                    }}
                    onPress={applyLanguage}
                >
                    <Text style={{ color: "white", fontSize: 16 }}>{t("done")}</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}
