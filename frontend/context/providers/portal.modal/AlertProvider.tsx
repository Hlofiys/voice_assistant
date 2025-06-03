import { Alert } from "@/components/modal/alert/Alert";
import { createContext, useContext, useState, useCallback } from "react";

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
  const [isVisible, setIsVisible] = useState(false);
  const [params, setParams] = useState<AlertParams | null>(null);
  const [pendingParams, setPendingParams] = useState<AlertParams | null>(null);

  const showAlert = useCallback(
    (newParams: AlertParams) => {
      if (isVisible) {
        // Если уже видим, сначала закроем
        setPendingParams(newParams); // запоминаем, что надо показать после закрытия
        setIsVisible(false);
      } else {
        setParams(newParams);
        setIsVisible(true);
      }
    },
    [isVisible]
  );

  const onClose = useCallback(() => {
    setTimeout(() => {
      setIsVisible(false);
    }, 300);
  }, []);

  const onModalDismiss = useCallback(() => {
    // После того, как модал полностью скрыт
    if (pendingParams) {
      setParams(pendingParams);
      setPendingParams(null);
      setIsVisible(true);
    } else {
      setParams(null);
    }
  }, [pendingParams]);

  return (
    <AlertContext.Provider value={{ showAlert, isAlertVisible: isVisible }}>
      {children}
      {params && (
        <Alert
          visible={isVisible}
          title={params.title}
          subtitle={params.subtitle}
          buttons={params.buttons}
          onClose={onClose}
          onDismiss={onModalDismiss} // <- добавляем сюда
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
