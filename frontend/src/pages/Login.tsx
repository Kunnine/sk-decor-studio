import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Lock, Mail, ArrowRight, ShieldCheck, AlertCircle } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";

const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

type LoginFormData = z.infer<typeof loginSchema>;

export const Login: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSubmit = async (data: LoginFormData) => {
    try {
      setIsSubmitting(true);
      setErrorMessage(null);
      await login(data);
      navigate("/products");
    } catch (err: any) {
      const msg =
        err.response?.data?.message ||
        err.response?.data?.errors?.email?.[0] ||
        "Authentication failed. Please verify your email and password.";
      setErrorMessage(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDemoFill = (roleEmail: string) => {
    setValue("email", roleEmail);
    setValue("password", "Password123!");
    setErrorMessage(null);
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <div className="w-12 h-12 rounded-lg bg-[#4338CA] text-white flex items-center justify-center font-bold text-xl">
            IS
          </div>
        </div>
        <h2 className="mt-4 text-center text-xl font-bold tracking-tight text-slate-900">
          Sign in to your account
        </h2>
        <p className="mt-1 text-center text-xs text-slate-500">
          Inventory & Sales Management Platform
        </p>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 border border-slate-200 rounded-lg sm:px-10">
          {errorMessage && (
            <div className="mb-5 p-3 rounded-lg border border-slate-800 bg-slate-50 flex items-start gap-2.5 text-slate-900 text-xs">
              <AlertCircle className="w-4 h-4 text-slate-900 shrink-0 mt-0.5" />
              <div className="font-semibold leading-relaxed">
                {errorMessage}
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <Input
              label="Email address"
              type="email"
              autoComplete="email"
              placeholder="user@inventory.test"
              error={errors.email?.message}
              {...register("email")}
            />

            <Input
              label="Password"
              type="password"
              autoComplete="current-password"
              placeholder="••••••••••••"
              error={errors.password?.message}
              {...register("password")}
            />

            <Button
              type="submit"
              variant="primary"
              className="w-full mt-2"
              isLoading={isSubmitting}
              rightIcon={<ArrowRight className="w-4 h-4" />}
            >
              Sign in
            </Button>
          </form>

          {/* Quick Demo Fill Buttons */}
          <div className="mt-6 pt-5 border-t border-slate-200">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 text-center mb-3">
              One-click demo credentials
            </p>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => handleDemoFill("admin@inventory.test")}
                className="py-1.5 px-2 text-xs font-semibold rounded border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-800 text-center transition-colors"
              >
                Admin
              </button>
              <button
                type="button"
                onClick={() => handleDemoFill("manager@inventory.test")}
                className="py-1.5 px-2 text-xs font-semibold rounded border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-800 text-center transition-colors"
              >
                Manager
              </button>
              <button
                type="button"
                onClick={() => handleDemoFill("cashier@inventory.test")}
                className="py-1.5 px-2 text-xs font-semibold rounded border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-800 text-center transition-colors"
              >
                Cashier
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
