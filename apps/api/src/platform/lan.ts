// The LAN addresses phones and the kiosk tablet use to reach this computer, and the start-up lines that name them.
import { existsSync } from 'node:fs'
import os from 'node:os'
import type { ApiModule } from './module.ts'

type Interfaces = ReturnType<typeof os.networkInterfaces>

const IPV4 = /^(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}$/

/**
 * TENURE_LAN_IPS (comma-separated IPv4) when it is set and every entry is valid: a container only sees its own
 * interfaces, so Docker passes the laptop's address in. Otherwise the non-internal IPv4 addresses of this computer.
 * Read on every call, so a hotspot turned on after start shows up.
 */
export function lanAddresses(
  env: Record<string, string | undefined>,
  interfaces: () => Interfaces = os.networkInterfaces,
): string[] {
  const given = (env.TENURE_LAN_IPS ?? '')
    .split(',')
    .map((ip) => ip.trim())
    .filter(Boolean)
  if (given.length && given.every((ip) => IPV4.test(ip))) return given
  return Object.values(interfaces())
    .flat()
    .filter((a): a is os.NetworkInterfaceInfo => a !== undefined && a.family === 'IPv4' && !a.internal)
    .map((a) => a.address)
}

/** True inside a Docker container. */
export const inContainer = () => existsSync('/.dockerenv')

/**
 * What to print for phones. In a container with no TENURE_LAN_IPS the only addresses are the container's own, which
 * no phone can reach, so there are none and `hint` is true (print the line saying how to pass this laptop's address in).
 */
export function phoneLinks(
  env: Record<string, string | undefined>,
  isContainer: () => boolean = inContainer,
  interfaces?: () => Interfaces,
): { lanIps: string[]; hint: boolean } {
  const lanIps = lanAddresses(env, interfaces)
  if (isContainer() && !(env.TENURE_LAN_IPS ?? '').trim()) return { lanIps: [], hint: true }
  return { lanIps, hint: false }
}

/**
 * `ctx.lan` for a server listening on `host`: the phone addresses, read on each call, when it listens on every
 * address (0.0.0.0); none otherwise, since no phone can reach a server on 127.0.0.1.
 */
export function serverLan(
  host: string,
  env: Record<string, string | undefined>,
  isContainer: () => boolean = inContainer,
  interfaces?: () => Interfaces,
): () => readonly string[] {
  return host === '0.0.0.0' ? () => phoneLinks(env, isContainer, interfaces).lanIps : () => []
}

/**
 * The old server's start-up printout. On 0.0.0.0 (a listen address, not one a browser can open) the laptop gets
 * localhost and phones each LAN address. When a module named kiosk is registered, the kiosk gets one link per LAN
 * address (localhost when there are none). `hint` adds one line saying how to get phone links.
 */
export function startupLines({ host, port, lanIps, kioskToken, hint = false, modules }: {
  host: string
  port: number
  lanIps: readonly string[]
  kioskToken: string | undefined
  /** Add the line that says how to get phone links (a container without TENURE_LAN_IPS). */
  hint?: boolean
  /** The registered modules: kiosk links only when one of them is the kiosk. */
  modules: readonly Pick<ApiModule, 'name'>[]
}): string[] {
  if (host !== '0.0.0.0') return [`Tenure on http://${host}:${port}`]
  const lines = [`Tenure on http://localhost:${port} (this computer)`]
  // Started by plain `docker compose up`, or by scripts/stall.sh when it found no address: this fits both.
  if (hint) lines.push("  for phone links, start with scripts/stall.sh, or set TENURE_LAN_IPS to this laptop's address")
  for (const ip of lanIps) lines.push(`  on a phone: http://${ip}:${port}`)
  if (kioskToken && modules.some((m) => m.name === 'kiosk')) {
    for (const h of lanIps.length ? lanIps : ['localhost']) lines.push(`  kiosk: http://${h}:${port}/kiosk/${kioskToken}`)
  }
  return lines
}
