import { useState } from "react";
import Navbar from "@/components/navbar";
import { Copy, Check, ExternalLink, Terminal, Folder, Play, AlertTriangle, Info } from "lucide-react";

function CopyCmd({ value, testId }: { value: string; testId: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try { await navigator.clipboard.writeText(value); }
    catch { const el = document.createElement("textarea"); el.value = value; document.body.appendChild(el); el.select(); document.execCommand("copy"); document.body.removeChild(el); }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button
      onClick={copy}
      className="shrink-0 p-1.5 rounded text-white/40 hover:text-white/80 hover:bg-white/10 transition-all"
      data-testid={testId}
      title="Copy"
    >
      {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
    </button>
  );
}

function CommandBlock({ label, value, icon: Icon, testId }: { label: string; value: string; icon: any; testId: string }) {
  return (
    <div className="mb-3">
      <div className="flex items-center gap-1.5 mb-1.5 text-xs text-white/40 font-medium uppercase tracking-wide">
        <Icon className="w-3 h-3" />
        {label}
      </div>
      <div className="flex items-center gap-2 bg-black/40 border border-white/10 rounded-lg px-3 py-2.5">
        <code className="text-green-400 text-sm font-mono flex-1 break-all leading-relaxed" data-testid={`text-${testId}`}>
          {value}
        </code>
        <CopyCmd value={value} testId={`copy-${testId}`} />
      </div>
    </div>
  );
}

function Step({ n, text }: { n: number; text: string }) {
  return (
    <div className="flex items-start gap-3">
      <span className="shrink-0 w-6 h-6 rounded-full bg-white/10 text-white/60 text-xs font-bold flex items-center justify-center mt-0.5">{n}</span>
      <p className="text-white/60 text-sm leading-relaxed">{text}</p>
    </div>
  );
}

function EnvRow({ name, desc, required }: { name: string; desc: string; required?: boolean }) {
  return (
    <div className="flex items-start gap-3 py-2.5 border-b border-white/5 last:border-0">
      <code className="text-yellow-400 text-xs font-mono shrink-0 mt-0.5">{name}</code>
      <span className="text-white/50 text-xs flex-1">{desc}</span>
      {required && <span className="text-red-400 text-xs shrink-0">required</span>}
    </div>
  );
}

export default function Deploy() {
  return (
    <div className="min-h-screen bg-[#141414] text-white">
      <Navbar />

      <div className="pt-24 pb-16 px-4 md:px-12 max-w-6xl mx-auto">
        <div className="mb-10">
          <h1 className="text-3xl md:text-4xl font-black mb-2">
            <span className="text-[#e50914]">Deploy</span> Configuration
          </h1>
          <p className="text-white/50 text-base max-w-2xl">
            Build and start commands for deploying this app to Vercel or Render.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">

          {/* ─── VERCEL ─── */}
          <div className="rounded-xl bg-[#1a1a1a] border border-white/10 overflow-hidden" style={{ borderTop: "3px solid #000" }}>
            <div className="px-5 py-4 flex items-center justify-between border-b border-white/10" style={{ background: "linear-gradient(90deg,#000 0%,#111 100%)" }}>
              <div className="flex items-center gap-3">
                <svg viewBox="0 0 76 65" className="w-6 h-6 fill-white" aria-label="Vercel"><path d="M37.5274 0L75.0548 65H0L37.5274 0Z"/></svg>
                <span className="text-white font-bold text-lg">Vercel</span>
              </div>
              <a
                href="https://vercel.com/new"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-white/40 hover:text-white/70 flex items-center gap-1 transition-colors"
                data-testid="link-vercel-new"
              >
                Open Vercel <ExternalLink className="w-3 h-3" />
              </a>
            </div>

            <div className="p-5">
              <div className="space-y-1 mb-5">
                <Step n={1} text="Import your GitHub repo in Vercel — select Asset-Extractor-web." />
                <Step n={2} text='Set Framework Preset to "Other" (not Vite), or leave as detected.' />
                <Step n={3} text="Paste the build command below and set the output directory to dist/public." />
                <Step n={4} text="Add any required environment variables, then deploy." />
              </div>

              <CommandBlock
                label="Build Command"
                icon={Terminal}
                value="npm run vercel-build && npx esbuild server/app.ts --bundle --platform=node --format=cjs --packages=external --outfile=api/_bundle.cjs"
                testId="vercel-build"
              />
              <CommandBlock
                label="Output Directory"
                icon={Folder}
                value="dist/public"
                testId="vercel-output"
              />
              <CommandBlock
                label="Install Command"
                icon={Terminal}
                value="npm install"
                testId="vercel-install"
              />

              <div className="mt-4 p-3 rounded-lg bg-blue-500/10 border border-blue-500/20 flex gap-2.5">
                <Info className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                <p className="text-blue-300/80 text-xs leading-relaxed">
                  The esbuild step bundles the full Express server into <code className="text-blue-300">api/_bundle.cjs</code> so Vercel's serverless runtime can load it. Function max duration is 60 s (set in <code className="text-blue-300">vercel.json</code>).
                </p>
              </div>
            </div>
          </div>

          {/* ─── RENDER ─── */}
          <div className="rounded-xl bg-[#1a1a1a] border border-white/10 overflow-hidden" style={{ borderTop: "3px solid #46e3b7" }}>
            <div className="px-5 py-4 flex items-center justify-between border-b border-white/10" style={{ background: "linear-gradient(90deg,#0d1f18 0%,#111 100%)" }}>
              <div className="flex items-center gap-3">
                <svg viewBox="0 0 40 40" className="w-6 h-6" aria-label="Render">
                  <circle cx="20" cy="20" r="20" fill="#46e3b7" />
                  <path d="M12 28V12h10a6 6 0 0 1 0 12H16v4H12zm4-8h6a2 2 0 0 0 0-4h-6v4z" fill="#0d1f18" />
                </svg>
                <span className="text-white font-bold text-lg">Render</span>
              </div>
              <a
                href="https://dashboard.render.com/new/web"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-white/40 hover:text-white/70 flex items-center gap-1 transition-colors"
                data-testid="link-render-new"
              >
                Open Render <ExternalLink className="w-3 h-3" />
              </a>
            </div>

            <div className="p-5">
              <div className="space-y-1 mb-5">
                <Step n={1} text="Create a new Web Service and connect your GitHub repo." />
                <Step n={2} text='Set Environment to "Node", Region to your preference.' />
                <Step n={3} text="Paste the build and start commands below." />
                <Step n={4} text="Add environment variables and click Create Web Service." />
              </div>

              <CommandBlock
                label="Build Command"
                icon={Terminal}
                value="npm install && npm run build"
                testId="render-build"
              />
              <CommandBlock
                label="Start Command"
                icon={Play}
                value="node dist/index.cjs"
                testId="render-start"
              />

              <div className="mt-4 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex gap-2.5">
                <Info className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <p className="text-emerald-300/80 text-xs leading-relaxed">
                  Render runs a persistent Node.js process — ideal for this app's streaming and proxying features. Free tier spins down after inactivity; a paid instance keeps it always-on.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* ─── ENV VARS ─── */}
        <div className="rounded-xl bg-[#1a1a1a] border border-white/10 mb-6">
          <div className="px-5 py-4 border-b border-white/10 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-yellow-400" />
            <h2 className="text-white font-semibold">Environment Variables</h2>
            <span className="text-white/40 text-sm ml-1">— set these in your deployment platform</span>
          </div>
          <div className="px-5 py-2">
            <EnvRow name="PORT" desc="Server port (default: 5000). Render sets this automatically; Vercel ignores it." />
            <EnvRow name="NODE_ENV" desc='Set to "production" for production builds. Both platforms set this automatically.' />
            <EnvRow name="DEBUG" desc='Set to "1" to enable verbose provider scraping logs. Optional.' />
          </div>
        </div>

        {/* ─── COMPARISON ─── */}
        <div className="rounded-xl bg-[#1a1a1a] border border-white/10">
          <div className="px-5 py-4 border-b border-white/10">
            <h2 className="text-white font-semibold">Platform Comparison</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm" data-testid="table-comparison">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="px-5 py-3 text-left text-white/40 font-medium w-1/3">Feature</th>
                  <th className="px-5 py-3 text-left text-white/60 font-medium">
                    <span className="flex items-center gap-2">
                      <svg viewBox="0 0 76 65" className="w-3.5 h-3.5 fill-white"><path d="M37.5274 0L75.0548 65H0L37.5274 0Z"/></svg>
                      Vercel
                    </span>
                  </th>
                  <th className="px-5 py-3 text-left text-white/60 font-medium">
                    <span className="flex items-center gap-2">
                      <span className="w-3.5 h-3.5 rounded-full bg-[#46e3b7] inline-block" />
                      Render
                    </span>
                  </th>
                </tr>
              </thead>
              <tbody className="text-white/50">
                {[
                  ["Free tier", "✅ Generous", "✅ Available (sleeps)"],
                  ["Server type", "Serverless functions", "Persistent Node.js process"],
                  ["Streaming/proxy", "⚠️ 60 s max per request", "✅ No timeout limit"],
                  ["Cold starts", "⚠️ Possible on free tier", "⚠️ Sleeps after inactivity"],
                  ["Custom domain", "✅ Free SSL", "✅ Free SSL"],
                  ["Recommended for", "Frontend + light API", "Full streaming workloads"],
                ].map(([f, v, r]) => (
                  <tr key={String(f)} className="border-b border-white/5 last:border-0 hover:bg-white/[0.02] transition-colors">
                    <td className="px-5 py-3 text-white/60 font-medium">{f}</td>
                    <td className="px-5 py-3">{v}</td>
                    <td className="px-5 py-3">{r}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
