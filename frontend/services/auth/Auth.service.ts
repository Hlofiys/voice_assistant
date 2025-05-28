import { instance } from "@/config/api.config/ApiConfig";
import {
  ConfirmEmailRequest,
  ConfirmEmailResponse,
  LoginRequest,
  LoginResponse,
  PasswordResetCodeRequest,
  PasswordResetCodeResponse,
  PasswordResetWithCodeRequest,
  PasswordResetWithCodeResponse,
  RefreshRequest,
  RefreshResponse,
  RegisterRequest,
  RegisterResponse,
} from "@/interfaces/auth/Auth.interface";
import { AxiosResponse } from "axios";

class AuthService {
  async login(body: LoginRequest): Promise<AxiosResponse<LoginResponse, any>> {
    return instance.post("/auth/login", body);
  }
  async register(
    body: RegisterRequest
  ): Promise<AxiosResponse<RegisterResponse, any>> {
    return instance.post("/auth/register", body);
  }
  async logout() {
    return instance.post("/auth/logout");
  }
  async refreshTokens(
    body: RefreshRequest
  ): Promise<AxiosResponse<RefreshResponse, any>> {
    return instance.post("/auth/refresh", body);
  }
  async requestPasswordResetCode(
    body: PasswordResetCodeRequest
  ): Promise<AxiosResponse<PasswordResetCodeResponse, any>> {
    return instance.post("/auth/password/request-reset-code", body);
  }
  async resetPasswordWithCode(
    body: PasswordResetWithCodeRequest
  ): Promise<AxiosResponse<PasswordResetWithCodeResponse, any>> {
    return instance.post("/auth/password/reset-with-code", body);
  }
  async confirmEmail(
    body: ConfirmEmailRequest
  ): Promise<AxiosResponse<ConfirmEmailResponse, any>> {
    return instance.post("/auth/confirm-email", body);
  }
}

export default new AuthService();
