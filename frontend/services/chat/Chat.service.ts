import { instance } from "@/config/api.config/ApiConfig";
import { Chat200Response } from "@/interfaces/chat/Chat.interface";
import { AxiosResponse } from "axios";

export interface IChatProps {
  fileUri: string;
  fileName: string;
  mimeType: string;
  session_id?: string;
}
class ChatService {
  async chat(props: IChatProps): Promise<AxiosResponse<Chat200Response, any>> {
    const { fileUri, fileName, mimeType, session_id } = props;
    const formData = new FormData();
    formData.append("audio", {
      uri: fileUri,
      name: fileName,
      type: mimeType,
    } as any); // as any из-за типизации FormData в TS и React Native
    session_id && formData.append("session_id", session_id);
    return instance.post("/chat", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
        Accept: "application/json",
      },
    });
  }
}

export default new ChatService();
