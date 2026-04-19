"use client";

import { useEffect, useMemo, useState } from "react";
import { HeroBanner } from "@/components/home/HeroBanner";
import { MovieRow } from "@/components/home/MovieRow";
import { buildHomeFeed } from "@/lib/firebase/homeFeed";
import { subscribeMovies } from "@/lib/firebase/movies";
import { subscribeAppSettings, type AppSettings } from "@/lib/firebase/settings";
import type { Movie } from "@/types";

export default function HomePage() {
  const [movies, setMovies] = useState<Movie[]>([]);
  const [settings, setSettings] = useState<AppSettings>({ homeBannerMovieId: null });
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const u1 = subscribeMovies(
      (list) => {
        setMovies(list);
        setReady(true);
      },
      () => setReady(true)
    );
    const u2 = subscribeAppSettings((s) => setSettings(s), () => {});
    return () => {
      u1();
      u2();
    };
  }, []);

  const { hero, featured, rows } = useMemo(
    () => buildHomeFeed(movies, settings),
    [movies, settings]
  );

  const loading = !ready;

  return (
    <div className="container-fluid px-0">
      <HeroBanner movie={hero} loading={loading} />
      <div className="-mt-20 relative z-20 space-y-1 pb-20">
        <MovieRow title="Featured" movies={featured} loading={loading} />
        {rows.map((row) => (
          <MovieRow key={row.title} title={row.title} movies={row.items} loading={loading} />
        ))}
      </div>
    </div>
  );
}
