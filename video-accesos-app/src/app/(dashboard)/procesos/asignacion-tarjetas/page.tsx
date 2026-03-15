"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Plus,
  Search,
  X,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  Loader2,
  XCircle,
  Trash2,
} from "lucide-react";

/* ---------- tipos ---------- */
interface Privada {
  id: number;
  descripcion: string;
  precioVehicular?: number;
  precioPeatonal?: number;
  precioMensualidad?: number;
}

interface Residencia {
  id: number;
  nroCasa: string;
  calle: string;
  privada: Privada;
}

interface Residente {
  id: number;
  nombre: string;
  apePaterno: string;
  apeMaterno: string;
  residencia: Residencia;
}

interface Tarjeta {
  id: number;
  lectura: string;
  tipoId: number;
  estatusId: number;
}

interface Asignacion {
  id: number;
  tarjetaId: string | null;
  tarjetaId2: string | null;
  tarjetaId3: string | null;
  tarjetaId4: string | null;
  tarjetaId5: string | null;
  residenteId: string;
  fecha: string;
  fechaVencimiento: string | null;
  tipoLectura: number | null;
  lecturaEpc: string | null;
  folioContrato: string | null;
  precio: number | null;
  utilizoSeguro: number;
  estatusId: number;
  folioTipo: string;
  tarjeta: Tarjeta | null;
  residente: Residente;
}

interface ResidenteSearch {
  id: number;
  nombre: string;
  apePaterno: string;
  apeMaterno: string;
  celular: string | null;
  email: string | null;
  residencia: {
    id: number;
    nroCasa: string;
    calle: string;
    privada: Privada;
  };
}

interface TarjetaSlot {
  tarjetaId: string;
  utilizoSeguro: boolean;
}

interface AsignacionForm {
  folioTipo: string;
  residenteId: string;
  fechaVencimiento: string;
  tipoLectura: string;
  lecturaEpc: string;
  folioContrato: string;
  precio: string;
  descuento: string;
  iva: string;
  tipoPago: string;
  compradorId: string;
  mostrarNombreComprador: boolean;
  concepto: string;
  observaciones: string;
}

const emptyForm: AsignacionForm = {
  folioTipo: "H",
  residenteId: "",
  fechaVencimiento: "",
  tipoLectura: "",
  lecturaEpc: "",
  folioContrato: "",
  precio: "",
  descuento: "0",
  iva: "0",
  tipoPago: "",
  compradorId: "",
  mostrarNombreComprador: false,
  concepto: "",
  observaciones: "",
};

/* ---------- constantes ---------- */
const ESTATUS_ASIGNACION: Record<number, string> = {
  1: "Activa",
  2: "Cancelada",
};

const ESTATUS_BADGE: Record<number, string> = {
  1: "bg-green-100 text-green-700",
  2: "bg-red-100 text-red-700",
};

const TIPO_TARJETA: Record<number, string> = {
  1: "Peatonal",
  2: "Vehicular",
};

const FOLIO_BADGE: Record<string, string> = {
  H: "bg-blue-100 text-blue-700",
  B: "bg-orange-100 text-orange-700",
};

const FOLIO_LABEL: Record<string, string> = {
  H: "Con Renovacion",
  B: "Sin Renovacion",
};

/* ================================================================ */

export default function AsignacionTarjetasPage() {
  /* ---------- state ---------- */
  const [items, setItems] = useState<Asignacion[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [totalPages, setTotalPages] = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);

  // filtros
  const [filterPrivada, setFilterPrivada] = useState("");
  const [filterEstatus, setFilterEstatus] = useState("");
  const [filterFolioTipo, setFilterFolioTipo] = useState("");
  const [privadas, setPrivadas] = useState<Privada[]>([]);

  // modal crear
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState<AsignacionForm>({ ...emptyForm });
  const [tarjetaSlots, setTarjetaSlots] = useState<TarjetaSlot[]>([
    { tarjetaId: "", utilizoSeguro: false },
  ]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // tarjetas disponibles (para el dropdown)
  const [tarjetasDisponibles, setTarjetasDisponibles] = useState<Tarjeta[]>([]);
  const [loadingTarjetas, setLoadingTarjetas] = useState(false);

  // busqueda de residentes
  const [residenteSearch, setResidenteSearch] = useState("");
  const [residenteResults, setResidenteResults] = useState<ResidenteSearch[]>(
    []
  );
  const [selectedResidente, setSelectedResidente] =
    useState<ResidenteSearch | null>(null);
  const [searchingResidentes, setSearchingResidentes] = useState(false);

  // busqueda de comprador
  const [compradorSearch, setCompradorSearch] = useState("");
  const [compradorResults, setCompradorResults] = useState<ResidenteSearch[]>(
    []
  );
  const [selectedComprador, setSelectedComprador] =
    useState<ResidenteSearch | null>(null);
  const [searchingComprador, setSearchingComprador] = useState(false);

  // precio info de privada
  const [precioInfo, setPrecioInfo] = useState<{
    vehicular: number;
    peatonal: number;
  } | null>(null);

  // cancelar asignacion
  const [cancelTarget, setCancelTarget] = useState<Asignacion | null>(null);
  const [cancelling, setCancelling] = useState(false);

  /* ---------- fetch data ---------- */
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(pageSize),
      });
      if (search) params.set("search", search);
      if (filterPrivada) params.set("privadaId", filterPrivada);
      if (filterEstatus) params.set("estatusId", filterEstatus);
      if (filterFolioTipo) params.set("folioTipo", filterFolioTipo);

      const res = await fetch(`/api/procesos/asignacion-tarjetas?${params}`);
      if (!res.ok) throw new Error("Error al obtener asignaciones");
      const json = await res.json();
      setItems(json.data);
      setTotal(json.pagination.total);
      setTotalPages(json.pagination.totalPages);
    } catch {
      console.error("Error al cargar asignaciones");
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, search, filterPrivada, filterEstatus, filterFolioTipo]);

  const fetchPrivadas = useCallback(async () => {
    try {
      const res = await fetch(
        "/api/catalogos/privadas?pageSize=200&estatusId=1"
      );
      if (!res.ok) return;
      const json = await res.json();
      setPrivadas(json.data || json);
    } catch {
      console.error("Error al cargar privadas");
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    fetchPrivadas();
  }, [fetchPrivadas]);

  /* ---------- busqueda ---------- */
  const handleSearch = () => {
    setPage(1);
    setSearch(searchInput);
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleSearch();
  };

  const clearSearch = () => {
    setSearchInput("");
    setSearch("");
    setFilterPrivada("");
    setFilterEstatus("");
    setFilterFolioTipo("");
    setPage(1);
  };

  /* ---------- tarjetas disponibles ---------- */
  const fetchTarjetasDisponibles = async () => {
    setLoadingTarjetas(true);
    try {
      const res = await fetch("/api/catalogos/tarjetas?estatusId=1&limit=500");
      if (!res.ok) return;
      const json = await res.json();
      setTarjetasDisponibles(json.data || []);
    } catch {
      console.error("Error al cargar tarjetas disponibles");
    } finally {
      setLoadingTarjetas(false);
    }
  };

  /* ---------- busqueda de residentes ---------- */
  const searchResidentes = async (query: string) => {
    if (query.length < 2) {
      setResidenteResults([]);
      return;
    }
    setSearchingResidentes(true);
    try {
      const res = await fetch(
        `/api/catalogos/residencias?search=${encodeURIComponent(query)}&limit=20`
      );
      if (!res.ok) return;
      const json = await res.json();
      const residentes: ResidenteSearch[] = [];
      const residencias = json.data || json;
      for (const residencia of residencias) {
        if (residencia.residentes) {
          for (const residente of residencia.residentes) {
            residentes.push({
              ...residente,
              residencia: {
                id: residencia.id,
                nroCasa: residencia.nroCasa,
                calle: residencia.calle,
                privada: residencia.privada,
              },
            });
          }
        }
      }
      setResidenteResults(residentes);
    } catch {
      console.error("Error al buscar residentes");
    } finally {
      setSearchingResidentes(false);
    }
  };

  /* ---------- busqueda de comprador ---------- */
  const searchComprador = async (query: string) => {
    if (query.length < 2) {
      setCompradorResults([]);
      return;
    }
    setSearchingComprador(true);
    try {
      const res = await fetch(
        `/api/catalogos/residencias?search=${encodeURIComponent(query)}&limit=20`
      );
      if (!res.ok) return;
      const json = await res.json();
      const residentes: ResidenteSearch[] = [];
      const residencias = json.data || json;
      for (const residencia of residencias) {
        if (residencia.residentes) {
          for (const residente of residencia.residentes) {
            residentes.push({
              ...residente,
              residencia: {
                id: residencia.id,
                nroCasa: residencia.nroCasa,
                calle: residencia.calle,
                privada: residencia.privada,
              },
            });
          }
        }
      }
      setCompradorResults(residentes);
    } catch {
      console.error("Error al buscar comprador");
    } finally {
      setSearchingComprador(false);
    }
  };

  /* ---------- auto-calculo de precio ---------- */
  const calcularPrecioTarjeta = useCallback(
    (tarjetaId: string): number => {
      if (!precioInfo || !tarjetaId) return 0;
      const tarjeta = tarjetasDisponibles.find(
        (t) => String(t.id) === tarjetaId
      );
      if (!tarjeta) return 0;
      return tarjeta.tipoId === 2
        ? precioInfo.vehicular
        : precioInfo.peatonal;
    },
    [precioInfo, tarjetasDisponibles]
  );

  const recalcularPrecios = useCallback(
    (slots: TarjetaSlot[], descuentoStr: string) => {
      if (!precioInfo) return;
      let subtotal = 0;
      for (const slot of slots) {
        subtotal += calcularPrecioTarjeta(slot.tarjetaId);
      }
      const descuento = parseFloat(descuentoStr) || 0;
      const conDescuento = Math.max(0, subtotal - descuento);
      const iva = conDescuento * 0.16;

      setForm((prev) => ({
        ...prev,
        precio: subtotal.toFixed(2),
        descuento: descuento.toFixed(2),
        iva: iva.toFixed(2),
      }));
    },
    [precioInfo, calcularPrecioTarjeta]
  );

  /* ---------- fecha vencimiento auto (folio H) ---------- */
  const calcularFechaVencimiento = (): string => {
    const hoy = new Date();
    hoy.setFullYear(hoy.getFullYear() + 1);
    return hoy.toISOString().split("T")[0];
  };

  /* ---------- modal helpers ---------- */
  const openCreate = () => {
    setForm({ ...emptyForm });
    setTarjetaSlots([{ tarjetaId: "", utilizoSeguro: false }]);
    setSelectedResidente(null);
    setSelectedComprador(null);
    setResidenteSearch("");
    setCompradorSearch("");
    setResidenteResults([]);
    setCompradorResults([]);
    setPrecioInfo(null);
    setError("");
    fetchTarjetasDisponibles();
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setError("");
  };

  const setField = (field: keyof AsignacionForm, value: string | boolean) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const selectResidente = (residente: ResidenteSearch) => {
    setSelectedResidente(residente);
    setForm((prev) => ({
      ...prev,
      residenteId: String(residente.id),
    }));
    setResidenteResults([]);
    setResidenteSearch(
      `${residente.apePaterno} ${residente.apeMaterno} ${residente.nombre}`
    );

    // Cargar precios de la privada del residente
    const priv = residente.residencia?.privada;
    if (priv) {
      setPrecioInfo({
        vehicular: priv.precioVehicular || 0,
        peatonal: priv.precioPeatonal || 0,
      });
    }

    // Auto-calcular fecha vencimiento si es folio H
    if (form.folioTipo === "H" && !form.fechaVencimiento) {
      setForm((prev) => ({
        ...prev,
        residenteId: String(residente.id),
        fechaVencimiento: calcularFechaVencimiento(),
      }));
    }
  };

  const selectComprador = (residente: ResidenteSearch) => {
    setSelectedComprador(residente);
    setForm((prev) => ({
      ...prev,
      compradorId: String(residente.id),
    }));
    setCompradorResults([]);
    setCompradorSearch(
      `${residente.apePaterno} ${residente.apeMaterno} ${residente.nombre}`
    );
  };

  /* ---------- multi-tarjeta ---------- */
  const addTarjetaSlot = () => {
    if (tarjetaSlots.length >= 5) return;
    setTarjetaSlots((prev) => [
      ...prev,
      { tarjetaId: "", utilizoSeguro: false },
    ]);
  };

  const removeTarjetaSlot = (index: number) => {
    if (tarjetaSlots.length <= 1) return;
    const updated = tarjetaSlots.filter((_, i) => i !== index);
    setTarjetaSlots(updated);
    recalcularPrecios(updated, form.descuento);
  };

  const updateTarjetaSlot = (
    index: number,
    field: keyof TarjetaSlot,
    value: string | boolean
  ) => {
    const updated = [...tarjetaSlots];
    updated[index] = { ...updated[index], [field]: value };
    setTarjetaSlots(updated);
    if (field === "tarjetaId") {
      recalcularPrecios(updated, form.descuento);
    }
  };

  // Tarjetas ya seleccionadas en otros slots
  const getSelectedTarjetaIds = (excludeIndex: number): string[] => {
    return tarjetaSlots
      .filter((_, i) => i !== excludeIndex)
      .map((s) => s.tarjetaId)
      .filter(Boolean);
  };

  /* ---------- guardar ---------- */
  const handleSave = async () => {
    if (!tarjetaSlots[0]?.tarjetaId) {
      setError("Debe seleccionar al menos una tarjeta");
      return;
    }
    if (!form.residenteId) {
      setError("Debe seleccionar un residente");
      return;
    }
    if (form.folioTipo === "H" && !form.fechaVencimiento) {
      setError("Debe indicar la fecha de vencimiento para Folio H");
      return;
    }

    setSaving(true);
    setError("");

    try {
      const res = await fetch("/api/procesos/asignacion-tarjetas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tarjetaId: tarjetaSlots[0]?.tarjetaId || null,
          tarjetaId2: tarjetaSlots[1]?.tarjetaId || null,
          tarjetaId3: tarjetaSlots[2]?.tarjetaId || null,
          tarjetaId4: tarjetaSlots[3]?.tarjetaId || null,
          tarjetaId5: tarjetaSlots[4]?.tarjetaId || null,
          residenteId: form.residenteId,
          fechaVencimiento:
            form.folioTipo === "H" ? form.fechaVencimiento : null,
          lecturaTipoId: form.tipoLectura || null,
          lecturaEpc: form.lecturaEpc || null,
          folioContrato: form.folioContrato || null,
          precio: form.precio || null,
          descuento: form.descuento || null,
          IVA: form.iva || null,
          tipoPago: form.tipoPago || null,
          compradorId: form.compradorId || null,
          mostrarNombreComprador: form.mostrarNombreComprador,
          concepto: form.concepto || null,
          observaciones: form.observaciones || null,
          utilizoSeguro: tarjetaSlots[0]?.utilizoSeguro || false,
          utilizoSeguro2: tarjetaSlots[1]?.utilizoSeguro || false,
          utilizoSeguro3: tarjetaSlots[2]?.utilizoSeguro || false,
          utilizoSeguro4: tarjetaSlots[3]?.utilizoSeguro || false,
          utilizoSeguro5: tarjetaSlots[4]?.utilizoSeguro || false,
          privada: selectedResidente?.residencia?.privada?.id || null,
          folioTipo: form.folioTipo,
        }),
      });

      if (!res.ok) {
        const json = await res.json();
        setError(json.error || "Error al guardar");
        return;
      }

      closeModal();
      fetchData();
    } catch {
      setError("Error de conexion");
    } finally {
      setSaving(false);
    }
  };

  /* ---------- cancelar asignacion ---------- */
  const handleCancel = async () => {
    if (!cancelTarget) return;
    setCancelling(true);

    try {
      const res = await fetch(
        `/api/procesos/asignacion-tarjetas/${cancelTarget.id}`,
        { method: "DELETE" }
      );

      if (!res.ok) {
        const json = await res.json();
        alert(json.error || "Error al cancelar asignacion");
        return;
      }

      setCancelTarget(null);
      fetchData();
    } catch {
      alert("Error de conexion al cancelar");
    } finally {
      setCancelling(false);
    }
  };

  /* ---------- helpers de formato ---------- */
  const fmtDate = (v: string | null) => {
    if (!v) return "-";
    try {
      return new Date(v).toLocaleDateString("es-MX", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      });
    } catch {
      return v;
    }
  };

  const fmtMoney = (v: number | null) => {
    if (v === null || v === undefined) return "-";
    return `$${Number(v).toFixed(2)}`;
  };

  /* ---------- calcular totales del formulario ---------- */
  const subtotal = parseFloat(form.precio) || 0;
  const descuento = parseFloat(form.descuento) || 0;
  const iva = parseFloat(form.iva) || 0;
  const totalFinal = subtotal - descuento + iva;

  /* ================================================================ */
  /* RENDER                                                           */
  /* ================================================================ */
  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <CreditCard className="h-7 w-7 text-blue-600" />
            Asignacion de Tarjetas
          </h1>
          <p className="text-sm text-gray-700 mt-1">
            Gestiona la asignacion de tarjetas de acceso a residentes
          </p>
        </div>
        <button
          onClick={openCreate}
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 transition"
        >
          <Plus className="h-4 w-4" />
          Nueva Asignacion
        </button>
      </div>

      {/* Barra de busqueda y filtros */}
      <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-3">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-600" />
            <input
              type="text"
              placeholder="Buscar por nombre de residente..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={handleSearchKeyDown}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <button
            onClick={handleSearch}
            className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium transition"
          >
            Buscar
          </button>
          {(search || filterPrivada || filterEstatus || filterFolioTipo) && (
            <button
              onClick={clearSearch}
              className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium transition"
            >
              Limpiar
            </button>
          )}
        </div>

        <div className="flex gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-600">
              Privada:
            </label>
            <select
              value={filterPrivada}
              onChange={(e) => {
                setFilterPrivada(e.target.value);
                setPage(1);
              }}
              className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Todas</option>
              {privadas.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.descripcion}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-600">
              Estado:
            </label>
            <select
              value={filterEstatus}
              onChange={(e) => {
                setFilterEstatus(e.target.value);
                setPage(1);
              }}
              className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Todos</option>
              <option value="1">Activa</option>
              <option value="2">Cancelada</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-600">Folio:</label>
            <select
              value={filterFolioTipo}
              onChange={(e) => {
                setFilterFolioTipo(e.target.value);
                setPage(1);
              }}
              className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Todos</option>
              <option value="H">H - Con Renovacion</option>
              <option value="B">B - Sin Renovacion</option>
            </select>
          </div>
        </div>
      </div>

      {/* Tabla */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-center px-3 py-3 font-semibold text-gray-700">
                  Folio
                </th>
                <th className="text-left px-4 py-3 font-semibold text-gray-700">
                  Tarjeta
                </th>
                <th className="text-left px-4 py-3 font-semibold text-gray-700">
                  Residente
                </th>
                <th className="text-left px-4 py-3 font-semibold text-gray-700">
                  Privada
                </th>
                <th className="text-center px-4 py-3 font-semibold text-gray-700">
                  #Casa
                </th>
                <th className="text-right px-4 py-3 font-semibold text-gray-700">
                  Precio
                </th>
                <th className="text-center px-4 py-3 font-semibold text-gray-700">
                  Fecha Asignacion
                </th>
                <th className="text-center px-4 py-3 font-semibold text-gray-700">
                  Vencimiento
                </th>
                <th className="text-center px-4 py-3 font-semibold text-gray-700">
                  Estado
                </th>
                <th className="text-center px-4 py-3 font-semibold text-gray-700">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={10} className="text-center py-12">
                    <Loader2 className="h-6 w-6 animate-spin text-blue-500 mx-auto" />
                    <p className="text-gray-600 text-sm mt-2">Cargando...</p>
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td
                    colSpan={10}
                    className="text-center py-12 text-gray-600"
                  >
                    No se encontraron asignaciones
                  </td>
                </tr>
              ) : (
                items.map((item) => (
                  <tr key={`${item.folioTipo}-${item.id}`} className="hover:bg-gray-50 transition">
                    <td className="px-3 py-3 text-center">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-xs font-bold ${
                          FOLIO_BADGE[item.folioTipo] ||
                          "bg-gray-100 text-gray-700"
                        }`}
                      >
                        {item.folioTipo}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-mono font-medium text-gray-900">
                        {item.tarjeta?.lectura || item.tarjetaId || "-"}
                      </div>
                      <div className="text-xs text-gray-700">
                        {item.tarjeta
                          ? TIPO_TARJETA[item.tarjeta.tipoId] || ""
                          : ""}
                      </div>
                    </td>
                    <td className="px-4 py-3 font-medium text-gray-900">
                      {item.residente.apePaterno} {item.residente.apeMaterno}{" "}
                      {item.residente.nombre}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {item.residente.residencia?.privada?.descripcion || "-"}
                    </td>
                    <td className="px-4 py-3 text-center text-gray-600">
                      {item.residente.residencia?.nroCasa || "-"}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-600">
                      {fmtMoney(item.precio)}
                    </td>
                    <td className="px-4 py-3 text-center text-gray-600">
                      {fmtDate(item.fecha)}
                    </td>
                    <td className="px-4 py-3 text-center text-gray-600">
                      {item.folioTipo === "B" ? (
                        <span className="text-xs text-gray-400">N/A</span>
                      ) : (
                        fmtDate(item.fechaVencimiento)
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                          ESTATUS_BADGE[item.estatusId] ||
                          "bg-gray-100 text-gray-700"
                        }`}
                      >
                        {ESTATUS_ASIGNACION[item.estatusId] ||
                          `Estatus ${item.estatusId}`}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-1">
                        {item.estatusId === 1 && (
                          <button
                            onClick={() => setCancelTarget(item)}
                            title="Cancelar asignacion"
                            className="p-1.5 rounded hover:bg-red-50 text-red-600 transition"
                          >
                            <XCircle className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Paginacion */}
        {totalPages > 0 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 bg-gray-50 text-sm">
            <span className="text-gray-600">
              Mostrando {items.length} de {total} registros
            </span>
            <div className="flex items-center gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="p-1.5 rounded border border-gray-300 bg-white hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="text-gray-700">
                Pagina {page} de {totalPages}
              </span>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="p-1.5 rounded border border-gray-300 bg-white hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ==================== MODAL CREAR ASIGNACION ==================== */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={closeModal} />
          <div className="relative bg-white rounded-xl shadow-xl w-full max-w-3xl mx-4 max-h-[90vh] overflow-y-auto">
            {/* header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">
                Nueva Asignacion de Tarjeta
              </h2>
              <button
                onClick={closeModal}
                className="p-1 rounded hover:bg-gray-100 transition"
              >
                <X className="h-5 w-5 text-gray-700" />
              </button>
            </div>

            {/* body */}
            <div className="px-6 py-4 space-y-4">
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded-lg text-sm">
                  {error}
                </div>
              )}

              {/* Tipo de Folio */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tipo de Folio <span className="text-red-500">*</span>
                </label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="folioTipo"
                      value="H"
                      checked={form.folioTipo === "H"}
                      onChange={() => {
                        setField("folioTipo", "H");
                        if (!form.fechaVencimiento) {
                          setField(
                            "fechaVencimiento",
                            calcularFechaVencimiento()
                          );
                        }
                      }}
                      className="text-blue-600"
                    />
                    <span className="text-sm">
                      <span className="font-semibold text-blue-700">
                        Folio H
                      </span>{" "}
                      - Con Renovacion
                    </span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="folioTipo"
                      value="B"
                      checked={form.folioTipo === "B"}
                      onChange={() => {
                        setField("folioTipo", "B");
                        setField("fechaVencimiento", "");
                      }}
                      className="text-orange-600"
                    />
                    <span className="text-sm">
                      <span className="font-semibold text-orange-700">
                        Folio B
                      </span>{" "}
                      - Sin Renovacion
                    </span>
                  </label>
                </div>
              </div>

              {/* Residente (busqueda) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Residente <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Buscar por nombre de residente..."
                    value={residenteSearch}
                    onChange={(e) => {
                      setResidenteSearch(e.target.value);
                      setSelectedResidente(null);
                      setForm((prev) => ({ ...prev, residenteId: "" }));
                      setPrecioInfo(null);
                      searchResidentes(e.target.value);
                    }}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  {searchingResidentes && (
                    <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-gray-600" />
                  )}

                  {residenteResults.length > 0 && !selectedResidente && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                      {residenteResults.map((r) => (
                        <button
                          key={r.id}
                          type="button"
                          onClick={() => selectResidente(r)}
                          className="w-full text-left px-4 py-2 hover:bg-blue-50 text-sm border-b border-gray-100 last:border-b-0"
                        >
                          <div className="font-medium text-gray-900">
                            {r.apePaterno} {r.apeMaterno} {r.nombre}
                          </div>
                          <div className="text-xs text-gray-700">
                            {r.residencia?.privada?.descripcion || ""} - Casa #
                            {r.residencia?.nroCasa || ""}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {selectedResidente && (
                  <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm">
                    <div className="font-medium text-blue-900">
                      {selectedResidente.apePaterno}{" "}
                      {selectedResidente.apeMaterno}{" "}
                      {selectedResidente.nombre}
                    </div>
                    <div className="text-blue-700">
                      {selectedResidente.residencia?.privada?.descripcion ||
                        ""}{" "}
                      - Casa #{selectedResidente.residencia?.nroCasa || ""}
                    </div>
                    {precioInfo && (
                      <div className="text-xs text-blue-600 mt-1">
                        Precio Vehicular: ${precioInfo.vehicular} | Precio
                        Peatonal: ${precioInfo.peatonal}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Tarjetas (multi-slot) */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-sm font-medium text-gray-700">
                    Tarjeta(s) <span className="text-red-500">*</span>
                  </label>
                  {tarjetaSlots.length < 5 && (
                    <button
                      type="button"
                      onClick={addTarjetaSlot}
                      className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                    >
                      + Agregar tarjeta
                    </button>
                  )}
                </div>

                {loadingTarjetas ? (
                  <div className="flex items-center gap-2 text-sm text-gray-700">
                    <Loader2 className="h-4 w-4 animate-spin" /> Cargando
                    tarjetas...
                  </div>
                ) : (
                  <div className="space-y-2">
                    {tarjetaSlots.map((slot, index) => {
                      const selectedIds = getSelectedTarjetaIds(index);
                      const available = tarjetasDisponibles.filter(
                        (t) => !selectedIds.includes(String(t.id))
                      );
                      return (
                        <div
                          key={index}
                          className="flex items-center gap-2"
                        >
                          <select
                            value={slot.tarjetaId}
                            onChange={(e) =>
                              updateTarjetaSlot(
                                index,
                                "tarjetaId",
                                e.target.value
                              )
                            }
                            className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          >
                            <option value="">
                              Seleccionar tarjeta {index + 1}...
                            </option>
                            {available.map((t) => (
                              <option key={t.id} value={t.id}>
                                {t.lectura} (
                                {TIPO_TARJETA[t.tipoId] || `Tipo ${t.tipoId}`})
                              </option>
                            ))}
                          </select>
                          <label className="flex items-center gap-1 text-xs text-gray-600 whitespace-nowrap">
                            <input
                              type="checkbox"
                              checked={slot.utilizoSeguro}
                              onChange={(e) =>
                                updateTarjetaSlot(
                                  index,
                                  "utilizoSeguro",
                                  e.target.checked
                                )
                              }
                            />
                            Seguro
                          </label>
                          {slot.tarjetaId && precioInfo && (
                            <span className="text-xs text-gray-500 whitespace-nowrap">
                              ${calcularPrecioTarjeta(slot.tarjetaId)}
                            </span>
                          )}
                          {index > 0 && (
                            <button
                              type="button"
                              onClick={() => removeTarjetaSlot(index)}
                              className="p-1 text-red-500 hover:text-red-700"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Fecha Vencimiento (solo Folio H) */}
              {form.folioTipo === "H" && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Fecha de Vencimiento{" "}
                    <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={form.fechaVencimiento}
                    onChange={(e) =>
                      setField("fechaVencimiento", e.target.value)
                    }
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Se sugiere 1 ano desde la fecha actual. Puede modificarla.
                  </p>
                </div>
              )}

              {/* Lectura */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tipo de Lectura
                  </label>
                  <select
                    value={form.tipoLectura}
                    onChange={(e) => setField("tipoLectura", e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Seleccionar...</option>
                    <option value="1">TID</option>
                    <option value="2">EPC</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Lectura EPC
                  </label>
                  <input
                    type="text"
                    maxLength={50}
                    value={form.lecturaEpc}
                    onChange={(e) => setField("lecturaEpc", e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Lectura EPC de la tarjeta"
                  />
                </div>
              </div>

              {/* Contrato */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Folio de Contrato
                  </label>
                  <input
                    type="text"
                    maxLength={10}
                    value={form.folioContrato}
                    onChange={(e) => setField("folioContrato", e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Folio del contrato"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Concepto
                  </label>
                  <input
                    type="text"
                    maxLength={100}
                    value={form.concepto}
                    onChange={(e) => setField("concepto", e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Concepto de la venta"
                  />
                </div>
              </div>

              {/* Precios */}
              <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                <h3 className="text-sm font-semibold text-gray-700">
                  Detalle de Venta
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Subtotal
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={form.precio}
                      onChange={(e) => {
                        setField("precio", e.target.value);
                        const sub = parseFloat(e.target.value) || 0;
                        const desc = parseFloat(form.descuento) || 0;
                        const newIva = Math.max(0, sub - desc) * 0.16;
                        setField("iva", newIva.toFixed(2));
                      }}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="0.00"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Descuento
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={form.descuento}
                      onChange={(e) => {
                        setField("descuento", e.target.value);
                        const sub = parseFloat(form.precio) || 0;
                        const desc = parseFloat(e.target.value) || 0;
                        const newIva = Math.max(0, sub - desc) * 0.16;
                        setField("iva", newIva.toFixed(2));
                      }}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="0.00"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      IVA (16%)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={form.iva}
                      readOnly
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-gray-100 text-gray-600"
                    />
                  </div>
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-gray-200">
                  <span className="text-sm font-semibold text-gray-700">
                    Total:
                  </span>
                  <span className="text-lg font-bold text-gray-900">
                    ${totalFinal.toFixed(2)}
                  </span>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Tipo de Pago
                  </label>
                  <select
                    value={form.tipoPago}
                    onChange={(e) => setField("tipoPago", e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Seleccionar...</option>
                    <option value="1">Efectivo</option>
                    <option value="2">Bancos</option>
                  </select>
                </div>
              </div>

              {/* Comprador */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Comprador (si es diferente al residente)
                </label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Buscar comprador..."
                    value={compradorSearch}
                    onChange={(e) => {
                      setCompradorSearch(e.target.value);
                      setSelectedComprador(null);
                      setForm((prev) => ({ ...prev, compradorId: "" }));
                      searchComprador(e.target.value);
                    }}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  {searchingComprador && (
                    <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-gray-600" />
                  )}

                  {compradorResults.length > 0 && !selectedComprador && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                      {compradorResults.map((r) => (
                        <button
                          key={r.id}
                          type="button"
                          onClick={() => selectComprador(r)}
                          className="w-full text-left px-4 py-2 hover:bg-blue-50 text-sm border-b border-gray-100 last:border-b-0"
                        >
                          <div className="font-medium text-gray-900">
                            {r.apePaterno} {r.apeMaterno} {r.nombre}
                          </div>
                          <div className="text-xs text-gray-700">
                            {r.residencia?.privada?.descripcion || ""} - Casa #
                            {r.residencia?.nroCasa || ""}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {selectedComprador && (
                  <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded-lg text-sm">
                    <div className="font-medium text-green-900">
                      {selectedComprador.apePaterno}{" "}
                      {selectedComprador.apeMaterno}{" "}
                      {selectedComprador.nombre}
                    </div>
                    <label className="flex items-center gap-2 mt-1 text-xs text-green-700">
                      <input
                        type="checkbox"
                        checked={form.mostrarNombreComprador}
                        onChange={(e) =>
                          setField("mostrarNombreComprador", e.target.checked)
                        }
                      />
                      Mostrar nombre del comprador
                    </label>
                  </div>
                )}
              </div>

              {/* Observaciones */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Observaciones
                </label>
                <textarea
                  maxLength={100}
                  value={form.observaciones}
                  onChange={(e) => setField("observaciones", e.target.value)}
                  rows={2}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Notas adicionales..."
                />
              </div>
            </div>

            {/* footer */}
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200">
              <button
                onClick={closeModal}
                className="px-4 py-2 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50 transition"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                {saving ? "Guardando..." : "Asignar Tarjeta"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================== CONFIRMAR CANCELACION ==================== */}
      {cancelTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setCancelTarget(null)}
          />
          <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md mx-4 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Confirmar Cancelacion
            </h3>
            <p className="text-sm text-gray-600 mb-6">
              Se cancelara la asignacion de la tarjeta{" "}
              <span className="font-semibold">
                &quot;
                {cancelTarget.tarjeta?.lectura ||
                  cancelTarget.tarjetaId ||
                  "-"}
                &quot;
              </span>{" "}
              al residente{" "}
              <span className="font-semibold">
                {cancelTarget.residente.nombre}{" "}
                {cancelTarget.residente.apePaterno}
              </span>
              . La tarjeta quedara disponible nuevamente.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setCancelTarget(null)}
                className="px-4 py-2 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50 transition"
              >
                No, mantener
              </button>
              <button
                onClick={handleCancel}
                disabled={cancelling}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-medium transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {cancelling && <Loader2 className="h-4 w-4 animate-spin" />}
                {cancelling ? "Cancelando..." : "Cancelar Asignacion"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
