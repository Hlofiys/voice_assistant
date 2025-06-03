import { useMutation } from "@tanstack/react-query";
import { AxiosError } from "axios";
import AuthService from "@/services/auth/Auth.service";
import { useAlert } from "@/context/providers/portal.modal/AlertProvider";
import { useRouter } from "expo-router";

export const useLogin = () => {
  const { showAlert } = useAlert();
  const router = useRouter();

  return useMutation({
    mutationKey: ["loginUser"],
    mutationFn: AuthService.login,
    onError: (error: AxiosError<any, any>) => {
      if (error.response?.status === 401) {
        showAlert({
          title: "Ошибка",
          subtitle: "Неверный логин или пароль",
        });
      } else if (error.response?.status === 400) {
        showAlert({
          title: "Ошибка",
          subtitle: "Пройдите подтверждение пароля",
          buttons: [
            {
              text: "Пройти",
              onPress: () => {
                router.push("/(identity)/setpassword");
              },
            },
          ],
        });
      }
    },
  });
};
