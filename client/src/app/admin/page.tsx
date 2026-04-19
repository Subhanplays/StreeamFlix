"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { listMoviesSorted, subscribeMovies } from "@/lib/firebase/movies";
import { getAppSettingsOnce, subscribeAppSettings, updateAppSettings } from "@/lib/firebase/settings";
import { subscribeUsersCount } from "@/lib/firebase/users";
import type { Movie } from "@/types";

export default function AdminDashboardPage() {
  const [movies, setMovies] = useState<Movie[]>([]);
  const [userCount, setUserCount] = useState(0);
  const [bannerMovieId, setBannerMovieId] = useState<string>("");
  const [bannerSaving, setBannerSaving] = useState(false);
  const [bannerMsg, setBannerMsg] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const u1 = subscribeMovies((list) => {
      setMovies(list);
      setReady(true);
    });
    const u2 = subscribeUsersCount(setUserCount);
    const u3 = subscribeAppSettings((s) => setBannerMovieId(s.homeBannerMovieId ?? ""));
    getAppSettingsOnce().then((s) => setBannerMovieId(s.homeBannerMovieId ?? ""));
    return () => {
      u1();
      u2();
      u3();
    };
  }, []);

  const popular = useMemo(() => {
    return [...movies].sort((a, b) => (b.views || 0) - (a.views || 0)).slice(0, 5);
  }, [movies]);

  const movieChoices = useMemo(() => listMoviesSorted(movies).map((m) => ({ _id: m._id, title: m.title })), [movies]);

  const selectOptions =
    bannerMovieId && !movieChoices.some((m) => m._id === bannerMovieId)
      ? [{ _id: bannerMovieId, title: "(previous pick — choose again or automatic)" }, ...movieChoices]
      : movieChoices;

  if (!ready) {
    return (
      <div className="grid gap-6 md:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="skeleton h-28 rounded-lg" />
        ))}
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8 rounded-lg bg-zinc-900 p-6 ring-1 ring-zinc-800">
        <h2 className="mb-2 text-lg font-semibold text-white">Home page banner</h2>
        <p className="mb-4 text-sm text-zinc-400">
          Live-updates from Firebase: pick the hero title for the public home page, or leave automatic.
        </p>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <label className="block flex-1 text-sm text-zinc-400">
            <span className="mb-1 block text-zinc-500">Movie</span>
            <select
              value={bannerMovieId}
              onChange={(e) => {
                setBannerMovieId(e.target.value);
                setBannerMsg(null);
              }}
              className="w-full rounded bg-zinc-950 px-3 py-2.5 text-white ring-1 ring-zinc-700"
            >
              <option value="">Automatic</option>
              {selectOptions.map((m) => (
                <option key={m._id} value={m._id}>
                  {m.title}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            disabled={bannerSaving}
            onClick={async () => {
              setBannerMsg(null);
              setBannerSaving(true);
              try {
                await updateAppSettings({
                  homeBannerMovieId: bannerMovieId === "" ? null : bannerMovieId,
                });
                setBannerMsg("Saved.");
              } catch (ex) {
                setBannerMsg(ex instanceof Error ? ex.message : "Could not save");
              } finally {
                setBannerSaving(false);
              }
            }}
            className="rounded bg-netflix px-5 py-2.5 text-sm font-semibold text-white hover:bg-netflix-dark disabled:opacity-50"
          >
            {bannerSaving ? "Saving…" : "Save banner"}
          </button>
        </div>
        {bannerMsg ? <p className="mt-3 text-sm text-zinc-300">{bannerMsg}</p> : null}
      </div>
      <div className="mb-10 grid gap-6 md:grid-cols-3">
        <div className="rounded-lg bg-zinc-900 p-6 ring-1 ring-zinc-800">
          <p className="text-sm text-zinc-400">Total users</p>
          <p className="text-4xl font-bold">{userCount}</p>
        </div>
        <div className="rounded-lg bg-zinc-900 p-6 ring-1 ring-zinc-800">
          <p className="text-sm text-zinc-400">Total movies</p>
          <p className="text-4xl font-bold">{movies.length}</p>
        </div>
        <div className="rounded-lg bg-zinc-900 p-6 ring-1 ring-zinc-800">
          <p className="text-sm text-zinc-400">Popular (by views)</p>
          <p className="text-lg font-semibold text-zinc-200">Top 5 below</p>
        </div>
      </div>
      <h2 className="mb-4 text-xl font-semibold">Most popular content</h2>
      <div className="row row-cols-2 row-cols-lg-5 g-3">
        {popular.map((m) => (
          <div key={m._id} className="col">
            <Link
              href={`/admin/movies/${m._id}/edit`}
              className="overflow-hidden rounded-lg bg-zinc-900 ring-1 ring-zinc-800 d-block"
            >
              <div className="position-relative aspect-video">
                <Image
                  src={m.thumbnailUrl || "/placeholder.svg"}
                  alt={m.title}
                  fill
                  className="object-cover"
                  unoptimized
                />
              </div>
              <div className="p-3">
                <p className="truncate font-medium">{m.title}</p>
                <p className="text-sm text-zinc-500">{m.views} views</p>
              </div>
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}
