export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-slate-900 to-slate-800 text-white font-sans">
      <main className="flex flex-col items-center gap-8 p-8 text-center">
        <h1 className="text-5xl font-bold tracking-tight">
          🌊 Xongket
        </h1>
        <p className="max-w-xl text-lg text-slate-300">
          Integrated Rural Disaster Management System for Assam
        </p>
        <div className="flex gap-3 text-sm text-slate-400">
          <span className="rounded-full border border-slate-600 px-3 py-1">IoT</span>
          <span className="rounded-full border border-slate-600 px-3 py-1">AI / ML</span>
          <span className="rounded-full border border-slate-600 px-3 py-1">Cloud</span>
        </div>
        <p className="mt-4 text-sm text-slate-500">
          Dashboard coming soon — backend running at{" "}
          <code className="text-emerald-400">localhost:8000/health</code>
        </p>
      </main>
    </div>
  );
}
