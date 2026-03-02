"use client";

import { useSession } from "next-auth/react";
import { Bell, User } from "lucide-react";

export function Header() {
  const { data: session } = useSession();

  return (
    <header className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between">
      <div>
        <h2 className="text-lg font-semibold text-gray-800">
          Sistema de Control de Acceso
        </h2>
      </div>
      <div className="flex items-center gap-4">
        <button className="relative text-gray-500 hover:text-gray-700 transition">
          <Bell className="h-5 w-5" />
        </button>
        <div className="flex items-center gap-2 text-sm">
          <div className="bg-blue-100 p-2 rounded-full">
            <User className="h-4 w-4 text-blue-600" />
          </div>
          <div>
            <p className="font-medium text-gray-700">{session?.user?.name}</p>
            <p className="text-xs text-gray-400">
              Operador #{String(session?.user?.nroOperador || "N/A")}
            </p>
          </div>
        </div>
      </div>
    </header>
  );
}
