// `@tenure/db/seed`: the Northside demo gym, its pure data builder, and the independent rules it is checked with.
export {
  buildNorthside,
  DEMO_PASSWORD,
  type NorthsideCheckin,
  type NorthsideData,
  type NorthsideGym,
  type NorthsideMember,
  type NorthsideNudge,
  type NorthsideTemplate,
  type NorthsideUser,
  type SeedTemplateInput,
} from './northside.ts'
export {
  resetNorthside,
  SEED_TIMEZONE,
  seedNorthside,
  type ResetNorthsideOptions,
  type SeededNorthside,
  type SeededUser,
  type SeedNorthsideOptions,
} from './seed.ts'
export { KIT_MEMBER_NAMES, summarizeNorthside, type KitMemberSummary, type NorthsideSummary, type StatusCounts } from './summary.ts'
export * as oracle from './rules.ts'
