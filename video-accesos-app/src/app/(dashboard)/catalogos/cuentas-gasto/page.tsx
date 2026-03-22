"use client";

import { useEffect, useState, useCallback } from "react";
import { Plus, Pencil, Trash2, X, Loader2, BookOpen } from "lucide-react";

interface CuentaGasto {
  id: number;
  clave: string;
  descripcion: string;
  estatusId: number;
}

export default function CuentasGastoPage() {
  const [cuentas, setCuentas] = useState<CuentaGasto[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState({ clave: "", descripcion: "" });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const fetchCuentas = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/catalogos/cuentas-gasto?estatus=activos");
      const json = await res.json();
      setCuentas(json.data || []);
    } catch {
      console.error("Error al cargar cuentas");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCuentas();
  }, [fetchCuentas]);

  const openCreate = () => {
    setEditingId(null);
    setForm({ clave: "", descripcion: "" });
    setError("");
    setModalOpen(true);
  };

  const openEdit = (c: CuentaGasto) => {
    setEditingId(c.id);
    setForm({ clave: c.clave, descripcion: c.descripcion });
    setError("");
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.clave.trim() || !form.descripcion.trim()) {
      setError("Clave y descripción son requeridos.");
      return;
    }
    setSaving(true);
    try {
      const url = editingId
        ? `/api/catalogos/cuentas-gasto/${editingId}`
        : "/api/catalogos/cuentas-gasto";
      const res = await fetch(url, {
        method: editingId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Error al guardar");
        return;
      }
      setModalOpen(false);
      fetchCuentas();
    } catch {
      setError("Error de conexión");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("¿Dar de baja esta cuenta de gasto?")) return;
    await fetch(`/api/catalogos/cuentas-gasto/${id}`, { method: "DELETE" });
    fetchCuentas();
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-purple-100 text-purple-700">
            <BookOpen className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Cuentas de Gasto</h1>
            <p className="text-sm text-gray-500">Catálogo de cuentas contables para clasificación de gastos.</p>
          </div>
        </div>
        <button
          onClick={openCreate}
          className="bg-purple-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-purple-700 flex items-center gap-2"
        >
          <Plus className="h-4 w-4" /> Agregar
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <table className="min-w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Clave</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Descripción</th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr>
                <td colSpan={3} className="text-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-purple-500 mx-auto" />
                </td>
              </tr>
            ) : cuentas.length === 0 ? (
              <tr>
                <td colSpan={3} className="text-center py-12 text-gray-500 text-sm">
                  No hay cuentas registradas
                </td>
              </tr>
            ) : (
              cuentas.map((c) => (
                <tr key={c.id} className="hover:bg-gray-50 transition">
                  <td className="px-4 py-3 text-sm font-mono font-medium text-gray-900">{c.clave}</td>
                  <td className="px-4 py-3 text-sm text-gray-700">{c.descripcion}</td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex justify-center gap-1">
                      <button onClick={() => openEdit(c)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-purple-600 transition">
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button onClick={() => handleDelete(c.id)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-red-600 transition">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="text-lg font-semibold text-gray-900">
                {editingId ? "Editar Cuenta" : "Nueva Cuenta de Gasto"}
              </h3>
              <button onClick={() => setModalOpen(false)} className="p-1 hover:bg-gray-100 rounded-lg">
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>
            {error && <p className="text-red-600 text-sm mx-4 mt-3 bg-red-50 p-2 rounded">{error}</p>}
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Clave *</label>
                <input
                  type="text"
                  value={form.clave}
                  onChange={(e) => setForm({ ...form, clave: e.target.value })}
                  maxLength={20}
                  placeholder="Ej: 5001, GEN-01"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-purple-500 focus:ring-1 focus:ring-purple-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Descripción *</label>
                <input
                  type="text"
                  value={form.descripcion}
                  onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
                  maxLength={100}
                  placeholder="Ej: Materiales de Limpieza"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-purple-500 focus:ring-1 focus:ring-purple-500 outline-none"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 p-4 border-t">
              <button onClick={() => setModalOpen(false)} className="px-4 py-2 text-sm text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition">
                Cancelar
              </button>
              <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 px-4 py-2 text-sm text-white bg-purple-600 rounded-lg hover:bg-purple-700 transition disabled:opacity-50">
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                {editingId ? "Actualizar" : "Guardar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
