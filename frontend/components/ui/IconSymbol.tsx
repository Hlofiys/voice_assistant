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
  | "paperplane.fill"
  | "chevron.left.forwardslash.chevron.right"
  | "chevron.right"
  | "chevron.left"
  | "arrow.left.corner"; // добавили новую иконку

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
  "paperplane.fill": "send",
  "chevron.left.forwardslash.chevron.right": "code",
  "chevron.right": "chevron-right",
  "chevron.left": "chevron-left",
  // стрелка влево уголком не имеет прямого аналога, оставим пустым
  "arrow.left.corner": "" as MaterialIconName,
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
  if (name === "arrow.left.corner") {
    // Рендерим текстовый символ уголка для стрелки влево без основания
    return (
      <Text
        style={[
          {
            fontSize: size,
            color: color,
            fontWeight: "bold",
            lineHeight: size, // выравнивание по вертикали
          },
          style,
        ]}
      >
        ‹
      </Text>
    );
  }

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
