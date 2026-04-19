"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { MovieForm, toPayload, type MovieFormValues } from "@/components/admin/MovieForm";
import { subscribeMovie, updateMovie } from "@/lib/firebase/movies";

export default function EditMoviePage() {
  const params = useParams();
  const id = params.id as string;
  const router = useRouter();
  const [initial, setInitial] = useState<Partial<MovieFormValues> | null>(null);

  useEffect(() => {
    const unsub = subscribeMovie(
      id,
      (m) => {
        if (!m) {
          router.replace("/admin/movies");
          return;
        }
        setInitial({
          title: m.title,
          description: m.description || "",
          videoUrl: m.videoUrl,
          thumbnailUrl: m.thumbnailUrl || "",
          trailerUrl: m.trailerUrl || "",
          genre: (m.genre || []).join(", "),
          releaseYear: m.releaseYear != null ? String(m.releaseYear) : "",
          isFeatured: !!m.isFeatured,
          isSeries: !!m.isSeries,
          episodes: m.episodes || [],
        });
      },
      () => router.replace("/admin/movies")
    );
    return () => unsub();
  }, [id, router]);

  if (!initial) {
    return <div className="skeleton h-96 max-w-2xl rounded-lg" />;
  }

  return (
    <div>
      <h2 className="mb-8 text-xl font-semibold">Edit movie</h2>
      <MovieForm
        key={id}
        initial={initial}
        submitLabel="Save changes"
        onSubmit={async (values) => {
          await updateMovie(id, toPayload(values) as Record<string, unknown>);
          router.refresh();
        }}
      />
    </div>
  );
}
