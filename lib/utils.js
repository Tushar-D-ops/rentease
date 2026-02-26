import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs) { return twMerge(clsx(inputs)) }

export function formatCurrency(paise) {
  if (paise === null || paise === undefined) return '—'
  return `₹${(paise / 100).toLocaleString('en-IN')}`
}

export function formatDate(dateStr, opts = {}) {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric', ...opts })
}

export function statusBadgeClass(status) {
  const map = {
    active:'badge-success', paid:'badge-success', approved:'badge-success', resolved:'badge-success', captured:'badge-success', in:'badge-success',
    pending:'badge-warning', under_review:'badge-warning',
    overdue:'badge-danger', failed:'badge-danger', rejected:'badge-danger', escalated:'badge-danger', suspended:'badge-danger', out:'badge-danger',
  }
  return map[status] || 'badge-muted'
}

export function truncate(str, n = 50) { return str?.length > n ? str.slice(0,n)+'…' : str }