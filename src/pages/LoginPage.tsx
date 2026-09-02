import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";
import { pb } from "@/lib/pocketbase";
import { toast } from "sonner";
import { parseAuthError } from "@/lib/authErrors";
import { useSeo } from "@/hooks/useSeo";
import { SEO_PAGES } from "@/lib/seo-config";
import { maskError } from "@/lib/utils";
import AuthShell from "@/components/auth/AuthShell";
import styles from "@/components/auth/AuthShell.module.css";

export default function LoginPage() {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [resettingPassword, setResettingPassword] = useState(false);

  useSeo(SEO_PAGES.login);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await pb.collection('users').authWithPassword(email, password);
      navigate("/dashboard");
    } catch (error: unknown) {
      toast.error(parseAuthError(error, "login"));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    if (loading) return;
    setLoading(true);
    try {
      // Start flow directly. PocketBase handles the error if not enabled.
      const authData = await pb.collection('users').authWithOAuth2({
        provider: 'google'
      });

      // Update name if it's a new account from Google
      if (authData.meta?.name && !authData.record.name) {
        await pb.collection('users').update(authData.record.id, {
          name: authData.meta.name,
        });
      }

      toast.success("Successfully logged in with Google!");
      navigate("/dashboard");
    } catch (error: unknown) {
      if ((error as Error).name !== "ClientResponseError" || (error as { originalError?: { message?: string } }).originalError?.message !== "The user cancelled the request.") {
        console.error("Google login error:", error);
        toast.error(maskError(error, "Google sign-in couldn't be completed. Please try again."));
      }
      setLoading(false);
    }
  };

  const handlePasswordReset = async () => {
    const normalizedEmail = email.trim();
    if (!normalizedEmail) {
      toast.info("Enter your email first, then request a reset link.");
      return;
    }

    setResettingPassword(true);
    try {
      await pb.collection("users").requestPasswordReset(normalizedEmail);
      toast.success("If an account exists for this email, a reset link is on its way.");
    } catch (error: unknown) {
      console.error("Password reset request failed:", error);
      toast.error("The reset request couldn't be completed. Please try again.");
    } finally {
      setResettingPassword(false);
    }
  };

  return (
    <AuthShell mode="login">
      <div className={styles.formPanel}>
        <header className={styles.formHeader}>
          <p className={styles.formEyebrow}>Welcome back</p>
          <h1>Sign in.</h1>
          <p>Continue to your profiles, links, routing, and analytics.</p>
        </header>

        <button type="button" onClick={handleGoogleLogin} disabled={loading} className={styles.oauthButton}>
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
          </svg>
          Continue with Google
        </button>

        <div className={styles.divider}>or use email</div>

        <form onSubmit={handleLogin} className={styles.form}>
          <div className={styles.field}>
            <label htmlFor="login-email" className={styles.label}>Email</label>
            <input
              id="login-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={styles.input}
              placeholder="you@example.com"
              autoComplete="email"
              required
            />
          </div>
          <div className={styles.field}>
            <div className={styles.fieldHeader}>
              <label htmlFor="login-password" className={styles.label}>Password</label>
              <button type="button" onClick={() => void handlePasswordReset()} disabled={resettingPassword} className={styles.textAction}>
                {resettingPassword ? "Sending…" : "Forgot password?"}
              </button>
            </div>
            <div className={styles.passwordField}>
              <input
                id="login-password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={styles.input}
                placeholder="••••••••"
                autoComplete="current-password"
                required
              />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className={styles.passwordToggle} aria-label={showPassword ? "Hide password" : "Show password"}>
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <button type="submit" disabled={loading} className={styles.submitButton}>
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>
      </div>
    </AuthShell>
  );
}
