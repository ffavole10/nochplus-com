import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { usePageTitle } from "@/hooks/usePageTitle";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { fetchRoleInfo, postLoginPath } from "@/lib/postLoginRoute";
import nochLogoWhite from "@/assets/noch-logo-white.png";
import nochPlusIcon from "@/assets/noch-plus-icon.png";

export default function FieldLogin() {
  usePageTitle("Field Sign In");
  const navigate = useNavigate();
  const { session, loading: authLoading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resetting, setResetting] = useState(false);

  // If already logged in, route by role.
  useEffect(() => {
    if (authLoading || !session?.user?.id) return;
    (async () => {
      const info = await fetchRoleInfo(session.user.id);
      navigate(postLoginPath(info), { replace: true });
    })();
  }, [authLoading, session, navigate]);

  const handleForgot = async () => {
    if (!email) {
      toast.error("Enter your email first, then tap Forgot password.");
      return;
    }
    setResetting(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      toast.success(`Reset link sent to ${email}.`);
    } catch (err: any) {
      toast.error(err.message || "Couldn't send reset link.");
    } finally {
      setResetting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;
      const userId = data.user?.id;
      if (!userId) throw new Error("Sign-in failed. Try again.");

      const info = await fetchRoleInfo(userId);

      // Role validation: only technicians may use /field.
      if (!info.isTechnician) {
        await supabase.auth.signOut();
        toast.error(
          "Admin access is at nochplus.com/login — please sign in there.",
          { duration: 6000 },
        );
        setLoading(false);
        return;
      }

      navigate(postLoginPath(info), { replace: true });
    } catch (err: any) {
      toast.error(err.message || "Sign-in failed.");
      setLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#25b3a5]">
        <Loader2 className="h-8 w-8 animate-spin text-white" />
      </div>
    );
  }
  if (session) return null;

  return (
    <div
      className="min-h-screen w-full flex justify-center"
      style={{
        background:
          "radial-gradient(ellipse at top, #4dd5c6 0%, #25b3a5 45%, #1a8a7f 100%)",
      }}
    >
      {/* Mobile-constrained container */}
      <div
        className="relative w-full max-w-[430px] min-h-screen flex flex-col"
        style={{
          paddingTop: "env(safe-area-inset-top)",
          paddingBottom: "env(safe-area-inset-bottom)",
        }}
      >
        {/* Top section: logo */}
        <div className="pt-10 pb-6 flex flex-col items-center justify-center">
          <img
            src={nochLogoWhite}
            alt="NOCH Power"
            className="w-[200px] h-auto"
            style={{ filter: "brightness(0) invert(1)" }}
          />
        </div>

        {/* Middle section: card */}
        <div className="flex-1 flex items-center justify-center px-5">
          <div
            className="w-full bg-white/97 backdrop-blur-sm rounded-[20px] p-8"
            style={{
              boxShadow: "0 10px 40px rgba(0,0,0,0.15)",
            }}
          >
            <div className="flex flex-col items-center mb-7">
              <img
                src={nochPlusIcon}
                alt="NOCH+"
                className="w-[72px] h-[72px] mb-4 rounded-2xl"
              />
              <h1 className="text-[24px] font-bold text-[#1a1a1a] leading-tight">
                NOCH+ Field
              </h1>
              <p className="text-[15px] text-[#6b7280] mt-1">
                Sign in to start your day
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label
                  htmlFor="field-email"
                  className="text-[12px] uppercase tracking-[0.5px] text-[#6b7280] font-medium"
                >
                  Email
                </Label>
                <Input
                  id="field-email"
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  placeholder="you@nochpower.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="h-[52px] rounded-xl border-[#e5e7eb] text-[16px] focus-visible:ring-[#25b3a5] focus-visible:border-[#25b3a5]"
                />
              </div>

              <div className="space-y-2">
                <Label
                  htmlFor="field-password"
                  className="text-[12px] uppercase tracking-[0.5px] text-[#6b7280] font-medium"
                >
                  Password
                </Label>
                <div className="relative">
                  <Input
                    id="field-password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                    className="h-[52px] rounded-xl border-[#e5e7eb] text-[16px] pr-12 focus-visible:ring-[#25b3a5] focus-visible:border-[#25b3a5]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 h-9 w-9 flex items-center justify-center text-[#6b7280] hover:text-[#1a1a1a]"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5" />
                    ) : (
                      <Eye className="h-5 w-5" />
                    )}
                  </button>
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={handleForgot}
                  disabled={resetting}
                  className="text-[13px] text-[#25b3a5] hover:underline disabled:opacity-50"
                >
                  {resetting ? "Sending…" : "Forgot password?"}
                </button>
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full h-[56px] rounded-xl bg-[#25b3a5] hover:bg-[#1a8a7f] text-white font-bold text-[17px]"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin mr-2" />
                    Signing in…
                  </>
                ) : (
                  "Sign In"
                )}
              </Button>
            </form>

            <p className="mt-5 text-center text-[13px] text-[#9ca3af]">
              Need help signing in? Contact your dispatcher.
            </p>

            <div className="mt-6 pt-5 border-t border-[#e5e7eb] text-center">
              <Link
                to="/login"
                className="text-[12px] text-[#9ca3af] hover:text-[#6b7280]"
              >
                Admin? Sign in here →
              </Link>
            </div>
          </div>
        </div>

        {/* Bottom section */}
        <div className="px-5 pt-6 pb-6 text-center">
          <p className="text-[11px] text-white/75">© 2026 NOCH Power</p>
        </div>
      </div>
    </div>
  );
}
