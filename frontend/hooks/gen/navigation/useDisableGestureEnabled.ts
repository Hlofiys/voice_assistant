import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { useCallback } from "react";

export const useDisableGestureEnabled = () => {
  const navigation = useNavigation();
  return useFocusEffect(
    useCallback(() => {
      navigation.getParent()?.setOptions({ gestureEnabled: false });

      return () => {
        navigation.getParent()?.setOptions({ gestureEnabled: true });
      };
    }, [navigation])
  );
};
