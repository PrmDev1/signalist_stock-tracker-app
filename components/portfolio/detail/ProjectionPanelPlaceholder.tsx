import StatCard from '@/components/portfolio/detail/StatCard';

export default function ProjectionPanelPlaceholder() {
  return (
    <section className="rounded-xl border border-[#1f2a3d] bg-[#070b13] p-3">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <p className="text-[10px] uppercase tracking-[0.14em] text-gray-500">Portfolio Intelligence</p>
          <h3 className="text-lg font-semibold text-white">Investment Projection</h3>
          <p className="text-xs text-gray-500">Monte Carlo Simulation (10 Years)</p>
        </div>
        <span className="rounded border border-[#2b3b54] bg-[#0e1726] px-2 py-1 text-[10px] text-gray-300">
          Auto Running
        </span>
      </div>

      <div className="mb-3 grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Expected Final Value" value="$1,285,611" />
        <StatCard label="Expected Net P/L" value="+$1,155,611" tone="positive" />
        <StatCard label="Worst Case Final Value" value="$346,106" tone="negative" />
        <StatCard label="SPY / BIL Final" value="SPY: $82,593 | BIL: $50,919" tone="info" />
      </div>

      <div className="relative h-[310px] overflow-hidden rounded-lg border border-[#1f2a3d] bg-[#03070f] sm:h-[360px]">
        <div className="pointer-events-none absolute inset-0 [background-image:linear-gradient(rgba(32,44,64,0.55)_1px,transparent_1px),linear-gradient(90deg,rgba(32,44,64,0.55)_1px,transparent_1px)] [background-size:40px_40px]" />
        <svg viewBox="0 0 1000 360" className="absolute inset-0 h-full w-full">
          <polyline
            fill="none"
            stroke="#00e7c2"
            strokeWidth="3"
            points="0,340 100,330 180,325 260,310 350,290 430,280 520,270 610,250 690,220 760,180 820,120 880,85 940,60 1000,120"
          />
          <polyline
            fill="none"
            stroke="#ff5b5b"
            strokeWidth="2"
            strokeDasharray="5 5"
            points="0,340 120,336 220,333 300,328 380,320 480,315 560,308 640,300 730,286 810,275 900,258 1000,245"
          />
          <polyline
            fill="none"
            stroke="#5ea6ff"
            strokeWidth="2"
            points="0,340 140,336 270,331 370,325 470,320 560,314 660,310 770,302 880,294 1000,288"
          />
          <polyline
            fill="none"
            stroke="#97c9ff"
            strokeWidth="2"
            points="0,341 160,339 310,336 460,333 620,330 780,326 900,324 1000,322"
          />
        </svg>
      </div>

      <div className="mt-2 flex flex-wrap items-center justify-center gap-4 rounded-md border border-[#1f2a3d] bg-[#050b16] px-2 py-1.5 text-[11px]">
        <span className="inline-flex items-center gap-1 text-[#00e7c2]"><span className="h-2 w-2 rounded-full bg-[#00e7c2]" />Portfolio Expected</span>
        <span className="inline-flex items-center gap-1 text-[#ff5b5b]"><span className="h-2 w-2 rounded-full bg-[#ff5b5b]" />Worst Case</span>
        <span className="inline-flex items-center gap-1 text-[#5ea6ff]"><span className="h-2 w-2 rounded-full bg-[#5ea6ff]" />SPY</span>
        <span className="inline-flex items-center gap-1 text-[#97c9ff]"><span className="h-2 w-2 rounded-full bg-[#97c9ff]" />BIL</span>
      </div>
    </section>
  );
}
