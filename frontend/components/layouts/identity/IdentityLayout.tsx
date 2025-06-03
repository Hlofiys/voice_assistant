import {
  View,
  StyleSheet,
  TouchableOpacity,
} from "react-native";
import { FC } from "react";
import { IconSymbol } from "@/components/ui/IconSymbol";
import { ThemedText } from "@/components/ThemedText";
import { useRouter } from "expo-router";
import { IWithChildren } from "@/interfaces/IWithChildren";
import { BlurView } from "expo-blur";

interface IIdentityLayout extends IWithChildren {
  header: string;
  subtitle?: string;
  hiddenBackBtn?: boolean;
}
const IdentityLayout: FC<IIdentityLayout> = (props) => {
  const { header, subtitle, hiddenBackBtn, children } = props;
  const router = useRouter();

  return (
    <View style={styles.identityContainer}>
      {!hiddenBackBtn && (
        <BlurView intensity={35} tint="light" style={styles.backButton}>
          <TouchableOpacity onPress={router.back}>
            <IconSymbol
              name="chevron.left"
              size={20}
              weight="medium"
              color={"0a7ea4"}
              style={styles.icon}
            />
          </TouchableOpacity>
        </BlurView>
      )}
      {/* <BlurView intensity={35} tint="light" style={styles.logoutBtn}>
        <TouchableOpacity onPress={router.back}>
          <IconSymbol
            name="chevron.left"
            size={20}
            weight="medium"
            color={"0a7ea4"}
            style={styles.icon}
          />
        </TouchableOpacity>
      </BlurView> */}
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
  identityContainer: {
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
    overflow: "hidden",
    borderRadius: "50%",
    // backgroundColor: "transparent",
    position: "absolute",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    top: 60,
    left: 10,
  },
  logoutBtn: {
    width: 40,
    height: 40,
    overflow: "hidden",
    borderRadius: "50%",
    // backgroundColor: "transparent",
    position: "absolute",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    top: 60,
    right: 10,
  },
  icon: {
    display: "flex",
    alignItems: "center",
    color: "#0a7ea4",
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
    opacity: 0.6,
  },
});
