"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Heart, Play } from "lucide-react";
import { incrementMovieViews, subscribeMovie } from "@/lib/firebase/movies";
import { subscribeUserDoc, toggleFavorite } from "@/lib/firebase/users";
import { useAuth } from "@/components/providers/AuthProvider";
import type { Movie } from "@/types";

export default function MovieDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const { user } = useAuth();
  const [movie, setMovie] = useState<Movie | null>(null);
  const [loading, setLoading] = useState(true);
  const [fav, setFav] = useState(false);
  const viewed = useRef<string | null>(null);

  useEffect(() => {
    viewed.current = null;
  }, [id]);

  useEffect(() => {
    if (!id) return;
    const unsub = subscribeMovie(
      id,
      (m) => {
        setMovie(m);
        setLoading(false);
        if (m && viewed.current !== m._id) {
          viewed.current = m._id;
          incrementMovieViews(m._id).catch(() => {});
        }
      },
      () => setLoading(false)
    );
    return () => unsub();
  }, [id]);

  useEffect(() => {
    if (!user) {
      setFav(false);
      return;
    }
    const unsub = subscribeUserDoc(user.id, (doc) => {
      if (!doc) return;
      setFav(doc.favorites.map(String).includes(String(id)));
    });
    return () => unsub();
  }, [user, id]);

  const toggleFav = async () => {
    if (!user) {
      window.location.href = "/login";
      return;
    }
    await toggleFavorite(user.id, id);
  };

  if (loading || !movie) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-12 md:px-8">
        <div className="skeleton mb-8 aspect-video w-full max-w-4xl rounded-2xl" />
        <div className="skeleton mb-4 h-12 w-2/3 rounded-lg" />
        <div className="skeleton h-4 w-full max-w-2xl rounded-md" />
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-7xl px-4 py-10 md:px-8 md:py-14">
      <div className="row g-5 g-lg-5">
        <div className="col-lg">
          <div className="card-tile relative mb-8 aspect-video overflow-hidden shadow-2xl">
            <Image
              src={movie.thumbnailUrl || "/placeholder.svg"}
              alt={movie.title}
              fill
              className="object-cover"
              priority
              unoptimized={!movie.thumbnailUrl || movie.thumbnailUrl.startsWith("http")}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
          </div>
          <h1 className="mb-4 text-3xl font-black tracking-tight md:text-5xl">{movie.title}</h1>
          <div className="mb-5 flex flex-wrap items-center gap-2 text-sm">
            {movie.releaseYear ? (
              <span className="rounded-full bg-white/10 px-3 py-1 text-zinc-300">{movie.releaseYear}</span>
            ) : null}
            {movie.genre?.map((g) => (
              <span key={g} className="rounded-full border border-white/10 px-3 py-1 text-zinc-200">
                {g}
              </span>
            ))}
          </div>
          <p className="max-w-3xl text-base leading-relaxed text-zinc-300">{movie.description}</p>
          {movie.isSeries && movie.episodes?.length ? (
            <div className="mt-10">
              <h2 className="mb-4 text-lg font-bold text-white">Episodes</h2>
              <ul className="space-y-2">
                {movie.episodes
                  .slice()
                  .sort((a, b) => a.episodeNumber - b.episodeNumber)
                  .map((ep, idx) => (
                    <li key={ep.episodeNumber}>
                      <Link
                        href={`/watch/${movie._id}?episode=${idx}`}
                        className="flex items-center justify-between rounded-xl border border-white/[0.06] bg-white/[0.03] px-4 py-3.5 transition hover:border-white/15 hover:bg-white/[0.06]"
                      >
                        <span className="text-sm text-zinc-200">
                          <span className="font-mono text-zinc-500">{ep.episodeNumber}.</span> {ep.title}
                        </span>
                        <Play className="h-4 w-4 shrink-0 text-netflix" />
                      </Link>
                    </li>
                  ))}
              </ul>
            </div>
          ) : null}
        </div>
        <div className="col-lg-auto" style={{ maxWidth: 360 }}>
          <div className="d-flex flex-column gap-3 position-lg-sticky" style={{ top: "6rem" }}>
            <Link
              href={`/watch/${movie._id}`}
              className="flex w-full items-center justify-center gap-2 rounded-full bg-netflix py-3.5 text-base font-bold text-white shadow-lg shadow-netflix/25 transition hover:scale-[1.02] hover:bg-netflix-dark active:scale-[0.98]"
            >
              <Play className="h-6 w-6 fill-white" />
              Watch Now
            </Link>
            <button
              type="button"
              onClick={toggleFav}
              className="flex w-full items-center justify-center gap-2 rounded-full border border-white/15 bg-white/[0.04] py-3.5 font-semibold text-white transition hover:border-white/25 hover:bg-white/[0.08]"
            >
              <Heart className={`h-5 w-5 ${fav ? "fill-netflix text-netflix" : ""}`} />
              {fav ? "Saved" : "Add to favorites"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
