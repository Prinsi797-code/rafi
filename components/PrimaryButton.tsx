import { JSX } from "react";
import { Pressable, StyleProp, Text, ViewStyle } from "react-native";
import { colors, radius, shadow } from "../utils/theme";

type Props = {
    title: string;
    onPress: () => void;
    style?: StyleProp<ViewStyle>;
    disabled?: boolean;
};

export default function PrimaryButton({
    title,
    onPress,
    style,
    disabled,
}: Props): JSX.Element {
    return (
        <Pressable
            onPress={onPress}
            disabled={disabled}
            style={({ pressed }) => [
                {
                    backgroundColor: disabled ? "#8b3a997a" : colors.purple,
                    paddingVertical: 16,
                    borderRadius: radius.xl,
                    alignItems: "center",
                    transform: [{ scale: pressed ? 0.98 : 1 }],
                },
                shadow.card,
                style,
            ]}
            accessibilityRole="button"
        >
            <Text style={{ color: colors.white, fontWeight: "900", fontSize: 18 }}>
                {title}
            </Text>
        </Pressable>
    );
}
