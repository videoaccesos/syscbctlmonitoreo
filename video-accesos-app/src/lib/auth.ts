import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "./prisma";

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        usuario: { label: "Usuario", type: "text" },
        contrasena: { label: "Contraseña", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.usuario || !credentials?.contrasena) {
          return null;
        }

        const usuario = await prisma.usuario.findFirst({
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

        if (!usuario) return null;

        const passwordMatch = await bcrypt.compare(
          credentials.contrasena,
          usuario.contrasena
        );

        if (!passwordMatch) return null;

        // Registrar inicio de sesión en bitácora
        await prisma.bitacoraInicio.create({
          data: {
            usuarioId: usuario.id,
            direccionIp: "",
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
        token.nroOperador = u.nroOperador as string | null | undefined;
        token.modificarFechas = u.modificarFechas as boolean;
        token.privadaId = u.privadaId as number | null;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.usuarioId = token.usuarioId as number;
        session.user.empleadoId = token.empleadoId as number | null;
        session.user.puestoId = token.puestoId as number | undefined;
        session.user.nroOperador = token.nroOperador as string | null | undefined;
        session.user.modificarFechas = token.modificarFechas as boolean;
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
    maxAge: 2 * 60 * 60, // 2 horas (igual que el sistema legacy)
  },
  secret: process.env.NEXTAUTH_SECRET,
};
