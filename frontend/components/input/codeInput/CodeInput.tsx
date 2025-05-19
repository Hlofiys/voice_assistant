import { ThemedText } from "@/components/ThemedText";
import React, { FC, useCallback, useEffect, useRef, useState } from "react";
import {
  View,
  TextInput,
  StyleSheet,
  Keyboard,
  NativeSyntheticEvent,
  TextInputFocusEventData,
} from "react-native";

const CODE_LENGTH = 6;

interface ICodeInputProps {
  code: string[];
  onChange: (code: string[]) => void;
}
const CodeInput: FC<ICodeInputProps> = (props) => {
  const { code, onChange } = props;
  const [localCode, setLocalCode] = useState(code);
  const inputsRef = useRef<(TextInput | null)[]>([]);

  // вызываем onChange при изменении localCode, но не внутри setState!
  useEffect(() => {
    onChange(localCode);
  }, [localCode, onChange]);

  const handleChange = useCallback((text: string, index: number) => {
    const cleanText = text.replace(/\D/g, "");

    if (cleanText.length > 1) {
      setLocalCode((prev) => {
        const newCode = [...prev];
        const chars = cleanText.slice(0, CODE_LENGTH - index).split("");
        chars.forEach((char, i) => {
          newCode[index + i] = char;
        });

        setTimeout(() => {
          const nextIndex = Math.min(index + chars.length, CODE_LENGTH - 1);
          inputsRef.current[nextIndex]?.focus();
        }, 0);

        return newCode;
      });
      return;
    }

    setLocalCode((prev) => {
      const newCode = [...prev];
      newCode[index] = cleanText;

      setTimeout(() => {
        if (cleanText && index < CODE_LENGTH - 1) {
          inputsRef.current[index + 1]?.focus();
        }
      }, 0);

      return newCode;
    });
  }, []);

  const handleKeyPress = useCallback(
    (e: any, index: number) => {
      if (
        e.nativeEvent.key === "Backspace" &&
        localCode[index] === "" &&
        index > 0
      ) {
        inputsRef.current[index - 1]?.focus();
      }
    },
    [localCode, inputsRef]
  );

  const handleFocus = useCallback(
    (e: NativeSyntheticEvent<TextInputFocusEventData>, index: number) => {
      const allBeforeFilled = localCode
        .slice(0, index)
        .every((char) => char !== "");
      if (!allBeforeFilled) {
        e.preventDefault(); // попытка отменить фокус
        inputsRef.current.find((input, i) => {
          if (localCode[i] === "") {
            input?.focus();
            return true;
          }
          return false;
        });
      }
    },
    [localCode, inputsRef]
  );

  useEffect(() => {
    if (localCode.every((el) => el !== "")) {
      Keyboard.dismiss();
    }
  }, [localCode]);

  return (
    <View style={styles.container}>
      <ThemedText type="subtitle" style={styles.label}>
        Enter Code
      </ThemedText>

      <View style={styles.inputsContainer}>
        {localCode.map((digit, index) => (
          <TextInput
            key={index}
            ref={(el) => {
              inputsRef.current[index] = el;
            }}
            style={styles.input}
            keyboardType="number-pad"
            maxLength={CODE_LENGTH}
            value={digit}
            onChangeText={(text) => handleChange(text, index)}
            onKeyPress={(e) => handleKeyPress(e, index)}
            onFocus={(e) => handleFocus(e, index)}
            textAlign="center"
            returnKeyType="done"
          />
        ))}
      </View>
    </View>
  );
};

export default CodeInput;

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
    color: "#0a7ea4",
    borderRadius: 6,
    fontSize: 20,
    fontWeight: "500",
  },
});
