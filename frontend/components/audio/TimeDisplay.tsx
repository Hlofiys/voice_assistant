import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { AnimatePresence, MotiView } from "moti";

interface TimeDisplayProps {
  time?: string; // Может быть пустым
  visible: boolean; // Управляет видимостью (отображение/скрытие)
}

export const TimeDisplay: React.FC<TimeDisplayProps> = ({ time, visible }) => {
  return (
    <AnimatePresence>
      {visible && time && (
        <MotiView
          from={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.8 }}
          transition={{
            type: "timing",
            duration: 300,
          }}
          style={styles.container}
        >
          <Text style={styles.timeText}>{time}</Text>
        </MotiView>
      )}
    </AnimatePresence>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: "#0a7ea4",
    borderRadius: 12,
    alignSelf: "center",
    minWidth: 140,
  },
  timeText: {
    color: "#ffffff",
    fontSize: 28,
    fontWeight: "bold",
    fontVariant: ["tabular-nums"],
    textAlign: "center",
    letterSpacing: 1,
  },
});
