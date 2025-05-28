import React, { useState } from "react";
import { View, TouchableOpacity, Text, StyleSheet } from "react-native";
import { MotiView, AnimatePresence } from "moti";

export default function DropletSplitButton() {
  const [expanded, setExpanded] = useState(false);

  return (
    <View>
      {/* Основная кнопка */}
      <TouchableOpacity
        onPress={() => setExpanded(!expanded)}
        activeOpacity={0.8}
      >
        <MotiView
          from={{ scale: 1 }}
          animate={{ scale: expanded ? 0.8 : 1 }}
          transition={{ type: "spring", damping: 10, stiffness: 150 }}
          style={{
            width: 80,
            height: 80,
            borderRadius: 40,
            backgroundColor: "#23e70a",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 2,
          }}
        >
          <Text style={{ color: "white", fontWeight: "bold" }}>+</Text>
        </MotiView>
      </TouchableOpacity>

      {/* Левая и правая кнопки */}
      <AnimatePresence>
        {expanded && (
          <>
            <MotiView
              from={{ translateX: 0, opacity: 0, scale: 0 }}
              animate={{ translateX: -100, opacity: 1, scale: 1 }}
              exit={{ translateX: 0, opacity: 0, scale: 0 }}
              transition={{ type: "spring", damping: 12, stiffness: 120 }}
              style={styles.splitButtonStyle}
            >
              <Text style={{ color: "white" }}>A</Text>
            </MotiView>

            <MotiView
              from={{ translateX: 0, opacity: 0, scale: 0 }}
              animate={{ translateX: 100, opacity: 1, scale: 1 }}
              exit={{ translateX: 0, opacity: 0, scale: 0 }}
              transition={{ type: "spring", damping: 12, stiffness: 120 }}
              style={styles.splitButtonStyle}
            >
              <Text style={{ color: "white" }}>B</Text>
            </MotiView>
          </>
        )}
      </AnimatePresence>
    </View>
  );
}

const styles= StyleSheet.create({
    splitButtonStyle: {
      position: "absolute" as const,
      top: "50%",
      marginTop: -40,
      width: 60,
      height: 60,
      borderRadius: 30,
      backgroundColor: "#23e70a",
      justifyContent: "center",
      alignItems: "center",
      zIndex: 1,
    }
})

