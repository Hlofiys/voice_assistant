// hooks/useLocationPermission.ts
import { useEffect, useState, useCallback, useRef } from "react";
import * as Location from "expo-location";
import * as Linking from "expo-linking";
import { useAlert } from "@/context/providers/portal.modal/AlertProvider";

export type Coordinates = {
  latitude: number;
  longitude: number;
};

export const useLocationPermission = () => {
  const { showAlert } = useAlert();
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const modalShownRef = useRef(false);

  const checkPermission = useCallback(async () => {
    const { status } = await Location.getForegroundPermissionsAsync();

    if (status === "granted") {
      setHasPermission(true);
      return;
    }

    const { status: requestStatus } =
      await Location.requestForegroundPermissionsAsync();

    if (requestStatus === "granted") {
      setHasPermission(true);
    } else {
      setHasPermission(false);

      // Показываем модалку только один раз
      if (!modalShownRef.current) {
        modalShownRef.current = true;

        showAlert({
          title: "Геопозиция отключена",
          subtitle:
            "Геопозиция нужна для работы всех функций. Включите доступ в настройках.",
          buttons: [
            {
              text: "Отмена",
              style: "cancel",
            },
            {
              text: "Настройки",
              onPress: () => Linking.openSettings(),
              style: "default",
            },
          ],
        });
      }
    }
  }, [showAlert]);

  useEffect(() => {
    checkPermission();
  }, [checkPermission]);

  const getLocation = useCallback(async (): Promise<Coordinates | null> => {
    if (hasPermission !== true) return null;

    try {
      const location = await Location.getCurrentPositionAsync({});
      return {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      };
    } catch (err) {
      console.warn("Ошибка при получении координат:", err);
      return null;
    }
  }, [hasPermission]);

  return { hasPermission, getLocation };
};
