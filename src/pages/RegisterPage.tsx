import { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Gift, Eye, EyeOff, ChevronDown, Link2 } from "lucide-react";
import { pb } from "@/lib/pocketbase";
import { toast } from "sonner";
import { parseAuthError } from "@/lib/authErrors";
import { useSeo } from "@/hooks/useSeo";
import { SEO_PAGES } from "@/lib/seo-config";
import { maskError } from "@/lib/utils";
import { captureReferral, claimStoredReferral, normalizeReferralCode } from "@/lib/affiliate";
import { trackGrowthEvent } from "@/lib/telemetry";
import { ensureStarterProfile, getPostRegistrationDestination } from "@/lib/profileOnboarding";
import AuthShell from "@/components/auth/AuthShell";
import styles from "@/components/auth/AuthShell.module.css";

export default function RegisterPage() {
  const navigate = useNavigate();

  const [searchParams] = useSearchParams();
  const reservedProfileSlug = (searchParams.get("profile") || "")
    .trim().toLowerCase().replace(/[^a-z0-9-]/g, "").slice(0, 64);
  const [showPassword, setShowPassword] = useState(false);
  const [username, setUsername] = useState(searchParams.get("username") || "");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [promocode, setPromocode] = useState("");
  const [showPromocode, setShowPromocode] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);

  useSeo(SEO_PAGES.register);

  useEffect(() => {
    const referralCode = normalizeReferralCode(searchParams.get("ref"));
    if (referralCode) captureReferral(referralCode);
  }, [searchParams]);

  useEffect(() => {
    trackGrowthEvent("signup_started", { surface: "register" });
  }, []);

  // Helper function to generate a guaranteed unique username
  const generateUniqueUsername = async (emailOrName: string) => {
    let baseUsername = emailOrName.split('@')[0].replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
    if (!baseUsername) baseUsername = "user";

    let isUnique = false;
    let finalUsername = baseUsername;

    while (!isUnique) {
      try {
        await pb.collection('users').getFirstListItem(`username="${finalUsername}"`);
        const randomSuffix = Math.floor(Math.random() * 10000);
        finalUsername = `${baseUsername}${randomSuffix}`;
      } catch (err: unknown) {
        if ((err as { status?: number }).status === 404) {
          isUnique = true;
        } else {
          throw err;
        }
      }
    }
    return finalUsername;
  };

  const finishStarterProfileSetup = async (accountUsername: string) => {
    try {
      return {
        profile: await ensureStarterProfile(accountUsername, reservedProfileSlug),
        error: "",
      };
    } catch (error) {
      console.error("Starter profile setup failed:", error);
      return {
        profile: null,
        error: error instanceof Error
          ? error.message
          : "Your account is ready, but the Public Profile couldn't be created yet.",
      };
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!agreed) {
      toast.error("You must agree to the Privacy Policy and Terms & Conditions");
      return;
    }
    
    const cleanUsername = username.trim().toLowerCase();
    if (!cleanUsername) {
      toast.error("Please enter a username");
      return;
    }
    
    setLoading(true);

    try {
      // 1. Check if username is already taken in PocketBase
      try {
        await pb.collection('users').getFirstListItem(`username="${cleanUsername}"`);
        toast.error("This username is already taken. Please choose another one.");
        setLoading(false);
        return;
      } catch (err: unknown) {
        if ((err as { status?: number }).status !== 404) {
          console.error("Username check error:", err);
          toast.error("An error occurred while checking username availability.");
          setLoading(false);
          return;
        }
      }

      // 2. Pre-validate promocode if provided
      const trimmedPromo = promocode.trim();
      if (trimmedPromo) {
        try {
          const res = await pb.send("/api/promocodes/validate", {
            method: "POST",
            body: { code: trimmedPromo }
          });
          if (!res.valid) {
            toast.error("This promo code is invalid, inactive, or has reached its usage limit.");
            setLoading(false);
            return;
          }
        } catch (err: unknown) {
          toast.error(maskError(err, "This promo code couldn't be verified. Check it and try again."));
          setLoading(false);
          return; // Stop registration
        }
      }

      // 3. Register user
      await pb.collection('users').create({
        email,
        password,
        passwordConfirm: password,
        username: cleanUsername,
      });
      await pb.collection('users').authWithPassword(email, password);
      if (pb.authStore.model?.id) {
        trackGrowthEvent("signup_completed", {
          event_id: `signup:${pb.authStore.model.id}`,
          surface: "password",
        });
      }

      // Claim the browser's first-touch referral before applying an optional
      // typed promo code. This makes attribution deterministic when both exist.
      try {
        await claimStoredReferral();
      } catch (err) {
        console.info("Referral attribution was not claimed:", err);
      }
      
      // 3. Apply promocode after successful registration. Completion uses one
      // consolidated notification after the starter profile is also ready.
      let promoResultMessage = "";
      let promoWarning = "";
      if (trimmedPromo) {
        try {
          const applyRes = await pb.send("/api/promocodes/apply", {
            method: "POST",
            body: { code: trimmedPromo }
          });
          if (applyRes.success) {
            promoResultMessage = String(applyRes.message || "Your promo code was applied.");
            // Refresh auth state to get updated plan and promocode_used into AuthContext
            await pb.collection("users").authRefresh();
          }
        } catch (err: unknown) {
          console.error("Failed to apply promocode after registration", err);
          promoWarning = maskError(err, "Your promo code wasn't applied. You can try it again in Settings.");
        }
      }

      const profileSetup = await finishStarterProfileSetup(cleanUsername);
      if (profileSetup.profile) {
        const profileDescription = promoWarning || promoResultMessage ||
          `linktery.com/${profileSetup.profile.slug} is ready.`;
        if (promoWarning) {
          toast.warning("Account and Public Profile are ready.", { description: profileDescription });
        } else {
          toast.success("Account and Public Profile are ready.", { description: profileDescription });
        }
        navigate(getPostRegistrationDestination(reservedProfileSlug, profileSetup.profile.id));
      } else {
        toast.error("Your account is ready, but profile setup didn't finish.", {
          description: profileSetup.error || "Open Profiles from the dashboard to try again.",
        });
        navigate("/dashboard");
      }
    } catch (error: unknown) {
      toast.error(parseAuthError(error, "register"));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    if (loading) return;
    setLoading(true);
    try {
      const authData = await pb.collection('users').authWithOAuth2({
        provider: 'google'
      });
      trackGrowthEvent("signup_completed", {
        event_id: `signup:${authData.record.id}`,
        surface: "google",
      });

      const updateData: Record<string, string> = {};
      let accountUsername = String(authData.record.username || "");
      if (!authData.record.username) {
        const generatedUsername = await generateUniqueUsername(authData.record.email);
        updateData.username = generatedUsername;
        accountUsername = generatedUsername;
      }

      if (Object.keys(updateData).length > 0) {
        await pb.collection('users').update(authData.record.id, updateData);
      }

      try {
        await claimStoredReferral();
      } catch (err) {
        console.info("Referral attribution was not claimed:", err);
      }

      const profileSetup = await finishStarterProfileSetup(accountUsername);
      if (profileSetup.profile) {
        toast.success("Account and Public Profile are ready.", {
          description: `linktery.com/${profileSetup.profile.slug} is ready.`,
        });
        navigate(getPostRegistrationDestination(reservedProfileSlug, profileSetup.profile.id));
      } else {
        toast.error("You're signed in, but profile setup didn't finish.", {
          description: profileSetup.error || "Open Profiles from the dashboard to try again.",
        });
        navigate("/dashboard");
      }
    } catch (error: unknown) {
      const err = error as { name?: string; originalError?: { message?: string }; message?: string };
      if (err.name !== "ClientResponseError" || err.originalError?.message !== "The user cancelled the request.") {
        console.error("Google login error:", err);
        toast.error(maskError(err, "Google sign-up couldn't be completed. Please try again."));
      }
      setLoading(false);
    }
  };

  return (
    <AuthShell mode="register" reservedProfileSlug={reservedProfileSlug}>
      <div className={styles.formPanel} data-promo-expanded={showPromocode ? "true" : undefined}>
        <header className={styles.formHeader}>
          {reservedProfileSlug && <p className={styles.formEyebrow}>Profile reserved</p>}
          <h1>{reservedProfileSlug ? "Claim your profile." : "Create your account."}</h1>
          <p>
            {reservedProfileSlug
              ? "Create your account, then continue to the profile editor."
              : "Your starter Public Profile is created with your account."}
          </p>
        </header>

        <button
          type="button"
          onClick={handleGoogleLogin}
          disabled={loading}
          className={styles.oauthButton}
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
          </svg>
          Continue with Google
        </button>

        <div className={styles.divider}>or use email</div>

        <form onSubmit={handleRegister} className={styles.form}>
          {reservedProfileSlug && (
            <div className={styles.reservation}>
              <span>
                <Link2 aria-hidden="true" />
              </span>
              <div>
                <small>Reserved Public Profile</small>
                <strong>linktery.com/{reservedProfileSlug}</strong>
                <p className={styles.reservationNote}>Your account username stays private and can be different.</p>
              </div>
            </div>
          )}
          <div className={styles.field}>
            <div className={styles.fieldHeader}>
              <label htmlFor="account-username" className={styles.label}>Account username</label>
              <span className={styles.fieldHint}>Private</span>
            </div>
            <input
              id="account-username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-zA-Z0-9_.]/g, "").slice(0, 22))}
              maxLength={22}
              className={styles.input}
              placeholder="yourname"
              autoComplete="username"
              required
            />
          </div>

          <div className={styles.field}>
            <label htmlFor="register-email" className={styles.label}>Email</label>
            <input
              id="register-email"
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
            <label htmlFor="register-password" className={styles.label}>Password</label>
            <div className={styles.passwordField}>
              <input
                id="register-password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={styles.input}
                placeholder="At least 6 characters"
                autoComplete="new-password"
                required
                minLength={6}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className={styles.passwordToggle}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}
              </button>
            </div>
          </div>

          <div className={styles.promo}>
            <button
              type="button"
              onClick={() => setShowPromocode((current) => !current)}
              aria-expanded={showPromocode}
              aria-controls="promocode-field"
              className={styles.promoSummary}
            >
              <span>
                <Gift aria-hidden="true" />
                Have a promocode?
              </span>
              <ChevronDown aria-hidden="true" />
            </button>
            {showPromocode && (
              <div id="promocode-field" className={styles.promoField}>
                <label htmlFor="promocode" className="sr-only">Promocode</label>
                <input
                  id="promocode"
                  type="text"
                  value={promocode}
                  onChange={(e) => setPromocode(e.target.value.toUpperCase())}
                  className={styles.promoInput}
                  placeholder="Enter promocode"
                />
              </div>
            )}
          </div>

          <div className={styles.terms}>
            <input
              type="checkbox"
              id="terms"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              className={styles.checkbox}
              required
            />
            <label htmlFor="terms">
              I agree with{" "}
              <Link to="/privacy">Privacy Policy</Link>
              <span> and </span>
              <Link to="/terms">Terms &amp; Conditions</Link>
            </label>
          </div>

          <button type="submit" disabled={loading} className={styles.submitButton}>
            {loading ? "Creating account…" : "Create account"}
          </button>
        </form>
      </div>
    </AuthShell>
  );
}
