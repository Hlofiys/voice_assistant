import { ThemedText } from "@/components/ThemedText";
import React, {
  Dispatch,
  FC,
  SetStateAction,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  View,
  TextInput,
  StyleSheet,
  Keyboard,
  NativeSyntheticEvent,
  TextInputFocusEventData,
  TouchableOpacity,
} from "react-native";

const CODE_LENGTH = 6;

interface ICodeInputProps {
  code: string[];
  onChange: Dispatch<SetStateAction<string[]>>;
  gap?: number;
}
const CodeInput: FC<ICodeInputProps> = (props) => {
  const { code, onChange, gap = 16 } = props;
  // const [localCode, setLocalCode] = useState(code);
  const inputsRef = useRef<(TextInput | null)[]>([]);

  // вызываем onChange при изменении localCode, но не внутри setState!
  useEffect(() => onChange(code), [code, onChange]);

  const handleChange = useCallback((text: string, index: number) => {
    const cleanText = text.replace(/\D/g, "");

    if (cleanText.length > 1) {
      onChange((prev) => {
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

    onChange((prev) => {
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
        code[index] === "" &&
        index > 0
      ) {
        inputsRef.current[index - 1]?.focus();
      }
    },
    [code, inputsRef]
  );

  const handleFocus = useCallback(
    (e: NativeSyntheticEvent<TextInputFocusEventData>, index: number) => {
      const allBeforeFilled = code.slice(0, index).every((char) => char !== "");
      if (!allBeforeFilled) {
        e.preventDefault(); // попытка отменить фокус
        inputsRef.current.find((input, i) => {
          if (code[i] === "") {
            input?.focus();
            return true;
          }
          return false;
        });
      }
    },
    [code, inputsRef]
  );

  useEffect(() => {
    if (code.every((el) => el !== "")) {
      Keyboard.dismiss();
    }
  }, [code]);

  return (
    <View style={[styles.container, { gap }]}>
      <TouchableOpacity>
        <ThemedText type="subtitle" style={styles.label}>
          Введите код
        </ThemedText>
      </TouchableOpacity>

      <View style={styles.inputsContainer}>
        {code.map((digit, index) => (
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
