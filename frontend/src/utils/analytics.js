/**
 * Analytics Utility Functions
 * Processes question data for charts and insights
 */

/**
 * Calculate accuracy trend over time (last 30 days)
 * @param {Array} questions - All questions
 * @returns {Array} - [{date: '2024-02-15', accuracy: 75, attempts: 5}, ...]
 */
export function getAccuracyTrend(questions) {
  const now = new Date()
  const thirtyDaysAgo = new Date(now)
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  // Group by date
  const dateMap = {}

  questions.forEach(q => {
    if (!q.last_attempted_at || q.times_attempted === 0) return

    const attemptDate = new Date(q.last_attempted_at)
    if (attemptDate < thirtyDaysAgo) return

    const dateKey = attemptDate.toISOString().split('T')[0]

    if (!dateMap[dateKey]) {
      dateMap[dateKey] = { correct: 0, total: 0 }
    }

    dateMap[dateKey].total += q.times_attempted
    dateMap[dateKey].correct += q.times_correct
  })

  // Convert to array and calculate accuracy
  const trend = Object.entries(dateMap)
    .map(([date, data]) => ({
      date,
      accuracy: Math.round((data.correct / data.total) * 100),
      attempts: data.total
    }))
    .sort((a, b) => new Date(a.date) - new Date(b.date))

  return trend
}

/**
 * Get subject-wise breakdown
 * @param {Array} questions - All questions
 * @returns {Array} - [{subject: 'Math', count: 50, accuracy: 75}, ...]
 */
export function getSubjectBreakdown(questions) {
  const subjectMap = {}

  questions.forEach(q => {
    const subject = q.subject || 'Unknown'

    if (!subjectMap[subject]) {
      subjectMap[subject] = {
        subject,
        count: 0,
        attempted: 0,
        correct: 0,
        total_attempts: 0
      }
    }

    subjectMap[subject].count++
    if (q.times_attempted > 0) {
      subjectMap[subject].attempted++
      subjectMap[subject].total_attempts += q.times_attempted
      subjectMap[subject].correct += q.times_correct
    }
  })

  // Convert to array with accuracy
  return Object.values(subjectMap).map(s => ({
    subject: s.subject,
    count: s.count,
    accuracy: s.total_attempts > 0
      ? Math.round((s.correct / s.total_attempts) * 100)
      : 0,
    attempted: s.attempted
  }))
}

/**
 * Get topic-wise breakdown for a specific subject
 * @param {Array} questions - All questions
 * @param {string} subject - Subject to filter by
 * @returns {Array} - [{topic: 'Algebra', count: 20, accuracy: 80}, ...]
 */
export function getTopicBreakdown(questions, subject) {
  const filtered = subject === 'All'
    ? questions
    : questions.filter(q => q.subject === subject)

  const topicMap = {}

  filtered.forEach(q => {
    const topic = q.topic || 'Other'

    if (!topicMap[topic]) {
      topicMap[topic] = {
        topic,
        count: 0,
        total_attempts: 0,
        correct: 0
      }
    }

    topicMap[topic].count++
    if (q.times_attempted > 0) {
      topicMap[topic].total_attempts += q.times_attempted
      topicMap[topic].correct += q.times_correct
    }
  })

  return Object.values(topicMap)
    .map(t => ({
      topic: t.topic,
      count: t.count,
      accuracy: t.total_attempts > 0
        ? Math.round((t.correct / t.total_attempts) * 100)
        : 0
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10) // Top 10 topics
}

/**
 * Get study activity heatmap (last 90 days)
 * @param {Array} questions - All questions
 * @returns {Array} - [{date: '2024-02-15', count: 5, level: 3}, ...]
 */
export function getStudyHeatmap(questions) {
  const now = new Date()
  const ninetyDaysAgo = new Date(now)
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90)

  const dateMap = {}

  // Count uploads per day
  questions.forEach(q => {
    const uploadDate = new Date(q.created_at)
    if (uploadDate < ninetyDaysAgo) return

    const dateKey = uploadDate.toISOString().split('T')[0]
    dateMap[dateKey] = (dateMap[dateKey] || 0) + 1
  })

  // Also count review activity
  questions.forEach(q => {
    if (!q.last_attempted_at) return

    const attemptDate = new Date(q.last_attempted_at)
    if (attemptDate < ninetyDaysAgo) return

    const dateKey = attemptDate.toISOString().split('T')[0]
    dateMap[dateKey] = (dateMap[dateKey] || 0) + 1
  })

  // Convert to array with levels (0-4, like GitHub)
  const maxCount = Math.max(...Object.values(dateMap), 1)

  return Object.entries(dateMap)
    .map(([date, count]) => ({
      date,
      count,
      level: Math.min(4, Math.ceil((count / maxCount) * 4))
    }))
    .sort((a, b) => new Date(a.date) - new Date(b.date))
}

/**
 * Get AI-powered insights
 * @param {Array} questions - All questions
 * @returns {Object} - { weakestTopic, strongestTopic, recommendations, streak }
 */
export function getInsights(questions) {
  const subjectBreakdown = getSubjectBreakdown(questions)

  // Find weakest subject
  const weakest = subjectBreakdown
    .filter(s => s.attempted > 0)
    .sort((a, b) => a.accuracy - b.accuracy)[0]

  // Find strongest subject
  const strongest = subjectBreakdown
    .filter(s => s.attempted > 0)
    .sort((a, b) => b.accuracy - a.accuracy)[0]

  // Calculate improvement
  const trend = getAccuracyTrend(questions)
  const recentAccuracy = trend.slice(-7).reduce((sum, d) => sum + d.accuracy, 0) / Math.max(trend.slice(-7).length, 1)
  const olderAccuracy = trend.slice(0, 7).reduce((sum, d) => sum + d.accuracy, 0) / Math.max(trend.slice(0, 7).length, 1)
  const improvement = Math.round(recentAccuracy - olderAccuracy)

  // Topics needing review
  const topicBreakdown = getTopicBreakdown(questions, 'All')
  const needsReview = topicBreakdown
    .filter(t => t.accuracy < 70 && t.count >= 3)
    .map(t => t.topic)

  // Calculate streak
  const heatmap = getStudyHeatmap(questions)
  let currentStreak = 0
  const today = new Date().toISOString().split('T')[0]

  for (let i = 0; i < 30; i++) {
    const checkDate = new Date()
    checkDate.setDate(checkDate.getDate() - i)
    const dateKey = checkDate.toISOString().split('T')[0]

    const hasActivity = heatmap.some(h => h.date === dateKey)
    if (hasActivity) {
      currentStreak++
    } else if (dateKey !== today) {
      break
    }
  }

  return {
    weakestTopic: weakest ? {
      name: weakest.subject,
      accuracy: weakest.accuracy
    } : null,
    strongestTopic: strongest ? {
      name: strongest.subject,
      accuracy: strongest.accuracy
    } : null,
    improvement: improvement > 0 ? `+${improvement}%` : `${improvement}%`,
    isImproving: improvement > 0,
    needsReview,
    streak: currentStreak,
    totalAttempts: questions.reduce((sum, q) => sum + q.times_attempted, 0),
    averageAccuracy: questions.filter(q => q.times_attempted > 0).length > 0
      ? Math.round(
          questions.reduce((sum, q) =>
            sum + (q.times_attempted > 0 ? (q.times_correct / q.times_attempted) : 0), 0
          ) / questions.filter(q => q.times_attempted > 0).length * 100
        )
      : 0
  }
}

/**
 * Get mastery distribution
 * @param {Array} questions - All questions
 * @returns {Object} - { new: 10, learning: 20, reviewing: 30, mastered: 40 }
 */
export function getMasteryDistribution(questions) {
  const distribution = {
    new: 0,
    learning: 0,
    reviewing: 0,
    mastered: 0
  }

  questions.forEach(q => {
    const level = q.mastery_level || 'new'
    distribution[level]++
  })

  return distribution
}

/**
 * Get best study time (hour of day with highest accuracy)
 * @param {Array} questions - All questions
 * @returns {Object} - { hour: 19, accuracy: 85, label: '7-8 PM' }
 */
export function getBestStudyTime(questions) {
  const hourMap = {}

  questions.forEach(q => {
    if (!q.last_attempted_at || q.times_attempted === 0) return

    const attemptDate = new Date(q.last_attempted_at)
    const hour = attemptDate.getHours()

    if (!hourMap[hour]) {
      hourMap[hour] = { total: 0, correct: 0 }
    }

    hourMap[hour].total += q.times_attempted
    hourMap[hour].correct += q.times_correct
  })

  // Find hour with best accuracy (min 5 attempts)
  let bestHour = null
  let bestAccuracy = 0

  Object.entries(hourMap).forEach(([hour, data]) => {
    if (data.total < 5) return

    const accuracy = (data.correct / data.total) * 100
    if (accuracy > bestAccuracy) {
      bestAccuracy = accuracy
      bestHour = parseInt(hour)
    }
  })

  if (!bestHour) return null

  const label = `${bestHour % 12 || 12}-${(bestHour + 1) % 12 || 12} ${bestHour >= 12 ? 'PM' : 'AM'}`

  return {
    hour: bestHour,
    accuracy: Math.round(bestAccuracy),
    label
  }
}