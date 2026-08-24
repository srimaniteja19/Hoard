"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { RefreshCw, Wifi, WifiOff, X, Share as ShareIcon, PlusSquare } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export interface SharedContent {
  title?: string;
  text?: string;
  url?: string;
  action?: string;
}

interface PWAContextType {
  isInstallable: boolean;
  isInstalled: boolean;
  isIOS: boolean;
  isOnline: boolean;
  isUpdateAvailable: boolean;
  promptInstall: () => Promise<void>;
  updateApp: () => void;
  showIOSPrompt: boolean;
  setShowIOSPrompt: (show: boolean) => void;
  sharedContent: SharedContent | null;
  clearSharedContent: () => void;
}

const PWAContext = createContext<PWAContextType>({
  isInstallable: false,
  isInstalled: false,
  isIOS: false,
  isOnline: true,
  isUpdateAvailable: false,
  promptInstall: async () => {},
  updateApp: () => {},
  showIOSPrompt: false,
  setShowIOSPrompt: () => {},
  sharedContent: null,
  clearSharedContent: () => {},
});

export const usePWA = () => useContext(PWAContext);

function getInitialStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

function getInitialIOS(): boolean {
  if (typeof window === "undefined") return false;
  return /iphone|ipad|ipod/.test(window.navigator.userAgent.toLowerCase());
}

function getInitialSharedContent(): SharedContent | null {
  if (typeof window === "undefined") return null;
  try {
    const urlParams = new URLSearchParams(window.location.search);
    const url = urlParams.get("url") || "";
    const text = urlParams.get("text") || "";
    const title = urlParams.get("title") || "";
    const action = urlParams.get("action") || "";

    if (url || text || title || action) {
      return {
        url: url || undefined,
        text: text || undefined,
        title: title || undefined,
        action: action || undefined,
      };
    }
  } catch {
    // ignore
  }
  return null;
}

export const PWAProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isInstalled, setIsInstalled] = useState(getInitialStandalone);
  const [isIOS] = useState(getInitialIOS);
  const [showIOSPrompt, setShowIOSPrompt] = useState(false);
  const [isOnline, setIsOnline] = useState(() => (typeof navigator !== "undefined" ? navigator.onLine : true));
  const [isUpdateAvailable, setIsUpdateAvailable] = useState(false);
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null);
  const [networkToast, setNetworkToast] = useState<{ message: string; type: "offline" | "online" } | null>(null);
  const [sharedContent, setSharedContent] = useState<SharedContent | null>(getInitialSharedContent);

  const clearSharedContent = useCallback(() => {
    setSharedContent(null);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Register Service Worker and listen for updates
    if ("serviceWorker" in navigator) {
      const registerSW = async () => {
        try {
          const registration = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
          console.log("[PWA] Service Worker registered with scope:", registration.scope);

          // Check if an updated worker is already waiting
          if (registration.waiting) {
            setWaitingWorker(registration.waiting);
            setIsUpdateAvailable(true);
          }

          // Listen for new service worker installation
          registration.addEventListener("updatefound", () => {
            const installingWorker = registration.installing;
            if (!installingWorker) return;

            installingWorker.addEventListener("statechange", () => {
              if (installingWorker.state === "installed" && navigator.serviceWorker.controller) {
                // New update is ready and waiting to activate
                setWaitingWorker(installingWorker);
                setIsUpdateAvailable(true);
              }
            });
          });
        } catch (error) {
          console.warn("[PWA] Service Worker registration failed:", error);
        }
      };

      if (document.readyState === "complete") {
        registerSW();
      } else {
        window.addEventListener("load", registerSW);
      }

      // Handle controller change (when new SW takes over)
      let refreshing = false;
      navigator.serviceWorker.addEventListener("controllerchange", () => {
        if (!refreshing) {
          refreshing = true;
          window.location.reload();
        }
      });
    }

    // Listen for PWA installation prompt (Chromium / Android)
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setIsInstallable(true);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setIsInstallable(false);
      setDeferredPrompt(null);
      setShowIOSPrompt(false);
    };

    // Online / Offline listeners
    const handleOnline = () => {
      setIsOnline(true);
      setNetworkToast({ message: "BACK ONLINE // RECONNECTED", type: "online" });
      setTimeout(() => setNetworkToast(null), 4000);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setNetworkToast({ message: "OFFLINE MODE // SERVING CACHED SHELF", type: "offline" });
      setTimeout(() => setNetworkToast(null), 5000);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  const promptInstall = async () => {
    if (isIOS && !isInstalled) {
      setShowIOSPrompt(true);
      return;
    }

    if (!deferredPrompt) return;
    try {
      await deferredPrompt.prompt();
      const choiceResult = await deferredPrompt.userChoice;
      if (choiceResult.outcome === "accepted") {
        setIsInstalled(true);
        setIsInstallable(false);
      }
      setDeferredPrompt(null);
    } catch (err) {
      console.error("[PWA] Install prompt failed:", err);
    }
  };

  const updateApp = () => {
    if (waitingWorker) {
      waitingWorker.postMessage({ type: "SKIP_WAITING" });
    } else {
      window.location.reload();
    }
  };

  return (
    <PWAContext.Provider
      value={{
        isInstallable: isInstallable || (isIOS && !isInstalled),
        isInstalled,
        isIOS,
        isOnline,
        isUpdateAvailable,
        promptInstall,
        updateApp,
        showIOSPrompt,
        setShowIOSPrompt,
        sharedContent,
        clearSharedContent,
      }}
    >
      {children}

      {/* ── Network Status Toast ── */}
      {networkToast && (
        <div
          role="status"
          aria-live="polite"
          style={{
            position: "fixed",
            bottom: "20px",
            left: "20px",
            zIndex: 99999,
            display: "flex",
            alignItems: "center",
            gap: "10px",
            background: networkToast.type === "online" ? "#B6FF3C" : "#FFE600",
            color: "#000000",
            border: "3px solid #000000",
            boxShadow: "4px 4px 0 #000000",
            padding: "10px 16px",
            fontFamily: "var(--font-mono, monospace)",
            fontSize: "12px",
            fontWeight: 900,
            letterSpacing: "0.5px",
            animation: "pwa-toast-in 0.2s ease-out",
          }}
        >
          {networkToast.type === "online" ? (
            <Wifi size={16} strokeWidth={3} />
          ) : (
            <WifiOff size={16} strokeWidth={3} />
          )}
          <span>{networkToast.message}</span>
        </div>
      )}

      {/* ── Update Available Notification Banner ── */}
      {isUpdateAvailable && (
        <aside
          role="alert"
          style={{
            position: "fixed",
            top: "16px",
            right: "16px",
            zIndex: 99999,
            display: "flex",
            alignItems: "center",
            gap: "12px",
            background: "#00F0FF",
            color: "#000000",
            border: "3px solid #000000",
            boxShadow: "5px 5px 0 #000000",
            padding: "12px 18px",
            fontFamily: "var(--font-mono, monospace)",
            maxWidth: "380px",
          }}
        >
          <RefreshCw size={18} strokeWidth={2.5} style={{ animation: "spin 3s linear infinite" }} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: "12px", fontWeight: 900 }}>NEW VERSION AVAILABLE</div>
            <div style={{ fontSize: "11px", fontWeight: 600, opacity: 0.85 }}>Reload to apply latest updates</div>
          </div>
          <button
            type="button"
            onClick={updateApp}
            style={{
              background: "#000000",
              color: "#00F0FF",
              border: "2px solid #000000",
              padding: "6px 10px",
              fontFamily: "inherit",
              fontSize: "11px",
              fontWeight: 900,
              cursor: "pointer",
            }}
          >
            RELOAD
          </button>
          <button
            type="button"
            onClick={() => setIsUpdateAvailable(false)}
            aria-label="Dismiss update notification"
            style={{
              background: "transparent",
              border: "none",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              padding: "2px",
            }}
          >
            <X size={16} color="#000000" />
          </button>
        </aside>
      )}

      {/* ── iOS Install Instructions Modal ── */}
      {showIOSPrompt && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="ios-pwa-title"
          onClick={() => setShowIOSPrompt(false)}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 99999,
            background: "rgba(0, 0, 0, 0.65)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px",
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "#F4F0EA",
              border: "4px solid #000000",
              boxShadow: "8px 8px 0 #000000",
              maxWidth: "420px",
              width: "100%",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                background: "#FFE600",
                borderBottom: "3px solid #000000",
                padding: "12px 16px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <div id="ios-pwa-title" style={{ fontFamily: "var(--font-mono, monospace)", fontSize: "14px", fontWeight: 900 }}>
                ⚡ INSTALL HOARD ON IOS
              </div>
              <button
                type="button"
                onClick={() => setShowIOSPrompt(false)}
                aria-label="Close dialog"
                style={{
                  background: "#000000",
                  color: "#FFE600",
                  border: "none",
                  cursor: "pointer",
                  width: "24px",
                  height: "24px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                ✕
              </button>
            </div>

            <div style={{ padding: "20px", fontFamily: "var(--font-mono, monospace)" }}>
              <p style={{ fontSize: "13px", marginBottom: "16px", lineHeight: 1.5, color: "#111" }}>
                Install HOARD to your iPhone or iPad home screen for standalone fullscreen speed and offline access:
              </p>

              <ol style={{ fontSize: "12px", lineHeight: 1.8, paddingLeft: "20px", marginBottom: "20px" }}>
                <li>
                  Tap the Safari <strong>Share</strong> button <ShareIcon size={14} style={{ display: "inline", verticalAlign: "middle", margin: "0 2px" }} /> in the toolbar.
                </li>
                <li>
                  Scroll down and tap <strong>Add to Home Screen</strong> <PlusSquare size={14} style={{ display: "inline", verticalAlign: "middle", margin: "0 2px" }} />.
                </li>
                <li>
                  Tap <strong>Add</strong> in the top right corner.
                </li>
              </ol>

              <button
                type="button"
                onClick={() => setShowIOSPrompt(false)}
                style={{
                  width: "100%",
                  background: "#B6FF3C",
                  color: "#000000",
                  border: "3px solid #000000",
                  boxShadow: "4px 4px 0 #000000",
                  padding: "12px",
                  fontSize: "13px",
                  fontWeight: 900,
                  cursor: "pointer",
                  textAlign: "center",
                }}
              >
                GOT IT
              </button>
            </div>
          </div>
        </div>
      )}
    </PWAContext.Provider>
  );
};
