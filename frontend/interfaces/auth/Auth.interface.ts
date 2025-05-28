export interface ConfirmEmailRequest {
  /**
   * @type {string}
   * @memberof ConfirmEmailRequest
   */
  email: string;

  /**
   * @type {string}
   * @memberof ConfirmEmailRequest
   */
  code: string;
}

export interface ConfirmEmailResponse {
  /**
   * JWT token
   * @type {string}
   * @memberof ConfirmEmailResponse
   */
  token: string;

  /**
   * Refresh token
   * @type {string}
   * @memberof ConfirmEmailResponse
   */
  refresh_token: string;
}

export interface LoginRequest {
  /**
   * @type {string}
   * @memberof LoginRequest
   */
  email: string;

  /**
   * @type {string}
   * @memberof LoginRequest
   */
  password: string;
}

export interface LoginResponse {
  /**
   * JWT token
   * @type {string}
   * @memberof LoginResponse
   */
  token: string;

  /**
   * Refresh token
   * @type {string}
   * @memberof LoginResponse
   */
  refresh_token: string;
}

export interface Logout200Response {
  /**
   * @type {string}
   * @memberof Logout200Response
   */
  message?: string;
}

export interface PasswordResetCodeRequest {
  /**
   * @type {string}
   * @memberof PasswordResetCodeRequest
   */
  email: string;
}

export interface PasswordResetCodeResponse {
  /**
   * @type {string}
   * @memberof PasswordResetCodeResponse
   */
  email: string;

  /**
   * @type {string}
   * @memberof PasswordResetCodeResponse
   */
  message: string;
}

export interface PasswordResetWithCodeRequest {
  /**
   * @type {string}
   * @memberof PasswordResetWithCodeRequest
   */
  email: string;

  /**
   * @type {string}
   * @memberof PasswordResetWithCodeRequest
   */
  code: string;

  /**
   * @type {string}
   * @memberof PasswordResetWithCodeRequest
   */
  new_password: string;
}

export interface PasswordResetWithCodeResponse {
  /**
   * JWT token
   * @type {string}
   * @memberof PasswordResetWithCodeResponse
   */
  token: string;

  /**
   * Refresh token
   * @type {string}
   * @memberof PasswordResetWithCodeResponse
   */
  refresh_token: string;
}

export interface RefreshRequest {
  /**
   * @type {string}
   * @memberof RefreshRequest
   */
  refresh_token: string;
}

export interface RefreshResponse {
  /**
   * JWT token
   * @type {string}
   * @memberof RefreshResponse
   */
  token: string;

  /**
   * Refresh token
   * @type {string}
   * @memberof RefreshResponse
   */
  refresh_token: string;
}

export interface RegisterRequest {
  /**
   * @type {string}
   * @memberof RegisterRequest
   */
  email: string;

  /**
   * @type {string}
   * @memberof RegisterRequest
   */
  password: string;
}

export interface RegisterResponse {
  /**
   * @type {string}
   * @memberof RegisterResponse
   */
  message: string;
}

export interface Token {
  /**
   * JWT token
   * @type {string}
   * @memberof Token
   */
  token: string;
}

export interface ValidateToken200Response {
  /**
   * @type {string}
   * @memberof ValidateToken200Response
   */
  message?: string;
}
