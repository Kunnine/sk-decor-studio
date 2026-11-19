import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  ArrowRight,
  AlertCircle,
  Eye,
  EyeOff,
  Users,
  ChevronDown,
  ShieldCheck,
  Briefcase,
  Store,
  Check,
  Info,
  X,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";

const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

type LoginFormData = z.infer<typeof loginSchema>;

interface DemoAccountItem {
  roleKey: "admin" | "manager" | "cashier";
  role: string;
  email: string;
  password: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  badgeBg: string;
  badgeText: string;
}

const DEMO_ACCOUNTS: DemoAccountItem[] = [
  {
    roleKey: "admin",
    role: "Admin",
    email: "admin@inventory.test",
    password: "Password123!",
    description: "Full access.",
    icon: ShieldCheck,
    badgeBg: "bg-[#795438]",
    badgeText: "text-white",
  },
  {
    roleKey: "manager",
    role: "Manager",
    email: "manager@inventory.test",
    password: "Password123!",
    description: "Business operations.",
    icon: Briefcase,
    badgeBg: "bg-[#A58B6F]",
    badgeText: "text-white",
  },
  {
    roleKey: "cashier",
    role: "Cashier",
    email: "cashier@inventory.test",
    password: "Password123!",
    description: "POS only.",
    icon: Store,
    badgeBg: "bg-[#D9D0C3]",
    badgeText: "text-[#292824]",
  },
];

export const Login: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isDemoDropdownOpen, setIsDemoDropdownOpen] = useState(false);
  const [selectedDemoRole, setSelectedDemoRole] = useState<string | null>(null);
  const [showRegisterInfo, setShowRegisterInfo] = useState(false);

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
      navigate("/dashboard");
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

  const handleSelectDemoAccount = (item: DemoAccountItem) => {
    setValue("email", item.email, {
      shouldValidate: true,
      shouldDirty: true,
    });
    setValue("password", item.password, {
      shouldValidate: true,
      shouldDirty: true,
    });
    setSelectedDemoRole(item.role);
    setErrorMessage(null);
  };

  return (
    <div className="relative min-h-screen bg-[#F8F6F2] flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 select-none">
      {/* Subtle Warm Decorative Background Accents */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-30" aria-hidden="true">
        {/* Top-left: Minimal architectural shelving & decor boxes lines */}
        <svg
          className="absolute -top-10 -left-10 w-80 h-80 text-[#DDD6CA]"
          viewBox="0 0 200 200"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.2"
        >
          <path d="M20 40 L180 40 M20 90 L180 90 M20 140 L180 140" strokeDasharray="3 3" />
          <path d="M40 20 L40 180 M160 20 L160 180" />
          <path d="M60 30 L80 18 L100 30 L80 42 Z" fill="#F3EDE6" />
          <path d="M60 30 L60 55 L80 67 L80 42 Z" fill="#EAE1D6" />
          <path d="M100 30 L100 55 L80 67 L80 42 Z" fill="#DDD6CA" />
        </svg>

        {/* Bottom-right: Subtle inventory pallet & minimal crate geometry */}
        <svg
          className="absolute -bottom-10 -right-10 w-80 h-80 text-[#DDD6CA]"
          viewBox="0 0 200 200"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.2"
        >
          <path d="M40 160 L160 160 M40 170 L160 170" strokeWidth="2.5" />
          <rect x="60" y="110" width="40" height="45" rx="2" fill="#F3EDE6" stroke="#DDD6CA" />
          <line x1="80" y1="110" x2="80" y2="155" stroke="#DDD6CA" />
          <rect x="105" y="90" width="45" height="65" rx="2" fill="#F3EDE6" stroke="#DDD6CA" />
          <line x1="127" y1="90" x2="127" y2="155" stroke="#DDD6CA" />
        </svg>
      </div>

      {/* Main Container */}
      <div className="relative z-10 sm:mx-auto sm:w-full sm:max-w-md select-text">
        {/* Header: Exact Maison Decor Brand Monogram & Title */}
        <div className="text-center mb-6">
          <div className="flex justify-center mb-4">
            <div className="w-12 h-12 rounded-xl bg-[#795438] text-white flex items-center justify-center font-bold text-lg tracking-wide shadow-sm">
              MD
            </div>
          </div>

          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#292824]">
            Sign in to your account
          </h1>
          <p className="mt-1 text-xs text-[#88847D] font-medium">
            Maison Decor Studio — Interior Home Decoration Management
          </p>
        </div>

        {/* Centered White Card with Soft Border & Rounded Corners */}
        <div className="bg-white py-8 px-6 border border-[#E8E3DA] rounded-2xl shadow-sm sm:px-10">
          {errorMessage && (
            <div className="mb-5 p-3 rounded-lg border border-[#292824] bg-[#F8F6F2] flex items-start gap-2.5 text-[#292824] text-xs">
              <AlertCircle className="w-4 h-4 text-[#795438] shrink-0 mt-0.5" />
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
              placeholder="e.g. user@example.com"
              required
              error={errors.email?.message}
              {...register("email")}
            />

            <Input
              label="Password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              placeholder="Enter your password"
              required
              error={errors.password?.message}
              rightElement={
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="p-1 rounded text-[#88847D] hover:text-[#292824] focus:outline-none focus:ring-1 focus:ring-[#795438]"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  title={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              }
              {...register("password")}
            />

            <Button
              type="submit"
              variant="primary"
              className="w-full mt-2 font-medium"
              isLoading={isSubmitting}
              rightIcon={<ArrowRight className="w-4 h-4" />}
            >
              Sign in
            </Button>
          </form>

          {/* Compact Demo Account Dropdown Section */}
          <div className="mt-4 pt-4 border-t border-[#E8E3DA]">
            <button
              type="button"
              onClick={() => setIsDemoDropdownOpen((prev) => !prev)}
              aria-expanded={isDemoDropdownOpen}
              aria-controls="demo-accounts-menu"
              className="w-full py-2 px-3 bg-[#F3EDE6] hover:bg-[#EAE1D6] active:bg-[#E2D9CE] text-[#795438] border border-[#E2D9CE] rounded-xl text-xs font-semibold flex items-center justify-between transition-colors focus:outline-none focus:ring-1 focus:ring-[#795438]"
            >
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-[#795438]" />
                <span>Demo Account</span>
              </div>
              <ChevronDown
                className={`w-4 h-4 text-[#795438] transition-transform duration-200 ${
                  isDemoDropdownOpen ? "rotate-180" : ""
                }`}
              />
            </button>

            {/* Expanded Dropdown Menu with 3 Demo Roles */}
            {isDemoDropdownOpen && (
              <div
                id="demo-accounts-menu"
                className="mt-2.5 p-2 bg-[#F8F6F2] border border-[#E8E3DA] rounded-xl space-y-1.5 animate-in fade-in duration-150"
              >
                <div className="px-2 pt-1 pb-1.5 flex items-center justify-between border-b border-[#E8E3DA] text-[11px]">
                  <span className="font-semibold uppercase tracking-wider text-[#88847D]">
                    Select Demo Role
                  </span>
                  <span className="text-[#88847D] text-[10px]">Click to auto-fill</span>
                </div>

                {DEMO_ACCOUNTS.map((account) => {
                  const Icon = account.icon;
                  const isSelected = selectedDemoRole === account.role;

                  return (
                    <button
                      key={account.roleKey}
                      type="button"
                      onClick={() => handleSelectDemoAccount(account)}
                      className={`w-full text-left p-2.5 rounded-lg border transition-all flex items-start gap-2.5 group focus:outline-none focus:ring-1 focus:ring-[#795438] ${
                        isSelected
                          ? "bg-[#F3EDE6] border-[#795438] ring-1 ring-[#795438]"
                          : "bg-white hover:bg-[#F3EDE6]/60 border-[#DDD6CA] hover:border-[#A58B6F]"
                      }`}
                    >
                      <div className={`p-1.5 rounded-md ${account.badgeBg} ${account.badgeText} mt-0.5 shrink-0`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-bold text-[#292824]">
                              {account.role}
                            </span>
                            <span className="text-[11px] font-medium text-[#88847D]">
                              • {account.description}
                            </span>
                          </div>
                          {isSelected ? (
                            <span className="flex items-center gap-1 text-[10px] font-semibold text-[#795438] bg-[#EAE1D6] px-1.5 py-0.5 rounded">
                              <Check className="w-3 h-3" /> Ready
                            </span>
                          ) : (
                            <span className="text-[10px] text-[#795438] opacity-0 group-hover:opacity-100 font-medium transition-opacity">
                              Fill &rarr;
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-[#88847D] font-mono mt-0.5 truncate">
                          {account.email}
                        </div>
                        <div className="text-[10px] text-[#88847D] font-mono">
                          Password:{" "}
                          <span className="text-[#292824] font-semibold">
                            {account.password}
                          </span>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Registration Helper Link */}
          <div className="mt-5 text-center text-xs text-[#88847D]">
            Don't have an account?{" "}
            <button
              type="button"
              onClick={() => setShowRegisterInfo(true)}
              className="font-semibold text-[#795438] hover:text-[#63432B] hover:underline focus:outline-none"
            >
              Register
            </button>
          </div>
        </div>
      </div>

      {/* Registration Info Modal */}
      {showRegisterInfo && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#292824]/40 backdrop-blur-xs animate-in fade-in duration-150"
        >
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-xl border border-[#E8E3DA] space-y-4">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2 text-[#795438]">
                <Info className="w-5 h-5" />
                <h3 className="text-sm font-bold text-[#292824]">
                  Account Registration
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowRegisterInfo(false)}
                className="text-[#88847D] hover:text-[#292824] p-1 rounded-md"
                aria-label="Close modal"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-[#88847D] leading-relaxed">
              New user accounts are securely provisioned by your system administrator.
              If you need system access or role permissions, please reach out to your store manager or administrator.
            </p>

            <div className="p-2.5 rounded-lg bg-[#F8F6F2] border border-[#E8E3DA] text-[11px] text-[#292824]">
              Tip: You can use the <strong>Demo Account</strong> dropdown above to test all roles (Admin, Manager, Cashier) immediately!
            </div>

            <Button
              type="button"
              variant="primary"
              size="sm"
              className="w-full font-medium"
              onClick={() => setShowRegisterInfo(false)}
            >
              Got it
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
