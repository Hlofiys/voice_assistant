import { ThemedText } from "@/components/ThemedText";
import { useCallback, FC, memo } from "react";
import { Modal, View, Text, TouchableOpacity, StyleSheet } from "react-native";

interface AlertButton {
  text: string;
  onPress?: () => void;
  style?: "default" | "cancel" | "destructive";
}

interface CustomAlertProps {
  visible: boolean;
  title: string;
  subtitle?: string;
  buttons?: AlertButton[];
  onClose: () => void;
}

export const Alert: FC<CustomAlertProps> = memo(
  ({ visible, title, subtitle, buttons = [{ text: "ДА" }], onClose }) => {
    const handlePress = useCallback(
      (btn: AlertButton) => {
        onClose();
        btn.onPress?.();
      },
      [onClose]
    );

    return (
      <Modal
        transparent
        animationType="fade"
        visible={visible}
        onRequestClose={onClose}
      >
        <View style={styles.overlay}>
          <View style={styles.alertBox}>
            <View style={styles.header}>
              <ThemedText style={styles.title} key={title}>
                {title}
              </ThemedText>
              {subtitle ? (
                <ThemedText style={styles.subtitle} key={subtitle}>
                  {subtitle}
                </ThemedText>
              ) : null}
            </View>

            <View style={styles.buttonContainer}>
              {buttons.map((btn, idx) => (
                <TouchableOpacity
                  key={idx}
                  onPress={() => handlePress(btn)}
                  style={[
                    styles.button,
                    btn.style === "cancel" && styles.cancelButton,
                    btn.style &&
                      ["destructive", "default"].includes(btn.style) &&
                      styles.destructiveButton,
                  ]}
                >
                  <Text
                    style={[
                      styles.buttonText,
                      btn.style === "cancel" && styles.cancelButtonText,
                      btn.style &&
                        ["destructive", "default"].includes(btn.style) &&
                        styles.destructiveButtonText,
                    ]}
                  >
                    {btn.text}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      </Modal>
    );
  }
);

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
  },
  alertBox: {
    width: "75%",
    // maxWidth: "90%",
    backgroundColor: "#1e1e1e",
    borderRadius: 16,
    overflow: "hidden",
    display: "flex",
    alignItems: "stretch",
    // gap: 20,
  },
  header: {
    display: "flex",
    padding: 20,
    gap: 5,
  },
  title: {
    fontSize: 17,
    lineHeight: 20,
    color: "#fff",
    fontWeight: "600",
    textAlign: "center",
  },
  subtitle: {
    fontSize: 13,
    lineHeight: 15,
    color: "#ccc",
    textAlign: "center",
  },
  buttonContainer: {
    width: "100%",
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  button: {
    flex: 1,
    borderTopWidth: 0.4,
    borderColor: "gray",
    paddingVertical: 12.5,
    alignItems: "center",
    // backgroundColor: "#B0BEC5",
  },
  cancelButton: {
    borderRightWidth: 0.2,
    borderRightColor: "gray",
  },
  destructiveButton: {
    borderLeftWidth: 0.2,
    borderLeftColor: "gray",
  },
  buttonText: {
    color: "#A0CFFF",
    fontSize: 16,
    fontWeight: 600,
  },
  cancelButtonText: { color: "#A0CFFF" },
  destructiveButtonText: { color: "#FF3B30" },
});
