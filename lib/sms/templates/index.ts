import type { BankTemplate } from '@/lib/sms/types'
import { saman } from '@/lib/sms/templates/saman'

/**
 * Registry of known bank formats, tried in order. Adding a bank means adding
 * a file next to saman.ts and appending it here. Nothing else changes.
 */
export const TEMPLATES: BankTemplate[] = [saman]
