import { ReactNode, FC, useMemo } from "react";
import {
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  GestureResponderEvent,
  ViewStyle,
  TextStyle,
  StyleProp,
} from "react-native";
import { ThemedText } from "../../ThemedText";

export type TButtonType = "primary" | "text";
interface ButtonProps {
  title?: string;
  children?: ReactNode;
  onPress?: (event: GestureResponderEvent) => void;
  isLoading?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  backgroundColor?: string;
  type?: TButtonType;
  loadingIndicatorColor?: string;
}

const Button: FC<ButtonProps> = ({
  title,
  children,
  onPress,
  isLoading = false,
  disabled = false,
  style,
  textStyle,
  backgroundColor = "#0a7ea4",
  type = "primary",
  loadingIndicatorColor,
}) => {
  const isDisabled = useMemo(
    () => disabled || isLoading,
    [disabled, isLoading]
  );

  return (
    <TouchableOpacity
      onPress={onPress}
      style={[
        styles.button,
        type === "text" ? styles.textButton : undefined,
        {
          backgroundColor:
            isDisabled && type !== "text"
              ? "#A0A0A0"
              : (type === "primary" && backgroundColor) || undefined,
        },
        style,
      ]}
      activeOpacity={0.7}
      disabled={isDisabled}
    >
      {isLoading ? (
        <ActivityIndicator color={loadingIndicatorColor || "#fff"} />
      ) : (
        <ThemedText style={[styles.text, textStyle]}>
          {children ?? title}
        </ThemedText>
      )}
    </TouchableOpacity>
  );
};

export default Button;

const styles = StyleSheet.create({
  button: {
    width: "100%",
    height: 50,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  textButton: {
    backgroundColor: "red !important",
  },
  text: {
    color: "#FEFEFE",
    fontWeight: "600",
    fontSize: 16,
  },
});
