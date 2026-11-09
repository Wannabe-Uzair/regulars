import { MutationCache, QueryCache, QueryClient } from '@tanstack/react-query'
import { ApiRequestError } from '../shared/api/client.ts'
import { sessionKey } from '../shared/session/session.ts'

const MAX_RETRIES = 3

/**
 * The app's query client. A 4xx answer is final, so it isn't retried. A 401 that means the session ended marks the
 * session signed out, from any query or mutation, and the guard then sends the user to /login.
 */
export function createQueryClient(): QueryClient {
  const onError = (error: Error) => {
    if (error instanceof ApiRequestError && error.sessionEnded) client.setQueryData(sessionKey, null)
  }
  const client: QueryClient = new QueryClient({
    queryCache: new QueryCache({ onError }),
    mutationCache: new MutationCache({ onError }),
    defaultOptions: {
      queries: {
        retry: (failures, error) =>
          !(error instanceof ApiRequestError && error.status >= 400 && error.status < 500) && failures < MAX_RETRIES,
      },
    },
  })
  return client
}
