"use client";

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { VideoPlayer } from "@/components/video/VideoPlayer";
import { subscribeMovie } from "@/lib/firebase/movies";
import { getWatchHistoryEntries, updateWatchProgress } from "@/lib/firebase/users";
import { useAuth } from "@/components/providers/AuthProvider";
import type { Movie } from "@/types";

function WatchPageInner() {
  const params = useParams();
  const searchParams = useSearchParams();
  const id = params.id as string;
  const episodeQ = searchParams.get("episode");
  const { user } = useAuth();
  const [movie, setMovie] = useState<Movie | null>(null);
  const [episodeIndex, setEpisodeIndex] = useState(0);
  const [startTime, setStartTime] = useState(0);
  const progressTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastReport = useRef({ t: 0, c: 0, d: 0 });

  useEffect(() => {
    if (!id) return;
    const unsub = subscribeMovie(id, (m) => {
      if (!m) return;
      setMovie(m);
      const idx = episodeQ != null ? Math.max(0, parseInt(episodeQ, 10) || 0) : 0;
      setEpisodeIndex(idx);
    });
    return () => unsub();
  }, [id, episodeQ]);

  const currentUrl = useMemo(() => {
    if (!movie) return "";
    if (movie.isSeries && movie.episodes?.length) {
      const ep = movie.episodes[episodeIndex];
      return ep?.videoUrl || movie.videoUrl;
    }
    return movie.videoUrl;
  }, [movie, episodeIndex]);

  useEffect(() => {
    if (!movie || !user) return;
    getWatchHistoryEntries(user.id)
      .then((entries) => {
        const entry = entries.find((e) => e.movie._id === movie._id);
        if (entry && entry.progress > 5) {
          const ei = entry.episodeIndex;
          if (typeof ei === "number" && movie.isSeries && movie.episodes?.length) {
            setEpisodeIndex(Math.min(ei, movie.episodes.length - 1));
          }
          setStartTime(entry.progress);
        }
      })
      .catch(() => {});
  }, [movie, user]);

  const reportProgress = useCallback(
    (current: number, duration: number) => {
      if (!movie || !user || !duration) return;
      lastReport.current = { t: Date.now(), c: current, d: duration };
      updateWatchProgress(user.id, {
        movieId: movie._id,
        progress: current,
        duration,
        episodeIndex: movie.isSeries ? episodeIndex : undefined,
      }).catch(() => {});
    },
    [movie, user, episodeIndex]
  );

  const onTimeUpdate = useCallback((current: number, duration: number) => {
    lastReport.current = { t: Date.now(), c: current, d: duration };
  }, []);

  useEffect(() => {
    progressTimer.current = setInterval(() => {
      const { c, d } = lastReport.current;
      if (c > 0 && d > 0 && user && movie) {
        reportProgress(c, d);
      }
    }, 10000);
    return () => {
      if (progressTimer.current) clearInterval(progressTimer.current);
    };
  }, [movie, user, reportProgress]);

  const handleEnded = useCallback(() => {
    if (!movie?.isSeries || !movie.episodes?.length) return;
    if (episodeIndex < movie.episodes.length - 1) {
      setEpisodeIndex((i) => i + 1);
      setStartTime(0);
    }
  }, [movie, episodeIndex]);

  if (!movie) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black">
        <div className="skeleton h-[50vh] max-h-[480px] w-full max-w-5xl rounded-xl" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black">
      <header className="sticky top-0 z-30 border-b border-white/10 bg-black/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-3 py-3 sm:px-4">
          <Link
            href={`/movie/${movie._id}`}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm text-zinc-400 transition hover:bg-white/10 hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Link>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-sm font-semibold text-white sm:text-base">{movie.title}</h1>
            {movie.isSeries && movie.episodes?.length ? (
              <p className="truncate text-xs text-zinc-500">
                {episodeIndex + 1}/{movie.episodes.length}
                {movie.episodes[episodeIndex]?.title ? ` · ${movie.episodes[episodeIndex].title}` : ""}
              </p>
            ) : null}
          </div>
        </div>
      </header>
      <div className="mx-auto max-w-6xl px-3 pb-10 pt-4 sm:px-4">
        <VideoPlayer
          key={`${currentUrl}-${episodeIndex}`}
          src={currentUrl}
          poster={movie.thumbnailUrl}
          startTime={startTime}
          autoPlay
          onTimeUpdate={onTimeUpdate}
          onEnded={handleEnded}
          onNextEpisode={
            movie.isSeries && movie.episodes && episodeIndex < movie.episodes.length - 1
              ? () => {
                  setEpisodeIndex((i) => i + 1);
                  setStartTime(0);
                }
              : undefined
          }
        />
      </div>
    </div>
  );
}

export default function WatchPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-black">
          <div className="skeleton h-64 w-full max-w-5xl rounded-xl" />
        </div>
      }
    >
      <WatchPageInner />
    </Suspense>
  );
}
