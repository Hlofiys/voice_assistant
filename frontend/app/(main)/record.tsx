import { View, StyleSheet, TouchableOpacity, Platform } from "react-native";
import MessageDisplay from "@/components/audio/MessageDisplay";
import { BlurView } from "expo-blur";
import { IconSymbol } from "@/components/ui/IconSymbol";
import { useRouter } from "expo-router";

const record = () => {
  const router = useRouter();

  return (
    <View style={styles.recordingContainer}>
      <BlurView intensity={35} tint="light" style={styles.backButton}>
        <TouchableOpacity onPress={router.back}>
          <IconSymbol
            name="chevron.left"
            size={Platform.OS === "android" ? 30 : 20}
            weight="medium"
            color={"0a7ea4"}
            style={styles.icon}
          />
        </TouchableOpacity>
      </BlurView>
      <MessageDisplay />
    </View>
  );
};

export default record;
const styles = StyleSheet.create({
  recordingContainer: {
    flex: 1,
    display: "flex",
    alignItems: "center",
    marginTop: 50,
    padding: 10,
  },
  backButton: {
    width: 40,
    height: 40,
    overflow: "hidden",
    borderRadius: "50%",
    // backgroundColor: "transparent",
    position: "absolute",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    top: 30,
    left: 10,
    zIndex: 99,
  },
  icon: {
    display: "flex",
    alignItems: "center",
    color: "#0a7ea4",
    fontWeight: 700,
    zIndex: 99,
    margin: 0,
    padding: 0,
  },
  text: {
    color: "red",
  },
});
