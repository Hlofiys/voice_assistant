import { useRef } from "react";
import { useMutation, UseMutationResult } from "@tanstack/react-query";
import { AxiosError, AxiosResponse } from "axios";
import ChatService, { IChatProps } from "@/services/chat/Chat.service";
import { Chat200Response } from "@/interfaces/chat/Chat.interface";
import { useErrorHook } from "@/hooks/gen/error/useErrorHook";
import { useSession } from "@/hooks/gen/session/useSession";

// 👇 Возвращаем расширенный хук с собственной обёрткой mutateAsync
export const useSendVoiceMessage = (): {
  mutateAsync: (
    variables: IChatProps,
    options?: {
      onSuccess?: (
        data: AxiosResponse<Chat200Response>,
        variables: IChatProps,
        context: unknown
      ) => void;
    }
  ) => Promise<AxiosResponse<Chat200Response>>;
  isPending: boolean;
} => {
  const { onError } = useErrorHook();
  const { saveSession } = useSession();
  const onSuccessRef = useRef<
    | ((
        data: AxiosResponse<Chat200Response>,
        variables: IChatProps,
        context: unknown
      ) => void)
    | null
  >(null);

  const mutation = useMutation({
    mutationKey: ["sendVoiceMessage"],
    mutationFn: ChatService.chat,
    onSuccess: (data, variables, context) => {
      if (data.data.session_id) {
        saveSession(data.data.session_id);
      }

      // 👉 вызываем переданный onSuccess
      onSuccessRef.current?.(data, variables, context);
    },
    onError: (err: AxiosError, variables, context) => {
      onError(err, async () => {
        // Повторный вызов мутации
        await mutation.mutateAsync(variables);
      });
    },
  });

  const mutateAsync = async (
    variables: IChatProps,
    options?: {
      onSuccess?: (
        data: AxiosResponse<Chat200Response>,
        variables: IChatProps,
        context: unknown
      ) => void;
    }
  ) => {
    onSuccessRef.current = options?.onSuccess ?? null;
    return mutation.mutateAsync(variables);
  };

  return {
    mutateAsync,
    isPending: mutation.isPending,
  };
};
