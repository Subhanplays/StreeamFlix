import {
  insertMovie,
  deleteMovieById,
  distinctGenres,
  filterMovies,
  findMovieById,
  getSettings,
  incrementMovieViews,
  listMoviesSorted,
  updateMovieById,
  updateSettings,
} from '../db/store.js';

export async function listMovies(req, res) {
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 20));
  const skip = (page - 1) * limit;
  const filtered = filterMovies({
    q: req.query.q,
    genre: req.query.genre,
    year: req.query.year ? parseInt(req.query.year, 10) : undefined,
  });
  const total = filtered.length;
  const items = filtered.slice(skip, skip + limit);
  res.json({ items, page, limit, total, pages: Math.ceil(total / limit) || 1 });
}

export async function featuredMovies(req, res) {
  const items = listMoviesSorted()
    .filter((m) => m.isFeatured)
    .slice(0, 12);
  res.json({ items });
}

export async function homeFeed(req, res) {
  const all = listMoviesSorted();
  const featured = all.filter((m) => m.isFeatured).slice(0, 12);
  const trending = all.slice(0, 40);
  const flatGenres = distinctGenres().slice(0, 4);
  const rows = flatGenres.map((g) => ({
    title: g,
    items: filterMovies({ genre: g }).slice(0, 12),
  }));
  const feat = featured.length ? featured : trending.slice(0, 6);
  const bannerId = getSettings().homeBannerMovieId;
  const bannerPick = bannerId ? findMovieById(bannerId) : null;
  const hero = bannerPick || feat[0] || trending[0] || null;
  res.json({
    hero,
    featured: feat,
    trending: trending.slice(0, 12),
    rows: rows.filter((r) => r.items.length),
  });
}

export async function getMovie(req, res) {
  const movie = findMovieById(req.params.id);
  if (!movie) {
    return res.status(404).json({ message: 'Movie not found' });
  }
  incrementMovieViews(req.params.id);
  const fresh = findMovieById(req.params.id);
  res.json({ movie: fresh });
}

export async function createMovie(req, res) {
  const movie = insertMovie(req.body);
  res.status(201).json({ movie });
}

export async function updateMovie(req, res) {
  const movie = updateMovieById(req.params.id, req.body);
  if (!movie) {
    return res.status(404).json({ message: 'Movie not found' });
  }
  res.json({ movie });
}

export async function deleteMovie(req, res) {
  const id = req.params.id;
  const ok = deleteMovieById(id);
  if (!ok) {
    return res.status(404).json({ message: 'Movie not found' });
  }
  if (getSettings().homeBannerMovieId === id) {
    updateSettings({ homeBannerMovieId: null });
  }
  res.json({ message: 'Deleted' });
}

export async function genres(req, res) {
  res.json({ genres: distinctGenres() });
}
