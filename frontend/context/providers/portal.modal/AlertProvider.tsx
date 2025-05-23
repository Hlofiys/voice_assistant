import { Alert } from "@/components/modal/alert/Alert";
import React, { createContext, useContext, useState, useCallback } from "react";

type AlertParams = {
  title: string;
  subtitle?: string;
  buttons?: {
    text: string;
    onPress?: () => void;
    style?: "default" | "cancel" | "destructive";
  }[];
};

type AlertContextType = {
  showAlert: (params: AlertParams) => void;
  isAlertVisible: boolean;
};

const AlertContext = createContext<AlertContextType | undefined>(undefined);

export const AlertProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [visible, setVisible] = useState(false);
  const [params, setParams] = useState<AlertParams | null>(null);

  const showAlert = useCallback(
    (newParams: AlertParams) => {
      if (visible) return; // 🛑 Не открываем второй алерт
      setParams(newParams);
      setVisible(true);
    },
    [visible]
  );

  const onClose = useCallback(() => {
    setVisible(false);
    setTimeout(() => setParams(null), 300); // чуть позже убираем параметры
  }, []);

  return (
    <AlertContext.Provider value={{ showAlert, isAlertVisible: visible }}>
      {children}
      {params && (
        <Alert
          visible={visible}
          title={params.title}
          subtitle={params.subtitle}
          buttons={params.buttons}
          onClose={onClose}
        />
      )}
    </AlertContext.Provider>
  );
};

export const useAlert = (): AlertContextType => {
  const context = useContext(AlertContext);
  if (!context) {
    throw new Error("useAlert must be used within an AlertProvider");
  }
  return context;
};
