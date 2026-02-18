/**
 * API Storage Adapter
 *
 * Implements the same DesignStorageAdapter interface as LocalStorageAdapter,
 * but persists designs to a backend API. Activated when VITE_API_URL is set.
 *
 * All endpoints follow the same REST contract:
 *   GET    /designs            → DesignSummary[]
 *   GET    /designs/:id        → Design
 *   POST   /designs            → Design (create/update)
 *   DELETE /designs/:id        → void
 *   POST   /uploads/presign    → { url: string }
 */

import type { Design, DesignSummary } from '../types'
import type { DesignStorageAdapter } from './storage-adapter'
import { log } from '../utils/log'

export class APIStorageAdapter implements DesignStorageAdapter {
  private readonly baseUrl: string

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl.replace(/\/$/, '')
    log.storage.info('APIStorageAdapter initialized', { baseUrl: this.baseUrl })
  }

  private async request<T>(path: string, options?: RequestInit): Promise<T> {
    const url = `${this.baseUrl}${path}`
    const res = await fetch(url, {
      headers: { 'Content-Type': 'application/json', ...options?.headers },
      ...options,
    })
    if (!res.ok) {
      const text = await res.text().catch(() => res.statusText)
      throw new Error(`API error ${res.status}: ${text}`)
    }
    if (res.status === 204) return undefined as T
    return res.json() as Promise<T>
  }

  async getDesign(id: string): Promise<Design | null> {
    log.storage.debug('APIStorageAdapter.getDesign', { id })
    try {
      return await this.request<Design>(`/designs/${id}`)
    } catch (err) {
      log.storage.warn('Design not found via API', { id, err })
      return null
    }
  }

  async saveDesign(design: Design): Promise<Design> {
    log.storage.debug('APIStorageAdapter.saveDesign', { id: design.id })
    return this.request<Design>('/designs', {
      method: 'POST',
      body: JSON.stringify(design),
    })
  }

  async listDesigns(): Promise<DesignSummary[]> {
    log.storage.debug('APIStorageAdapter.listDesigns')
    return this.request<DesignSummary[]>('/designs')
  }

  async deleteDesign(id: string): Promise<void> {
    log.storage.debug('APIStorageAdapter.deleteDesign', { id })
    await this.request<void>(`/designs/${id}`, { method: 'DELETE' })
  }

  async generatePresignedUrl(filename: string): Promise<string> {
    log.storage.debug('APIStorageAdapter.generatePresignedUrl', { filename })
    const result = await this.request<{ url: string }>('/uploads/presign', {
      method: 'POST',
      body: JSON.stringify({ filename }),
    })
    return result.url
  }
}
