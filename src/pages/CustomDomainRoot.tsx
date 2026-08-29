import { lazy, Suspense, useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { getPublicCustomDomainTarget, type CustomDomainTarget } from "@/lib/customDomains";
import { getPublicAssetRequestStatus } from "@/lib/publicAssets";
import { Button } from "@/components/ui/button";

const PublicProfile = lazy(() => import("./PublicProfile"));
const RedirectHandler = lazy(() => import("./RedirectHandler"));

export default function CustomDomainRoot() {
  const [target, setTarget] = useState<CustomDomainTarget | null>(null);
  const [failure, setFailure] = useState<"missing" | "unavailable" | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    setFailure(null);
    getPublicCustomDomainTarget()
      .then((result) => { if (active) setTarget(result); })
      .catch((error: unknown) => {
        if (active) setFailure(getPublicAssetRequestStatus(error) === 404 ? "missing" : "unavailable");
      });
    return () => { active = false; };
  }, [attempt]);

  if (failure) {
    return (
      <main className="min-h-[100dvh] bg-black px-6 flex items-center justify-center text-center">
        <div className="max-w-sm">
          <p className="font-mono text-xs uppercase tracking-[0.18em] text-accent">Domain unavailable</p>
          <h1 className="mt-4 text-3xl font-semibold text-white">{failure === "missing" ? "This page is not connected." : "Please try again in a moment."}</h1>
          <p className="mt-3 text-sm leading-6 text-white/50">{failure === "missing"
            ? "Check the address or contact the owner of this domain."
            : "We couldn't load this page. Check your connection and try again."}</p>
          {failure === "unavailable" && <Button type="button" variant="outline" size="lg" className="mt-6" onClick={() => setAttempt((value) => value + 1)}>Try again</Button>}
        </div>
      </main>
    );
  }

  if (!target) {
    return (
      <main className="min-h-[100dvh] bg-black flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-accent" aria-label="Loading custom domain" />
      </main>
    );
  }

  return (
    <Suspense fallback={
      <main className="min-h-[100dvh] bg-black flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
      </main>
    }>
      {target.type === "profile"
        ? <PublicProfile slugOverride={target.slug} customDomainRoot />
        : <RedirectHandler slugOverride={target.slug} customDomainRoot />}
    </Suspense>
  );
}
