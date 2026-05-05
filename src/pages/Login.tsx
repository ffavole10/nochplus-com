import { useState, useEffect } from "react";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import loginBg from "@/assets/login-background.webp";
import nochLogo from "@/assets/noch-logo-new.png";
import { toast } from "sonner";
import { fetchRoleInfo, postLoginPath } from "@/lib/postLoginRoute";

const Login = () => {
  usePageTitle('Sign In');
  const navigate = useNavigate();
  const { session, loading: authLoading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [resetting, setResetting] = useState(false);

  const handleForgotPassword = async () => {
    if (!email) {
      toast.error("Enter your email above, then click Forgot password?");
      return;
    }
    setResetting(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      toast.success(`Password reset link sent to ${email}. Check your inbox.`);
    } catch (err: any) {
      toast.error(err.message || "Failed to send reset link");
    } finally {
      setResetting(false);
    }
  };

  // If already authenticated, route by role.
  useEffect(() => {
    if (authLoading || !session?.user?.id) return;
    (async () => {
      const info = await fetchRoleInfo(session.user.id);
      navigate(postLoginPath(info), { replace: true });
    })();
  }, [session, authLoading, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Store remember-me preference before auth
      try {
        localStorage.setItem("nochplus-remember-me", rememberMe ? "true" : "false");
      } catch {}

      if (isSignUp) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin },
        });
        if (error) throw error;
        toast.success("Check your email for a verification link!");
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        const userId = data.user?.id;
        if (!userId) throw new Error("Sign-in failed. Try again.");

        const info = await fetchRoleInfo(userId);

        // Role validation: technicians must use /field, not /login.
        if (info.isTechnicianOnly) {
          await supabase.auth.signOut();
          toast.error(
            "Technicians should sign in at nochplus.com/field — redirecting…",
            { duration: 5000 },
          );
          setTimeout(() => navigate("/field", { replace: true }), 800);
          return;
        }

        navigate(postLoginPath(info), { replace: true });
      }
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  // Show nothing while checking auth state to prevent flash
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  // If session exists, the useEffect above will redirect
  if (session) return null;

  return (
    <div
      className="min-h-screen flex items-center justify-center bg-cover bg-center bg-no-repeat"
      style={{ backgroundImage: `url(${loginBg})` }}
    >
      <div className="w-full max-w-md mx-4 rounded-2xl backdrop-blur-md bg-white/35 p-10 shadow-2xl">
        {/* Logo */}
        <div className="flex justify-center mb-12">
          <img src={nochLogo} alt="Noch Power" className="h-[88px] brightness-0" />
        </div>

        {/* Title */}
        <h1 className="text-4xl font-bold text-center text-foreground mb-1" style={{ fontFamily: "'AntroVectra', cursive" }}>
          Reliability Starts Here
        </h1>
        <p className="text-center text-foreground/60 text-sm mb-8">
          {isSignUp ? "Create your account" : "Sign in to your dashboard"}
        </p>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="email" className="text-foreground/80 text-xs uppercase tracking-wider">
              Email
            </Label>
            <Input
              id="email"
              type="email"
              placeholder="you@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="bg-foreground/10 border-foreground/20 text-foreground placeholder:text-foreground/40 focus-visible:ring-primary"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password" className="text-foreground/80 text-xs uppercase tracking-wider">
              Password
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

          {!isSignUp && (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="remember-me"
                  checked={rememberMe}
                  onCheckedChange={(checked) => setRememberMe(checked === true)}
                  className="border-foreground/30 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                />
                <Label htmlFor="remember-me" className="text-xs text-foreground/60 cursor-pointer">
                  Remember me
                </Label>
              </div>
              <button
                type="button"
                onClick={handleForgotPassword}
                disabled={resetting}
                className="text-xs text-foreground/50 hover:text-foreground/80 transition-colors disabled:opacity-50"
              >
                {resetting ? "Sending…" : "Forgot password?"}
              </button>
            </div>
          )}

          <Button
            type="submit"
            disabled={loading}
            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold py-5"
          >
            {loading ? "Please wait..." : isSignUp ? "Create Account" : "Sign In"}
          </Button>
        </form>

        <div className="mt-6 text-center">
          <button
            type="button"
            onClick={() => setIsSignUp(!isSignUp)}
            className="text-sm text-foreground/50 hover:text-foreground/80 transition-colors"
          >
            {isSignUp
              ? "Already have an account? Sign in"
              : "Don't have an account? Sign up"}
          </button>
        </div>
      </div>

      <div className="absolute bottom-6 left-0 right-0 text-center text-sm text-white/70">
        © 2026 Noch Power | <a href="https://www.nochpower.com" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors underline">www.nochpower.com</a>
      </div>
    </div>
  );
};

export default Login;
