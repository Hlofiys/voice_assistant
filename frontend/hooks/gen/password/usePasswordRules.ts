import { useMemo } from "react";

export interface PasswordRule {
  name: string;
  completed: boolean;
}

export const usePasswordRules = (password: string) => {
  const rules: PasswordRule[] = useMemo(
    () => [
      { name: "Минимум 8 символов", completed: password.length >= 8 },
      { name: "Заглавные буквы", completed: /[A-ZА-Я]/.test(password) },
      { name: "Цифры", completed: /\d/.test(password) },
    ],
    [password]
  );

  const isValid = useMemo(() => rules.every((rule) => rule.completed), [rules]);

  return { rules, isValid };
};
