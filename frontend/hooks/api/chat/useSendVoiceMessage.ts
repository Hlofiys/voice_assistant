import { useErrorHook } from "@/hooks/gen/error/useErrorHook";
import { useSession } from "@/hooks/gen/session/useSession";
import ChatService, { IChatProps } from "@/services/chat/Chat.service";
import { useMutation } from "@tanstack/react-query";
import { AxiosError } from "axios";

export const useSendVoiceMessage = () => {
  const { onError } = useErrorHook(["sendVoiceMessage"]);
  const { saveSession } = useSession();
  const mutation = useMutation({
    mutationKey: ["sendVoiceMessage"],
    mutationFn: ChatService.chat,
    onSuccess: (data) => {
      console.log("data: ", data.data);
      !!data.data.session_id && saveSession(data.data.session_id);
    },
    onError: (err: AxiosError, variables: IChatProps) => {
      onError(err, async () => {
        await mutation.mutateAsync(variables);
      });
    },
  });
  return mutation;
};
