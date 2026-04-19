"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/providers/AuthProvider";
import { subscribeMovies } from "@/lib/firebase/movies";
import {
  mapFavoriteMovies,
  mapWatchHistory,
  subscribeUserDoc,
  type UserDoc,
} from "@/lib/firebase/users";
import type { Movie } from "@/types";

export default function ProfilePage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [movies, setMovies] = useState<Movie[]>([]);
  const [userDoc, setUserDoc] = useState<UserDoc | null>(null);
  const [history, setHistory] = useState<
    { movie: Movie; progress: number; duration: number; episodeIndex: number | null }[]
  >([]);
  const [favorites, setFavorites] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    return subscribeMovies((list) => setMovies(list));
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.replace("/login");
      return;
    }
    const unsub = subscribeUserDoc(user.id, (doc) => {
      setUserDoc(doc);
      setLoading(false);
    });
    return () => unsub();
  }, [user, authLoading, router]);

  useEffect(() => {
    if (!userDoc) {
      setHistory([]);
      setFavorites([]);
      return;
    }
    setHistory(mapWatchHistory(userDoc.watchHistory, movies));
    setFavorites(mapFavoriteMovies(userDoc.favorites, movies));
  }, [userDoc, movies]);

  if (authLoading || !user) {
    return (
      <div className="container mx-auto max-w-7xl px-4 py-16 md:px-8">
        <div className="skeleton mb-8 h-10 w-48" />
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-7xl px-4 py-10 md:px-8">
      <h1 className="mb-2 text-3xl font-bold">Profile</h1>
      <p className="mb-10 text-zinc-400">
        {user.name} · {user.email}
      </p>

      <section className="mb-12">
        <h2 className="mb-4 text-xl font-semibold">Continue watching</h2>
        {loading ? (
          <div className="flex gap-4 overflow-hidden">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="skeleton h-40 w-64 shrink-0 rounded-lg" />
            ))}
          </div>
        ) : history.length === 0 ? (
          <p className="text-zinc-500">No history yet. Start watching something!</p>
        ) : (
          <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
            {history.map((h) => (
              <Link
                key={h.movie._id}
                href={
                  h.episodeIndex != null && h.movie.isSeries
                    ? `/watch/${h.movie._id}?episode=${h.episodeIndex}`
                    : `/watch/${h.movie._id}`
                }
                className="relative h-40 w-64 shrink-0 overflow-hidden rounded-lg bg-zinc-800"
              >
                <Image
                  src={h.movie.thumbnailUrl || "/placeholder.svg"}
                  alt={h.movie.title}
                  fill
                  className="object-cover"
                  unoptimized
                />
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-zinc-700">
                  <div
                    className="h-full bg-netflix"
                    style={{
                      width: `${h.duration ? Math.min(100, (h.progress / h.duration) * 100) : 0}%`,
                    }}
                  />
                </div>
                <p className="absolute bottom-2 left-2 right-2 text-xs font-semibold drop-shadow">
                  {h.movie.title}
                </p>
              </Link>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-4 text-xl font-semibold">Favorites</h2>
        {loading ? (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="skeleton aspect-[2/3] rounded-lg" />
            ))}
          </div>
        ) : favorites.length === 0 ? (
          <p className="text-zinc-500">No favorites yet.</p>
        ) : (
          <div className="row row-cols-2 row-cols-md-4 g-3">
            {favorites.map((m) => (
              <div key={m._id} className="col">
                <Link
                  href={`/movie/${m._id}`}
                  className="relative aspect-[2/3] block overflow-hidden rounded-lg bg-zinc-800"
                >
                  <Image
                    src={m.thumbnailUrl || "/placeholder.svg"}
                    alt={m.title}
                    fill
                    className="object-cover"
                    unoptimized
                  />
                </Link>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
