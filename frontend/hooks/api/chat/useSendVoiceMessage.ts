import { DefaultApi } from "@/api";
import { useAxiosConfiguration } from "@/config/api.config/ApiConfig";
import { useErrorHook } from "@/hooks/gen/error/useErrorHook";
import ChatService from "@/services/chat/Chat.service";
import { useMutation } from "@tanstack/react-query";

export const useSendVoiceMessage = () => {
  // const config = useAxiosConfiguration();
  // const instance = new DefaultApi(config);
  const { onError } = useErrorHook(["sendVoiceMessage"]);
  return useMutation({
    mutationKey: ["sendVoiceMessage"],
    mutationFn: ChatService.chat,
    onSuccess: (data) => console.log(data.data.text),
    onError,
  });
};
