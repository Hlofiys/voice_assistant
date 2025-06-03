import { useSendVoiceMessage } from "@/hooks/api/chat/useSendVoiceMessage";
import * as FileSystem from "expo-file-system";
import { useAlert } from "@/context/providers/portal.modal/AlertProvider";
import { IChatProps } from "@/services/chat/Chat.service";
import { AxiosResponse } from "axios";
import { Chat200Response } from "@/interfaces/chat/Chat.interface";
import { useSession } from "../gen/session/useSession";
import { Coordinates } from "../geolocation/useLocationPermission";

export const useSendHandler = (file: string) => {
  const { showAlert } = useAlert();
  const { mutateAsync: send_message, isPending } = useSendVoiceMessage();
  const { sessionId } = useSession();

  const handleSend = async (
    location?: Coordinates,
    onSuccess?: (
      data: AxiosResponse<Chat200Response, any>,
      variables: IChatProps,
      context: unknown
    ) => void
  ) => {
    if (!file) {
      showAlert({ title: "Ошибка", subtitle: "Нет файла для отправки" });
      return;
    }

    const info = await FileSystem.getInfoAsync(file);
    if (!info.exists) {
      showAlert({ title: "Ошибка", subtitle: "Файл не найден." });
      return;
    }

    const props: IChatProps = {
      fileUri: info.uri,
      fileName: "recording.m4a",
      mimeType: "audio/mp4",
      session_id: sessionId ?? undefined,
      location,
    };
    console.log("file: ", props);
    await send_message(props, { onSuccess });
  };

  return { handleSend, isPending };
};
