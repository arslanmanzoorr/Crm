import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { CopyButton, McpTokens, OAuthApps } from "@/components/mcp-connect";
import { Skeleton } from "@/components/ui";
import { dbEnabled, getMcpTokens, getOAuthApps } from "@/lib/db";
import { TOOLS } from "@/lib/mcp";

export const metadata: Metadata = { title: "Connect your AI" };

const card = "flex flex-col gap-3 rounded-card bg-surface-2 p-5 text-sm";
const pre = "overflow-x-auto rounded-xl bg-surface-1 p-3 text-xs text-ink";

export default function ConnectAiPage() {
  return (
    <div className="mx-auto flex max-w-xl flex-col gap-6">
      <header>
        <Link href="/account" className="text-sm text-muted hover:text-ink">Account</Link>
        <h1 className="text-4xl font-light">Connect your AI</h1>
        <p className="mt-2 text-muted">
          Use Estos from Claude, ChatGPT, Cursor or any app that speaks MCP. Ask it to plan your day, find a buyer the right home or log a call.
          It sees and does only what you can in Estos, on your active team.
        </p>
      </header>
      {dbEnabled ? <Suspense fallback={<Skeleton className="h-96" />}><Body /></Suspense> : <p className="text-muted">Connect the database first.</p>}
    </div>
  );
}

async function Body() {
  const [tokens, apps] = await Promise.all([getMcpTokens(), getOAuthApps()]);
  const url = `${process.env.SITE_URL ?? "https://estos.app"}/api/mcp`;
  const reads = TOOLS.filter((t) => !t.write), writes = TOOLS.filter((t) => t.write);
  return (
    <>
      <section aria-labelledby="address" className="flex flex-col gap-2">
        <h2 id="address" className="text-sm text-muted">Server address</h2>
        <div className={`${card} sm:flex-row sm:items-center sm:justify-between`}>
          <code className="min-w-0 break-all text-ink">{url}</code>
          <CopyButton text={url} label="Copy address" />
        </div>
      </section>

      <section aria-labelledby="signin" className="flex flex-col gap-2">
        <h2 id="signin" className="text-sm text-muted">Connect by signing in</h2>
        {apps ? (
          <>
            <div className={card}>
              <p>Best for Claude and ChatGPT. Add the address above as a connector, then sign in to Estos when asked and approve.</p>
              <ul className="flex list-disc flex-col gap-1.5 pl-5 text-muted">
                <li><span className="text-ink">Claude:</span> Settings → Connectors → Add custom connector.</li>
                <li><span className="text-ink">ChatGPT:</span> Settings → Apps and connectors → Create, with the address as the MCP server URL.</li>
                <li><span className="text-ink">Claude Code:</span> run the line below, then <code>/mcp</code> to sign in.</li>
              </ul>
              <pre className={pre}>{`claude mcp add --transport http estos ${url}`}</pre>
            </div>
            <h3 className="mt-2 text-sm text-muted">Connected apps</h3>
            <OAuthApps apps={apps} />
          </>
        ) : (
          <p className={`${card} text-muted`}>Signing in from Claude and ChatGPT is almost ready. Until then, connect with a personal token below from any app that lets you add a header.</p>
        )}
      </section>

      <section aria-labelledby="tokens" className="flex flex-col gap-2">
        <h2 id="tokens" className="text-sm text-muted">Personal tokens</h2>
        <p className="text-sm text-muted">For Cursor, VS Code, Claude Code and other apps that take a header. Each token works only for you, can be read-only, and expires.</p>
        <McpTokens tokens={tokens} />
        <details className={`${card} text-muted`}>
          <summary className="cursor-pointer text-ink">How to add a token</summary>
          <p>Most apps take a JSON block like this (Cursor: Settings → MCP; VS Code: <code>.vscode/mcp.json</code> under <code>servers</code>):</p>
          <pre className={pre}>{`{
  "mcpServers": {
    "estos": {
      "url": "${url}",
      "headers": { "Authorization": "Bearer estos_…" }
    }
  }
}`}</pre>
          <p>Claude Code:</p>
          <pre className={pre}>{`claude mcp add --transport http estos ${url} \\
  --header "Authorization: Bearer estos_…"`}</pre>
        </details>
      </section>

      <section aria-labelledby="can" className="flex flex-col gap-2">
        <h2 id="can" className="text-sm text-muted">What your AI can do</h2>
        <div className={card}>
          <p className="font-medium">Read</p>
          <ul className="flex flex-wrap gap-1.5">{reads.map((t) => <li key={t.name} className="rounded-full bg-surface-1 px-3 py-1">{t.title}</li>)}</ul>
          <p className="mt-2 font-medium">Change, with a read-and-change token or sign-in</p>
          <ul className="flex flex-wrap gap-1.5">{writes.map((t) => <li key={t.name} className="rounded-full bg-surface-1 px-3 py-1">{t.title}</li>)}</ul>
          <ul className="mt-2 flex list-disc flex-col gap-1.5 pl-5 text-muted">
            <li>It never sends texts, emails or calls. It drafts; you send.</li>
            <li>It can&apos;t delete anything, and never records consent a client didn&apos;t give.</li>
            <li>Every lead comes with who may be called, texted or emailed right now (consent, Do Not Call checks, your calling hours).</li>
            <li>Leads it adds say so on their timeline, and you can cut its access any time here.</li>
          </ul>
        </div>
      </section>
    </>
  );
}
