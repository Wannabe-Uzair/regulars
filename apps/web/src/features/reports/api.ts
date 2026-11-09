// Reports' query keys and the GET /api/reports hook.
import { useQuery } from '@tanstack/react-query'
import { ReportsResponse } from '@tenure/contracts'
import { get } from '../../shared/api/client.ts'

export const reportsKeys = {
  all: ['reports'] as const,
}

/** The owner's reports. Live events invalidate it (see index.ts). */
export function useReports() {
  return useQuery({ queryKey: reportsKeys.all, queryFn: () => get('/api/reports', ReportsResponse) })
}
