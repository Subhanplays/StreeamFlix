"use client";

import { useRouter } from "next/navigation";
import { MovieForm, toPayload } from "@/components/admin/MovieForm";
import { createMovie } from "@/lib/firebase/movies";

export default function NewMoviePage() {
  const router = useRouter();

  return (
    <div>
      <h2 className="mb-8 text-xl font-semibold">Add movie</h2>
      <MovieForm
        submitLabel="Create movie"
        onSubmit={async (values) => {
          const id = await createMovie(toPayload(values) as Record<string, unknown>);
          if (!id) throw new Error("Invalid response");
          router.push(`/admin/movies/${id}/edit`);
        }}
      />
    </div>
  );
}
