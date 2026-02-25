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
            include: {
              empleado: {
                include: { puesto: true },
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

        // Registrar inicio de sesión en bitácora
        await prisma.bitacoraInicio.create({
          data: {
            usuarioId: usuario.id,
            inicioSesion: new Date(),
            direccionIp: "",
            hostName: "",
          },
        });

        // Actualizar última sesión
        await prisma.usuario.update({
          where: { id: usuario.id },
          data: { ultimaSesion: new Date() },
        });

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
