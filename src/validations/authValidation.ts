import * as yup from "yup";
import type { LoginRequest } from "../types/auth";

export const loginSchema: yup.ObjectSchema<LoginRequest> = yup.object({
  userName: yup.string().trim().required("Username is required"),
  password: yup.string().required("Password is required").min(6, "Password must be at least 6 characters"),
});
