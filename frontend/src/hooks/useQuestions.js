import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../supabaseClient'

const PAGE_SIZE = 25

export function useQuestions(user) {
  const [mistakes, setMistakes] = useState([])
  const [loading, setLoading] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState(null)
  const [hasMore, setHasMore] = useState(true)
  const [page, setPage] = useState(0)

  const fetchQuestions = useCallback(async (reset = true) => {
    if (!user) return

    const nextPage = reset ? 0 : page
    reset ? setLoading(true) : setLoadingMore(true)

    try {
      const from = nextPage * PAGE_SIZE
      const to = from + PAGE_SIZE - 1
      const { data, error } = await supabase
        .from('questions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .range(from, to)

      if (error) throw error

      const incoming = data || []
      setMistakes((prev) => (reset ? incoming : [...prev, ...incoming]))
      setHasMore(incoming.length === PAGE_SIZE)
      setPage(nextPage + 1)
    } catch (err) {
      console.error('Failed to fetch questions', err)
      setError(err.message)
      if (reset) setMistakes([])
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }, [user, page])

  useEffect(() => {
    if (user) fetchQuestions(true)
  }, [user])

  const addNote = async (questionId, note) => {
    await updateQuestion(questionId, { manual_notes: note })
  }

  const updateQuestion = async (questionId, updates) => {
    try {
      const { data, error } = await supabase
        .from('questions')
        .update(updates)
        .eq('id', questionId)
        .eq('user_id', user.id)
        .select()
        .single()

      if (error) throw error

      setMistakes((prev) => prev.map((q) => (q.id === questionId ? { ...q, ...data } : q)))
    } catch (err) {
      console.error('Failed to update question:', err)
      throw err
    }
  }

  const deleteQuestion = async (questionId) => {
    try {
      const { error } = await supabase
        .from('questions')
        .delete()
        .eq('id', questionId)
        .eq('user_id', user.id)

      if (error) throw error
      setMistakes((prev) => prev.filter((q) => q.id !== questionId))
    } catch (err) {
      console.error('Failed to delete question:', err)
      throw err
    }
  }

  const createManualQuestion = async (payload) => {
    try {
      const options = payload.options.map((text, idx) => ({ label: String.fromCharCode(65 + idx), text }))
      const { data, error } = await supabase
        .from('questions')
        .insert({
          user_id: user.id,
          question_text: payload.question_text,
          options,
          correct_option: payload.correct_option,
          subject: payload.subject,
          topic: payload.topic,
          status: 'manual',
          content: {
            question_text: payload.question_text,
            options,
            correct_answer: payload.correct_option,
            detailed_analysis: 'Manual entry question'
          }
        })
        .select()
        .single()

      if (error) throw error
      setMistakes((prev) => [data, ...prev])
    } catch (err) {
      console.error('Failed to create manual question:', err)
      throw err
    }
  }

  return {
    mistakes,
    loading,
    loadingMore,
    hasMore,
    error,
    refetch: () => fetchQuestions(true),
    loadMore: () => fetchQuestions(false),
    addNote,
    updateQuestion,
    deleteQuestion,
    createManualQuestion
  }
}
