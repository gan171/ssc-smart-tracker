import { useState } from 'react'
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Area, AreaChart
} from 'recharts'
import {
  TrendingUp, TrendingDown, Target, Brain, Flame, Award,
  AlertTriangle, CheckCircle, Calendar, Clock, Zap
} from 'lucide-react'
import { motion } from 'framer-motion'
import {
  getAccuracyTrend,
  getSubjectBreakdown,
  getTopicBreakdown,
  getStudyHeatmap,
  getInsights,
  getMasteryDistribution,
  getBestStudyTime
} from '../utils/analytics'

function AnalyticsDashboard({ mistakes }) {
  const [selectedSubject, setSelectedSubject] = useState('All')

  // Calculate all analytics
  const accuracyTrend = getAccuracyTrend(mistakes)
  const subjectBreakdown = getSubjectBreakdown(mistakes)
  const topicBreakdown = getTopicBreakdown(mistakes, selectedSubject)
  const studyHeatmap = getStudyHeatmap(mistakes)
  const insights = getInsights(mistakes)
  const masteryDist = getMasteryDistribution(mistakes)
  const bestTime = getBestStudyTime(mistakes)

  // Chart colors
  const COLORS = {
    primary: '#3B82F6',
    success: '#10B981',
    warning: '#F59E0B',
    danger: '#EF4444',
    purple: '#8B5CF6',
    subjects: ['#3B82F6', '#8B5CF6', '#EC4899', '#F59E0B', '#10B981', '#06B6D4']
  }

  const cardVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.3 } }
  }

  if (mistakes.length === 0) {
    return (
      <div className="text-center py-12">
        <BarChart size={64} className="mx-auto mb-4 text-gray-400 opacity-50" />
        <h3 className="text-xl font-semibold text-gray-800 dark:text-white mb-2">
          No Data Yet
        </h3>
        <p className="text-gray-600 dark:text-gray-400">
          Upload some questions and start practicing to see your analytics!
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">

      {/* Insights Cards */}
      <div className="grid md:grid-cols-3 gap-4">

        {/* Improvement Card */}
        <motion.div
          variants={cardVariants}
          initial="hidden"
          animate="visible"
          className={`p-6 rounded-xl border ${
            insights.isImproving
              ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
              : 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800'
          }`}
        >
          <div className="flex items-center gap-3 mb-3">
            {insights.isImproving ? (
              <TrendingUp className="text-green-600 dark:text-green-400" size={24} />
            ) : (
              <TrendingDown className="text-orange-600 dark:text-orange-400" size={24} />
            )}
            <span className="font-semibold text-gray-800 dark:text-white">Progress</span>
          </div>
          <div className="text-3xl font-bold text-gray-800 dark:text-white mb-1">
            {insights.improvement}
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {insights.isImproving ? "You're improving!" : "Keep practicing!"}
          </p>
        </motion.div>

        {/* Streak Card */}
        <motion.div
          variants={cardVariants}
          initial="hidden"
          animate="visible"
          transition={{ delay: 0.1 }}
          className="p-6 rounded-xl bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800"
        >
          <div className="flex items-center gap-3 mb-3">
            <Flame className="text-orange-600 dark:text-orange-400" size={24} />
            <span className="font-semibold text-gray-800 dark:text-white">Streak</span>
          </div>
          <div className="text-3xl font-bold text-gray-800 dark:text-white mb-1">
            {insights.streak} days
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Keep it going! 🔥
          </p>
        </motion.div>

        {/* Best Time Card */}
        <motion.div
          variants={cardVariants}
          initial="hidden"
          animate="visible"
          transition={{ delay: 0.2 }}
          className="p-6 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800"
        >
          <div className="flex items-center gap-3 mb-3">
            <Clock className="text-blue-600 dark:text-blue-400" size={24} />
            <span className="font-semibold text-gray-800 dark:text-white">Best Time</span>
          </div>
          <div className="text-3xl font-bold text-gray-800 dark:text-white mb-1">
            {bestTime ? bestTime.label : 'N/A'}
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {bestTime ? `${bestTime.accuracy}% accuracy` : 'Need more data'}
          </p>
        </motion.div>
      </div>

      {/* Main Insights Panel */}
      <motion.div
        variants={cardVariants}
        initial="hidden"
        animate="visible"
        transition={{ delay: 0.3 }}
        className="p-6 rounded-xl bg-gradient-to-r from-purple-500 to-blue-500 text-white"
      >
        <div className="flex items-center gap-3 mb-4">
          <Brain size={28} />
          <h3 className="text-xl font-bold">AI Insights</h3>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              {insights.weakestTopic ? (
                <AlertTriangle size={20} />
              ) : (
                <CheckCircle size={20} />
              )}
              <span className="font-semibold">
                {insights.weakestTopic ? 'Focus Area' : 'Great Job!'}
              </span>
            </div>
            <p className="text-blue-100">
              {insights.weakestTopic
                ? `Work on ${insights.weakestTopic.name} (${insights.weakestTopic.accuracy}% accuracy)`
                : 'All subjects looking good!'}
            </p>
          </div>

          <div>
            <div className="flex items-center gap-2 mb-2">
              <Award size={20} />
              <span className="font-semibold">Strength</span>
            </div>
            <p className="text-blue-100">
              {insights.strongestTopic
                ? `${insights.strongestTopic.name} is your best! (${insights.strongestTopic.accuracy}%)`
                : 'Start practicing to see strengths'}
            </p>
          </div>
        </div>

        {insights.needsReview.length > 0 && (
          <div className="mt-4 pt-4 border-t border-white/20">
            <div className="flex items-center gap-2 mb-2">
              <Zap size={20} />
              <span className="font-semibold">Topics Needing Review:</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {insights.needsReview.map(topic => (
                <span key={topic} className="px-3 py-1 bg-white/20 rounded-full text-sm">
                  {topic}
                </span>
              ))}
            </div>
          </div>
        )}
      </motion.div>

      {/* Charts Row 1: Accuracy Trend + Subject Breakdown */}
      <div className="grid md:grid-cols-2 gap-6">

        {/* Accuracy Trend */}
        <motion.div
          variants={cardVariants}
          initial="hidden"
          animate="visible"
          transition={{ delay: 0.4 }}
          className="p-6 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700"
        >
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
            <TrendingUp size={20} />
            Accuracy Over Time
          </h3>

          {accuracyTrend.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={accuracyTrend}>
                <defs>
                  <linearGradient id="colorAccuracy" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={COLORS.primary} stopOpacity={0.3}/>
                    <stop offset="95%" stopColor={COLORS.primary} stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.1} />
                <XAxis
                  dataKey="date"
                  stroke="#9CA3AF"
                  tick={{ fontSize: 12 }}
                  tickFormatter={(date) => new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                />
                <YAxis stroke="#9CA3AF" tick={{ fontSize: 12 }} domain={[0, 100]} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1F2937',
                    border: 'none',
                    borderRadius: '8px',
                    color: '#fff'
                  }}
                  formatter={(value) => [`${value}%`, 'Accuracy']}
                  labelFormatter={(date) => new Date(date).toLocaleDateString()}
                />
                <Area
                  type="monotone"
                  dataKey="accuracy"
                  stroke={COLORS.primary}
                  strokeWidth={3}
                  fill="url(#colorAccuracy)"
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[250px] flex items-center justify-center text-gray-500 dark:text-gray-400">
              Start practicing to see trend
            </div>
          )}
        </motion.div>

        {/* Subject Breakdown */}
        <motion.div
          variants={cardVariants}
          initial="hidden"
          animate="visible"
          transition={{ delay: 0.5 }}
          className="p-6 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700"
        >
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
            <Target size={20} />
            Subject Distribution
          </h3>

          {subjectBreakdown.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={subjectBreakdown}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ subject, count }) => `${subject}: ${count}`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="count"
                >
                  {subjectBreakdown.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS.subjects[index % COLORS.subjects.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1F2937',
                    border: 'none',
                    borderRadius: '8px',
                    color: '#fff'
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[250px] flex items-center justify-center text-gray-500 dark:text-gray-400">
              No data available
            </div>
          )}
        </motion.div>
      </div>

      {/* Charts Row 2: Topic Breakdown + Mastery Distribution */}
      <div className="grid md:grid-cols-2 gap-6">

        {/* Topic Breakdown */}
        <motion.div
          variants={cardVariants}
          initial="hidden"
          animate="visible"
          transition={{ delay: 0.6 }}
          className="p-6 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white flex items-center gap-2">
              <BarChart size={20} />
              Topic Accuracy
            </h3>
            <select
              value={selectedSubject}
              onChange={(e) => setSelectedSubject(e.target.value)}
              className="px-3 py-1 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300"
            >
              <option value="All">All Subjects</option>
              {subjectBreakdown.map(s => (
                <option key={s.subject} value={s.subject}>{s.subject}</option>
              ))}
            </select>
          </div>

          {topicBreakdown.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={topicBreakdown} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.1} />
                <XAxis type="number" stroke="#9CA3AF" tick={{ fontSize: 12 }} domain={[0, 100]} />
                <YAxis
                  type="category"
                  dataKey="topic"
                  stroke="#9CA3AF"
                  tick={{ fontSize: 12 }}
                  width={100}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1F2937',
                    border: 'none',
                    borderRadius: '8px',
                    color: '#fff'
                  }}
                  formatter={(value) => [`${value}%`, 'Accuracy']}
                />
                <Bar dataKey="accuracy" fill={COLORS.primary} radius={[0, 8, 8, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[250px] flex items-center justify-center text-gray-500 dark:text-gray-400">
              No topics available
            </div>
          )}
        </motion.div>

        {/* Mastery Distribution */}
        <motion.div
          variants={cardVariants}
          initial="hidden"
          animate="visible"
          transition={{ delay: 0.7 }}
          className="p-6 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700"
        >
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
            <Award size={20} />
            Mastery Levels
          </h3>

          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-600 dark:text-gray-400">New</span>
                <span className="text-sm font-bold text-gray-800 dark:text-white">{masteryDist.new}</span>
              </div>
              <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gray-400 rounded-full transition-all"
                  style={{ width: `${(masteryDist.new / mistakes.length) * 100}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Learning</span>
                <span className="text-sm font-bold text-gray-800 dark:text-white">{masteryDist.learning}</span>
              </div>
              <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-orange-500 rounded-full transition-all"
                  style={{ width: `${(masteryDist.learning / mistakes.length) * 100}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Reviewing</span>
                <span className="text-sm font-bold text-gray-800 dark:text-white">{masteryDist.reviewing}</span>
              </div>
              <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-yellow-500 rounded-full transition-all"
                  style={{ width: `${(masteryDist.reviewing / mistakes.length) * 100}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Mastered</span>
                <span className="text-sm font-bold text-gray-800 dark:text-white">{masteryDist.mastered}</span>
              </div>
              <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-green-500 rounded-full transition-all"
                  style={{ width: `${(masteryDist.mastered / mistakes.length) * 100}%` }}
                />
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Study Heatmap */}
      <motion.div
        variants={cardVariants}
        initial="hidden"
        animate="visible"
        transition={{ delay: 0.8 }}
        className="p-6 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700"
      >
        <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
          <Calendar size={20} />
          Study Activity (Last 90 Days)
        </h3>

        <div className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          {studyHeatmap.length > 0 ? `${studyHeatmap.length} active days` : 'No activity yet'}
        </div>

        {/* Simple heatmap visualization */}
        <div className="grid grid-cols-13 gap-1">
          {Array.from({ length: 91 }).map((_, i) => {
            const date = new Date()
            date.setDate(date.getDate() - (90 - i))
            const dateKey = date.toISOString().split('T')[0]
            const activity = studyHeatmap.find(h => h.date === dateKey)
            const level = activity ? activity.level : 0

            return (
              <div
                key={i}
                className={`w-3 h-3 rounded-sm ${
                  level === 0 ? 'bg-gray-200 dark:bg-gray-700' :
                  level === 1 ? 'bg-green-200 dark:bg-green-900' :
                  level === 2 ? 'bg-green-400 dark:bg-green-700' :
                  level === 3 ? 'bg-green-600 dark:bg-green-500' :
                  'bg-green-800 dark:bg-green-300'
                }`}
                title={`${dateKey}: ${activity ? activity.count : 0} activities`}
              />
            )
          })}
        </div>

        <div className="flex items-center gap-4 mt-4 text-xs text-gray-600 dark:text-gray-400">
          <span>Less</span>
          <div className="flex gap-1">
            <div className="w-3 h-3 bg-gray-200 dark:bg-gray-700 rounded-sm" />
            <div className="w-3 h-3 bg-green-200 dark:bg-green-900 rounded-sm" />
            <div className="w-3 h-3 bg-green-400 dark:bg-green-700 rounded-sm" />
            <div className="w-3 h-3 bg-green-600 dark:bg-green-500 rounded-sm" />
            <div className="w-3 h-3 bg-green-800 dark:bg-green-300 rounded-sm" />
          </div>
          <span>More</span>
        </div>
      </motion.div>
    </div>
  )
}

export default AnalyticsDashboard