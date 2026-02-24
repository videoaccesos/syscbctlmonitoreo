"use client";

import { useSession } from "next-auth/react";
import {
  Shield,
  Users,
  Building2,
  ClipboardList,
  Activity,
  Clock,
} from "lucide-react";

export default function DashboardPage() {
  const { data: session } = useSession();

  return (
    <div className="space-y-6">
      {/* Bienvenida */}
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
          value="--"
          icon={<Shield className="h-6 w-6 text-blue-600" />}
          bgColor="bg-blue-50"
        />
        <DashboardCard
          title="Privadas Activas"
          value="--"
          icon={<Building2 className="h-6 w-6 text-green-600" />}
          bgColor="bg-green-50"
        />
        <DashboardCard
          title="Residencias"
          value="--"
          icon={<Users className="h-6 w-6 text-purple-600" />}
          bgColor="bg-purple-50"
        />
        <DashboardCard
          title="Órdenes Abiertas"
          value="--"
          icon={<ClipboardList className="h-6 w-6 text-orange-600" />}
          bgColor="bg-orange-50"
        />
      </div>

      {/* Actividad reciente */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Activity className="h-5 w-5 text-gray-600" />
            <h2 className="text-lg font-semibold text-gray-800">
              Últimos Accesos
            </h2>
          </div>
          <div className="text-center py-8 text-gray-400">
            <p>Los registros de acceso aparecerán aquí</p>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Clock className="h-5 w-5 text-gray-600" />
            <h2 className="text-lg font-semibold text-gray-800">
              Actividad del Sistema
            </h2>
          </div>
          <div className="text-center py-8 text-gray-400">
            <p>La actividad reciente aparecerá aquí</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function DashboardCard({
  title,
  value,
  icon,
  bgColor,
}: {
  title: string;
  value: string;
  icon: React.ReactNode;
  bgColor: string;
}) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500">{title}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
        </div>
        <div className={`${bgColor} p-3 rounded-full`}>{icon}</div>
      </div>
    </div>
  );
}
