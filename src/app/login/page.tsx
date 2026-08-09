"use client";

import React, { useState } from "react";
import Link from "next/link";
import { signIn, signUp } from "@/lib/auth-client";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [tab, setTab] = useState<"signin" | "signup">("signin");

  // Sign In Form state
  const [signInEmail, setSignInEmail] = useState("");
  const [signInPassword, setSignInPassword] = useState("");

  // Sign Up Form state
  const [signUpName, setSignUpName] = useState("");
  const [signUpEmail, setSignUpEmail] = useState("");
  const [signUpPassword, setSignUpPassword] = useState("");
  const [signUpConfirmPassword, setSignUpConfirmPassword] = useState("");

  // Common UI state
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [userAlreadyExistsError, setUserAlreadyExistsError] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSignInSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setUserAlreadyExistsError(false);

    if (!signInEmail || !signInPassword) {
      setErrorMessage("Please enter both email and password.");
      return;
    }

    try {
      setIsLoading(true);
      const res = await signIn.email({
        email: signInEmail,
        password: signInPassword,
        callbackURL: "/",
      });

      if (res.error) {
        setErrorMessage(res.error.message || "Failed to sign in. Please check your credentials.");
      } else {
        router.push("/");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Sign in error";
      setErrorMessage(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignUpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setUserAlreadyExistsError(false);

    if (!signUpName || !signUpEmail || !signUpPassword) {
      setErrorMessage("Please fill out all required fields.");
      return;
    }

    if (signUpPassword.length < 8) {
      setErrorMessage("Password must be at least 8 characters long.");
      return;
    }

    if (signUpPassword !== signUpConfirmPassword) {
      setErrorMessage("Passwords do not match.");
      return;
    }

    try {
      setIsLoading(true);
      const res = await signUp.email({
        name: signUpName,
        email: signUpEmail,
        password: signUpPassword,
        callbackURL: "/",
      });

      if (res.error) {
        const errorText = res.error.message || "Failed to create account.";
        if (errorText.toLowerCase().includes("already exists")) {
          setUserAlreadyExistsError(true);
          setSignInEmail(signUpEmail);
          setErrorMessage("An account with this email address already exists.");
        } else {
          setErrorMessage(errorText);
        }
      } else {
        router.push("/");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Registration error";
      setErrorMessage(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOAuthSignIn = async (provider: "github" | "google") => {
    try {
      setIsLoading(true);
      setErrorMessage(null);
      setUserAlreadyExistsError(false);
      await signIn.social({
        provider,
        callbackURL: "/",
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "OAuth error";
      setErrorMessage(msg);
      setIsLoading(false);
    }
  };

  const switchToSignInWithEmail = () => {
    setSignInEmail(signUpEmail);
    setTab("signin");
    setErrorMessage(null);
    setUserAlreadyExistsError(false);
  };

  return (
    <div
      style={{
        display: "grid",
        placeItems: "center",
        minHeight: "100vh",
        background: "var(--cream)",
        padding: "20px",
      }}
    >
      <div
        style={{
          width: "min(480px, 94vw)",
          background: "var(--paper)",
          border: "4px solid #000",
          boxShadow: "10px 10px 0 #000",
          padding: "28px 24px",
        }}
      >
        {/* Brand Badge Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
          <span
            style={{
              fontFamily: "var(--mono)",
              fontWeight: 800,
              fontSize: "22px",
              letterSpacing: "-.06em",
              background: "var(--yel)",
              border: "3px solid #000",
              boxShadow: "3px 3px 0 #000",
              padding: "4px 12px",
            }}
          >
            HOARD
          </span>
          <span
            style={{
              fontFamily: "var(--mono)",
              fontSize: "10px",
              fontWeight: 800,
              border: "2px solid #000",
              background: "var(--lime)",
              padding: "3px 7px",
            }}
          >
            AUTHENTICATION
          </span>
        </div>

        {/* Tab Switcher */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            border: "3px solid #000",
            boxShadow: "4px 4px 0 #000",
            marginBottom: "20px",
          }}
        >
          <button
            type="button"
            onClick={() => {
              setTab("signin");
              setErrorMessage(null);
              setUserAlreadyExistsError(false);
            }}
            style={{
              border: 0,
              borderRight: "2px solid #000",
              background: tab === "signin" ? "#000" : "#FFFDF8",
              color: tab === "signin" ? "var(--yel)" : "#000",
              padding: "10px",
              fontFamily: "var(--mono)",
              fontSize: "12px",
              fontWeight: 800,
              cursor: "pointer",
            }}
          >
            SIGN IN
          </button>
          <button
            type="button"
            onClick={() => {
              setTab("signup");
              setErrorMessage(null);
              setUserAlreadyExistsError(false);
            }}
            style={{
              border: 0,
              background: tab === "signup" ? "#000" : "#FFFDF8",
              color: tab === "signup" ? "var(--yel)" : "#000",
              padding: "10px",
              fontFamily: "var(--mono)",
              fontSize: "12px",
              fontWeight: 800,
              cursor: "pointer",
            }}
          >
            CREATE ACCOUNT
          </button>
        </div>

        {/* Error Alert Message */}
        {errorMessage && (
          <div
            style={{
              border: "2px solid #000",
              background: "#FF007A",
              color: "#fff",
              padding: "12px",
              fontFamily: "var(--mono)",
              fontSize: "11.5px",
              fontWeight: 700,
              marginBottom: "16px",
            }}
          >
            <div style={{ marginBottom: userAlreadyExistsError ? "8px" : "0" }}>
              ⚠ {errorMessage}
            </div>
            {userAlreadyExistsError && (
              <button
                type="button"
                onClick={switchToSignInWithEmail}
                style={{
                  border: "2px solid #000",
                  background: "#FFE600",
                  color: "#000",
                  padding: "6px 10px",
                  fontFamily: "var(--mono)",
                  fontSize: "11px",
                  fontWeight: 800,
                  cursor: "pointer",
                  width: "100%",
                }}
              >
                SWITCH TO SIGN IN TAB ↗
              </button>
            )}
          </div>
        )}

        {/* SIGN IN FORM */}
        {tab === "signin" && (
          <form onSubmit={handleSignInSubmit}>
            <div style={{ marginBottom: "14px" }}>
              <label
                style={{
                  display: "block",
                  fontFamily: "var(--mono)",
                  fontSize: "10px",
                  fontWeight: 800,
                  letterSpacing: ".1em",
                  marginBottom: "4px",
                }}
              >
                EMAIL ADDRESS
              </label>
              <input
                type="email"
                required
                value={signInEmail}
                onChange={(e) => setSignInEmail(e.target.value)}
                placeholder="name@example.com"
                style={{
                  width: "100%",
                  border: "3px solid #000",
                  padding: "10px 12px",
                  fontFamily: "var(--mono)",
                  fontSize: "13px",
                  fontWeight: 600,
                  outline: "none",
                  background: "#F4F0EA",
                }}
              />
            </div>

            <div style={{ marginBottom: "20px" }}>
              <label
                style={{
                  display: "block",
                  fontFamily: "var(--mono)",
                  fontSize: "10px",
                  fontWeight: 800,
                  letterSpacing: ".1em",
                  marginBottom: "4px",
                }}
              >
                PASSWORD
              </label>
              <input
                type="password"
                required
                value={signInPassword}
                onChange={(e) => setSignInPassword(e.target.value)}
                placeholder="••••••••"
                style={{
                  width: "100%",
                  border: "3px solid #000",
                  padding: "10px 12px",
                  fontFamily: "var(--mono)",
                  fontSize: "13px",
                  fontWeight: 600,
                  outline: "none",
                  background: "#F4F0EA",
                }}
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              style={{
                width: "100%",
                border: "3px solid #000",
                background: "#00F0FF",
                boxShadow: "4px 4px 0 #000",
                padding: "12px",
                fontFamily: "var(--mono)",
                fontSize: "13px",
                fontWeight: 800,
                cursor: "pointer",
                transition: ".1s",
              }}
            >
              {isLoading ? "AUTHENTICATING..." : "SIGN IN"}
            </button>
          </form>
        )}

        {/* CREATE ACCOUNT FORM */}
        {tab === "signup" && (
          <form onSubmit={handleSignUpSubmit}>
            <div style={{ marginBottom: "14px" }}>
              <label
                style={{
                  display: "block",
                  fontFamily: "var(--mono)",
                  fontSize: "10px",
                  fontWeight: 800,
                  letterSpacing: ".1em",
                  marginBottom: "4px",
                }}
              >
                FULL NAME
              </label>
              <input
                type="text"
                required
                value={signUpName}
                onChange={(e) => setSignUpName(e.target.value)}
                placeholder="e.g. Maniteja"
                style={{
                  width: "100%",
                  border: "3px solid #000",
                  padding: "10px 12px",
                  fontFamily: "var(--mono)",
                  fontSize: "13px",
                  fontWeight: 600,
                  outline: "none",
                  background: "#F4F0EA",
                }}
              />
            </div>

            <div style={{ marginBottom: "14px" }}>
              <label
                style={{
                  display: "block",
                  fontFamily: "var(--mono)",
                  fontSize: "10px",
                  fontWeight: 800,
                  letterSpacing: ".1em",
                  marginBottom: "4px",
                }}
              >
                EMAIL ADDRESS
              </label>
              <input
                type="email"
                required
                value={signUpEmail}
                onChange={(e) => setSignUpEmail(e.target.value)}
                placeholder="name@example.com"
                style={{
                  width: "100%",
                  border: "3px solid #000",
                  padding: "10px 12px",
                  fontFamily: "var(--mono)",
                  fontSize: "13px",
                  fontWeight: 600,
                  outline: "none",
                  background: "#F4F0EA",
                }}
              />
            </div>

            <div style={{ marginBottom: "14px" }}>
              <label
                style={{
                  display: "block",
                  fontFamily: "var(--mono)",
                  fontSize: "10px",
                  fontWeight: 800,
                  letterSpacing: ".1em",
                  marginBottom: "4px",
                }}
              >
                PASSWORD (8+ CHARACTERS)
              </label>
              <input
                type="password"
                required
                value={signUpPassword}
                onChange={(e) => setSignUpPassword(e.target.value)}
                placeholder="••••••••"
                style={{
                  width: "100%",
                  border: "3px solid #000",
                  padding: "10px 12px",
                  fontFamily: "var(--mono)",
                  fontSize: "13px",
                  fontWeight: 600,
                  outline: "none",
                  background: "#F4F0EA",
                }}
              />
            </div>

            <div style={{ marginBottom: "20px" }}>
              <label
                style={{
                  display: "block",
                  fontFamily: "var(--mono)",
                  fontSize: "10px",
                  fontWeight: 800,
                  letterSpacing: ".1em",
                  marginBottom: "4px",
                }}
              >
                CONFIRM PASSWORD
              </label>
              <input
                type="password"
                required
                value={signUpConfirmPassword}
                onChange={(e) => setSignUpConfirmPassword(e.target.value)}
                placeholder="••••••••"
                style={{
                  width: "100%",
                  border: "3px solid #000",
                  padding: "10px 12px",
                  fontFamily: "var(--mono)",
                  fontSize: "13px",
                  fontWeight: 600,
                  outline: "none",
                  background: "#F4F0EA",
                }}
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              style={{
                width: "100%",
                border: "3px solid #000",
                background: "#B6FF3C",
                boxShadow: "4px 4px 0 #000",
                padding: "12px",
                fontFamily: "var(--mono)",
                fontSize: "13px",
                fontWeight: 800,
                cursor: "pointer",
                transition: ".1s",
              }}
            >
              {isLoading ? "CREATING ACCOUNT..." : "CREATE ACCOUNT"}
            </button>
          </form>
        )}

        {/* Divider */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px", margin: "20px 0 16px" }}>
          <div style={{ flex: 1, height: "2px", background: "#000" }} />
          <span style={{ fontFamily: "var(--mono)", fontSize: "9.5px", fontWeight: 800, letterSpacing: ".1em" }}>
            OR CONTINUE WITH
          </span>
          <div style={{ flex: 1, height: "2px", background: "#000" }} />
        </div>

        {/* OAuth Buttons */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
          <button
            type="button"
            onClick={() => handleOAuthSignIn("github")}
            disabled={isLoading}
            style={{
              border: "2px solid #000",
              background: "#000",
              color: "#fff",
              boxShadow: "3px 3px 0 #000",
              padding: "10px",
              fontFamily: "var(--mono)",
              fontWeight: 800,
              fontSize: "11px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "6px",
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="#fff">
              <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
            </svg>
            GITHUB
          </button>

          <button
            type="button"
            onClick={() => handleOAuthSignIn("google")}
            disabled={isLoading}
            style={{
              border: "2px solid #000",
              background: "#FFFDF8",
              color: "#000",
              boxShadow: "3px 3px 0 #000",
              padding: "10px",
              fontFamily: "var(--mono)",
              fontWeight: 800,
              fontSize: "11px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "6px",
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
            </svg>
            GOOGLE
          </button>
        </div>

        {/* Footer Navigation */}
        <div
          style={{
            marginTop: "24px",
            paddingTop: "16px",
            borderTop: "2px solid #000",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <span style={{ fontFamily: "var(--mono)", fontSize: "11px", opacity: 0.6 }}>
            HOARD Auth Engine
          </span>
          <Link
            href="/"
            style={{
              fontFamily: "var(--mono)",
              fontSize: "11px",
              fontWeight: 800,
              color: "#000",
              textDecoration: "underline",
            }}
          >
            ← Back to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
