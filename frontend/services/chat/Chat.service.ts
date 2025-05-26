import { instance } from "@/config/api.config/ApiConfig";

export interface IChatProps {
  fileUri: string;
  fileName: string;
  mimeType: string;
}
class ChatService {
  async chat(props: IChatProps) {
    const { fileUri, fileName, mimeType } = props;
    const formData = new FormData();
    formData.append("audio", {
      uri: fileUri,
      name: fileName,
      type: mimeType,
    } as any); // as any из-за типизации FormData в TS и React Native
    return instance.post("/chat", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
        Accept: "application/json",
      },
    });
  }
}

export default new ChatService();
