/**
 * SM-2 Spaced Repetition Algorithm
 * Based on SuperMemo 2 algorithm
 * Used by Anki and other successful SRS systems
 */

/**
 * Calculate next review date using SM-2 algorithm
 * @param {boolean} wasCorrect - Whether user answered correctly
 * @param {number} currentEaseFactor - Current ease factor (default 2.5)
 * @param {number} currentInterval - Current interval in days (default 1)
 * @param {number} repetitions - Number of successful repetitions (default 0)
 * @returns {Object} - { nextReviewDate, easeFactor, interval, repetitions, masteryLevel }
 */
export function calculateNextReview(wasCorrect, currentEaseFactor = 2.5, currentInterval = 1, repetitions = 0) {
  let newEaseFactor = currentEaseFactor
  let newInterval = currentInterval
  let newRepetitions = repetitions

  if (wasCorrect) {
    // Correct answer - increase interval
    newRepetitions += 1

    if (newRepetitions === 1) {
      newInterval = 1 // Review tomorrow
    } else if (newRepetitions === 2) {
      newInterval = 6 // Review in 6 days
    } else {
      newInterval = Math.round(currentInterval * currentEaseFactor)
    }

    // Adjust ease factor (gets easier if consistently correct)
    // EF' = EF + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02))
    // For correct answer, we'll use quality = 4 (good)
    newEaseFactor = currentEaseFactor + (0.1 - (5 - 4) * (0.08 + (5 - 4) * 0.02))
    newEaseFactor = Math.max(1.3, newEaseFactor) // Minimum ease factor

  } else {
    // Incorrect answer - reset interval but keep some progress
    newRepetitions = 0
    newInterval = 1 // Review tomorrow

    // Decrease ease factor (question is harder)
    // For incorrect answer, we'll use quality = 0 (fail)
    newEaseFactor = currentEaseFactor + (0.1 - (5 - 0) * (0.08 + (5 - 0) * 0.02))
    newEaseFactor = Math.max(1.3, newEaseFactor)
  }

  // Calculate next review date
  const nextReviewDate = new Date()
  nextReviewDate.setDate(nextReviewDate.getDate() + newInterval)

  // Determine mastery level
  let masteryLevel = 'new'
  if (newRepetitions === 0) {
    masteryLevel = 'learning'
  } else if (newRepetitions <= 2) {
    masteryLevel = 'learning'
  } else if (newRepetitions <= 5) {
    masteryLevel = 'reviewing'
  } else {
    masteryLevel = 'mastered'
  }

  return {
    nextReviewDate: nextReviewDate.toISOString(),
    easeFactor: parseFloat(newEaseFactor.toFixed(2)),
    intervalDays: newInterval,
    repetitions: newRepetitions,
    masteryLevel
  }
}

/**
 * Get review priority score (higher = more urgent)
 * @param {string} nextReviewDate - ISO date string
 * @param {number} timesAttempted - Number of attempts
 * @param {number} timesCorrect - Number of correct attempts
 * @returns {number} - Priority score (0-100)
 */
export function getReviewPriority(nextReviewDate, timesAttempted, timesCorrect) {
  const now = new Date()
  const reviewDate = new Date(nextReviewDate)
  const daysOverdue = Math.max(0, (now - reviewDate) / (1000 * 60 * 60 * 24))

  // Accuracy (lower = higher priority)
  const accuracy = timesAttempted > 0 ? timesCorrect / timesAttempted : 0
  const accuracyScore = (1 - accuracy) * 40 // Max 40 points

  // Overdue score (more overdue = higher priority)
  const overdueScore = Math.min(40, daysOverdue * 10) // Max 40 points

  // Attempt score (fewer attempts = higher priority)
  const attemptScore = Math.max(0, 20 - timesAttempted * 2) // Max 20 points

  return Math.round(accuracyScore + overdueScore + attemptScore)
}

/**
 * Categorize questions by review status
 * @param {Array} questions - Array of question objects
 * @returns {Object} - { overdue, dueToday, dueSoon, upcoming }
 */
export function categorizeReviewQueue(questions) {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)
  const nextWeek = new Date(today)
  nextWeek.setDate(nextWeek.getDate() + 7)

  const categorized = {
    overdue: [],
    dueToday: [],
    dueSoon: [],
    upcoming: []
  }

  questions.forEach(q => {
    const reviewDate = new Date(q.next_review_date)

    if (reviewDate < today) {
      categorized.overdue.push(q)
    } else if (reviewDate < tomorrow) {
      categorized.dueToday.push(q)
    } else if (reviewDate < nextWeek) {
      categorized.dueSoon.push(q)
    } else {
      categorized.upcoming.push(q)
    }
  })

  // Sort each category by priority
  Object.keys(categorized).forEach(category => {
    categorized[category].sort((a, b) => {
      const priorityA = getReviewPriority(a.next_review_date, a.times_attempted, a.times_correct)
      const priorityB = getReviewPriority(b.next_review_date, b.times_attempted, b.times_correct)
      return priorityB - priorityA // Higher priority first
    })
  })

  return categorized
}

/**
 * Get study statistics
 * @param {Array} questions - All user's questions
 * @returns {Object} - Statistics object
 */
export function getStudyStats(questions) {
  const now = new Date()

  const stats = {
    total: questions.length,
    new: 0,
    learning: 0,
    reviewing: 0,
    mastered: 0,
    dueToday: 0,
    dueThisWeek: 0,
    averageAccuracy: 0,
    totalAttempts: 0,
    streak: 0 // TODO: Implement streak tracking
  }

  let totalAccuracy = 0
  let questionsWithAttempts = 0

  questions.forEach(q => {
    // Count by mastery level
    stats[q.mastery_level || 'new']++

    // Count due questions
    const reviewDate = new Date(q.next_review_date)
    const daysUntilReview = (reviewDate - now) / (1000 * 60 * 60 * 24)

    if (daysUntilReview <= 0) {
      stats.dueToday++
    }
    if (daysUntilReview <= 7) {
      stats.dueThisWeek++
    }

    // Calculate average accuracy
    if (q.times_attempted > 0) {
      totalAccuracy += (q.times_correct / q.times_attempted)
      questionsWithAttempts++
      stats.totalAttempts += q.times_attempted
    }
  })

  stats.averageAccuracy = questionsWithAttempts > 0
    ? Math.round((totalAccuracy / questionsWithAttempts) * 100)
    : 0

  return stats
}

/**
 * Get recommended study duration
 * @param {number} questionCount - Number of questions to review
 * @returns {number} - Estimated minutes
 */
export function getEstimatedStudyTime(questionCount) {
  // Assume 2 minutes per question on average
  const minutesPerQuestion = 2
  return questionCount * minutesPerQuestion
}