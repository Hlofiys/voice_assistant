export const SESSION_TTL_MS = 3 * 60 * 60 * 1000; // 3 часа

export interface ISessionData {
  id: string;
  createdAt: number;
}
