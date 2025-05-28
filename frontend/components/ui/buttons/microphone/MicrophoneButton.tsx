import { FC, useCallback, useEffect, useState } from "react";
import {
  View,
  TouchableOpacity,
  StyleSheet,
  TouchableOpacityProps,
  GestureResponderEvent,
  ActivityIndicator,
} from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  interpolate,
  Easing,
  withDelay,
} from "react-native-reanimated";
import { IconSymbol } from "../../IconSymbol";

const BUTTON_SIZE = 60;
const RING_SIZE = 110;

interface IMicrophoneButtonProps extends TouchableOpacityProps {
  isRecording?: boolean;
  hasRecord?: boolean;
  isLoading?: boolean;
  loadingIndicatorColor?: string;
}
export const MicrophoneButton: FC<IMicrophoneButtonProps> = (props) => {
  const {
    isRecording = false,
    hasRecord = false,
    isLoading = false,
    loadingIndicatorColor,
    ...touchableOpacityProps
  } = props;

  const ring1Progress = useSharedValue(0);
  const ring2Progress = useSharedValue(0);

  useEffect(() => {
    const config = {
      duration: 1500,
      easing: Easing.out(Easing.linear),
    };

    if (isRecording) {
      ring1Progress.value = withRepeat(withTiming(1, config), -1, false);
      ring2Progress.value = withDelay(
        500,
        withRepeat(withTiming(1, config), -1, false)
      );
    } else {
      ring1Progress.value = withTiming(0, { duration: 300 });
      ring2Progress.value = withTiming(0, { duration: 300 });
    }
  }, [isRecording]);

  const createRingStyle = (progress: typeof ring1Progress) =>
    useAnimatedStyle(() => {
      const scale = interpolate(progress.value, [0, 1], [1, 2]);
      const opacity = interpolate(progress.value, [0, 1], [0.5, 0]);

      return {
        transform: [{ scale }],
        opacity,
      };
    });

  const ring1Style = createRingStyle(ring1Progress);
  const ring2Style = createRingStyle(ring2Progress);

  return (
    <TouchableOpacity disabled={isLoading} {...touchableOpacityProps}>
      <View style={styles.wrapper}>
        <Animated.View style={[styles.ring, styles.ring1, ring1Style]} />
        <Animated.View style={[styles.ring, styles.ring2, ring2Style]} />

        <View style={styles.button}>
          {isLoading ? (
            <ActivityIndicator color={loadingIndicatorColor || "#fff"} />
          ) : (
            <IconSymbol
              name={
                hasRecord && !isRecording ? "tray.and.arrow.up.fill" : "mic"
              }
              size={32}
              color="#fff"
            />
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    width: BUTTON_SIZE,
    height: BUTTON_SIZE,
    justifyContent: "center",
    alignItems: "center",
  },
  ring: {
    position: "absolute",
    justifyContent: "center",
    alignItems: "center",
  },
  ring1: {
    width: RING_SIZE,
    height: RING_SIZE,
    borderRadius: RING_SIZE / 2,
    backgroundColor: "rgba(10, 126, 164, .3)",
  },
  ring2: {
    width: RING_SIZE / 1.25,
    height: RING_SIZE / 1.25,
    borderRadius: RING_SIZE / 2,
    backgroundColor: "rgba(10, 126, 164, .3)",
  },
  button: {
    width: BUTTON_SIZE,
    height: BUTTON_SIZE,
    backgroundColor: "rgba(10, 126, 164, .7)",
    borderRadius: BUTTON_SIZE / 2,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10,
  },
});
