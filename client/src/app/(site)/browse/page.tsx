"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { distinctGenres, filterMovies, subscribeMovies } from "@/lib/firebase/movies";
import type { Movie } from "@/types";

const inputClass =
  "w-full rounded-xl border border-white/[0.08] bg-zinc-900/80 px-4 py-2.5 text-sm text-white shadow-inner outline-none transition placeholder:text-zinc-600 focus:border-netflix/50 focus:ring-2 focus:ring-netflix/20";

export default function BrowsePage() {
  const [q, setQ] = useState("");
  const [genre, setGenre] = useState("");
  const [year, setYear] = useState("");
  const [catalog, setCatalog] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const limit = 24;

  useEffect(() => {
    return subscribeMovies(
      (list) => {
        setCatalog(list);
        setLoading(false);
      },
      () => setLoading(false)
    );
  }, []);

  const genres = useMemo(() => distinctGenres(catalog), [catalog]);

  const filtered = useMemo(
    () =>
      filterMovies(catalog, {
        q: q.trim() || undefined,
        genre: genre || undefined,
        year: year ? Number(year) : undefined,
      }),
    [catalog, q, genre, year]
  );

  const pages = Math.max(1, Math.ceil(filtered.length / limit));
  const items = useMemo(() => {
    const p = Math.min(page, pages);
    const start = (p - 1) * limit;
    return filtered.slice(start, start + limit);
  }, [filtered, page, pages, limit]);

  useEffect(() => {
    setPage(1);
  }, [q, genre, year]);

  useEffect(() => {
    setPage((p) => Math.min(p, pages));
  }, [pages]);

  return (
    <div className="container mx-auto max-w-7xl px-4 py-10 md:px-8 md:py-14">
      <div className="mb-10 md:mb-12">
        <h1 className="text-3xl font-black tracking-tight md:text-4xl">Browse</h1>
        <p className="mt-2 max-w-xl text-sm text-zinc-400">Search and filter the catalog (updates live from Firebase).</p>
      </div>

      <div className="mb-10 grid gap-4 rounded-2xl border border-white/[0.06] bg-black/30 p-4 backdrop-blur-sm sm:p-6 md:grid-cols-[1fr_auto_auto] md:items-end">
        <label className="flex flex-col gap-2 text-xs font-medium uppercase tracking-wide text-zinc-500">
          Search
          <input
            value={q}
            onChange={(e) => {
              setPage(1);
              setQ(e.target.value);
            }}
            placeholder="Title…"
            className={inputClass}
          />
        </label>
        <label className="flex flex-col gap-2 text-xs font-medium uppercase tracking-wide text-zinc-500">
          Genre
          <select
            value={genre}
            onChange={(e) => {
              setPage(1);
              setGenre(e.target.value);
            }}
            className={inputClass}
          >
            <option value="">All genres</option>
            {genres.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-2 text-xs font-medium uppercase tracking-wide text-zinc-500">
          Year
          <input
            type="number"
            value={year}
            onChange={(e) => {
              setPage(1);
              setYear(e.target.value);
            }}
            placeholder="2024"
            className={`${inputClass} md:w-36`}
          />
        </label>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="skeleton aspect-[2/3] w-full rounded-xl" />
          ))}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            {items.map((m) => (
              <Link
                key={m._id}
                href={`/movie/${m._id}`}
                className="card-tile group relative aspect-[2/3]"
              >
                <Image
                  src={m.thumbnailUrl || "/placeholder.svg"}
                  alt={m.title}
                  fill
                  className="object-cover transition duration-500 group-hover:scale-105"
                  sizes="200px"
                  unoptimized={!m.thumbnailUrl || m.thumbnailUrl.startsWith("http")}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent opacity-90" />
                <p className="absolute bottom-3 left-3 right-3 text-xs font-semibold leading-snug text-white line-clamp-2">
                  {m.title}
                </p>
              </Link>
            ))}
          </div>
          <div className="mt-12 flex items-center justify-center gap-3">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="rounded-full border border-white/10 bg-white/5 px-5 py-2.5 text-sm font-medium transition hover:bg-white/10 disabled:opacity-30"
            >
              Previous
            </button>
            <span className="px-4 text-sm tabular-nums text-zinc-500">
              {page} / {pages}
            </span>
            <button
              type="button"
              disabled={page >= pages}
              onClick={() => setPage((p) => p + 1)}
              className="rounded-full border border-white/10 bg-white/5 px-5 py-2.5 text-sm font-medium transition hover:bg-white/10 disabled:opacity-30"
            >
              Next
            </button>
          </div>
        </>
      )}
    </div>
  );
}
