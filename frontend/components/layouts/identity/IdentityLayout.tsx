import { View, StyleSheet, TouchableOpacity } from "react-native";
import React, { FC } from "react";
import { IconSymbol } from "@/components/ui/IconSymbol";
import { ThemedText } from "@/components/ThemedText";
import { useRouter } from "expo-router";
import { IWithChildren } from "@/interfaces/IWithChildren";

interface IIdentityLayout extends IWithChildren {
  header: string;
  subtitle?: string;
}
const IdentityLayout: FC<IIdentityLayout> = (props) => {
  const { header, subtitle, children } = props;
  const router = useRouter();

  return (
    <View style={styles.authContainer}>
      <TouchableOpacity style={styles.backButton} onPress={router.back}>
        <IconSymbol
          name="chevron.left"
          size={20}
          weight="medium"
          color={"0a7ea4"}
          style={styles.icon}
        />
      </TouchableOpacity>
      <View style={styles.textComponent}>
        <ThemedText type="title" style={styles.header}>
          {header}
        </ThemedText>
        {subtitle && (
          <ThemedText type="subtitle" style={styles.subtitle}>
            {subtitle}
          </ThemedText>
        )}
      </View>
      {children}
    </View>
  );
};

export default IdentityLayout;

const styles = StyleSheet.create({
  authContainer: {
    flex: 1,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    padding: 10,
    gap: 32,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: "50%",
    backgroundColor: "#292D32",
    position: "absolute",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    top: 50,
    left: 28,
  },
  icon: {
    display: "flex",
    alignItems: "center",
    zIndex: 99,
    margin: 0,
    padding: 0,
  },
  textComponent: {
    flex: 0.35,
    display: "flex",
    gap: 20,
  },
  header: {
    textAlign: "center",
  },
  subtitle: {
    textAlign: "center",
    fontSize: 17,
    opacity: .6
  },
});
