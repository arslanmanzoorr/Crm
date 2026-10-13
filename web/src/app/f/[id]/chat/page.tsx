import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { WebChat } from "@/components/web-chat";

export const metadata: Metadata = { title: "Ask a question", robots: { index: false } };

export default function ChatPage({ params }: PageProps<"/f/[id]/chat">) {
  return (
    <div className="mx-auto flex min-h-[80dvh] w-full max-w-lg flex-col justify-center py-8">
      <Suspense><Chat params={params} /></Suspense>
    </div>
  );
}

async function Chat({ params }: { params: PageProps<"/f/[id]/chat">["params"] }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  return <WebChat formId={id} />;
}
