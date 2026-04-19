import { Navbar } from "@/components/layout/Navbar";

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen pt-[4.25rem]">
      <Navbar />
      <main className="container-fluid relative px-0">{children}</main>
      <footer className="mt-24 border-t border-white/[0.06] bg-black/20 py-12 text-center">
        <p className="text-xs text-zinc-500">Streamflix — demo project</p>
      </footer>
    </div>
  );
}
