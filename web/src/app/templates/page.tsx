import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { TemplateEditor, DeleteTemplate } from "@/components/template-editor";
import { Skeleton } from "@/components/ui";
import { dbEnabled, getTemplates, isOwnerOrAdmin } from "@/lib/db";

export const metadata: Metadata = { title: "Document templates" };

export default function TemplatesPage({ searchParams }: PageProps<"/templates">) {
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <header>
        <h1 className="text-4xl font-light">Document templates</h1>
        <p className="mt-2 text-sm text-muted">Paste your own forms and letters (from your broker, attorney or state association) and add fields like {"{{client_name}}"}. Any deal can then fill one in and print it. Estos doesn&apos;t supply legal forms or wording.</p>
      </header>
      {dbEnabled ? <Suspense fallback={<Skeleton className="h-64" />}><List searchParams={searchParams} /></Suspense> : <p className="text-muted">Connect Supabase to save templates.</p>}
    </div>
  );
}

async function List({ searchParams }: { searchParams: PageProps<"/templates">["searchParams"] }) {
  const [templates, admin, { edit }] = await Promise.all([getTemplates(), isOwnerOrAdmin(), searchParams]);
  const current = templates.find((t) => t.id === edit);
  return (
    <>
      {templates.length > 0 && (
        <ul className="flex flex-col divide-y divide-line/5 overflow-hidden rounded-card bg-surface-2">
          {templates.map((t) => (
            <li key={t.id} className="flex min-h-12 flex-wrap items-center justify-between gap-2 px-5 py-2 text-sm">
              <span className="font-medium">{t.name} {t.state && <span className="font-normal text-muted">· {t.state}</span>}</span>
              {admin && <span className="flex items-center gap-2"><Link href={`/templates?edit=${t.id}`} className="text-muted underline hover:text-ink">Edit</Link><DeleteTemplate id={t.id} name={t.name} /></span>}
            </li>
          ))}
        </ul>
      )}
      {admin ? <TemplateEditor key={current?.id ?? "new"} template={current} /> : templates.length === 0 && <p className="text-sm text-muted">No templates yet. An owner or admin can add them.</p>}
    </>
  );
}
