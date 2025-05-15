import React, { FC, useState } from "react";
import {
  View,
  TouchableOpacity,
  StyleSheet,
  GestureResponderEvent,
} from "react-native";
import { ThemedText } from "@/components/ThemedText";
import { IconSymbol } from "@/components/ui/IconSymbol"; // если есть иконки

type CheckboxProps = {
  label?: string;
  checked?: boolean;
  onChange?: (checked: boolean) => void;
  disabled?: boolean;
};

const Checkbox: FC<CheckboxProps> = ({
  label,
  checked: controlledChecked,
  onChange,
  disabled,
}) => {
  // Если передан controlled checked - используем его, иначе локальный стейт
  const [internalChecked, setInternalChecked] = useState(false);
  const checked = controlledChecked ?? internalChecked;

  const toggleCheckbox = (event: GestureResponderEvent) => {
    if (disabled) return;
    const newChecked = !checked;
    if (onChange) onChange(newChecked);
    if (controlledChecked === undefined) setInternalChecked(newChecked);
  };

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={toggleCheckbox}
      style={styles.container}
      disabled={disabled}
    >
      <View
        style={[
          styles.checkbox,
          checked && styles.checked,
          disabled && styles.disabled,
        ]}
      >
        {checked && (
          <IconSymbol
            name="checkmark"
            size={16}
            color="#fff"
            style={{ alignSelf: "center" }}
          />
        )}
      </View>
      {label && <ThemedText style={styles.label}>{label}</ThemedText>}
    </TouchableOpacity>
  );
};

export default Checkbox;

const styles = StyleSheet.create({
  container: {
    width: '90%',
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: "#777",
    justifyContent: "center",
    backgroundColor: "transparent",
  },
  checked: {
    backgroundColor: "#0a7ea4",
    borderColor: "#0a7ea4",
  },
  disabled: {
    borderColor: "#ccc",
    backgroundColor: "#eee",
  },
  label: {
    fontSize: 16,
  },
});
