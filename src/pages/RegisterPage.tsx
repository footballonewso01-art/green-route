import { useState, useEffect, useRef } from "react";
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
import { ensureStarterProfile } from "@/lib/profileOnboarding";

interface Star {
  x: number;
  y: number;
  size: number;
  opacity: number;
  speed: number;
  blinkDirection: number;
}

export default function RegisterPage() {
  const navigate = useNavigate();
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Background animated stars canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationId: number;
    let stars: Star[] = [];

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      initStars();
    };

    const initStars = () => {
      stars = [];
      const numStars = Math.floor((canvas.width * canvas.height) / 12000);
      for (let i = 0; i < numStars; i++) {
        stars.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          size: Math.random() * 2 + 0.5,
          opacity: Math.random() * 0.7 + 0.1,
          speed: Math.random() * 0.05 + 0.01,
          blinkDirection: Math.random() > 0.5 ? 1 : -1,
        });
      }
    };

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Draw grains/noise overlay manually via canvas for high performance
      ctx.fillStyle = "rgba(255, 255, 255, 0.01)";
      for (let i = 0; i < 5000; i++) {
        const x = Math.random() * canvas.width;
        const y = Math.random() * canvas.height;
        ctx.fillRect(x, y, 1, 1);
      }

      stars.forEach((star) => {
        // Soft green glowing stars
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
        
        // Blink logic
        star.opacity += star.blinkDirection * 0.005;
        if (star.opacity > 0.8) {
          star.opacity = 0.8;
          star.blinkDirection = -1;
        } else if (star.opacity < 0.1) {
          star.opacity = 0.1;
          star.blinkDirection = 1;
        }

        // Float up slowly
        star.y -= star.speed * 12;
        if (star.y < 0) {
          star.y = canvas.height;
          star.x = Math.random() * canvas.width;
        }

        ctx.fillStyle = `rgba(34, 197, 94, ${star.opacity})`;
        ctx.shadowBlur = 8;
        ctx.shadowColor = "rgba(34, 197, 94, 0.6)";
        ctx.fill();
        ctx.shadowBlur = 0; // reset
      });

      animationId = requestAnimationFrame(draw);
    };

    window.addEventListener("resize", resizeCanvas);
    resizeCanvas();
    draw();

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener("resize", resizeCanvas);
    };
  }, []);

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
        navigate(`/dashboard/profile/${profileSetup.profile.id}`);
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
        navigate(`/dashboard/profile/${profileSetup.profile.id}`);
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
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-6 sm:px-6 sm:py-10 relative overflow-x-hidden">
      {/* Background stars canvas & grid */}
      <canvas ref={canvasRef} className="fixed inset-0 z-0 pointer-events-none w-full h-full opacity-60" />
      <div className="absolute inset-0 bg-grid-white opacity-[0.03] z-0 pointer-events-none" />

      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/3 right-1/4 w-96 h-96 bg-accent/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/3 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-3xl" />
      </div>

      <div className="glass-card px-5 py-7 sm:p-8 w-full max-w-md relative z-10 animate-scale-in">
        <div className="text-center mb-6">
          <Link to="/" className="inline-flex items-center gap-2.5 mb-4 hover:opacity-80 transition-opacity">
            <img src="/logo.webp" alt="Linktery" className="h-9 w-auto mix-blend-screen" />
            <span className="text-2xl font-bold text-foreground tracking-tighter">Linktery</span>
          </Link>
          <h1 className="text-xl font-bold text-foreground">Create your account</h1>
          <p className="text-sm text-muted-foreground mt-1">Start managing your links today</p>
        </div>

        {/* Google Sign Up */}
        <button
          onClick={handleGoogleLogin}
          disabled={loading}
          className="w-full flex items-center justify-center gap-3 py-2.5 rounded-xl border border-border bg-surface hover:bg-surface-hover text-foreground font-medium transition-all duration-200 mb-5 text-sm"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
          </svg>
          Continue with Google
        </button>

        <div className="relative mb-5">
          <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-border" /></div>
          <div className="relative flex justify-center text-xs"><span className="bg-card px-3 text-muted-foreground">or sign up with email</span></div>
        </div>

        <form onSubmit={handleRegister} className="space-y-4">
          {reservedProfileSlug && (
            <div className="flex items-start gap-3 rounded-xl border border-accent/20 bg-accent/[0.06] px-3.5 py-3 text-left">
              <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent/10 text-accent">
                <Link2 className="h-4 w-4" />
              </span>
              <div className="min-w-0">
                <p className="text-xs font-medium text-muted-foreground">Reserved Public Profile</p>
                <p className="truncate text-sm font-semibold text-foreground">linktery.com/{reservedProfileSlug}</p>
                <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">Your account username stays private to Linktery and can be different.</p>
              </div>
            </div>
          )}
          <div>
            <label className="text-sm font-medium text-foreground mb-1.5 block">Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-zA-Z0-9_.]/g, "").slice(0, 22))}
              maxLength={22}
              className="w-full px-4 py-2.5 rounded-xl bg-surface border border-border text-foreground placeholder:text-muted-foreground/50 focus:outline-none input-glow focus:border-accent/50 transition-colors text-sm"
              placeholder="yourname"
              required
            />
          </div>

          <div>
            <label className="text-sm font-medium text-foreground mb-1.5 block">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-surface border border-border text-foreground placeholder:text-muted-foreground/50 focus:outline-none input-glow focus:border-accent/50 transition-colors text-sm"
              placeholder="you@example.com"
              required
            />
          </div>

          <div>
            <label className="text-sm font-medium text-foreground mb-1.5 block">Password</label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-surface border border-border text-foreground placeholder:text-muted-foreground/50 focus:outline-none input-glow focus:border-accent/50 transition-colors pr-10 text-sm"
                placeholder="At least 6 characters"
                required
                minLength={6}
              />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="rounded-xl border border-border/70 bg-surface/40 overflow-hidden">
            <button
              type="button"
              onClick={() => setShowPromocode((current) => !current)}
              aria-expanded={showPromocode}
              aria-controls="promocode-field"
              className="w-full flex items-center justify-between gap-3 px-4 py-2.5 text-sm text-muted-foreground hover:text-foreground hover:bg-surface/70 transition-colors"
            >
              <span className="flex items-center gap-2">
                <Gift className="w-4 h-4 text-accent" />
                Have a promocode?
              </span>
              <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${showPromocode ? "rotate-180" : ""}`} />
            </button>
            {showPromocode && (
              <div id="promocode-field" className="px-3 pb-3 animate-fade-in">
                <label htmlFor="promocode" className="sr-only">Promocode</label>
                <input
                  id="promocode"
                  type="text"
                  value={promocode}
                  onChange={(e) => setPromocode(e.target.value.toUpperCase())}
                  className="w-full px-4 py-2.5 rounded-xl bg-surface border border-border text-foreground placeholder:text-muted-foreground/50 focus:outline-none input-glow focus:border-accent/50 transition-colors text-sm"
                  placeholder="Enter promocode"
                />
              </div>
            )}
          </div>

          <div className="flex items-start gap-3 py-0.5">
            <div className="relative flex items-center justify-center shrink-0 mt-0.5">
              <input
                type="checkbox"
                id="terms"
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
                className="h-4 w-4 shrink-0 rounded-[4px] border-2 border-border bg-surface text-accent focus:ring-accent/30 cursor-pointer appearance-none checked:bg-accent checked:border-accent transition-all duration-200"
                required
              />
              {agreed && (
                <svg className="absolute w-2.5 h-2.5 text-white pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              )}
            </div>
            <label htmlFor="terms" className="text-xs text-muted-foreground leading-tight cursor-pointer select-none">
              I agree with{" "}
              <Link to="/privacy" className="text-accent hover:underline font-medium">Privacy Policy</Link>
              <span className="mx-1 opacity-20">|</span>
              <Link to="/terms" className="text-accent hover:underline font-medium">Terms & Conditions</Link>
            </label>
          </div>

          <button type="submit" disabled={loading} className="btn-primary-glow w-full !py-2.5 text-sm disabled:opacity-50">
            {loading ? "Creating account..." : "Create Account"}
          </button>
        </form>

        <p className="text-sm text-muted-foreground text-center mt-5">
          Already have an account?{" "}
          <Link to="/login" className="text-accent hover:underline">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
