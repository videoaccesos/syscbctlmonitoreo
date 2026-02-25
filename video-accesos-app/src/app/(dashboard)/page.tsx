"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState, useCallback } from "react";
import {
  Shield,
  Building2,
  ClipboardList,
  Activity,
  ShieldCheck,
  ShieldX,
  Info,
  Home,
} from "lucide-react";

interface DashboardStats {
  accesosHoy: number;
  privadasActivas: number;
  totalResidencias: number;
  desglose: { accesos: number; rechazos: number; informes: number };
  ultimosAccesos: Array<{
    id: number;
    fechaModificacion: string;
    estatusId: number;
    solicitanteId: string;
    privada: { descripcion: string } | null;
    residencia: { nroCasa: string; calle: string } | null;
    empleado: { nombre: string; apePaterno: string } | null;
  }>;
}

function getEstatusLabel(id: number) {
  switch (id) {
    case 1: return "Acceso";
    case 2: return "Rechazado";
    case 3: return "Informo";
    default: return "-";
  }
}

function getEstatusColor(id: number) {
  switch (id) {
    case 1: return "text-green-600";
    case 2: return "text-red-600";
    case 3: return "text-blue-600";
    default: return "text-gray-600";
  }
}

export default function DashboardPage() {
  const { data: session } = useSession();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch("/api/dashboard");
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch {
      console.error("Error al cargar estadisticas");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 30000);
    return () => clearInterval(interval);
  }, [fetchStats]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Bienvenido, {session?.user?.name || "Operador"}
        </h1>
        <p className="text-gray-500 mt-1">
          Panel de control del sistema de accesos
        </p>
      </div>

      {/* Tarjetas de resumen */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <DashboardCard
          title="Accesos Hoy"
          value={loading ? "..." : String(stats?.accesosHoy ?? 0)}
          icon={<Shield className="h-6 w-6 text-blue-600" />}
          bgColor="bg-blue-50"
        />
        <DashboardCard
          title="Privadas Activas"
          value={loading ? "..." : String(stats?.privadasActivas ?? 0)}
          icon={<Building2 className="h-6 w-6 text-green-600" />}
          bgColor="bg-green-50"
        />
        <DashboardCard
          title="Residencias"
          value={loading ? "..." : String(stats?.totalResidencias ?? 0)}
          icon={<Home className="h-6 w-6 text-purple-600" />}
          bgColor="bg-purple-50"
        />
        <DashboardCard
          title="Desglose Hoy"
          value=""
          icon={<ClipboardList className="h-6 w-6 text-orange-600" />}
          bgColor="bg-orange-50"
          extra={
            stats ? (
              <div className="flex items-center gap-3 mt-1">
                <span className="flex items-center gap-1 text-sm">
                  <ShieldCheck className="h-4 w-4 text-green-500" />
                  <span className="font-bold text-green-700">
                    {stats.desglose.accesos}
                  </span>
                </span>
                <span className="flex items-center gap-1 text-sm">
                  <ShieldX className="h-4 w-4 text-red-500" />
                  <span className="font-bold text-red-700">
                    {stats.desglose.rechazos}
                  </span>
                </span>
                <span className="flex items-center gap-1 text-sm">
                  <Info className="h-4 w-4 text-blue-500" />
                  <span className="font-bold text-blue-700">
                    {stats.desglose.informes}
                  </span>
                </span>
              </div>
            ) : null
          }
        />
      </div>

      {/* Ultimos Accesos */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center gap-2 mb-4">
          <Activity className="h-5 w-5 text-gray-600" />
          <h2 className="text-lg font-semibold text-gray-800">
            Ultimos Accesos de Hoy
          </h2>
        </div>
        {loading ? (
          <div className="text-center py-8 text-gray-400 text-sm">
            Cargando...
          </div>
        ) : stats?.ultimosAccesos && stats.ultimosAccesos.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">
                    Hora
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">
                    Privada
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">
                    Residencia
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">
                    Operador
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">
                    Estado
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {stats.ultimosAccesos.map((a) => (
                  <tr key={a.id} className="hover:bg-gray-50">
                    <td className="px-3 py-2 font-mono text-xs text-gray-700">
                      {new Date(a.fechaModificacion).toLocaleTimeString("es-MX", {
                        hour: "2-digit",
                        minute: "2-digit",
                        hour12: false,
                      })}
                    </td>
                    <td className="px-3 py-2 text-gray-700">
                      {a.privada?.descripcion || "-"}
                    </td>
                    <td className="px-3 py-2">
                      <span className="font-medium">
                        #{a.residencia?.nroCasa}
                      </span>{" "}
                      <span className="text-gray-500">
                        {a.residencia?.calle}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-gray-700">
                      {a.empleado
                        ? `${a.empleado.nombre} ${a.empleado.apePaterno}`
                        : "-"}
                    </td>
                    <td className={`px-3 py-2 font-medium ${getEstatusColor(a.estatusId)}`}>
                      {getEstatusLabel(a.estatusId)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-8 text-gray-400 text-sm">
            No hay registros de acceso para hoy
          </div>
        )}
      </div>
    </div>
  );
}

function DashboardCard({
  title,
  value,
  icon,
  bgColor,
  extra,
}: {
  title: string;
  value: string;
  icon: React.ReactNode;
  bgColor: string;
  extra?: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500">{title}</p>
          {value && (
            <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
          )}
          {extra}
        </div>
        <div className={`${bgColor} p-3 rounded-full`}>{icon}</div>
      </div>
    </div>
  );
}
