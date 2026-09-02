import type { ReactNode } from "react";
import { Link } from "react-router-dom";

import authRegisterSharing from "@/assets/auth-register-sharing.webp";
import authWelcomeMarketingLead from "@/assets/auth-welcome-marketing-lead.webp";
import BrandWordmark from "@/components/BrandWordmark";
import "@/styles/landing-rebrand.css";
import styles from "./AuthShell.module.css";

interface AuthShellProps {
  mode: "login" | "register";
  children: ReactNode;
  reservedProfileSlug?: string;
}

function WorkspacePreview({ mode, reservedProfileSlug = "" }: Omit<AuthShellProps, "children">) {
  const message = reservedProfileSlug
    ? "Your space is ready."
    : mode === "login"
      ? "Welcome back."
      : "Build what comes next.";
  const image = mode === "login" ? authWelcomeMarketingLead : authRegisterSharing;

  return (
    <aside className={styles.preview} data-preview-mode={mode} aria-label="Linktery brand story">
      <img className={styles.previewImage} src={image} alt="" />
      <div className={styles.previewCaption}>
        <h2>{message}</h2>
      </div>
    </aside>
  );
}

export default function AuthShell({ mode, children, reservedProfileSlug }: AuthShellProps) {
  const alternateHref = mode === "login" ? "/register" : "/login";
  const alternateLabel = mode === "login" ? "Create account" : "Sign in";
  const alternatePrompt = mode === "login" ? "New here?" : "Already have an account?";

  return (
    <div
      className={styles.page}
      data-auth-page={mode}
      data-auth-reserved={reservedProfileSlug ? "true" : undefined}
    >
      <a href="#auth-main" className={styles.skipLink}>Skip to {mode === "login" ? "sign in" : "registration"}</a>
      <header className={styles.topbar}>
        <Link to="/" className={styles.brand} aria-label="Linktery home">
          <BrandWordmark tone="dark" />
        </Link>
        <p><span>{alternatePrompt}</span> <Link to={alternateHref}>{alternateLabel}</Link></p>
      </header>

      <main id="auth-main" className={styles.main}>
        <section className={styles.formColumn} aria-label={mode === "login" ? "Sign in" : "Create account"}>
          {children}
        </section>
        <WorkspacePreview mode={mode} reservedProfileSlug={reservedProfileSlug} />
      </main>
    </div>
  );
}
