"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Shield,
  Building2,
  ClipboardList,
  BarChart3,
  KeyRound,
  ChevronDown,
  LogOut,
  Monitor,
  Wrench,
} from "lucide-react";
import { signOut, useSession } from "next-auth/react";
import { useState } from "react";

interface NavItem {
  label: string;
  href?: string;
  icon: React.ReactNode;
  children?: { label: string; href: string }[];
}

/** Menu completo del sistema. Se filtra segun permisos del usuario. */
const fullNavigation: NavItem[] = [
  {
    label: "Inicio",
    href: "/",
    icon: <Monitor className="h-5 w-5" />,
  },
  {
    label: "Terminal de Monitoreo",
    href: "/procesos/monitoristas",
    icon: <Monitor className="h-5 w-5" />,
  },
  {
    label: "Catálogos",
    icon: <Building2 className="h-5 w-5" />,
    children: [
      { label: "Privadas", href: "/catalogos/privadas" },
      { label: "Residencias", href: "/catalogos/residencias" },
      { label: "Empleados", href: "/catalogos/empleados" },
      { label: "Tarjetas", href: "/catalogos/tarjetas" },
      { label: "Puestos", href: "/catalogos/puestos" },
      { label: "Turnos", href: "/catalogos/turnos" },
      { label: "Fallas", href: "/catalogos/fallas" },
      { label: "Materiales", href: "/catalogos/materiales" },
      { label: "Cuentas de Gasto", href: "/catalogos/cuentas-gasto" },
    ],
  },
  {
    label: "Procesos",
    icon: <ClipboardList className="h-5 w-5" />,
    children: [
      { label: "Registro de Accesos", href: "/procesos/registro-accesos" },
      { label: "Consola Monitorista", href: "/procesos/monitoristas" },
      { label: "Asignación de Tarjetas", href: "/procesos/asignacion-tarjetas" },
      { label: "Órdenes de Servicio", href: "/procesos/ordenes-servicio" },
      { label: "Supervisión de Llamadas", href: "/procesos/supervision-llamadas" },
      { label: "Gastos", href: "/procesos/gastos" },
      { label: "Pago de Mensualidades", href: "/procesos/mensualidades" },
    ],
  },
  {
    label: "Herramientas",
    icon: <Wrench className="h-5 w-5" />,
    children: [
      { label: "Corrección Vencimientos", href: "/procesos/correccion-vencimientos" },
      { label: "Conciliación de Tarjetas", href: "/herramientas/conciliacion" },
      { label: "Dashboard de Ingresos", href: "/herramientas/ingresos" },
      { label: "Prenomina Quincenal", href: "/procesos/prenomina" },
    ],
  },
  {
    label: "Reportes",
    icon: <BarChart3 className="h-5 w-5" />,
    children: [
      { label: "Accesos Consultas", href: "/reportes/accesos-consultas" },
      { label: "Accesos Gráficas", href: "/reportes/accesos-graficas" },
      { label: "Supervisión Llamadas", href: "/reportes/supervision-llamadas" },
      { label: "Reporte de Ventas", href: "/reportes/reporte-ventas" },
      { label: "Tarjetas por Vencer", href: "/reportes/tarjetas-vencimientos" },
      { label: "Listado de Tarjetas", href: "/reportes/catalogo-tarjetas" },
    ],
  },
  {
    label: "Seguridad",
    icon: <KeyRound className="h-5 w-5" />,
    children: [
      { label: "Usuarios", href: "/seguridad/usuarios" },
      { label: "Grupos de Usuario", href: "/seguridad/grupos-usuarios" },
      { label: "Permisos de Acceso", href: "/seguridad/permisos" },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const { data: session, status } = useSession();
  const [openMenus, setOpenMenus] = useState<Record<string, boolean>>({});

  // Filtrar navegacion segun permisos almacenados en la sesión (JWT)
  const navigation = (() => {
    // Mientras carga la sesión, solo mostrar Inicio
    if (status === "loading" || !session?.user) {
      return fullNavigation.filter((item) => item.label === "Inicio");
    }

    const { isAdmin, rutasAutorizadas } = session.user;

    // Admin ve todo
    if (isAdmin) {
      return fullNavigation;
    }

    // Construir set de rutas autorizadas
    const rutasAuth = new Set(rutasAutorizadas || []);

    return fullNavigation
      .map((item) => {
        // Inicio siempre visible
        if (item.label === "Inicio") return item;

        // Items con href directo
        if (item.href) {
          return rutasAuth.has(item.href) ? item : null;
        }

        // Items con children: filtrar hijos
        if (item.children) {
          const filteredChildren = item.children.filter((child) =>
            rutasAuth.has(child.href)
          );
          if (filteredChildren.length === 0) return null;
          return { ...item, children: filteredChildren };
        }

        return null;
      })
      .filter(Boolean) as NavItem[];
  })();

  const toggleMenu = (label: string) => {
    setOpenMenus((prev) => {
      const willOpen = !prev[label];
      if (!willOpen) {
        // Closing this menu – just toggle it off
        return { ...prev, [label]: false };
      }
      // Opening this menu – close all others (except those with an active child)
      const next: Record<string, boolean> = {};
      for (const item of navigation) {
        if (!item.children) continue;
        if (item.label === label) {
          next[item.label] = true;
        } else if (isParentActive(item.children)) {
          // Keep open if it contains the current page
          next[item.label] = prev[item.label] ?? false;
        } else {
          next[item.label] = false;
        }
      }
      return next;
    });
  };

  const isActive = (href: string) => pathname === href;
  const isParentActive = (children: { href: string }[]) =>
    children.some((child) => pathname.startsWith(child.href));

  return (
    <aside className="w-64 bg-slate-900 text-white min-h-screen flex flex-col">
      {/* Header */}
      <div className="p-5 border-b border-slate-700">
        <div className="flex items-center gap-3">
          <div className="bg-blue-600 p-2 rounded-lg">
            <Shield className="h-6 w-6" />
          </div>
          <div>
            <h1 className="font-bold text-lg leading-tight">Video Accesos</h1>
            <p className="text-slate-400 text-xs">v2.0</p>
          </div>
        </div>
      </div>

      {/* Navigation - pb-80 reserves space at bottom for the floating softphone */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto pb-80">
        {navigation.map((item) => {
          if (item.href) {
            return (
              <Link
                key={item.label}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition ${
                  isActive(item.href)
                    ? "bg-blue-600 text-white"
                    : "text-slate-300 hover:bg-slate-800 hover:text-white"
                }`}
              >
                {item.icon}
                {item.label}
              </Link>
            );
          }

          const isOpen =
            openMenus[item.label] || isParentActive(item.children || []);

          return (
            <div key={item.label}>
              <button
                onClick={() => toggleMenu(item.label)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm transition ${
                  isParentActive(item.children || [])
                    ? "bg-slate-800 text-white"
                    : "text-slate-300 hover:bg-slate-800 hover:text-white"
                }`}
              >
                <span className="flex items-center gap-3">
                  {item.icon}
                  {item.label}
                </span>
                <ChevronDown
                  className={`h-4 w-4 transition-transform ${
                    isOpen ? "rotate-180" : ""
                  }`}
                />
              </button>
              {isOpen && item.children && (
                <div className="ml-5 mt-1 space-y-1 border-l border-slate-700 pl-3">
                  {item.children.map((child) => (
                    <Link
                      key={child.href}
                      href={child.href}
                      className={`block px-3 py-2 rounded-lg text-sm transition ${
                        isActive(child.href)
                          ? "bg-blue-600 text-white"
                          : "text-slate-400 hover:bg-slate-800 hover:text-white"
                      }`}
                    >
                      {child.label}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          );
        })}

        {/* Logout - inside scrollable nav so softphone doesn't cover it */}
        <div className="mt-4 pt-3 border-t border-slate-700">
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-slate-300 hover:bg-red-600/20 hover:text-red-400 transition"
          >
            <LogOut className="h-5 w-5" />
            Cerrar Sesión
          </button>
        </div>
      </nav>
    </aside>
  );
}
