import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowRight, Link2, Loader2 } from "lucide-react";
import { pb } from "@/lib/pocketbase";
import { captureReferral, normalizeReferralCode } from "@/lib/affiliate";
import { useSeo } from "@/hooks/useSeo";

export default function ReferralCapture() {
  const { referralCode } = useParams();
  const navigate = useNavigate();
  const [invalid, setInvalid] = useState(false);

  useSeo({
    title: "Join Linktery",
    description: "Create your Linktery account.",
    noIndex: true,
  });

  useEffect(() => {
    let cancelled = false;
    const code = normalizeReferralCode(referralCode);
    if (!code) {
      setInvalid(true);
      return;
    }

    pb.send(`/api/affiliate/referral/${encodeURIComponent(code)}`, {
      method: "GET",
      requestKey: null,
    }).then((response) => {
      if (cancelled) return;
      if (!response?.valid) {
        setInvalid(true);
        return;
      }
      captureReferral(code);
      navigate(`/register?ref=${encodeURIComponent(code)}`, { replace: true });
    }).catch(() => {
      if (!cancelled) setInvalid(true);
    });

    return () => {
      cancelled = true;
    };
  }, [navigate, referralCode]);

  return (
    <main className="min-h-screen bg-background grid place-items-center px-5">
      <section className="glass-card w-full max-w-md p-7 sm:p-9 text-center">
        <div className="mx-auto mb-5 grid h-12 w-12 place-items-center rounded-2xl border border-accent/25 bg-accent/10 text-accent">
          {invalid ? <Link2 className="h-5 w-5" /> : <Loader2 className="h-5 w-5 animate-spin" />}
        </div>
        <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.2em] text-accent">Linktery invite</p>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          {invalid ? "This referral link is unavailable" : "Preparing your invite"}
        </h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          {invalid
            ? "The link may be inactive or mistyped. You can still create a regular Linktery account."
            : "We’re preserving the partner attribution and taking you to registration."}
        </p>
        {invalid && (
          <Link
            to="/register"
            className="btn-primary-glow mt-6 inline-flex min-h-11 items-center justify-center gap-2 px-5"
          >
            Continue to registration
            <ArrowRight className="h-4 w-4" />
          </Link>
        )}
      </section>
    </main>
  );
}
