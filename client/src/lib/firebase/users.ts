import {
  doc,
  getDoc,
  onSnapshot,
  setDoc,
  updateDoc,
  collection,
  getDocs,
  type Unsubscribe,
} from "firebase/firestore";
import { getDb } from "./client";
import type { Movie } from "@/types";
import { getMovieOnce } from "./movies";

export type UserDoc = {
  name: string;
  email: string;
  role: "user" | "admin";
  favorites: string[];
  watchHistory: {
    movieId: string;
    progress: number;
    duration: number;
    episodeIndex: number | null;
    updatedAt?: string;
  }[];
};

const emptyUser = (email: string, name: string): UserDoc => ({
  name,
  email: email.toLowerCase(),
  role: "user",
  favorites: [],
  watchHistory: [],
});

export async function createUserProfile(uid: string, name: string, email: string): Promise<void> {
  const db = getDb();
  await setDoc(doc(db, "users", uid), emptyUser(email, name), { merge: true });
}

export function subscribeUserDoc(uid: string, onData: (u: UserDoc | null) => void): Unsubscribe {
  const db = getDb();
  return onSnapshot(doc(db, "users", uid), (snap) => {
    if (!snap.exists()) {
      onData(null);
      return;
    }
    const d = snap.data();
    onData({
      name: String(d.name ?? ""),
      email: String(d.email ?? ""),
      role: d.role === "admin" ? "admin" : "user",
      favorites: Array.isArray(d.favorites) ? d.favorites.map(String) : [],
      watchHistory: Array.isArray(d.watchHistory) ? d.watchHistory : [],
    });
  });
}

export async function getUserDocOnce(uid: string): Promise<UserDoc | null> {
  const db = getDb();
  const snap = await getDoc(doc(db, "users", uid));
  if (!snap.exists()) return null;
  const d = snap.data();
  return {
    name: String(d.name ?? ""),
    email: String(d.email ?? ""),
    role: d.role === "admin" ? "admin" : "user",
    favorites: Array.isArray(d.favorites) ? d.favorites.map(String) : [],
    watchHistory: Array.isArray(d.watchHistory) ? d.watchHistory : [],
  };
}

function upsertWatchEntry(
  history: UserDoc["watchHistory"],
  entry: {
    movieId: string;
    progress: number;
    duration: number;
    episodeIndex: number | null;
  }
): UserDoc["watchHistory"] {
  const id = entry.movieId;
  const list = [...(history || [])];
  const idx = list.findIndex((h) => h.movieId === id);
  const row = {
    movieId: id,
    progress: Math.max(0, entry.progress || 0),
    duration: Math.max(0, entry.duration || 0),
    episodeIndex: entry.episodeIndex == null ? null : Number(entry.episodeIndex),
    updatedAt: new Date().toISOString(),
  };
  if (idx >= 0) list[idx] = { ...list[idx], ...row };
  else list.push(row);
  return list;
}

export async function updateWatchProgress(
  uid: string,
  body: {
    movieId: string;
    progress: number;
    duration: number;
    episodeIndex?: number | null;
  }
): Promise<void> {
  const db = getDb();
  const ref = doc(db, "users", uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) return;
  const u = snap.data() as Record<string, unknown>;
  const prev = (Array.isArray(u.watchHistory) ? u.watchHistory : []) as UserDoc["watchHistory"];
  const watchHistory = upsertWatchEntry(prev, {
    movieId: body.movieId,
    progress: body.progress,
    duration: body.duration,
    episodeIndex: body.episodeIndex,
  });
  await updateDoc(ref, { watchHistory });
}

export async function toggleFavorite(uid: string, movieId: string): Promise<string[]> {
  const db = getDb();
  const ref = doc(db, "users", uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) return [];
  const d = snap.data();
  const favs = [...(Array.isArray(d.favorites) ? d.favorites.map(String) : [])];
  const i = favs.indexOf(movieId);
  if (i >= 0) favs.splice(i, 1);
  else favs.push(movieId);
  await updateDoc(ref, { favorites: favs });
  return favs;
}

export async function getWatchHistoryEntries(uid: string): Promise<
  { movie: Movie; progress: number; duration: number; episodeIndex: number | null }[]
> {
  const u = await getUserDocOnce(uid);
  if (!u) return [];
  const raw = u.watchHistory || [];
  const entries = await Promise.all(
    raw.map(async (h) => {
      const movie = await getMovieOnce(h.movieId);
      return movie
        ? {
            movie,
            progress: h.progress,
            duration: h.duration,
            episodeIndex: h.episodeIndex,
            updatedAt: h.updatedAt,
          }
        : null;
    })
  );
  return entries
    .filter((e): e is NonNullable<typeof e> => e != null && !!e.movie.title)
    .sort((a, b) => new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime());
}

export async function getFavoriteMovies(uid: string): Promise<Movie[]> {
  const u = await getUserDocOnce(uid);
  if (!u) return [];
  const items = await Promise.all((u.favorites || []).map((id) => getMovieOnce(id)));
  return items.filter((m): m is Movie => m != null);
}

/** Resolve favorites from ids using an in-memory movie list (avoids N+1 reads). */
export function mapFavoriteMovies(ids: string[], movies: Movie[]): Movie[] {
  const map = new Map(movies.map((m) => [m._id, m]));
  return ids.map((id) => map.get(id)).filter((m): m is Movie => m != null);
}

/** Resolve watch history using movie list cache. */
export function mapWatchHistory(
  raw: UserDoc["watchHistory"],
  movies: Movie[]
): { movie: Movie; progress: number; duration: number; episodeIndex: number | null }[] {
  const map = new Map(movies.map((m) => [m._id, m]));
  return raw
    .map((h) => {
      const movie = map.get(h.movieId);
      if (!movie) return null;
      return {
        movie,
        progress: h.progress,
        duration: h.duration,
        episodeIndex: h.episodeIndex,
        updatedAt: h.updatedAt,
      };
    })
    .filter((e): e is NonNullable<typeof e> => e != null)
    .sort((a, b) => new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime());
}

export async function countUsers(): Promise<number> {
  const db = getDb();
  const snap = await getDocs(collection(db, "users"));
  return snap.size;
}

export function subscribeUsersCount(onCount: (n: number) => void): Unsubscribe {
  const db = getDb();
  return onSnapshot(collection(db, "users"), (snap) => onCount(snap.size));
}
