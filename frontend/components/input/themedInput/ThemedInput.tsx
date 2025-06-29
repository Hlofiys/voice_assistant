import {
  View,
  StyleSheet,
  TextInput,
  TextInputProps,
  TouchableOpacity,
  Platform,
} from "react-native";
import { FC, useMemo, useState } from "react";
import { ThemedText } from "../../ThemedText";
import { IconSymbol } from "../../ui/IconSymbol";
import { useRouter } from "expo-router";

type TThemedInputProps = TextInputProps & {
  label?: string;
  isShowForgotPassword?: boolean;
  error?: string;
  touched?: boolean;
  isPassword?: boolean;
};
const ThemedInput: FC<TThemedInputProps> = (props) => {
  const {
    label,
    error,
    touched,
    isShowForgotPassword,
    isPassword,
    ...inputProps
  } = props;

  const showError = useMemo(() => touched && !!error, [touched, error]);
  const [isSecurity, setIsSecurity] = useState<boolean>(isPassword || false);

  const router = useRouter();

  return (
    <View
      style={styles.themedInputContainer}
      key={isSecurity ? "password" : "text"}
    >
      <View style={styles.labelContainer}>
        {label && <ThemedText>{label}</ThemedText>}
        {isShowForgotPassword && (
          <ThemedText
            type="link"
            onPress={() => router.push("/forgotpassword")}
          >
            Забыл пароль
          </ThemedText>
        )}
      </View>

      <View style={styles.positionRelativeIcon}>
        {isPassword && (
          <TouchableOpacity
            style={styles.eyeSlash}
            onPress={() => setIsSecurity((pre) => !pre)} // баг смены типа с пароля на простой текст
          >
            <IconSymbol
              name={isSecurity ? "eye.slash" : "eye"}
              size={25}
              weight="medium"
              color={"#BABABA"}
              style={styles.eyeSlash}
            />
          </TouchableOpacity>
        )}
        <TextInput
          // key={isSecurity ? "secure" : "visible"}
          style={styles.input}
          placeholderTextColor={"#BABABA"}
          // color="black"
          scrollEnabled={false}
          secureTextEntry={isSecurity}
          onBlur={inputProps.onBlur}
          {...inputProps}
        />
      </View>
      {!!showError && (
        <View style={styles.error}>
          <IconSymbol
            name="exclamationmark.triangle.fill"
            size={14}
            weight="medium"
            color={"#EA2A2A"}
          />
          <ThemedText type="link" style={styles.errorMessage}>
            {error}
          </ThemedText>
        </View>
      )}
    </View>
  );
};

export default ThemedInput;

const styles = StyleSheet.create({
  themedInputContainer: {
    width: "100%",
    display: "flex",
    position: "relative",
    gap: 4,
  },
  labelContainer: {
    width: "100%",
    display: "flex",
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  positionRelativeIcon: {
    width: "100%", // это важно
    position: "relative",
    display: "flex",
    justifyContent: "center",
  },
  eyeSlash: {
    position: "absolute",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    right: 7,
    zIndex: 99,
    margin: 0,
    padding: 0,
  },
  input: {
    width: "100%",
    height: 44,
    backgroundColor: "#F5F5F5",
    color: "black",
    textAlignVertical: "center",
    fontFamily: (Platform.OS === "android" && "System") || undefined,
    paddingVertical: 12,
    paddingLeft: 12,
    paddingRight: 40,
    borderBlockColor: "red",
    flexShrink: 1,
    flexGrow: 0,
    flexBasis: "auto",
    borderRadius: 10,
  },
  error: {
    position: "absolute",
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
    padding: 0,
    margin: 0,
    bottom: -27,
    gap: 4,
  },
  errorMessage: {
    fontSize: 13,
    color: "#EA2A2A",
  },
});
