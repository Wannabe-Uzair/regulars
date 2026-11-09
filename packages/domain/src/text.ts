// Search folding, shared by the Members and board filter bar and the kiosk's name search (FR-MEM-02).

/** Case and accents folded, so 'jose' finds 'José' and 'JOSÉ' finds 'jose'. */
export const fold = (text: string): string => text.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase()

/**
 * A search query's digits with their leading zeros dropped, to look for inside a stored E.164 phone's digits: '0300 123'
 * gives '300123', which finds +923001234567. '' when the query has no digits but zeros.
 */
export const foldDigits = (query: string): string => query.replace(/\D/g, '').replace(/^0+/, '')
