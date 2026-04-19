import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  increment,
  onSnapshot,
  query,
  serverTimestamp,
  updateDoc,
  type Unsubscribe,
} from "firebase/firestore";
import type { DocumentData } from "firebase/firestore";
import { getDb } from "./client";
import type { Episode, Movie } from "@/types";

const COL = "movies";

function tsToIso(v: unknown): string | undefined {
  if (v && typeof v === "object" && "toDate" in v && typeof (v as { toDate: () => Date }).toDate === "function") {
    return (v as { toDate: () => Date }).toDate().toISOString();
  }
  return undefined;
}

export function docToMovie(id: string, data: DocumentData): Movie {
  return {
    _id: id,
    title: String(data.title ?? ""),
    description: String(data.description ?? ""),
    videoUrl: String(data.videoUrl ?? ""),
    thumbnailUrl: String(data.thumbnailUrl ?? ""),
    trailerUrl: data.trailerUrl ? String(data.trailerUrl) : undefined,
    genre: Array.isArray(data.genre) ? data.genre.map(String) : [],
    releaseYear: typeof data.releaseYear === "number" ? data.releaseYear : undefined,
    isFeatured: !!data.isFeatured,
    isSeries: !!data.isSeries,
    episodes: Array.isArray(data.episodes) ? (data.episodes as Episode[]) : undefined,
    views: typeof data.views === "number" ? data.views : 0,
    createdAt: tsToIso(data.createdAt) ?? new Date(0).toISOString(),
  };
}

export function listMoviesSorted(movies: Movie[]): Movie[] {
  return [...movies].sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
}

export function distinctGenres(movies: Movie[]): string[] {
  const set = new Set<string>();
  for (const m of movies) {
    for (const g of m.genre || []) {
      if (g) set.add(g);
    }
  }
  return [...set].sort();
}

export function filterMovies(
  movies: Movie[],
  opts: { q?: string; genre?: string; year?: number }
): Movie[] {
  let list = listMoviesSorted(movies);
  if (opts.q?.trim()) {
    const s = opts.q.trim().toLowerCase();
    list = list.filter(
      (m) =>
        m.title.toLowerCase().includes(s) || (m.description && m.description.toLowerCase().includes(s))
    );
  }
  if (opts.genre) {
    list = list.filter((m) => m.genre.includes(opts.genre!));
  }
  if (opts.year != null) {
    list = list.filter((m) => m.releaseYear === opts.year);
  }
  return list;
}

export function subscribeMovies(onData: (movies: Movie[]) => void, onError?: (e: Error) => void): Unsubscribe {
  const db = getDb();
  const q = query(collection(db, COL));
  return onSnapshot(
    q,
    (snap) => {
      const items: Movie[] = [];
      snap.forEach((d) => items.push(docToMovie(d.id, d.data())));
      onData(listMoviesSorted(items));
    },
    (err) => onError?.(err)
  );
}

export async function listAllMoviesOnce(): Promise<Movie[]> {
  const db = getDb();
  const snap = await getDocs(collection(db, COL));
  const items: Movie[] = [];
  snap.forEach((d) => items.push(docToMovie(d.id, d.data())));
  return listMoviesSorted(items);
}

export function subscribeMovie(
  id: string,
  onData: (movie: Movie | null) => void,
  onError?: (e: Error) => void
): Unsubscribe {
  const db = getDb();
  return onSnapshot(
    doc(db, COL, id),
    (snap) => {
      if (!snap.exists()) {
        onData(null);
        return;
      }
      onData(docToMovie(snap.id, snap.data()));
    },
    (err) => onError?.(err)
  );
}

export async function getMovieOnce(id: string): Promise<Movie | null> {
  const db = getDb();
  const ref = doc(db, COL, id);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  return docToMovie(snap.id, snap.data());
}

export async function incrementMovieViews(id: string): Promise<void> {
  const db = getDb();
  const ref = doc(db, COL, id);
  await updateDoc(ref, { views: increment(1) }).catch(() => {});
}

function stripUndefined<T extends Record<string, unknown>>(o: T): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(o)) {
    if (v !== undefined) out[k] = v;
  }
  return out;
}

export async function createMovie(payload: Record<string, unknown>): Promise<string> {
  const db = getDb();
  const ref = await addDoc(collection(db, COL), {
    ...stripUndefined(payload),
    views: 0,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

export async function updateMovie(id: string, patch: Record<string, unknown>): Promise<void> {
  const db = getDb();
  await updateDoc(doc(db, COL, id), stripUndefined(patch));
}

export async function deleteMovie(id: string): Promise<void> {
  const db = getDb();
  await deleteDoc(doc(db, COL, id));
}
