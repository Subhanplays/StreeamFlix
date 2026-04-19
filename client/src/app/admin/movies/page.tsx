"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { deleteMovie, subscribeMovies } from "@/lib/firebase/movies";
import { getAppSettingsOnce, updateAppSettings } from "@/lib/firebase/settings";
import type { Movie } from "@/types";

export default function AdminMoviesPage() {
  const [items, setItems] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    return subscribeMovies((list) => {
      setItems(list);
      setLoading(false);
    });
  }, []);

  const remove = async (id: string) => {
    if (!confirm("Delete this movie?")) return;
    const settings = await getAppSettingsOnce();
    if (settings.homeBannerMovieId === id) {
      await updateAppSettings({ homeBannerMovieId: null });
    }
    await deleteMovie(id);
  };

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <h2 className="text-xl font-semibold">All movies</h2>
        <Link
          href="/admin/movies/new"
          className="inline-flex items-center gap-2 rounded bg-netflix px-4 py-2 text-sm font-semibold text-white hover:bg-netflix-dark"
        >
          <Plus className="h-4 w-4" />
          Add movie
        </Link>
      </div>
      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="skeleton h-16 w-full rounded-lg" />
          ))}
        </div>
      ) : (
        <div className="table-responsive rounded-lg ring-1 ring-zinc-800">
          <table className="table table-dark table-hover mb-0 align-middle">
            <thead className="text-secondary">
              <tr>
                <th className="p-3">Thumb</th>
                <th className="p-3">Title</th>
                <th className="p-3">Year</th>
                <th className="p-3">Featured</th>
                <th className="p-3 w-28" />
              </tr>
            </thead>
            <tbody>
              {items.map((m) => (
                <tr key={m._id} className="border-zinc-800">
                  <td className="p-3">
                    <div className="position-relative h-12 w-20 overflow-hidden rounded bg-zinc-800">
                      <Image
                        src={m.thumbnailUrl || "/placeholder.svg"}
                        alt=""
                        fill
                        className="object-cover"
                        unoptimized
                      />
                    </div>
                  </td>
                  <td className="p-3 font-medium">{m.title}</td>
                  <td className="p-3 text-zinc-400">{m.releaseYear ?? "—"}</td>
                  <td className="p-3">{m.isFeatured ? "Yes" : "—"}</td>
                  <td className="p-3">
                    <div className="d-flex gap-2">
                      <Link
                        href={`/admin/movies/${m._id}/edit`}
                        className="rounded p-2 hover:bg-zinc-800"
                        aria-label="Edit"
                      >
                        <Pencil className="h-4 w-4" />
                      </Link>
                      <button
                        type="button"
                        onClick={() => remove(m._id)}
                        className="rounded p-2 text-danger hover:bg-zinc-800"
                        aria-label="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
