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

// --- Cache de nonce digest para evitar doble request por snapshot ---
// Despues de la primera autenticacion exitosa, reutilizamos el nonce
// con nc incrementado (1 request en vez de 2 por snapshot)
interface DigestCacheEntry {
  realm: string;
  nonce: string;
  qop: string;
  opaque: string;
  nc: number;
  timestamp: number;
}

const digestNonceCache = new Map<string, DigestCacheEntry>();
const NONCE_CACHE_TTL = 60_000; // 60 segundos

// --- Semaforo por host: limita requests concurrentes al mismo DVR ---
// Previene agotamiento de conexiones TCP cuando multiples camaras
// del mismo host se refrescan simultaneamente
const MAX_CONCURRENT_PER_HOST = 2;
const hostQueues = new Map<string, { active: number; waiting: Array<() => void> }>();

async function acquireHostSlot(hostKey: string): Promise<void> {
  if (!hostKey) return;
  let queue = hostQueues.get(hostKey);
  if (!queue) {
    queue = { active: 0, waiting: [] };
    hostQueues.set(hostKey, queue);
  }
  if (queue.active < MAX_CONCURRENT_PER_HOST) {
    queue.active++;
    return;
  }
  // Esperar a que se libere un slot
  return new Promise<void>((resolve) => {
    queue!.waiting.push(resolve);
  });
}

function releaseHostSlot(hostKey: string): void {
  if (!hostKey) return;
  const queue = hostQueues.get(hostKey);
  if (!queue) return;
  if (queue.waiting.length > 0) {
    const next = queue.waiting.shift()!;
    next(); // no decrementar active, el slot pasa al siguiente
  } else {
    queue.active--;
    if (queue.active === 0) hostQueues.delete(hostKey); // limpiar
  }
}

function getHostKey(url: string): string {
  try {
    const u = new URL(url);
    return `${u.hostname}:${u.port || "80"}`;
  } catch {
    return "";
  }
}

function makeDigestHeader(
  user: string,
  pass: string,
  method: string,
  uri: string,
  realm: string,
  nonce: string,
  qopRaw: string,
  opaque: string,
  nc: number
): string {
  const ha1 = md5(`${user}:${realm}:${pass}`);
  const ha2 = md5(`${method}:${uri}`);
  const ncHex = nc.toString(16).padStart(8, "0");
  const cnonce = crypto.randomBytes(8).toString("hex");
  const qop = qopRaw.split(",")[0].trim();

  let response: string;
  if (qop) {
    response = md5(`${ha1}:${nonce}:${ncHex}:${cnonce}:${qop}:${ha2}`);
  } else {
    response = md5(`${ha1}:${nonce}:${ha2}`);
  }

  let header = `Digest username="${user}", realm="${realm}", nonce="${nonce}", uri="${uri}"`;
  if (qop) header += `, qop=${qop}, nc=${ncHex}, cnonce="${cnonce}"`;
  header += `, response="${response}"`;
  if (opaque) header += `, opaque="${opaque}"`;
  return header;
}

// Limpia un valor de la base de datos eliminando comillas sueltas y espacios
// Necesario porque algunos registros tienen comillas extra (ej: url")
function sanitizeDbValue(raw: string): string {
  return raw.trim().replace(/^["']+|["']+$/g, "").trim();
}

// Construye la URL completa de la camara a partir de los campos de la privada
// Si video_N ya es una URL completa (http://...), se usa directamente
// Si es un path relativo, se combina con dns_N y puerto_N
function buildCameraUrl(
  videoUrl: string,
  dns: string,
  puerto: string
): string {
  const trimmed = sanitizeDbValue(videoUrl);
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return trimmed;
  }
  // Construir URL a partir de DNS + puerto + path
  const host = sanitizeDbValue(dns);
  const port = sanitizeDbValue(puerto);
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
// - Reutiliza nonce en cache para hacer 1 request en vez de 2
// - Consume response bodies para liberar conexiones TCP (evita "fetch failed")
// - Propaga signal del cliente para cancelar fetches cuando el browser cancela
async function fetchWithDigestAuth(
  url: string,
  user: string,
  pass: string,
  timeoutMs: number = 8000,
  clientSignal?: AbortSignal
): Promise<{ ok: boolean; data: Buffer | null; contentType: string; status: number; error?: string }> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  // Cancelar fetch a la camara si el cliente se desconecta
  const onClientAbort = () => controller.abort();
  if (clientSignal) {
    if (clientSignal.aborted) {
      clearTimeout(timeout);
      return { ok: false, data: null, contentType: "", status: 0, error: "Client disconnected" };
    }
    clientSignal.addEventListener("abort", onClientAbort, { once: true });
  }

  const fetchHeaders = {
    Accept: "image/jpeg, image/*",
    "Cache-Control": "no-cache",
    "User-Agent": "VideoAccesos/2.0",
  };

  try {
    let uri: string;
    try { uri = new URL(url).pathname; } catch { uri = "/"; }
    const hostKey = getHostKey(url);

    // --- Intentar con nonce en cache (1 solo request) ---
    const cached = hostKey ? digestNonceCache.get(hostKey) : undefined;
    if (cached && Date.now() - cached.timestamp < NONCE_CACHE_TTL) {
      cached.nc++;
      const authHeader = makeDigestHeader(
        user, pass, "GET", uri,
        cached.realm, cached.nonce, cached.qop, cached.opaque, cached.nc
      );
      const resCached = await fetch(url, {
        headers: { ...fetchHeaders, Authorization: authHeader },
        signal: controller.signal,
      });

      if (resCached.ok) {
        const buf = Buffer.from(await resCached.arrayBuffer());
        cached.timestamp = Date.now(); // refrescar TTL
        return {
          ok: true, data: buf,
          contentType: resCached.headers.get("content-type") || "image/jpeg",
          status: resCached.status,
        };
      }

      // Nonce expirado u otro error - consumir body para liberar conexion
      await resCached.arrayBuffer().catch(() => {});
      if (resCached.status === 401) {
        digestNonceCache.delete(hostKey); // nonce stale, caer al flujo completo
      } else {
        return { ok: false, data: null, contentType: "", status: resCached.status, error: `HTTP ${resCached.status}` };
      }
    }

    // --- Flujo completo de 2 pasos (sin cache o nonce expirado) ---
    // Primer request - esperamos 401 con challenge
    const res1 = await fetch(url, {
      headers: fetchHeaders,
      signal: controller.signal,
    });

    // Si responde 200 directamente (sin auth requerido)
    if (res1.ok) {
      const buf = Buffer.from(await res1.arrayBuffer());
      return {
        ok: true, data: buf,
        contentType: res1.headers.get("content-type") || "image/jpeg",
        status: res1.status,
      };
    }

    if (res1.status !== 401) {
      await res1.arrayBuffer().catch(() => {}); // CRITICO: consumir body para liberar conexion
      return { ok: false, data: null, contentType: "", status: res1.status, error: `HTTP ${res1.status}` };
    }

    const wwwAuth = res1.headers.get("www-authenticate") || "";
    await res1.arrayBuffer().catch(() => {}); // CRITICO: consumir body del 401 para liberar conexion

    // Intentar Basic Auth si no es Digest
    if (!wwwAuth.toLowerCase().startsWith("digest")) {
      const basicAuth = Buffer.from(`${user}:${pass}`).toString("base64");
      const res2 = await fetch(url, {
        headers: { ...fetchHeaders, Authorization: `Basic ${basicAuth}` },
        signal: controller.signal,
      });
      if (res2.ok) {
        const buf = Buffer.from(await res2.arrayBuffer());
        return {
          ok: true, data: buf,
          contentType: res2.headers.get("content-type") || "image/jpeg",
          status: res2.status,
        };
      }
      await res2.arrayBuffer().catch(() => {}); // consumir body para liberar conexion
      return { ok: false, data: null, contentType: "", status: res2.status, error: "Basic auth failed" };
    }

    // Parsear challenge Digest
    const realm = wwwAuth.match(/realm="([^"]+)"/)?.[1] || "";
    const nonce = wwwAuth.match(/nonce="([^"]+)"/)?.[1] || "";
    const qopRaw = wwwAuth.match(/qop="([^"]+)"/)?.[1] || "";
    const opaque = wwwAuth.match(/opaque="([^"]+)"/)?.[1] || "";

    const nc = 1;
    const authHeader = makeDigestHeader(user, pass, "GET", uri, realm, nonce, qopRaw, opaque, nc);

    // Segundo request con credenciales digest
    const res3 = await fetch(url, {
      headers: { ...fetchHeaders, Authorization: authHeader },
      signal: controller.signal,
    });

    if (res3.ok) {
      const buf = Buffer.from(await res3.arrayBuffer());
      // Guardar nonce en cache para reutilizar en siguientes requests
      if (hostKey) {
        digestNonceCache.set(hostKey, { realm, nonce, qop: qopRaw, opaque, nc, timestamp: Date.now() });
      }
      return {
        ok: true, data: buf,
        contentType: res3.headers.get("content-type") || "image/jpeg",
        status: res3.status,
      };
    }

    await res3.arrayBuffer().catch(() => {}); // consumir body para liberar conexion
    return { ok: false, data: null, contentType: "", status: res3.status, error: `Digest auth failed: HTTP ${res3.status}` };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return { ok: false, data: null, contentType: "", status: 0, error: message.includes("abort") ? "Timeout" : message };
  } finally {
    clearTimeout(timeout);
    if (clientSignal) {
      clientSignal.removeEventListener("abort", onClientAbort);
    }
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

    console.log(`[camera-proxy] Peticion recibida: telefono="${telefono}" privada_id="${privadaId}" cam=${camIndex}`);

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

    console.log(`[camera-proxy] ========== SNAPSHOT REQUEST ==========`);
    console.log(`[camera-proxy] Privada: ${privada.descripcion} (ID: ${privada.id})`);
    console.log(`[camera-proxy] Cam index: ${camIndex}`);
    console.log(`[camera-proxy] DB video_${camIndex}: "${rawVideoUrl}"`);
    console.log(`[camera-proxy] DB dns_${camIndex}: "${dnsHosts[camIndex - 1] || ""}" | puerto_${camIndex}: "${dnsPorts[camIndex - 1] || ""}"`);
    console.log(`[camera-proxy] Todos los videos: video_1="${privada.video1}" | video_2="${privada.video2}" | video_3="${privada.video3}"`);
    console.log(`[camera-proxy] Todos los DNS: dns_1="${privada.dns1}" | dns_2="${privada.dns2}" | dns_3="${privada.dns3}"`);
    console.log(`[camera-proxy] Todos los puertos: puerto_1="${privada.puerto1}" | puerto_2="${privada.puerto2}" | puerto_3="${privada.puerto3}"`);

    if (!rawVideoUrl || rawVideoUrl.trim() === "") {
      console.log(`[camera-proxy] ❌ video_${camIndex} esta VACIO - No configurada`);
      console.log(`[camera-proxy] ==========================================`);
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

    console.log(`[camera-proxy] >>> URL CONSTRUIDA: ${cameraUrl}`);

    if (!cameraUrl) {
      console.log(`[camera-proxy] ❌ URL construida esta VACIA - URL invalida`);
      console.log(`[camera-proxy] ==========================================`);
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
    console.log(`[camera-proxy] Credenciales: user="${creds.user}" pass="${creds.pass.substring(0, 3)}***"`);

    // Adquirir slot del semaforo para este host (evita saturar conexiones al DVR)
    const hostKey = getHostKey(cameraUrl);
    await acquireHostSlot(hostKey);

    try {
      console.log(`[camera-proxy] Iniciando fetch a: ${cameraUrl}`);

      // Fetch snapshot con digest auth (pasa signal del cliente para cancelar si el browser desconecta)
      const fetchStart = Date.now();
      const result = await fetchWithDigestAuth(cameraUrl, creds.user, creds.pass, 8000, request.signal);
      const fetchMs = Date.now() - fetchStart;

      if (result.ok && result.data) {
        console.log(`[camera-proxy] ✅ Snapshot OK | ${result.data.length} bytes | ${result.contentType} | ${fetchMs}ms`);
        console.log(`[camera-proxy] ==========================================`);
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
      console.log(`[camera-proxy] ❌ Snapshot FALLO | status=${result.status} | error="${result.error}" | ${fetchMs}ms`);
      console.log(`[camera-proxy] URL que fallo: ${cameraUrl}`);
      console.log(`[camera-proxy] ==========================================`);
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
    } finally {
      releaseHostSlot(hostKey);
    }
  } catch (error) {
    console.error("[camera-proxy] ❌ ERROR CRITICO:", error);
    return new NextResponse(noSignalSvg("Error", "Error interno del servidor"), {
      status: 500,
      headers: { "Content-Type": "image/svg+xml" },
    });
  }
}
