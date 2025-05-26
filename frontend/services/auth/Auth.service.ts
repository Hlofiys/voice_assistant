import {
  ConfirmEmailRequest,
  LoginRequest,
  PasswordResetCodeRequest,
  PasswordResetWithCodeRequest,
  RefreshRequest,
  RegisterRequest,
} from "@/api";
import { instance } from "@/config/api.config/ApiConfig";

class AuthService {
  async login(body: LoginRequest) {
    return instance.post("/auth/login", body);
  }
  async register(body: RegisterRequest) {
    return instance.post("/auth/register", body);
  }
  async logout() {
    return instance.post("/auth/logout");
  }
  async refreshTokens(body: RefreshRequest) {
    return instance.post("/auth/refresh", body);
  }
  async requestPasswordResetCode(body: PasswordResetCodeRequest) {
    return instance.post("/auth/password/request-reset-code", body);
  }
  async resetPasswordWithCode(body: PasswordResetWithCodeRequest) {
    return instance.post("/auth/password/reset-with-code", body);
  }
  async confirmEmail(body: ConfirmEmailRequest) {
    return instance.post("/auth/confirm-email", body);
  }
}

export default new AuthService();
