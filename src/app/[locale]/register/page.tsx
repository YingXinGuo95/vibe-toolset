import { RegisterForm } from "@/components/auth/RegisterForm";

export default function RegisterPage() {
  return (
    <div className="relative flex min-h-[calc(100vh-4rem)] items-center justify-center overflow-hidden bg-gradient-to-br from-background via-background to-muted/30 p-4">
      {/* Background decoration */}
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute -left-40 -top-40 size-[500px] rounded-full bg-primary/[0.04] blur-[100px]" />
        <div className="absolute -bottom-40 -right-40 size-[500px] rounded-full bg-primary/[0.06] blur-[100px]" />
        <div className="absolute left-1/2 top-1/3 size-[300px] -translate-x-1/2 rounded-full bg-primary/[0.03] blur-[80px]" />
      </div>
      <RegisterForm />
    </div>
  );
}
