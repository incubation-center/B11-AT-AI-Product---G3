import { object, string } from "zod";

export const getPasswordSchema = (type: "password" | "confirmPassword") =>
  string()
    .nonempty(`${type} is required`)
    .min(8, `${type} must be at least 8 characters`)
    .max(32, `${type} can not exceed 32 characters`);

export const getEmailSchema = () =>
  string().nonempty("Email is required").email("Invalid email");

export const getNameSchema = () =>
  string()
    .nonempty("Name is required")
    .max(50, "Name must be less than 50 characters");

export const signInSchema = object({
  email: getEmailSchema(),
  password: getPasswordSchema("password"),
});

export const signUpSchema = object({
  name: getNameSchema(),
  email: getEmailSchema(),
  password: getPasswordSchema("password"),
  confirmPassword: getPasswordSchema("confirmPassword"),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

export const forgotPasswordSchema = object({
  email: getEmailSchema(),
});
