// The composer's calls (FR-NUDGE-01, 03, 04): the gym's templates, one filled in for the member, and recording a nudge.
import { useMutation, useQuery } from '@tanstack/react-query'
import {
  type NudgeChannel,
  RecordNudgeResponse,
  RenderResponse,
  TemplatesResponse,
} from '@tenure/contracts'
import { get, post } from '../api/client.ts'

/** GET /api/templates, and the renders under it, so invalidating `all` refreshes both. */
export const templateKeys = {
  all: ['templates'] as const,
  render: (memberId: number, templateId: number) => ['templates', 'render', memberId, templateId] as const,
}

export function useTemplates() {
  return useQuery({ queryKey: templateKeys.all, queryFn: () => get('/api/templates', TemplatesResponse) })
}

/**
 * The template filled in for the member by the server: {first}, {coach} (the sender's first name), {gym} and {days}
 * (since the last visit, or since joining for a member never seen). Asked once per choice and dropped when the
 * composer closes, so a refetch never replaces the coach's words and a reopened composer counts today's days.
 */
export function useRenderedTemplate(memberId: number, templateId: number | null) {
  return useQuery({
    queryKey: templateKeys.render(memberId, templateId ?? 0),
    queryFn: () => post('/api/templates/render', { memberId, templateId }, RenderResponse),
    enabled: templateId !== null,
    staleTime: Infinity,
    gcTime: 0,
  })
}

export type NudgeRecord = { body: string; templateId: number | null; channel: NudgeChannel }

/**
 * POST /api/nudges, then `onRecorded` with what was recorded. The live `nudge.recorded` event refreshes every screen
 * that shows nudges.
 */
export function useRecordNudge(memberId: number, onRecorded: (nudge: NudgeRecord) => void) {
  return useMutation({
    mutationFn: (nudge: NudgeRecord) => post('/api/nudges', { memberId, ...nudge }, RecordNudgeResponse),
    onSuccess: (_answer, nudge) => onRecorded(nudge),
  })
}
