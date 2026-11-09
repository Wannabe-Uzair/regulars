// Whether this is the stall, and "Try the Demo" (FR-WEB-04): read by the home page and by the sign-in pages, which at
// the stall offer the demo instead of a sign-up.
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { DemoStatus, TryDemoResponse } from '@tenure/contracts'
import { useNavigate } from 'react-router'
import { get, post } from '../api/client.ts'
import { sessionKey } from '../session/session.ts'

export const demoKey = ['demo'] as const

/** Stall mode or not: it can't change while the server runs. */
export function useDemoStatus() {
  return useQuery({ queryKey: demoKey, queryFn: () => get('/api/demo', DemoStatus), staleTime: Infinity })
}

/** Signs in as the demo owner, then opens Today with nothing cached from before, as log-in does. */
export function useTryDemo() {
  const client = useQueryClient()
  const navigate = useNavigate()
  return useMutation({
    mutationFn: () => post('/api/demo/try', {}, TryDemoResponse),
    onSuccess: async (me) => {
      client.clear()
      client.setQueryData(sessionKey, me)
      await navigate('/app')
    },
  })
}
