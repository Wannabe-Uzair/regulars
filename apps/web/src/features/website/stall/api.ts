// The stall demo's calls: whether this is the stall, "Try the demo" and "Reset the demo" (FR-WEB-04, FR-OPS-03).
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { ResetDemoResponse } from '@tenure/contracts'
import { post } from '../../../shared/api/client.ts'
import { sessionKey } from '../../../shared/session/session.ts'

// The stall question and Try the Demo live in shared/, since the sign-in pages read them too.
export { useDemoStatus, useTryDemo } from '../../../shared/demo/demo.ts'

/** Re-seeds the demo gym. Its sessions end with it, this device's included, so the session is asked again. */
export function useResetDemo() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: () => post('/api/demo/reset', {}, ResetDemoResponse),
    onSuccess: () => client.invalidateQueries({ queryKey: sessionKey }),
  })
}
