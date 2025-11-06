// import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { JSX, ReactNode } from "react";
import { StyleProp, View, ViewStyle } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors } from "../utils/theme";

type Props = {
    children: ReactNode;
    style?: StyleProp<ViewStyle>;
};

export default function GradientScreen({ children, style }: Props): JSX.Element {
    return (
        <LinearGradient
            colors={[colors.bg1, colors.bg2]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{ flex: 1 }}
        >
            {/* GIF background with expo-image */}
            {/* <Image
                source={require("../assets/images/confetti.gif")}
                style={{
                    position: "absolute",
                    width: "100%",
                    height: "100%",
                }}
                contentFit="cover"
                blurRadius={5}
            /> */}
            <SafeAreaView style={{ flex: 1 }}>
                <View style={[{ flex: 1, padding: 0 }, style]}>
                    {children}
                </View>
            </SafeAreaView>
        </LinearGradient>
    );
}
