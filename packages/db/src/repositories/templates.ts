import { and, asc, eq, max } from 'drizzle-orm'
import type { Db } from '../client.ts'
import { nudges, templates } from '../schema/index.ts'
import type { Template } from './records.ts'

export interface NewTemplate {
  gymId: number
  name: string
  body: string
  /** UTC ISO timestamp. */
  updatedAt: string
}

export interface TemplateEdit {
  /** Left as it is when not given. */
  name?: string
  body?: string
  updatedAt: string
}

const inGym = (gymId: number, id: number) => and(eq(templates.id, id), eq(templates.gymId, gymId))

export function templatesRepository(db: Db) {
  return {
    /** The gym's templates in their order: by sort, then id. */
    async list(gymId: number): Promise<Template[]> {
      return db.select().from(templates).where(eq(templates.gymId, gymId)).orderBy(asc(templates.sort), asc(templates.id)).all()
    },

    async findInGym(gymId: number, id: number): Promise<Template | undefined> {
      return db.select().from(templates).where(inGym(gymId, id)).get()
    },

    /** A new template at the end of the gym's list: its sort is one more than the highest (1 for the first). */
    async create(input: NewTemplate): Promise<Template> {
      return db.transaction((tx) => {
        const top = tx.select({ sort: max(templates.sort) }).from(templates).where(eq(templates.gymId, input.gymId)).get()
        return tx
          .insert(templates)
          .values({ ...input, sort: (top?.sort ?? 0) + 1 })
          .returning()
          .get()
      })
    },

    /** Change the name, the body or both. Undefined when the template is not in this gym. */
    async update(gymId: number, id: number, edit: TemplateEdit): Promise<Template | undefined> {
      const set: TemplateEdit = { updatedAt: edit.updatedAt }
      if (edit.name !== undefined) set.name = edit.name
      if (edit.body !== undefined) set.body = edit.body
      return db.update(templates).set(set).where(inGym(gymId, id)).returning().get()
    },

    /**
     * Delete the template, in one transaction with its nudges: they keep their body and lose their templateId.
     * Returns the deleted template, or undefined when it is not in this gym.
     */
    async delete(gymId: number, id: number): Promise<Template | undefined> {
      return db.transaction((tx) => {
        tx.update(nudges)
          .set({ templateId: null })
          .where(and(eq(nudges.templateId, id), eq(nudges.gymId, gymId)))
          .run()
        return tx.delete(templates).where(inGym(gymId, id)).returning().get()
      })
    },
  }
}

export type TemplatesRepository = ReturnType<typeof templatesRepository>
