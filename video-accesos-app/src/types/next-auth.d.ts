import { DefaultSession, DefaultUser } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: DefaultSession["user"] & {
      usuarioId: number;
      empleadoId: number | null;
      puestoId: number | undefined;
      nroOperador: string | undefined;
      modificarFechas: string; // "S" o "N" (char 1 en BD)
      privadaId: number | null;
      allowedRoutes: string[]; // rutas permitidas segun permisos del grupo
    };
  }

  interface User extends DefaultUser {
    usuarioId: number;
    empleadoId: number | null;
    puestoId: number | undefined;
    nroOperador: string | undefined;
    modificarFechas: string;
    privadaId: number | null;
    allowedRoutes: string[];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    usuarioId: number;
    empleadoId: number | null;
    puestoId: number | undefined;
    nroOperador: string | undefined;
    modificarFechas: string;
    privadaId: number | null;
    allowedRoutes: string[];
  }
}
