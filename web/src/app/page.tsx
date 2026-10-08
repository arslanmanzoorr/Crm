import { Sidebar } from "@/components/sidebar";
import { Workspace } from "@/components/workspace";

export default function Home() {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="min-w-0 flex-1 px-4 py-6 sm:px-8">
        <div className="mx-auto max-w-[1400px]">
          <Workspace />
        </div>
      </main>
    </div>
  );
}
