/**
 * Configuracion compartida para la comunicacion con agentes remotos.
 * Centraliza tokens y parametros que antes estaban duplicados en multiples rutas.
 */

/** Token para autenticar agentes remotos (poll, frames, channels) */
export const AGENT_TOKEN =
  process.env.AGENT_TOKEN ||
  process.env.CAMERA_AGENT_TOKEN ||
  "b7f9dee88d9e9d141557ef6227a351048df0d105b71dfd00cdda483d7d347c47";

/** Verifica si el token proporcionado es valido */
export function isValidAgentToken(token: string | null): boolean {
  return !!token && token === AGENT_TOKEN;
}
