// Small wire types the other contract files share.
import { z } from 'zod'

/** A row id. */
export const Id = z.int().positive()
/** A calendar date, 'YYYY-MM-DD'. */
export const IsoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/)
/** An instant, as Date#toISOString writes it. */
export const IsoInstant = z.iso.datetime()
