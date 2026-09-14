import { useTranslation } from "react-i18next";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import { ShieldCheck } from "lucide-react";
import { loginThunk } from "../store/auth/authThunks";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import { loginSchema } from "../validations/authValidation";
import toast from "../utilities/toast";
import Button from "../components/ui/Button";
import Input from "../components/ui/Input";
import type { LoginRequest } from "../types/auth";

export default function LoginPage() {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const { loading } = useAppSelector((s) => s.auth);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginRequest>({
    resolver: yupResolver(loginSchema),
    defaultValues: { userName: "", password: "" },
  });

  const onSubmit = async (data: LoginRequest) => {
    try {
      const { user } = await dispatch(loginThunk(data)).unwrap();
      toast.success(`Welcome back, ${user.userName}!`);
    } catch (message) {
      toast.error(typeof message === "string" ? message : "Invalid username or password.");
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left panel — branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-linear-to-br from-primary-600 via-primary-500 to-primary-700 items-center justify-center p-12">
        <div className="max-w-md text-white">
          <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center mb-8">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <h1 className="text-4xl font-bold mb-4 leading-tight">
            Inner Eye
            <br />
            Document Management
          </h1>
          <p className="text-primary-100 text-lg leading-relaxed">
            Securely manage, track, and approve documents across your organization.
          </p>
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12 bg-surface-100">
        <div className="w-full max-w-sm">
          <div className="lg:hidden flex items-center gap-2.5 mb-10">
            <div className="w-10 h-10 rounded-xl bg-primary-500 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold text-gray-900">{t("app.name")}</span>
          </div>

          <h2 className="text-2xl font-bold text-gray-900 mb-1">{t("auth.welcome")}</h2>
          <p className="text-gray-500 text-sm mb-8">{t("auth.subtitle")}</p>

          <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
            <Input
              label={t("auth.userName")}
              type="text"
              autoComplete="username"
              placeholder={t("auth.userNamePlaceholder")}
              error={errors.userName?.message}
              {...register("userName")}
            />
            <Input
              label={t("auth.password")}
              type="password"
              autoComplete="current-password"
              placeholder="••••••••"
              error={errors.password?.message}
              {...register("password")}
            />
            <Button type="submit" loading={loading} className="w-full">
              {t("auth.login")}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
