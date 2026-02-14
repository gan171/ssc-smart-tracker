import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'

export function useQuestions(user) {
  const [mistakes, setMistakes] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const fetchQuestions = async () => {
    if (!user) return

    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('questions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(100)

      if (error) throw error
      setMistakes(data || [])
    } catch (err) {
      console.error("Failed to fetch questions", err)
      setError(err.message)
      setMistakes([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (user) {
      fetchQuestions()
    }
  }, [user])

  const addNote = async (questionId, note) => {
    try {
      const { error } = await supabase
        .from('questions')
        .update({ manual_notes: note })
        .eq('id', questionId)
        .eq('user_id', user.id)

      if (error) throw error
      await fetchQuestions()
    } catch (err) {
      console.error('Failed to add note:', err)
      throw err
    }
  }

  const updateStatus = async (questionId, status) => {
    try {
      const { error } = await supabase
        .from('questions')
        .update({ status })
        .eq('id', questionId)
        .eq('user_id', user.id)

      if (error) throw error
      await fetchQuestions()
    } catch (err) {
      console.error('Failed to update status:', err)
      throw err
    }
  }

  return {
    mistakes,
    loading,
    error,
    refetch: fetchQuestions,
    addNote,
    updateStatus
  }
}