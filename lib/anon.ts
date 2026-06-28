'use client'

/** Stable per-browser anonymous owner id (no login). Doubles as the users_anon PK. */
export function anonOwner(): string {
  if (typeof window === 'undefined') return ''
  let id = window.localStorage.getItem('nerve_owner')
  if (!id) {
    id = crypto.randomUUID()
    window.localStorage.setItem('nerve_owner', id)
  }
  return id
}
