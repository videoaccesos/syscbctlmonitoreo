import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";

// GET /api/camera-proxy?telefono=XXX&cam=1
// GET /api/camera-proxy?privada_id=N&cam=1
// Proxy que obtiene snapshots de camaras con autenticacion digest
// Las URLs se leen de la tabla privadas (video_1, video_2, video_3)
// Las credenciales se leen de dns_*/contrasena_* de la misma privada

function md5(str: string): string {
  return crypto.createHash("md5").update(str).digest("hex");
}

// Construye la URL completa de la camara a partir de los campos de la privada
// Si video_N ya es una URL completa (http://...), se usa directamente
// Si es un path relativo, se combina con dns_N y puerto_N
function buildCameraUrl(
  videoUrl: string,
  dns: string,
  puerto: string
): string {
  const trimmed = videoUrl.trim();
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return trimmed;
  }
  // Construir URL a partir de DNS + puerto + path
  const host = dns.trim();
  const port = puerto.trim();
  if (!host) return "";
  const path = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
  return port ? `http://${host}:${port}${path}` : `http://${host}${path}`;
}

// Determina las credenciales para una URL dada, buscando coincidencia por host
// entre la URL y los campos dns_1, dns_2, dns_3 de la privada
function findCredentials(
  url: string,
  privada: {
    dns1: string;
    puerto1: string;
    contrasena1: string;
    dns2: string;
    puerto2: string;
    contrasena2: string;
    dns3: string;
    puerto3: string;
    contrasena3: string;
  }
): { user: string; pass: string } {
  // Parsea el campo contrasena que puede tener formato "usuario:password" o solo "password"
  function parseCredentials(raw: string): { user: string; pass: string } {
    const trimmed = raw.trim();
    const colonIdx = trimmed.indexOf(":");
    if (colonIdx > 0) {
      return { user: trimmed.substring(0, colonIdx), pass: trimmed.substring(colonIdx + 1) };
    }
    return { user: "admin", pass: trimmed };
  }

  let hostname = "";
  try {
    hostname = new URL(url).hostname;
  } catch {
    return parseCredentials(privada.contrasena1);
  }

  // Buscar coincidencia por hostname en los 3 slots DNS
  const dnsSlots = [
    { dns: privada.dns1, cred: privada.contrasena1 },
    { dns: privada.dns2, cred: privada.contrasena2 },
    { dns: privada.dns3, cred: privada.contrasena3 },
  ];

  for (const slot of dnsSlots) {
    if (slot.dns && slot.dns.trim() !== "") {
      const slotHost = slot.dns.trim().toLowerCase();
      if (
        hostname.toLowerCase() === slotHost ||
        hostname.toLowerCase().includes(slotHost) ||
        slotHost.includes(hostname.toLowerCase())
      ) {
        return parseCredentials(slot.cred);
      }
    }
  }

  // Si no hay coincidencia, usar el primer slot con credenciales
  for (const slot of dnsSlots) {
    if (slot.cred && slot.cred.trim() !== "") {
      return parseCredentials(slot.cred);
    }
  }

  return { user: "admin", pass: "" };
}

// Implementacion de HTTP Digest Authentication
async function fetchWithDigestAuth(
  url: string,
  user: string,
  pass: string,
  timeoutMs: number = 8000
): Promise<{ ok: boolean; data: Buffer | null; contentType: string; status: number; error?: string }> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    // Primer request - esperamos 401 con challenge
    const res1 = await fetch(url, {
      headers: {
        Accept: "image/jpeg, image/*",
        "Cache-Control": "no-cache",
        "User-Agent": "VideoAccesos/2.0",
      },
      signal: controller.signal,
    });

    // Si responde 200 directamente (sin auth requerido)
    if (res1.ok) {
      const buf = Buffer.from(await res1.arrayBuffer());
      return {
        ok: true,
        data: buf,
        contentType: res1.headers.get("content-type") || "image/jpeg",
        status: res1.status,
      };
    }

    if (res1.status !== 401) {
      return {
        ok: false,
        data: null,
        contentType: "",
        status: res1.status,
        error: `HTTP ${res1.status}`,
      };
    }

    const wwwAuth = res1.headers.get("www-authenticate") || "";

    // Intentar Basic Auth si no es Digest
    if (!wwwAuth.toLowerCase().startsWith("digest")) {
      const basicAuth = Buffer.from(`${user}:${pass}`).toString("base64");
      const res2 = await fetch(url, {
        headers: {
          Authorization: `Basic ${basicAuth}`,
          Accept: "image/jpeg, image/*",
          "Cache-Control": "no-cache",
        },
        signal: controller.signal,
      });
      if (res2.ok) {
        const buf = Buffer.from(await res2.arrayBuffer());
        return {
          ok: true,
          data: buf,
          contentType: res2.headers.get("content-type") || "image/jpeg",
          status: res2.status,
        };
      }
      return {
        ok: false,
        data: null,
        contentType: "",
        status: res2.status,
        error: "Basic auth failed",
      };
    }

    // Parsear challenge Digest
    const realm = wwwAuth.match(/realm="([^"]+)"/)?.[1] || "";
    const nonce = wwwAuth.match(/nonce="([^"]+)"/)?.[1] || "";
    const qopRaw = wwwAuth.match(/qop="([^"]+)"/)?.[1] || "";
    const opaque = wwwAuth.match(/opaque="([^"]+)"/)?.[1] || "";

    // Calcular response
    const uri = new URL(url).pathname;
    const ha1 = md5(`${user}:${realm}:${pass}`);
    const ha2 = md5(`GET:${uri}`);
    const nc = "00000001";
    const cnonce = crypto.randomBytes(8).toString("hex");

    let response: string;
    const qop = qopRaw.split(",")[0].trim();
    if (qop) {
      response = md5(`${ha1}:${nonce}:${nc}:${cnonce}:${qop}:${ha2}`);
    } else {
      response = md5(`${ha1}:${nonce}:${ha2}`);
    }

    // Construir Authorization header
    let authHeader = `Digest username="${user}", realm="${realm}", nonce="${nonce}", uri="${uri}"`;
    if (qop) {
      authHeader += `, qop=${qop}, nc=${nc}, cnonce="${cnonce}"`;
    }
    authHeader += `, response="${response}"`;
    if (opaque) {
      authHeader += `, opaque="${opaque}"`;
    }

    // Segundo request con credenciales digest
    const res3 = await fetch(url, {
      headers: {
        Authorization: authHeader,
        Accept: "image/jpeg, image/*",
        "Cache-Control": "no-cache",
        "User-Agent": "VideoAccesos/2.0",
      },
      signal: controller.signal,
    });

    if (res3.ok) {
      const buf = Buffer.from(await res3.arrayBuffer());
      return {
        ok: true,
        data: buf,
        contentType: res3.headers.get("content-type") || "image/jpeg",
        status: res3.status,
      };
    }

    return {
      ok: false,
      data: null,
      contentType: "",
      status: res3.status,
      error: `Digest auth failed: HTTP ${res3.status}`,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return {
      ok: false,
      data: null,
      contentType: "",
      status: 0,
      error: message.includes("abort") ? "Timeout" : message,
    };
  } finally {
    clearTimeout(timeout);
  }
}

// SVG placeholder para cuando no hay señal
function noSignalSvg(channel: string, errorMsg: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="640" height="480" xmlns="http://www.w3.org/2000/svg">
  <rect width="100%" height="100%" fill="#1e1b4b"/>
  <text x="50%" y="45%" text-anchor="middle" fill="#ff6b35" font-size="24" font-family="sans-serif">Sin señal</text>
  <text x="50%" y="55%" text-anchor="middle" fill="#94a3b8" font-size="14" font-family="sans-serif">${channel}</text>
  <text x="50%" y="65%" text-anchor="middle" fill="#64748b" font-size="12" font-family="sans-serif">${errorMsg}</text>
</svg>`;
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return new NextResponse("No autorizado", { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const telefono = searchParams.get("telefono");
    const privadaId = searchParams.get("privada_id");
    const camIndex = parseInt(searchParams.get("cam") || "1");

    if (!telefono && !privadaId) {
      return NextResponse.json(
        { error: "Se requiere telefono o privada_id" },
        { status: 400 }
      );
    }

    if (camIndex < 1 || camIndex > 3) {
      return NextResponse.json(
        { error: "cam debe ser 1, 2 o 3" },
        { status: 400 }
      );
    }

    // Buscar privada
    const privadaSelect = {
      id: true,
      descripcion: true,
      video1: true,
      aliasVideo1: true,
      video2: true,
      aliasVideo2: true,
      video3: true,
      aliasVideo3: true,
      dns1: true,
      puerto1: true,
      contrasena1: true,
      dns2: true,
      puerto2: true,
      contrasena2: true,
      dns3: true,
      puerto3: true,
      contrasena3: true,
    };

    let privada;

    if (privadaId) {
      privada = await prisma.privada.findFirst({
        where: { id: parseInt(privadaId), estatusId: { in: [1, 2] } },
        select: privadaSelect,
      });
    } else if (telefono) {
      const cleanNum = telefono.replace(/\D/g, "");
      const last10 = cleanNum.length > 10 ? cleanNum.slice(-10) : null;
      const variants = [cleanNum, telefono];
      if (last10) variants.push(last10);

      // 1. Buscar directo en privada
      privada = await prisma.privada.findFirst({
        where: {
          estatusId: { in: [1, 2] },
          OR: variants.flatMap((num) => [
            { telefono: num },
            { celular: num },
          ]),
        },
        select: privadaSelect,
      });

      // 2. Buscar via residencia si no encontro directo
      if (!privada) {
        const residencia = await prisma.residencia.findFirst({
          where: {
            estatusId: { in: [1, 2, 3] },
            OR: variants.flatMap((num) => [
              { telefonoInterfon: num },
              { interfon: num },
              { telefono1: num },
              { telefono2: num },
            ]),
          },
          select: { privadaId: true },
        });

        if (residencia) {
          privada = await prisma.privada.findFirst({
            where: { id: residencia.privadaId, estatusId: { in: [1, 2] } },
            select: privadaSelect,
          });
        }
      }
    }

    if (!privada) {
      return new NextResponse(noSignalSvg("Privada no encontrada", ""), {
        status: 404,
        headers: { "Content-Type": "image/svg+xml" },
      });
    }

    // Obtener la URL de video segun el indice
    const videoUrls = [privada.video1, privada.video2, privada.video3];
    const dnsHosts = [privada.dns1, privada.dns2, privada.dns3];
    const dnsPorts = [privada.puerto1, privada.puerto2, privada.puerto3];

    const rawVideoUrl = videoUrls[camIndex - 1] || "";
    if (!rawVideoUrl || rawVideoUrl.trim() === "") {
      return new NextResponse(
        noSignalSvg(`Camara ${camIndex}`, "No configurada"),
        {
          status: 200,
          headers: {
            "Content-Type": "image/svg+xml",
            "Cache-Control": "no-cache",
          },
        }
      );
    }

    // Construir URL completa
    const cameraUrl = buildCameraUrl(
      rawVideoUrl,
      dnsHosts[camIndex - 1] || dnsHosts[0] || "",
      dnsPorts[camIndex - 1] || dnsPorts[0] || ""
    );

    if (!cameraUrl) {
      return new NextResponse(
        noSignalSvg(`Camara ${camIndex}`, "URL invalida"),
        {
          status: 200,
          headers: {
            "Content-Type": "image/svg+xml",
            "Cache-Control": "no-cache",
          },
        }
      );
    }

    // Obtener credenciales
    const creds = findCredentials(cameraUrl, privada);

    // Fetch snapshot con digest auth
    const result = await fetchWithDigestAuth(cameraUrl, creds.user, creds.pass);

    if (result.ok && result.data) {
      return new NextResponse(new Uint8Array(result.data), {
        status: 200,
        headers: {
          "Content-Type": result.contentType || "image/jpeg",
          "Cache-Control": "no-cache, no-store, must-revalidate",
          Pragma: "no-cache",
          Expires: "0",
          "X-Camera-Index": String(camIndex),
          "X-Privada": privada.descripcion,
          "Access-Control-Allow-Origin": "*",
        },
      });
    }

    // Error - devolver SVG placeholder
    return new NextResponse(
      noSignalSvg(
        `Camara ${camIndex} - ${privada.descripcion}`,
        result.error || `HTTP ${result.status}`
      ),
      {
        status: 200,
        headers: {
          "Content-Type": "image/svg+xml",
          "Cache-Control": "no-cache",
        },
      }
    );
  } catch (error) {
    console.error("Error en camera-proxy:", error);
    return new NextResponse(noSignalSvg("Error", "Error interno del servidor"), {
      status: 500,
      headers: { "Content-Type": "image/svg+xml" },
    });
  }
}
