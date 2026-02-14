import { useState } from 'react'
import { supabase } from '../supabaseClient'

const API_BASE_URL = 'http://127.0.0.1:8000'

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
          'Authorization': `Bearer ${session?.access_token}`
        },
        body: formData
      })

      if (!response.ok) throw new Error('Upload failed')

      const result = await response.json()
      setAnalysis(result.data)

      if (onSuccess) {
        setTimeout(() => onSuccess(), 500)
      }

      return result.data
    } catch (err) {
      setError("Failed to analyze image. Please try again.")
      console.error(err)
      throw err
    } finally {
      setLoading(false)
    }
  }

  const uploadBulk = async (files, onProgress) => {
    setLoading(true)
    setError(null)

    const results = { success: 0, failed: 0, errors: [] }

    for (let i = 0; i < files.length; i++) {
      const file = files[i]

      try {
        if (onProgress) {
          onProgress({ current: i + 1, total: files.length })
        }

        const { data: { session } } = await supabase.auth.getSession()
        const formData = new FormData()
        formData.append('file', file)

        const response = await fetch(`${API_BASE_URL}/upload-screenshot/`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`
          },
          body: formData
        })

        if (!response.ok) {
          results.failed++
          results.errors.push({ file: file.name, error: 'Upload failed' })
        } else {
          results.success++
        }

        await new Promise(resolve => setTimeout(resolve, 1000))

      } catch (err) {
        console.error(`Error uploading ${file.name}:`, err)
        results.failed++
        results.errors.push({ file: file.name, error: err.message })
      }
    }

    setLoading(false)

    if (results.failed > 0) {
      setError(`Upload complete: ${results.success} succeeded, ${results.failed} failed`)
    }

    if (onSuccess) {
      setTimeout(() => onSuccess(), 1500)
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