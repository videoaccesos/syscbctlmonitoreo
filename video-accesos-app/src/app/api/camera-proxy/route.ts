import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { getFrame, pushCommand } from "@/lib/frame-store";
import crypto from "crypto";

const TAG = "camera-proxy";

// ---------------------------------------------------------------------------
// Request-level diagnostics - log timing of each step in the proxy pipeline
// ---------------------------------------------------------------------------
interface ProxyDiagEntry {
  ts: number;
  step: string;
  detail?: string;
}

function createProxyDiag(reqId: string) {
  const entries: ProxyDiagEntry[] = [];
  const start = Date.now();
  return {
    log(step: string, detail?: string) {
      entries.push({ ts: Date.now() - start, step, detail });
      logger.debug(TAG, `[${reqId}] +${Date.now() - start}ms | ${step}${detail ? ` | ${detail}` : ""}`);
    },
    summary() {
      return entries.map(e => `+${e.ts}ms ${e.step}${e.detail ? ` (${e.detail})` : ""}`).join(" -> ");
    },
    elapsed() {
      return Date.now() - start;
    },
  };
}

let _proxyReqCounter = 0;

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

// Limpieza periodica de nonces expirados para evitar memory leak
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of digestNonceCache) {
    if (now - entry.timestamp > NONCE_CACHE_TTL * 2) {
      digestNonceCache.delete(key);
    }
  }
}, 120_000).unref();

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
  clientSignal?: AbortSignal,
  diagFn?: (step: string, detail?: string) => void
): Promise<{ ok: boolean; data: Buffer | null; contentType: string; status: number; error?: string }> {
  const dlog = diagFn || (() => {});
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
      dlog("DIGEST_CACHE_HIT", `nc=${cached.nc + 1} host=${hostKey}`);
      cached.nc++;
      const authHeader = makeDigestHeader(
        user, pass, "GET", uri,
        cached.realm, cached.nonce, cached.qop, cached.opaque, cached.nc
      );
      dlog("FETCH_CACHED_START");
      const resCached = await fetch(url, {
        headers: { ...fetchHeaders, Authorization: authHeader },
        signal: controller.signal,
      });
      dlog("FETCH_CACHED_DONE", `status=${resCached.status}`);

      if (resCached.ok) {
        const buf = Buffer.from(await resCached.arrayBuffer());
        cached.timestamp = Date.now(); // refrescar TTL
        dlog("CACHE_OK", `${buf.length} bytes`);
        return {
          ok: true, data: buf,
          contentType: resCached.headers.get("content-type") || "image/jpeg",
          status: resCached.status,
        };
      }

      // Nonce expirado u otro error - consumir body para liberar conexion
      await resCached.arrayBuffer().catch(() => {});
      if (resCached.status === 401) {
        dlog("NONCE_STALE", "cache invalidated");
        digestNonceCache.delete(hostKey); // nonce stale, caer al flujo completo
      } else {
        dlog("CACHE_FAIL", `HTTP ${resCached.status}`);
        return { ok: false, data: null, contentType: "", status: resCached.status, error: `HTTP ${resCached.status}` };
      }
    } else {
      dlog("DIGEST_CACHE_MISS", hostKey);
    }

    // --- Flujo completo de 2 pasos (sin cache o nonce expirado) ---
    // Primer request - esperamos 401 con challenge
    dlog("FETCH_CHALLENGE_START", url.substring(0, 120));
    const res1 = await fetch(url, {
      headers: fetchHeaders,
      signal: controller.signal,
    });
    dlog("FETCH_CHALLENGE_DONE", `status=${res1.status}`);

    // Si responde 200 directamente (sin auth requerido)
    if (res1.ok) {
      const buf = Buffer.from(await res1.arrayBuffer());
      dlog("NO_AUTH_NEEDED", `${buf.length} bytes`);
      return {
        ok: true, data: buf,
        contentType: res1.headers.get("content-type") || "image/jpeg",
        status: res1.status,
      };
    }

    if (res1.status !== 401) {
      await res1.arrayBuffer().catch(() => {}); // CRITICO: consumir body para liberar conexion
      dlog("UNEXPECTED_STATUS", `HTTP ${res1.status}`);
      return { ok: false, data: null, contentType: "", status: res1.status, error: `HTTP ${res1.status}` };
    }

    const wwwAuth = res1.headers.get("www-authenticate") || "";
    dlog("AUTH_CHALLENGE", wwwAuth.substring(0, 80));
    await res1.arrayBuffer().catch(() => {}); // CRITICO: consumir body del 401 para liberar conexion

    // Intentar Basic Auth si no es Digest
    if (!wwwAuth.toLowerCase().startsWith("digest")) {
      dlog("BASIC_AUTH_ATTEMPT");
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
    dlog("FETCH_DIGEST_START");
    const res3 = await fetch(url, {
      headers: { ...fetchHeaders, Authorization: authHeader },
      signal: controller.signal,
    });
    dlog("FETCH_DIGEST_DONE", `status=${res3.status}`);

    if (res3.ok) {
      const buf = Buffer.from(await res3.arrayBuffer());
      // Guardar nonce en cache para reutilizar en siguientes requests
      if (hostKey) {
        digestNonceCache.set(hostKey, { realm, nonce, qop: qopRaw, opaque, nc, timestamp: Date.now() });
      }
      dlog("DIGEST_OK", `${buf.length} bytes, nonce cached`);
      return {
        ok: true, data: buf,
        contentType: res3.headers.get("content-type") || "image/jpeg",
        status: res3.status,
      };
    }

    await res3.arrayBuffer().catch(() => {}); // consumir body para liberar conexion
    dlog("DIGEST_FAIL", `HTTP ${res3.status}`);
    return { ok: false, data: null, contentType: "", status: res3.status, error: `Digest auth failed: HTTP ${res3.status}` };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    const errorType = message.includes("abort") ? "Timeout" : message;
    dlog("FETCH_EXCEPTION", `${errorType} (raw: ${message})`);
    return { ok: false, data: null, contentType: "", status: 0, error: errorType };
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

// --- Auto-trigger start_stream cuando el proxy no encuentra frame del agente ---
// Evita que el usuario tenga que esperar a que el flujo UI envie el comando.
// Debounce por sitio+cam: max 1 trigger cada 15 segundos por cámara.
const autoTriggerLastSent = new Map<string, number>();
const AUTO_TRIGGER_DEBOUNCE_MS = 15_000;

function autoTriggerStartStream(siteId: string, camId?: number) {
  const now = Date.now();
  const key = camId ? `${siteId}:${camId}` : siteId;
  const last = autoTriggerLastSent.get(key) || 0;
  if (now - last < AUTO_TRIGGER_DEBOUNCE_MS) return;
  autoTriggerLastSent.set(key, now);
  logger.info(TAG, `Auto-trigger start_stream para site=${siteId} cam=${camId || "all"}`);
  pushCommand(siteId, {
    cmd: "start_stream",
    fps: 25,
    duration: 0,
    cam_id: camId,
    ts: now,
  });
}

export async function GET(request: NextRequest) {
  const reqId = `r${++_proxyReqCounter}`;
  const diag = createProxyDiag(reqId);

  try {
    diag.log("AUTH_CHECK");
    const session = await getServerSession(authOptions);
    if (!session) {
      logger.warn(TAG, "Solicitud sin sesion (401)");
      return new NextResponse("No autorizado", { status: 401 });
    }
    diag.log("AUTH_OK");

    const { searchParams } = new URL(request.url);
    const telefono = searchParams.get("telefono");
    const privadaId = searchParams.get("privada_id");
    const camIndex = parseInt(searchParams.get("cam") || "1");

    diag.log("PARAMS", `privada_id=${privadaId} tel=${telefono} cam=${camIndex}`);
    logger.debug(TAG, `[${reqId}] Request: privada_id=${privadaId}, telefono=${telefono}, cam=${camIndex}`);

    if (!telefono && !privadaId) {
      return NextResponse.json(
        { error: "Se requiere telefono o privada_id" },
        { status: 400 }
      );
    }

    if (camIndex < 1 || camIndex > 16) {
      return NextResponse.json(
        { error: "cam debe ser entre 1 y 16" },
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

        if (residencia && residencia.privadaId) {
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

    // --- Verificar si hay un frame reciente del agente remoto ---
    // Prioridad: si existe un frame fresco del agente, usarlo siempre.
    // Esto permite camaras 4+ que no existen en la BD pero si en el agente.
    const agentFrame = getFrame(String(privada.id), camIndex);
    if (agentFrame) {
      const ageMs = Date.now() - agentFrame.receivedAt;
      diag.log("AGENT_FRAME_HIT", `age=${ageMs}ms bytes=${agentFrame.data.length} host=${agentFrame.agentHost || "?"}`);
      logger.info(TAG, `[${reqId}] AGENT FRAME | Cam ${camIndex} | ${privada.descripcion} | ${agentFrame.data.length} bytes | age=${ageMs}ms`);
      return new NextResponse(new Uint8Array(agentFrame.data), {
        status: 200,
        headers: {
          "Content-Type": agentFrame.contentType || "image/jpeg",
          "Cache-Control": "no-cache, no-store, must-revalidate",
          Pragma: "no-cache",
          Expires: "0",
          "X-Camera-Index": String(camIndex),
          "X-Privada": privada.descripcion,
          "X-Frame-Source": "agent",
          "X-Frame-Age-Ms": String(ageMs),
          "Access-Control-Allow-Origin": "*",
        },
      });
    }
    diag.log("AGENT_FRAME_MISS", `site=${privada.id} cam=${camIndex}`);

    // --- Auto-trigger start_stream si no hay frame del agente ---
    autoTriggerStartStream(String(privada.id), camIndex);

    // --- Fallback: fetch directo al DVR (modo legacy, solo cam 1-3) ---
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

    logger.info(TAG, `Privada: ${privada.descripcion} (ID:${privada.id}) | Cam ${camIndex} | URL: ${cameraUrl || "(vacia)"} | raw: ${rawVideoUrl} | dns: ${dnsHosts[camIndex - 1] || dnsHosts[0] || "(none)"} | puerto: ${dnsPorts[camIndex - 1] || dnsPorts[0] || "(none)"}`);

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
    logger.info(TAG, `Credenciales: user="${creds.user}" | pass="${creds.pass ? "***" : "(vacio)"}"`);

    // Adquirir slot del semaforo para este host (evita saturar conexiones al DVR)
    const hostKey = getHostKey(cameraUrl);
    diag.log("SEMAPHORE_WAIT", hostKey);
    await acquireHostSlot(hostKey);
    diag.log("SEMAPHORE_ACQUIRED");

    try {

      // Fetch snapshot con digest auth (pasa signal del cliente para cancelar si el browser desconecta)
      diag.log("FETCH_START", cameraUrl.substring(0, 120));
      const startMs = Date.now();
      const result = await fetchWithDigestAuth(cameraUrl, creds.user, creds.pass, 8000, request.signal, diag.log);
      const elapsedMs = Date.now() - startMs;
      diag.log("FETCH_COMPLETE", `ok=${result.ok} status=${result.status} ${elapsedMs}ms`);

      if (result.ok && result.data) {
        logger.info(TAG, `[${reqId}] OK | Cam ${camIndex} | ${privada.descripcion} | ${result.data.length} bytes | ${elapsedMs}ms | pipeline: ${diag.summary()}`);
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
      logger.warn(TAG, `[${reqId}] FALLO | Cam ${camIndex} | ${privada.descripcion} | ${elapsedMs}ms | Status: ${result.status} | Error: ${result.error} | pipeline: ${diag.summary()}`);
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
    diag.log("CRITICAL_ERROR", error instanceof Error ? error.message : String(error));
    logger.error(TAG, `[${reqId}] ERROR CRITICO | pipeline: ${diag.summary()}`, error);
    return new NextResponse(noSignalSvg("Error", "Error interno del servidor"), {
      status: 500,
      headers: { "Content-Type": "image/svg+xml" },
    });
  }
}
