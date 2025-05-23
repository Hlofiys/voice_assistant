import { View, Text, StyleSheet } from "react-native";
import React from "react";
import VoiceRecorderPanel from "@/components/record/VoiceRecorderPanel";

const record = () => {
  return (
    <View style={styles.recordingContainer}>
      <Text style={styles.text}>record</Text>

      <VoiceRecorderPanel />
    </View>
  );
};

export default record;
const styles = StyleSheet.create({
  recordingContainer: {
    height: "100%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  text: {
    color: "red",
  },
});
