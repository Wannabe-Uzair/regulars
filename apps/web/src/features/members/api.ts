// Members' query keys and hooks: the list by view, the member page, the owner's edits, archive, restore and delete, and
// the staff to pick a coach from.
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  CoachesResponse,
  MemberDeleteResponse,
  MemberDetailResponse,
  type MemberPatchRequest,
  MembersResponse,
  type MemberView,
} from '@tenure/contracts'
import { del, get, patch, post } from '../../shared/api/client.ts'

export const memberKeys = {
  /** Every members query: a live event refreshes them all (see index.ts). */
  all: ['members'] as const,
  lists: ['members', 'list'] as const,
  list: (view: MemberView) => ['members', 'list', view] as const,
  detail: (id: number) => ['members', 'detail', id] as const,
  staff: ['members', 'staff'] as const,
}

/** GET /api/members?view=…, scoped by the server. The last view's rows stay on screen while another loads. */
export function useMemberList(view: MemberView) {
  return useQuery({
    queryKey: memberKeys.list(view),
    queryFn: () => get(`/api/members?view=${view}`, MembersResponse),
    placeholderData: keepPreviousData,
  })
}

/** GET /api/members/:id. A 404 isn't retried: it's the not-found view. */
export function useMember(id: number) {
  return useQuery({
    queryKey: memberKeys.detail(id),
    queryFn: () => get(`/api/members/${id}`, MemberDetailResponse),
  })
}

/** The gym's active staff, owners included, for the owner's coach edit (GET /api/coaches is owner only). */
export function useCoachChoices(enabled: boolean) {
  return useQuery({
    queryKey: memberKeys.staff,
    queryFn: () => get('/api/coaches', CoachesResponse),
    select: (data) => data.staff.filter((person) => person.active),
    enabled,
  })
}

/**
 * PATCH /api/members/:id with only the fields the form changed. The answer is the member page, written straight into
 * the cache; the lists refetch.
 */
export function useUpdateMember(id: number) {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (change: MemberPatchRequest) => patch(`/api/members/${id}`, change, MemberDetailResponse),
    onSuccess: (page) => {
      client.setQueryData(memberKeys.detail(id), page)
      void client.invalidateQueries({ queryKey: memberKeys.lists })
    },
  })
}

/**
 * POST /api/members/:id/archive, or /restore with `archive` false (FR-MEMBER-05, FR-MEMBER-06). The answer is the member
 * page, written straight into the cache; the lists refetch.
 */
export function useArchiveMember(id: number) {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (archive: boolean) =>
      post(`/api/members/${id}/${archive ? 'archive' : 'restore'}`, {}, MemberDetailResponse),
    onSuccess: (page) => {
      client.setQueryData(memberKeys.detail(id), page)
      void client.invalidateQueries({ queryKey: memberKeys.lists })
    },
  })
}

/** DELETE /api/members/:id (FR-MEMBER-07, owners, archived members only). The page leaves the cache; the lists refetch. */
export function useDeleteMember(id: number) {
  const client = useQueryClient()
  return useMutation({
    mutationFn: () => del(`/api/members/${id}`, MemberDeleteResponse),
    onSuccess: () => {
      client.removeQueries({ queryKey: memberKeys.detail(id) })
      void client.invalidateQueries({ queryKey: memberKeys.lists })
    },
  })
}
