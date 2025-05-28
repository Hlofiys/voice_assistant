import { ISessionData } from "@/hooks/gen/session/types/TSession";

export interface IInitialState {
  token: string | null;
  session: ISessionData | null;
}
