import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { SymbolWeight } from "expo-symbols";
import { ComponentProps } from "react";
import {
  OpaqueColorValue,
  StyleProp,
  TextStyle,
  Platform,
  Text,
} from "react-native";

type MaterialIconName = ComponentProps<typeof MaterialIcons>["name"];

type SFIconName =
  | "eye"
  | "eye.slash"
  | "exclamationmark.triangle.fill"
  | "checkmark"
  | "close"
  | "user"
  | "lock"
  | "change-circle"
  | "house.fill"
  // | "paperplane"
  | "chevron.left.forwardslash.chevron.right"
  | "chevron.right"
  | "chevron.left"
  | "arrow.left.corner"
  | "mic"
  | "repeat"
  | "pause.circle"
  | "tray.and.arrow.up.fill"
  | "play";

const MAPPING: Record<SFIconName, MaterialIconName> = {
  eye: "visibility",
  "eye.slash": "visibility-off",
  "exclamationmark.triangle.fill": "error-outline",
  checkmark: "check",
  close: "close",
  user: "person",
  lock: "lock",
  "change-circle": "change-history",
  "house.fill": "home",
  "tray.and.arrow.up.fill": "outbox",
  "chevron.left.forwardslash.chevron.right": "code",
  "chevron.right": "chevron-right",
  "chevron.left": "chevron-left",
  "arrow.left.corner": "" as MaterialIconName,
  mic: "mic",
  repeat: "repeat",
  "pause.circle": "pause",
  play: "play-arrow",
  // paperplane: 'style'
};

export function IconSymbol({
  name,
  size = 24,
  color = "#000",
  style,
  weight,
}: {
  name: SFIconName;
  size?: number;
  color?: string | OpaqueColorValue;
  style?: StyleProp<TextStyle>;
  weight?: SymbolWeight;
}) {

  const materialName = MAPPING[name];

  if (__DEV__ && !materialName) {
    console.warn(
      `[IconSymbol] No MaterialIcon mapping found for SF Symbol: "${name}". Please update the MAPPING.`
    );
  }

  return (
    <MaterialIcons
      name={materialName || "help-outline"}
      size={size}
      color={color}
      style={style}
    />
  );
}
