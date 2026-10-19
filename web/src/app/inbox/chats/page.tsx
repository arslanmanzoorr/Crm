import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ChatMode, LiveChats } from "@/components/live-chats";
import { Skeleton } from "@/components/ui";
import { dbEnabled, getWebChats, isOwnerOrAdmin } from "@/lib/db";

export const metadata: Metadata = { title: "Website chats" };

export default function ChatsPage() {
  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <Link href="/inbox" className="text-sm text-muted hover:text-ink">Inbox</Link>
          <h1 className="text-4xl font-light">Website chats</h1>
          <p className="mt-1 max-w-2xl text-muted">Every chat from your website, as it happens. Take one over and the assistant stops answering it; your replies show on the visitor&apos;s page within seconds.</p>
        </div>
      </header>
      {dbEnabled ? <Suspense fallback={<Skeleton className="h-[60dvh]" />}><Body /></Suspense> : <p className="text-muted">Connect the database to see chats.</p>}
    </div>
  );
}

async function Body() {
  const [{ chats, mode }, admin] = await Promise.all([getWebChats(), isOwnerOrAdmin()]);
  return (
    <>
      <ChatMode mode={mode} admin={admin} />
      <LiveChats chats={chats} />
    </>
  );
}
