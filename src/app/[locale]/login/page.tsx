import { LoginForm } from "@/components/auth/LoginForm";
import { AuthBackground } from "@/components/auth/AuthBackground";

export default function LoginPage() {
  return (
    <div className="relative flex min-h-[calc(100vh-4rem)] items-center justify-center overflow-hidden bg-gradient-to-br from-background via-background to-muted/30 p-4">
      <AuthBackground />
      <LoginForm />
    </div>
  );
}
