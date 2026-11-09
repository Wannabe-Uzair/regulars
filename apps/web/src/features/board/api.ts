// The board's query key and its data: Today's read model, whose `board` is every member in the viewer's scope still in
// their first 90 days, in board order (slipping first, then the newest), with today's check-ins for the pop.
import { useQuery } from '@tanstack/react-query'
import { TodayResponse } from '@tenure/contracts'
import { get } from '../../shared/api/client.ts'

export const boardKeys = {
  all: ['board'] as const,
}

/** The board's rows and today's check-ins, scoped by the server to the viewer. Live events invalidate it (index.ts). */
export function useBoard() {
  return useQuery({ queryKey: boardKeys.all, queryFn: () => get('/api/today', TodayResponse) })
}
