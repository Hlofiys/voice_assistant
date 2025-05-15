import { ThemedText } from "@/components/ThemedText";
import React, { useEffect, useRef, useState } from "react";
import {
  View,
  TextInput,
  StyleSheet,
  Text,
  TouchableWithoutFeedback,
  Keyboard,
} from "react-native";

const CODE_LENGTH = 6;

export default function CodeInput() {
  const [code, setCode] = useState(Array(CODE_LENGTH).fill("")); // ["", "", "", ...]
  const inputsRef = useRef<(TextInput | null)[]>([]);

  const handleChange = (text: string, index: number) => {
    // фильтруем только цифры
    const cleanText = text.replace(/\D/g, "");
    const newCode = [...code];

    if (cleanText.length > 1) {
      // пользователь вставил сразу несколько символов
      const chars = cleanText.split("").slice(0, CODE_LENGTH);
      chars.forEach((char, i) => {
        newCode[i] = char;
      });
      setCode(newCode);

      // сфокусировать следующее после последнего символа
      const nextIndex =
        chars.length < CODE_LENGTH ? chars.length : CODE_LENGTH - 1;
      inputsRef.current[nextIndex]?.focus();
    } else {
      // обычное поведение
      newCode[index] = cleanText;
      setCode(newCode);

      if (cleanText && index < CODE_LENGTH - 1) {
        inputsRef.current[index + 1]?.focus();
      }
    }
  };

  const handleKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === "Backspace" && code[index] === "" && index > 0) {
      inputsRef.current[index - 1]?.focus();
    }
  };

  useEffect(() => {
    code.every((el) => el !== "") && Keyboard.dismiss();
  }, [code]);

  return (
      <View style={styles.container}>
        <ThemedText type="subtitle" style={styles.label}>
          Enter Code
        </ThemedText>
        <View style={styles.inputsContainer}>
          {code.map((digit, index) => (
            <TextInput
              key={index}
              ref={(el) => {
                inputsRef.current[index] = el;
              }}
              style={styles.input}
              keyboardType="decimal-pad"
              maxLength={1}
              value={digit}
              onChangeText={(text) => handleChange(text, index)}
              onKeyPress={(e) => handleKeyPress(e, index)}
              textAlign="center"
            />
          ))}
        </View>
      </View>
  );
}

const styles = StyleSheet.create({
  container: {
    display: "flex",
    flexDirection: "column",
    gap: 16,
  },
  label: {
    width: "100%",
    textAlign: "left",
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 12,
  },
  inputsContainer: {
    width: "100%",
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    // gap: 16,
  },
  input: {
    width: 48,
    height: 44,
    borderWidth: 1,
    borderColor: "#ccc",
    color: "red",
    borderRadius: 6,
    fontSize: 20,
    fontWeight: "500",
  },
});
