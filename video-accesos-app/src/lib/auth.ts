import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
// eslint-disable-next-line @typescript-eslint/no-require-imports
const crypt = require("unix-crypt-td-js");
import { prisma } from "./prisma";

/**
 * Verifica una contraseña contra el hash DES crypt almacenado por el sistema legacy PHP.
 * El sistema legacy usa: substr(crypt($cadena, 0), 0, 10)
 * Los hashes almacenados usan salt DES de 2 caracteres (primeros 2 chars del hash).
 */
function verificarContrasena(input: string, hashAlmacenado: string): boolean {
  const salt = hashAlmacenado.substring(0, 2);
  const hashCalculado = crypt(input, salt).substring(0, 10);
  return hashCalculado === hashAlmacenado;
}

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        usuario: { label: "Usuario", type: "text" },
        contrasena: { label: "Contraseña", type: "password" },
      },
      async authorize(credentials) {
        console.log("[AUTH] authorize() llamado con usuario:", credentials?.usuario);

        if (!credentials?.usuario || !credentials?.contrasena) {
          console.log("[AUTH] Credenciales vacías");
          return null;
        }

        let usuario;
        try {
          usuario = await prisma.usuario.findFirst({
            where: {
              usuario: credentials.usuario,
              estatusId: 1,
            },
            select: {
              id: true,
              usuario: true,
              contrasena: true,
              modificarFechas: true,
              empleadoId: true,
              privadaId: true,
              estatusId: true,
              empleado: {
                select: {
                  nombre: true,
                  apePaterno: true,
                  email: true,
                  puestoId: true,
                  nroOperador: true,
                },
              },
            },
          });
        } catch (err) {
          console.error("[AUTH] Error en consulta Prisma:", err);
          return null;
        }

        console.log("[AUTH] Usuario encontrado:", usuario ? `ID=${usuario.id}, estatus=${usuario.estatusId}` : "NO");

        if (!usuario) return null;

        console.log("[AUTH] Hash almacenado:", usuario.contrasena, "longitud:", usuario.contrasena.length);
        const salt = usuario.contrasena.substring(0, 2);
        const hashCalculado = crypt(credentials.contrasena, salt).substring(0, 10);
        console.log("[AUTH] Salt:", salt, "Hash calculado:", hashCalculado, "Coincide:", hashCalculado === usuario.contrasena);

        // BD legacy usa DES crypt de PHP: substr(crypt($pass, 0), 0, 10)
        if (!verificarContrasena(credentials.contrasena, usuario.contrasena)) return null;

        // Registrar inicio de sesión en bitácora y actualizar última sesión
        // Wrapped en try/catch para que errores de auditoría no bloqueen el login
        try {
          // Truncar a segundos para coincidir con DateTime(0) de MySQL,
          // evitando el error "found no record(s)" de Prisma al hacer SELECT post-INSERT.
          const ahora = new Date();
          ahora.setMilliseconds(0);
          await prisma.bitacoraInicio.create({
            data: {
              usuarioId: usuario.id,
              inicioSesion: ahora,
              direccionIp: "",
              hostName: "",
            },
          });
          await prisma.usuario.update({
            where: { id: usuario.id },
            data: { ultimaSesion: new Date() },
            select: { id: true },
          });
        } catch (err) {
          console.error("[AUTH] Error en bitácora/update (login continúa):", err);
        }

        // Obtener rutas permitidas para este usuario basado en sus grupos/permisos
        let allowedRoutes: string[] = [];
        try {
          const permisos = await prisma.$queryRawUnsafe<
            Array<{ funcion: string | null; ruta_acceso: string | null }>
          >(`
            SELECT DISTINCT sp.funcion, p.ruta_acceso
            FROM subprocesos sp
            INNER JOIN permisos_acceso pa ON pa.subproceso_id = sp.subproceso_id
            INNER JOIN grupos_usuarios gu ON gu.grupo_usuario_id = pa.grupo_usuario_id
            INNER JOIN grupos_usuarios_detalles gud ON gud.grupo_usuario_id = gu.grupo_usuario_id
            INNER JOIN procesos p ON p.proceso_id = sp.proceso_id
            WHERE gud.usuario_id = ?
              AND gu.estatus_id = 1
          `, usuario.id);

          const routes = new Set<string>();
          for (const row of permisos) {
            // Solo agregar valores que sean rutas Next.js validas (empiezan con "/")
            // Esto filtra funciones PHP legacy como "listar", "editar", etc.
            if (row.funcion && row.funcion.startsWith("/")) routes.add(row.funcion);
            if (row.ruta_acceso && row.ruta_acceso.startsWith("/")) routes.add(row.ruta_acceso);
          }

          // Anti-lockout: si el usuario tiene ALGUN permiso configurado,
          // siempre incluir rutas de Seguridad para que pueda arreglar permisos
          if (routes.size > 0) {
            routes.add("/seguridad/usuarios");
            routes.add("/seguridad/grupos-usuarios");
            routes.add("/seguridad/permisos");
          }

          allowedRoutes = Array.from(routes);
          console.log("[AUTH] Rutas permitidas para usuario", usuario.id, ":", allowedRoutes);
        } catch (err) {
          console.error("[AUTH] Error obteniendo permisos (login continúa):", err);
        }

        return {
          id: String(usuario.id),
          name: usuario.empleado
            ? `${usuario.empleado.nombre} ${usuario.empleado.apePaterno}`
            : usuario.usuario,
          email: usuario.empleado?.email || "",
          image: null,
          usuarioId: usuario.id,
          empleadoId: usuario.empleadoId,
          puestoId: usuario.empleado?.puestoId,
          nroOperador: usuario.empleado?.nroOperador,
          modificarFechas: usuario.modificarFechas,
          privadaId: usuario.privadaId,
          allowedRoutes,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        const u = user as unknown as Record<string, unknown>;
        token.usuarioId = u.usuarioId as number;
        token.empleadoId = u.empleadoId as number | null;
        token.puestoId = u.puestoId as number | undefined;
        token.nroOperador = u.nroOperador as string | undefined;
        token.modificarFechas = u.modificarFechas as string;
        token.privadaId = u.privadaId as number | null;
        token.allowedRoutes = u.allowedRoutes as string[];
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.usuarioId = token.usuarioId as number;
        session.user.empleadoId = token.empleadoId as number | null;
        session.user.puestoId = token.puestoId as number | undefined;
        session.user.nroOperador = token.nroOperador as string | undefined;
        session.user.modificarFechas = token.modificarFechas as string;
        session.user.privadaId = token.privadaId as number | null;
        session.user.allowedRoutes = token.allowedRoutes as string[];
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
    maxAge: 2 * 60 * 60, // 2 horas
  },
  secret: process.env.NEXTAUTH_SECRET,
};
