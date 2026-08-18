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
  const [oauthNotice, setOauthNotice] = useState<string | null>(null);

  const handleSignInSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setOauthNotice(null);
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
        window.location.href = "/";
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
    setOauthNotice(null);
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
        window.location.href = "/";
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Registration error";
      setErrorMessage(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOAuthClick = (provider: "GitHub" | "Google") => {
    setErrorMessage(null);
    setUserAlreadyExistsError(false);
    setOauthNotice(`${provider} OAuth sign-in is not yet implemented. Please sign in or create an account using Email & Password above.`);
  };

  const switchToSignInWithEmail = () => {
    setSignInEmail(signUpEmail);
    setTab("signin");
    setErrorMessage(null);
    setOauthNotice(null);
    setUserAlreadyExistsError(false);
  };

  return (
    <div
      className="page-scroll"
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "safe center",
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
            EMAIL AUTH
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
              setOauthNotice(null);
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
              setOauthNotice(null);
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

        {/* OAuth Paused Notice Banner */}
        {oauthNotice && (
          <div
            style={{
              border: "2px solid #000",
              background: "#FFE600",
              color: "#000",
              padding: "12px",
              fontFamily: "var(--mono)",
              fontSize: "11.5px",
              fontWeight: 700,
              marginBottom: "16px",
            }}
          >
            💡 {oauthNotice}
          </div>
        )}

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
            OR SOCIAL OAUTH
          </span>
          <div style={{ flex: 1, height: "2px", background: "#000" }} />
        </div>

        {/* OAuth Buttons (Paused - Not Yet Implemented) */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
          <button
            type="button"
            onClick={() => handleOAuthClick("GitHub")}
            style={{
              border: "2px solid #000",
              background: "#EAEAEA",
              color: "#666",
              padding: "10px 6px",
              fontFamily: "var(--mono)",
              fontWeight: 800,
              fontSize: "10px",
              cursor: "pointer",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: "3px",
            }}
          >
            <span>GITHUB</span>
            <span style={{ fontSize: "8.5px", opacity: 0.7 }}>(NOT YET IMPLEMENTED)</span>
          </button>

          <button
            type="button"
            onClick={() => handleOAuthClick("Google")}
            style={{
              border: "2px solid #000",
              background: "#EAEAEA",
              color: "#666",
              padding: "10px 6px",
              fontFamily: "var(--mono)",
              fontWeight: 800,
              fontSize: "10px",
              cursor: "pointer",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: "3px",
            }}
          >
            <span>GOOGLE</span>
            <span style={{ fontSize: "8.5px", opacity: 0.7 }}>(NOT YET IMPLEMENTED)</span>
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
