import type { Movie } from "@/types";
import { filterMovies, listMoviesSorted } from "./movies";
import type { AppSettings } from "./settings";

export function buildHomeFeed(movies: Movie[], settings: AppSettings) {
  const all = listMoviesSorted(movies);
  const featured = all.filter((m) => m.isFeatured).slice(0, 12);
  const trending = all.slice(0, 40);
  const flatGenres = [...new Set(all.flatMap((m) => m.genre || []))].sort().slice(0, 4);
  const rows = flatGenres.map((g) => ({
    title: g,
    items: filterMovies(all, { genre: g }).slice(0, 12),
  }));
  const feat = featured.length ? featured : trending.slice(0, 6);
  const bannerPick = settings.homeBannerMovieId
    ? all.find((m) => m._id === settings.homeBannerMovieId)
    : undefined;
  const hero = bannerPick || feat[0] || trending[0] || null;
  return {
    hero,
    featured: feat,
    trending: trending.slice(0, 12),
    rows: rows.filter((r) => r.items.length),
  };
}
