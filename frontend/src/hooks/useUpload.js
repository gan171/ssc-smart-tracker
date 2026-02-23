import { useState } from 'react'
import { supabase } from '../supabaseClient'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000'
const BULK_CONCURRENCY = 3

console.log('🔥 Vercel built this with API URL:', import.meta.env.VITE_API_BASE_URL)
console.log('🚀 Final API URL being used:', API_BASE_URL)

const normalizeErrorMessage = async (response) => {
  let message = `Upload failed (${response.status})`

  try {
    const payload = await response.json()
    if (payload?.detail) {
      message = typeof payload.detail === 'string' ? payload.detail : JSON.stringify(payload.detail)
    }
  } catch {
    // Ignore JSON parse errors and use fallback message.
  }

  return message
}

export function useUpload(onSuccess) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [analysis, setAnalysis] = useState(null)

  const uploadSingle = async (file) => {
    setLoading(true)
    setError(null)
    setAnalysis(null)

    const formData = new FormData()
    formData.append('file', file)

    try {
      const { data: { session } } = await supabase.auth.getSession()

      const response = await fetch(`${API_BASE_URL}/upload-screenshot/`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session?.access_token}`
        },
        body: formData
      })

      if (!response.ok) throw new Error(await normalizeErrorMessage(response))

      const result = await response.json()
      setAnalysis(result.data)

      if (onSuccess) {
        setTimeout(() => onSuccess(), 500)
      }

      return result.data
    } catch (err) {
      setError('Failed to analyze image. Please try again.')
      console.error(err)
      throw err
    } finally {
      setLoading(false)
    }
  }

  const uploadBulk = async (files, onProgress) => {
    setLoading(true)
    setError(null)

    const fileList = Array.from(files || [])
    const total = fileList.length

    const results = {
      total,
      processed: 0,
      success: 0,
      failed: 0,
      duplicates: 0,
      storageFailed: 0,
      aiFailed: 0,
      skipped: 0,
      failedFiles: []
    }

    if (total === 0) {
      setLoading(false)
      return results
    }

    const { data: { session } } = await supabase.auth.getSession()
    const token = session?.access_token

    if (!token) {
      setLoading(false)
      const authMessage = 'Missing login session. Please sign in again.'
      setError(authMessage)
      throw new Error(authMessage)
    }

    let nextIndex = 0
    let shouldStop = false
    const seenQuestionIds = new Set()
    const startedIndexes = new Set()

    const updateProgress = () => {
      if (onProgress) {
        onProgress({ current: results.processed, total })
      }
    }

    const uploadOne = async (file) => {
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch(`${API_BASE_URL}/upload-screenshot/`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`
        },
        body: formData
      })

      if (!response.ok) {
        const message = await normalizeErrorMessage(response)
        const isQuotaError = response.status === 429 || /quota|resourceexhausted|rate limit/i.test(message)
        if (isQuotaError) shouldStop = true

        results.failed += 1
        results.aiFailed += 1
        results.failedFiles.push({ file: file.name, error: message })
        return
      }

      const payload = await response.json()

      results.success += 1
      if (payload?.is_duplicate || (payload?.id && seenQuestionIds.has(payload.id))) results.duplicates += 1
      if (payload?.id) seenQuestionIds.add(payload.id)
      if (!payload?.image_url) results.storageFailed += 1
    }

    const worker = async () => {
      while (true) {
        if (shouldStop) break

        const currentIndex = nextIndex
        nextIndex += 1

        if (currentIndex >= total) break

        const file = fileList[currentIndex]
        startedIndexes.add(currentIndex)

        try {
          await uploadOne(file)
        } catch (err) {
          results.failed += 1
          results.failedFiles.push({ file: file.name, error: err.message })
        } finally {
          results.processed += 1
          updateProgress()
        }
      }
    }

    const concurrency = Math.min(BULK_CONCURRENCY, total)
    await Promise.all(Array.from({ length: concurrency }, () => worker()))

    if (shouldStop && results.processed < total) {
      const skippedFiles = fileList
        .map((file, index) => ({ file, index }))
        .filter(({ index }) => !startedIndexes.has(index))
        .map(({ file }) => ({ file: file.name, error: 'Skipped after Gemini quota/rate-limit error' }))

      results.skipped = skippedFiles.length
      results.failed += results.skipped
      results.failedFiles.push(...skippedFiles)
      results.processed = total
      updateProgress()
    }

    setLoading(false)

    if (results.failed > 0) {
      setError(`Upload complete: ${results.success} successful, ${results.failed} failed`)
    }

    if (onSuccess && results.success > 0) {
      onSuccess()
    }

    return results
  }

  const clearAnalysis = () => setAnalysis(null)
  const clearError = () => setError(null)

  return {
    loading,
    error,
    analysis,
    uploadSingle,
    uploadBulk,
    clearAnalysis,
    clearError
  }
}
