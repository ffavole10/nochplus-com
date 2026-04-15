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
  usePageTitle("Reset Password");
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Listen for the PASSWORD_RECOVERY event from the hash token
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event) => {
        if (event === "PASSWORD_RECOVERY") {
          setReady(true);
        }
      }
    );
    // Also check if we already have a session with recovery type
    const hash = window.location.hash;
    if (hash.includes("type=recovery")) {
      setReady(true);
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
      toast.success("Password updated successfully!");
      navigate("/dashboard");
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

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
          Set New Password
        </h1>
        <p className="text-center text-foreground/60 text-sm mb-8">
          Enter your new password below
        </p>

        {!ready ? (
          <p className="text-center text-foreground/60 text-sm">
            Verifying your reset link…
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="password" className="text-foreground/80 text-xs uppercase tracking-wider">
                New Password
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
              {loading ? "Updating…" : "Update Password"}
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
