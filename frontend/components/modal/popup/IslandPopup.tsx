import Checkbox from "@/components/input/checkbox/Checkbox";
import { ThemedText } from "@/components/ThemedText";
import React, { useEffect } from "react";
import { View, Platform, Dimensions, StyleSheet } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type Rule = {
  name: string;
  completed: boolean;
};

type IslandPopupProps = {
  visible: boolean;
  rules: Rule[];
};

export const IslandPopup: React.FC<IslandPopupProps> = ({ visible, rules }) => {
  const insets = useSafeAreaInsets();

  const opacity = useSharedValue(0);
  const translateY = useSharedValue(-50);
  const scale = useSharedValue(0.8);

  useEffect(() => {
    if (visible) {
      opacity.value = withTiming(1, { duration: 300 });
      translateY.value = withTiming(0, {
        duration: 400,
        easing: Easing.out(Easing.exp),
      });
      scale.value = withTiming(1, { duration: 400 });
    } else {
      opacity.value = withTiming(0, { duration: 200 });
      translateY.value = withTiming(-50, { duration: 200 });
      scale.value = withTiming(0.95, { duration: 200 });
    }
  }, [visible]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }, { scale: scale.value }],
  }));

  const popupWidth =
    Platform.OS === "ios" ? "100%" : Dimensions.get("window").width - 40;

  return (
    <Animated.View
      pointerEvents={visible ? "auto" : "none"}
      style={[
        styles.popupContainer,
        {
          top: insets.top,
          width: popupWidth,
        },
        animatedStyle,
      ]}
    >
      {rules.map((rule, index) => (
        <RuleItem key={index} label={rule.name} completed={rule.completed} />
      ))}
    </Animated.View>
  );
};

const RuleItem = ({
  label,
  completed,
}: {
  label: string;
  completed: boolean;
}) => {
  const lineAnim = useSharedValue(completed ? 1 : 0);

  useEffect(() => {
    lineAnim.value = withTiming(completed ? 1 : 0, {
      duration: 300,
      easing: Easing.out(Easing.ease),
    });
  }, [completed]);

  return (
    <View style={styles.ruleItemContainer}>
      <Checkbox
        readOnly
        checked={completed}
        styleBlocks={{ container: { width: "auto" } }}
      />
      <ThemedText style={[styles.ruleText, completed && styles.ruleCompleted]}>
        {label}
      </ThemedText>
    </View>
  );
};

const styles = StyleSheet.create({
  popupContainer: {
    position: "absolute",
    alignSelf: "center",
    backgroundColor: "#111",
    borderRadius: 15,
    paddingVertical: 12,
    paddingHorizontal: 20,
    zIndex: 1000,
    shadowColor: "#000",
    shadowOpacity: 0.3,
    shadowRadius: 10,
  },
  ruleItemContainer: {
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginVertical: 6,
  },
  ruleText: {
    fontSize: 17,
    color: "#fff",
  },
  ruleCompleted: {
    color: "#aaa",
  },
});
