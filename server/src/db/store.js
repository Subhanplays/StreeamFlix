import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, '..', '..', 'data');
const DB_PATH = join(DATA_DIR, 'db.json');

/** @type {{ users: object[], movies: object[], settings: { homeBannerMovieId: string | null } }} */
let cache = { users: [], movies: [], settings: { homeBannerMovieId: null } };

function normalizeDb(raw) {
  const users = Array.isArray(raw.users) ? raw.users : [];
  const movies = Array.isArray(raw.movies) ? raw.movies : [];
  const sid = raw.settings?.homeBannerMovieId;
  const settings = {
    homeBannerMovieId: typeof sid === 'string' && sid ? sid : null,
  };
  return { users, movies, settings };
}

function ensureFile() {
  mkdirSync(DATA_DIR, { recursive: true });
  if (!existsSync(DB_PATH)) {
    writeFileSync(
      DB_PATH,
      JSON.stringify({ users: [], movies: [], settings: { homeBannerMovieId: null } }, null, 2),
      'utf8'
    );
  }
}

export function initDb() {
  ensureFile();
  cache = normalizeDb(JSON.parse(readFileSync(DB_PATH, 'utf8')));
}

export function getSettings() {
  return { ...cache.settings };
}

export function updateSettings(patch) {
  Object.assign(cache.settings, patch);
  persist();
  return getSettings();
}

function persist() {
  writeFileSync(DB_PATH, JSON.stringify(cache, null, 2), 'utf8');
}

export function newId() {
  return crypto.randomUUID();
}

// --- Users ---
export function findUserByEmail(email) {
  const e = String(email).toLowerCase().trim();
  return cache.users.find((u) => u.email.toLowerCase() === e) || null;
}

export function findUserById(id) {
  return cache.users.find((u) => u._id === id) || null;
}

export function createUser({ name, email, password, role = 'user' }) {
  const user = {
    _id: newId(),
    name,
    email: String(email).toLowerCase().trim(),
    password,
    role,
    watchHistory: [],
    favorites: [],
  };
  cache.users.push(user);
  persist();
  return user;
}

export function updateUserById(id, updater) {
  const u = findUserById(id);
  if (!u) return null;
  Object.assign(u, typeof updater === 'function' ? updater(u) : updater);
  persist();
  return u;
}

export function countUsers() {
  return cache.users.length;
}

// --- Movies ---
export function findMovieById(id) {
  return cache.movies.find((m) => m._id === id) || null;
}

export function listMoviesSorted() {
  return [...cache.movies].sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
}

export function filterMovies({ q, genre, year }) {
  let list = listMoviesSorted();
  if (q && String(q).trim()) {
    const s = String(q).trim().toLowerCase();
    list = list.filter(
      (m) =>
        (m.title && m.title.toLowerCase().includes(s)) ||
        (m.description && m.description.toLowerCase().includes(s))
    );
  }
  if (genre) {
    list = list.filter((m) => Array.isArray(m.genre) && m.genre.includes(genre));
  }
  if (year != null) {
    list = list.filter((m) => m.releaseYear === year);
  }
  return list;
}

export function insertMovie(body) {
  const movie = {
    _id: newId(),
    ...body,
    views: body.views ?? 0,
    createdAt: new Date().toISOString(),
  };
  cache.movies.push(movie);
  persist();
  return movie;
}

export function insertMoviesIfEmpty(samples) {
  if (cache.movies.length > 0) {
    console.log('Movies already present, skipping insert');
    return;
  }
  for (const body of samples) {
    insertMovie(body);
  }
  console.log('Inserted sample movies');
}

export function updateMovieById(id, patch) {
  const m = findMovieById(id);
  if (!m) return null;
  Object.assign(m, patch);
  persist();
  return m;
}

export function deleteMovieById(id) {
  const i = cache.movies.findIndex((m) => m._id === id);
  if (i < 0) return false;
  cache.movies.splice(i, 1);
  persist();
  return true;
}

export function incrementMovieViews(id) {
  const m = findMovieById(id);
  if (!m) return null;
  m.views = (m.views || 0) + 1;
  persist();
  return m;
}

export function distinctGenres() {
  const set = new Set();
  for (const m of cache.movies) {
    if (Array.isArray(m.genre)) {
      for (const g of m.genre) {
        if (g) set.add(g);
      }
    }
  }
  return [...set].sort();
}

export function countMovies() {
  return cache.movies.length;
}

export function getDbPath() {
  return DB_PATH;
}
