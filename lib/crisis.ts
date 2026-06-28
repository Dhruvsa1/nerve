import { q } from './db'

export interface CrisisResource {
  id: string
  label: string
  contact: string | null
  url: string | null
  region: string | null
  sort_order: number
}

export async function getCrisisResources(): Promise<CrisisResource[]> {
  return q<CrisisResource>(
    `select id, label, contact, url, region, sort_order
     from nerve.crisis_resources order by sort_order asc, label asc`,
  )
}
