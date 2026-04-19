import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { usePageTitle } from "@/hooks/usePageTitle";
import loginBg from "@/assets/login-background.webp";
import nochLogo from "@/assets/noch-logo-white.png";
import { toast } from "sonner";

const ResetPassword = () => {
  usePageTitle("Set Up Account");
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);
  // First-time setup vs returning password reset
  const [isFirstTime, setIsFirstTime] = useState(true);

  useEffect(() => {
    const detectMode = (user: any) => {
      // If the user has never signed in before, treat as first-time setup
      const lastSignIn = user?.last_sign_in_at;
      const createdAt = user?.created_at;
      // Consider "first-time" when last_sign_in_at is missing OR equals created_at
      // (the recovery click itself sets last_sign_in_at on some configs)
      if (!lastSignIn) {
        setIsFirstTime(true);
      } else if (createdAt && Math.abs(new Date(lastSignIn).getTime() - new Date(createdAt).getTime()) < 60_000) {
        setIsFirstTime(true);
      } else {
        setIsFirstTime(false);
      }
    };

    // Listen for the PASSWORD_RECOVERY event from the hash token
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === "PASSWORD_RECOVERY" || (event === "SIGNED_IN" && window.location.hash.includes("type=recovery"))) {
          setReady(true);
          if (session?.user) detectMode(session.user);
        }
      }
    );
    // Also check if we already have a session with recovery type
    const hash = window.location.hash;
    if (hash.includes("type=recovery")) {
      setReady(true);
      supabase.auth.getUser().then(({ data }) => {
        if (data.user) detectMode(data.user);
      });
    }
    return () => subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }
    if (password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      toast.success(isFirstTime ? "Account created! Welcome to NOCH+" : "Password updated successfully!");
      navigate("/dashboard");
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const copy = isFirstTime
    ? { title: "Welcome to NOCH+!", subtitle: "Create your password to get started", button: "Create My Account", busy: "Creating…" }
    : { title: "Reset Your Password", subtitle: "Enter your new password", button: "Update Password", busy: "Updating…" };

  return (
    <div
      className="min-h-screen flex items-center justify-center bg-cover bg-center bg-no-repeat"
      style={{ backgroundImage: `url(${loginBg})` }}
    >
      <div className="w-full max-w-md mx-4 rounded-2xl backdrop-blur-md bg-white/35 p-10 shadow-2xl">
        <div className="flex justify-center mb-12">
          <img src={nochLogo} alt="Noch Power" className="h-[88px] brightness-0" />
        </div>

        <h1 className="text-4xl font-bold text-center text-foreground mb-1" style={{ fontFamily: "'AntroVectra', cursive" }}>
          {copy.title}
        </h1>
        <p className="text-center text-foreground/60 text-sm mb-8">
          {copy.subtitle}
        </p>

        {!ready ? (
          <div className="text-center text-foreground/60 text-sm space-y-3">
            <p>Verifying your link…</p>
            <p className="text-xs text-foreground/50">
              If this link has expired, return to the sign-in page and click "Forgot password?" to get a new one.
            </p>
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate("/login")}
              className="mt-2"
            >
              Back to Sign In
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="password" className="text-foreground/80 text-xs uppercase tracking-wider">
                {isFirstTime ? "Choose a Password" : "New Password"}
              </Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="bg-foreground/10 border-foreground/20 text-foreground placeholder:text-foreground/40 focus-visible:ring-primary"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="text-foreground/80 text-xs uppercase tracking-wider">
                Confirm Password
              </Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={6}
                className="bg-foreground/10 border-foreground/20 text-foreground placeholder:text-foreground/40 focus-visible:ring-primary"
              />
            </div>
            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold py-5"
            >
              {loading ? copy.busy : copy.button}
            </Button>
          </form>
        )}
      </div>

      <div className="absolute bottom-6 left-0 right-0 text-center text-sm text-white/70">
        © 2026 Noch Power | <a href="https://www.nochpower.com" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors underline">www.nochpower.com</a>
      </div>
    </div>
  );
};

export default ResetPassword;
