import type os from 'node:os'
import { describe, expect, test } from 'vitest'
import { createTestContext, TEST_LAN_IP } from './context.ts'
import { lanAddresses, phoneLinks, serverLan, startupLines } from './lan.ts'

const iface = (address: string, family: 'IPv4' | 'IPv6', internal = false) =>
  ({ address, family, internal, netmask: '', mac: '', cidr: null }) as os.NetworkInterfaceInfo
const interfaces = () => ({
  lo0: [iface('127.0.0.1', 'IPv4', true), iface('::1', 'IPv6', true)],
  en0: [iface('fe80::1', 'IPv6'), iface('192.168.1.20', 'IPv4')],
  bridge100: [iface('192.168.2.1', 'IPv4')],
  utun0: undefined,
})
/** Milestone 1's modules: no kiosk yet. */
const noKiosk = [{ name: 'health' }, { name: 'auth' }, { name: 'realtime' }, { name: 'today' }]
const withKiosk = [...noKiosk, { name: 'kiosk' }]

describe('lanAddresses', () => {
  test('without TENURE_LAN_IPS: the non-internal IPv4 addresses of this computer', () => {
    expect(lanAddresses({}, interfaces)).toEqual(['192.168.1.20', '192.168.2.1'])
    expect(lanAddresses({ TENURE_LAN_IPS: '' }, interfaces)).toEqual(['192.168.1.20', '192.168.2.1'])
  })

  test('TENURE_LAN_IPS replaces the lookup, a comma-separated list with spaces allowed', () => {
    expect(lanAddresses({ TENURE_LAN_IPS: '192.168.137.1' }, interfaces)).toEqual(['192.168.137.1'])
    expect(lanAddresses({ TENURE_LAN_IPS: ' 10.0.0.5, 172.20.10.2 ,' }, interfaces)).toEqual(['10.0.0.5', '172.20.10.2'])
  })

  test.each(['192.168.1', '256.1.1.1', 'laptop.local', '::1', '10.0.0.5,nope'])(
    'a TENURE_LAN_IPS that is not all IPv4 (%s) falls back to the lookup',
    (value) => {
      expect(lanAddresses({ TENURE_LAN_IPS: value }, interfaces)).toEqual(['192.168.1.20', '192.168.2.1'])
    },
  )

  test('reads the real interfaces by default', () => {
    for (const ip of lanAddresses({})) expect(ip).toMatch(/^\d+\.\d+\.\d+\.\d+$/)
  })
})

describe('startupLines', () => {
  test('on 0.0.0.0 with a kiosk module: localhost for this computer, a phone URL and a kiosk URL per LAN address', () => {
    const lanIps = ['192.168.137.1', '10.0.0.5']
    expect(startupLines({ host: '0.0.0.0', port: 5195, lanIps, kioskToken: 'tok', modules: withKiosk })).toEqual([
      'Tenure on http://localhost:5195 (this computer)',
      '  on a phone: http://192.168.137.1:5195',
      '  on a phone: http://10.0.0.5:5195',
      '  kiosk: http://192.168.137.1:5195/kiosk/tok',
      '  kiosk: http://10.0.0.5:5195/kiosk/tok',
    ])
  })

  test('with no kiosk module there is no kiosk line, a gym or not', () => {
    expect(startupLines({ host: '0.0.0.0', port: 5195, lanIps: ['10.0.0.5'], kioskToken: 'tok', modules: noKiosk })).toEqual([
      'Tenure on http://localhost:5195 (this computer)',
      '  on a phone: http://10.0.0.5:5195',
    ])
    expect(startupLines({ host: '0.0.0.0', port: 5195, lanIps: [], kioskToken: 'tok', modules: noKiosk })).toEqual([
      'Tenure on http://localhost:5195 (this computer)',
    ])
  })

  test('on 0.0.0.0 with no LAN address the kiosk link uses localhost; with no gym there is none', () => {
    expect(startupLines({ host: '0.0.0.0', port: 5175, lanIps: [], kioskToken: 'tok', modules: withKiosk })).toEqual([
      'Tenure on http://localhost:5175 (this computer)',
      '  kiosk: http://localhost:5175/kiosk/tok',
    ])
    expect(startupLines({ host: '0.0.0.0', port: 5175, lanIps: ['10.0.0.5'], kioskToken: undefined, modules: withKiosk })).toEqual([
      'Tenure on http://localhost:5175 (this computer)',
      '  on a phone: http://10.0.0.5:5175',
    ])
  })

  test('on any other host: just that address', () => {
    expect(startupLines({ host: '127.0.0.1', port: 5175, lanIps: ['10.0.0.5'], kioskToken: 'tok', modules: withKiosk })).toEqual([
      'Tenure on http://127.0.0.1:5175',
    ])
  })
})

const HINT = "  for phone links, start with scripts/stall.sh, or set TENURE_LAN_IPS to this laptop's address"

describe('phoneLinks', () => {
  test('in a container without TENURE_LAN_IPS: no addresses (they would be the container\'s own) and the hint', () => {
    expect(phoneLinks({}, () => true, interfaces)).toEqual({ lanIps: [], hint: true })
    expect(phoneLinks({ TENURE_LAN_IPS: ' ' }, () => true, interfaces)).toEqual({ lanIps: [], hint: true })
  })

  test('in a container with TENURE_LAN_IPS, or outside one, it is the addresses and no hint', () => {
    expect(phoneLinks({ TENURE_LAN_IPS: '10.0.0.5' }, () => true, interfaces)).toEqual({ lanIps: ['10.0.0.5'], hint: false })
    expect(phoneLinks({}, () => false, interfaces)).toEqual({ lanIps: ['192.168.1.20', '192.168.2.1'], hint: false })
  })

  test('FR-OPS-01 ctx.lan on 0.0.0.0 is the phone addresses, read on each call; on any other host none', () => {
    let ips = '10.0.0.5'
    const env = { get TENURE_LAN_IPS() { return ips } }
    const lan = serverLan('0.0.0.0', env, () => false, interfaces)
    expect(lan()).toEqual(['10.0.0.5'])
    ips = '172.20.10.2'
    expect(lan()).toEqual(['172.20.10.2'])
    expect(serverLan('0.0.0.0', {}, () => true, interfaces)()).toEqual([])
    expect(serverLan('127.0.0.1', { TENURE_LAN_IPS: '10.0.0.5' }, () => false, interfaces)()).toEqual([])
  })

  test('FR-OPS-01 a test context has the one fixed LAN address', () => {
    expect(createTestContext().lan()).toEqual([TEST_LAN_IP])
  })

  test('the hint, one line after localhost, fits plain `docker compose up` and scripts/stall.sh that found no address', () => {
    expect(startupLines({ host: '0.0.0.0', port: 5175, lanIps: [], kioskToken: 'tok', hint: true, modules: withKiosk })).toEqual([
      'Tenure on http://localhost:5175 (this computer)',
      HINT,
      '  kiosk: http://localhost:5175/kiosk/tok',
    ])
  })
})
