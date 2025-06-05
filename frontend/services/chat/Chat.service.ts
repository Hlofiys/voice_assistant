import { instance } from "@/config/api.config/ApiConfig";
import { Coordinates } from "@/hooks/geolocation/useLocationPermission";
import { Chat200Response } from "@/interfaces/chat/Chat.interface";
import { AxiosResponse } from "axios";

export interface IChatProps {
  fileUri: string;
  fileName: string;
  mimeType: string;
  session_id?: string;
  location?: Coordinates;
}
class ChatService {
  async chat(props: IChatProps): Promise<AxiosResponse<Chat200Response, any>> {
    const { fileUri, fileName, mimeType, session_id, location } = props;
    const formData = new FormData();
    formData.append("audio", {
      uri: fileUri,
      name: fileName,
      type: mimeType,
    } as any); // as any из-за типизации FormData в TS и React Native
    session_id && formData.append("session_id", session_id);
    location?.latitude &&
      formData.append("latitude", location.latitude.toString());
    location?.longitude &&
      formData.append("longitude", location.longitude.toString());

    console.log("📤 Отправляем файл:", {
      fileUri,
      fileName,
      mimeType,
      session_id,
      latitude: location?.latitude,
      longitude: location?.longitude,
    });

    return instance.post("/chat", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
        Accept: "application/json",
      },
      // timeout: 10000,
    });
  }
}

export default new ChatService();
