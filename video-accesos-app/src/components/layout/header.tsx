"use client";

import { useSession } from "next-auth/react";
import { Bell, User, Lock, X, Loader2 } from "lucide-react";
import { useState } from "react";

export function Header() {
  const { data: session } = useSession();
  const [showModal, setShowModal] = useState(false);
  const [contrasenaActual, setContrasenaActual] = useState("");
  const [contrasenaNueva, setContrasenaNueva] = useState("");
  const [contrasenaConfirmar, setContrasenaConfirmar] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const resetForm = () => {
    setContrasenaActual("");
    setContrasenaNueva("");
    setContrasenaConfirmar("");
    setError("");
    setSuccess("");
  };

  const handleClose = () => {
    resetForm();
    setShowModal(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!contrasenaActual || !contrasenaNueva || !contrasenaConfirmar) {
      setError("Todos los campos son requeridos");
      return;
    }

    if (contrasenaNueva.length < 4) {
      setError("La nueva contraseña debe tener al menos 4 caracteres");
      return;
    }

    if (contrasenaNueva !== contrasenaConfirmar) {
      setError("La nueva contraseña y la confirmación no coinciden");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/seguridad/cambiar-contrasena", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contrasenaActual,
          contrasenaNueva,
          contrasenaConfirmar,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Error al cambiar la contraseña");
        return;
      }

      setSuccess("Contraseña actualizada correctamente");
      setTimeout(() => handleClose(), 1500);
    } catch {
      setError("Error de conexión al cambiar la contraseña");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
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
          <button
            onClick={() => setShowModal(true)}
            className="relative text-gray-500 hover:text-gray-700 transition"
            title="Cambiar Contraseña"
          >
            <Lock className="h-5 w-5" />
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

      {/* Modal Cambiar Contraseña */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-sm mx-4">
            <div className="flex items-center justify-between px-5 py-4 border-b">
              <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                <Lock className="h-5 w-5 text-blue-600" />
                Cambiar Contraseña
              </h3>
              <button
                onClick={handleClose}
                className="text-gray-400 hover:text-gray-600 transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded text-sm">
                  {error}
                </div>
              )}
              {success && (
                <div className="bg-green-50 border border-green-200 text-green-700 px-3 py-2 rounded text-sm">
                  {success}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Contraseña Actual
                </label>
                <input
                  type="password"
                  value={contrasenaActual}
                  onChange={(e) => setContrasenaActual(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  placeholder="Teclee la contraseña actual"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nueva Contraseña
                </label>
                <input
                  type="password"
                  value={contrasenaNueva}
                  onChange={(e) => setContrasenaNueva(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  placeholder="Teclee la nueva contraseña"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Confirmar Contraseña
                </label>
                <input
                  type="password"
                  value={contrasenaConfirmar}
                  onChange={(e) => setContrasenaConfirmar(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  placeholder="Confirmar la nueva contraseña"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleClose}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                  Guardar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
