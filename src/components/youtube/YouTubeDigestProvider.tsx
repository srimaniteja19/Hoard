"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import { YouTubeDigestModal } from "./YouTubeDigestModal";
import { extractYouTubeVideoId } from "@/lib/cleanTitle";

interface YouTubeDigestContextType {
  openYouTubeDigest: (url: string, initialTitle?: string) => void;
  closeYouTubeDigest: () => void;
  isOpen: boolean;
  currentUrl: string | null;
  savedVideoIds: Set<string>;
  isDigestSaved: (urlOrId: string) => boolean;
  markDigestSaved: (videoId: string) => void;
  markDigestRemoved: (videoId: string) => void;
}

const YouTubeDigestContext = createContext<YouTubeDigestContextType | null>(null);

export const YouTubeDigestProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [currentUrl, setCurrentUrl] = useState<string | null>(null);
  const [initialTitle, setInitialTitle] = useState<string | undefined>(undefined);
  const [savedVideoIds, setSavedVideoIds] = useState<Set<string>>(new Set());
  const savedVideoIdsRef = useRef<Set<string>>(new Set());

  // Keep ref in sync
  savedVideoIdsRef.current = savedVideoIds;

  // Load saved video IDs on mount
  useEffect(() => {
    let mounted = true;
    async function loadSaved() {
      try {
        const res = await fetch("/api/youtube/saved");
        if (res.ok) {
          const data = await res.json();
          if (mounted && Array.isArray(data.videoIds)) {
            const nextSet = new Set<string>(data.videoIds);
            savedVideoIdsRef.current = nextSet;
            setSavedVideoIds(nextSet);
          }
        }
      } catch {
        // ignore
      }
    }
    loadSaved();
    return () => {
      mounted = false;
    };
  }, []);

  const isDigestSaved = useCallback((urlOrId: string) => {
    if (!urlOrId) return false;
    const videoId =
      urlOrId.length === 11 && !urlOrId.includes("/")
        ? urlOrId
        : extractYouTubeVideoId(urlOrId);
    if (!videoId) return false;
    return savedVideoIdsRef.current.has(videoId);
  }, []);

  const markDigestSaved = useCallback((videoId: string) => {
    if (!videoId) return;
    if (savedVideoIdsRef.current.has(videoId)) return;
    const nextSet = new Set(savedVideoIdsRef.current);
    nextSet.add(videoId);
    savedVideoIdsRef.current = nextSet;
    setSavedVideoIds(nextSet);
  }, []);

  const markDigestRemoved = useCallback((videoId: string) => {
    if (!videoId) return;
    if (!savedVideoIdsRef.current.has(videoId)) return;
    const nextSet = new Set(savedVideoIdsRef.current);
    nextSet.delete(videoId);
    savedVideoIdsRef.current = nextSet;
    setSavedVideoIds(nextSet);
  }, []);

  const openYouTubeDigest = useCallback((url: string, title?: string) => {
    if (!url) return;
    setCurrentUrl(url);
    setInitialTitle(title);
    setIsOpen(true);
  }, []);

  const closeYouTubeDigest = useCallback(() => {
    setIsOpen(false);
    setCurrentUrl(null);
    setInitialTitle(undefined);
  }, []);

  return (
    <YouTubeDigestContext.Provider
      value={{
        openYouTubeDigest,
        closeYouTubeDigest,
        isOpen,
        currentUrl,
        savedVideoIds,
        isDigestSaved,
        markDigestSaved,
        markDigestRemoved,
      }}
    >
      {children}
      <YouTubeDigestModal
        isOpen={isOpen}
        url={currentUrl}
        initialTitle={initialTitle}
        onClose={closeYouTubeDigest}
      />
    </YouTubeDigestContext.Provider>
  );
};

const defaultContext: YouTubeDigestContextType = {
  openYouTubeDigest: () => {},
  closeYouTubeDigest: () => {},
  isOpen: false,
  currentUrl: null,
  savedVideoIds: new Set(),
  isDigestSaved: () => false,
  markDigestSaved: () => {},
  markDigestRemoved: () => {},
};

export function useYouTubeDigest(): YouTubeDigestContextType {
  const context = useContext(YouTubeDigestContext);
  return context || defaultContext;
}
