import {
  countMovies,
  countUsers,
  findMovieById,
  getSettings,
  listMoviesSorted,
  updateSettings,
} from '../db/store.js';

export async function dashboard(req, res) {
  const topMovies = listMoviesSorted()
    .sort((a, b) => (b.views || 0) - (a.views || 0))
    .slice(0, 5);
  res.json({
    totalUsers: countUsers(),
    totalMovies: countMovies(),
    popular: topMovies.map((m) => ({
      id: m._id,
      title: m.title,
      views: m.views || 0,
      thumbnailUrl: m.thumbnailUrl,
    })),
  });
}

export async function readSettings(req, res) {
  res.json(getSettings());
}

export async function patchSettings(req, res) {
  const { homeBannerMovieId } = req.body;
  if (!('homeBannerMovieId' in req.body)) {
    return res.status(400).json({ message: 'homeBannerMovieId is required (null clears the banner pick)' });
  }
  if (homeBannerMovieId === null || homeBannerMovieId === '') {
    updateSettings({ homeBannerMovieId: null });
    return res.json(getSettings());
  }
  if (typeof homeBannerMovieId !== 'string') {
    return res.status(400).json({ message: 'homeBannerMovieId must be a string or null' });
  }
  if (!findMovieById(homeBannerMovieId)) {
    return res.status(400).json({ message: 'Movie not found' });
  }
  updateSettings({ homeBannerMovieId });
  res.json(getSettings());
}
