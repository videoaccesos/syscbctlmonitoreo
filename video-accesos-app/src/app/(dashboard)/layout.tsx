export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-100">
      {/* Top Nav */}
      <nav className="bg-gradient-to-r from-indigo-950 to-indigo-800 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-gradient-to-br from-orange-500 to-orange-400 rounded-lg flex items-center justify-center text-sm font-extrabold">
              VA
            </div>
            <div>
              <h1 className="text-sm font-bold tracking-wide">Video Accesos</h1>
              <span className="text-[9px] opacity-70 uppercase tracking-wider">Sistema de Control y Monitoreo</span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <a href="/procesos/monitoristas" className="text-xs text-white/80 hover:text-white transition-colors">
              Monitoristas
            </a>
          </div>
        </div>
      </nav>
      {/* Page Content */}
      <main className="max-w-7xl mx-auto">
        {children}
      </main>
    </div>
  );
}
