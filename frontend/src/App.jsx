import { useState, useEffect, useMemo } from 'react'
import { useAuth } from './AuthContext'
import { useQuestions } from './hooks/useQuestions'
import { useUpload } from './hooks/useUpload'

// Pages
import LandingPage from './LandingPage'
import Auth from './Auth'
import Dashboard from './Dashboard'
import ProfilePage from './ProfilePage'
import MockTestSetup from './MockTestSetup'
import MockTest from './MockTest'
import CommunityPage from './CommunityPage'

// Components
import UploadModal from './components/UploadModal'
import BulkUploadModal from './components/BulkUploadModal'
import StudyView from './components/StudyView'
import ExportModal from './components/ExportModal'
import TopNav from './components/TopNav'
import MockSummaryModal from './components/MockSummaryModal'
import ManualEntryModal from './components/ManualEntryModal'
import ApiKeySettingsModal from './components/ApiKeySettingsModal'

import { Loader2 } from 'lucide-react'

function App() {
  const { user, signOut, loading: authLoading } = useAuth()

  // Custom hooks
  const {
    mistakes,
    loading: questionsLoading,
    loadingMore,
    hasMore,
    refetch,
    loadMore,
    addNote,
    updateQuestion,
    deleteQuestion,
    createManualQuestion
  } = useQuestions(user)
  const {
    loading: uploadLoading,
    error: uploadError,
    uploadSingle,
    uploadBulk,
    clearAnalysis
  } = useUpload(refetch)

  // View States
  const [showLanding, setShowLanding] = useState(!user)
  const [currentView, setCurrentView] = useState('dashboard')
  const [mockTestConfig, setMockTestConfig] = useState(null)

  // Modal States
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [showBulkModal, setShowBulkModal] = useState(false)
  const [showExportModal, setShowExportModal] = useState(false)
  const [showMockSummary, setShowMockSummary] = useState(false)
  const [showManualEntry, setShowManualEntry] = useState(false)
  const [showApiKeySettings, setShowApiKeySettings] = useState(false)
  const [bulkProgress, setBulkProgress] = useState({ current: 0, total: 0 })
  const [bulkSummary, setBulkSummary] = useState(null)
  const [selectedQuestionId, setSelectedQuestionId] = useState(null)
  const [lastMockSummary, setLastMockSummary] = useState(null)

  // Theme
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('theme')
    return saved === 'dark'
  })

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark')
      localStorage.setItem('theme', 'dark')
    } else {
      document.documentElement.classList.remove('dark')
      localStorage.setItem('theme', 'light')
    }
  }, [darkMode])

  const handleUpload = async (file) => {
    await uploadSingle(file)
    setShowUploadModal(false)
  }

  const handleBulkUpload = async (files) => {
    setBulkSummary(null)
    setBulkProgress({ current: 0, total: files.length })
    const summary = await uploadBulk(files, setBulkProgress)
    setBulkSummary(summary)
  }

  const selectedQuestionIndex = useMemo(
    () => mistakes.findIndex((question) => question.id === selectedQuestionId),
    [mistakes, selectedQuestionId]
  )

  const selectedQuestion = selectedQuestionIndex >= 0 ? mistakes[selectedQuestionIndex] : null

  const handleQuestionClick = (question) => {
    setSelectedQuestionId(question.id)
  }

  const handleNavigateQuestion = (direction) => {
    if (selectedQuestionIndex < 0) return
    const nextIndex = selectedQuestionIndex + direction
    if (nextIndex < 0 || nextIndex >= mistakes.length) return
    setSelectedQuestionId(mistakes[nextIndex].id)
  }

  const handleCloseAnalysis = () => {
    setSelectedQuestionId(null)
    clearAnalysis()
  }

  const handleMockTest = () => setCurrentView('mockSetup')

  const handleMockTestStart = (config) => {
    setMockTestConfig(config)
    setCurrentView('mockTest')
  }

  const handleMockTestComplete = async (answers) => {
    const questions = mockTestConfig?.questions || []
    const answered = Object.keys(answers).length
    const correct = questions.filter((q) => answers[q.id] === q.correct_option).length
    const score = questions.length > 0 ? (correct / questions.length) * 100 : 0

    const weakSubjects = questions.reduce((acc, q) => {
      const subject = q.subject || 'General'
      if (answers[q.id] && answers[q.id] !== q.correct_option) {
        acc[subject] = (acc[subject] || 0) + 1
      }
      return acc
    }, {})

    const focusTopics = Object.entries(weakSubjects)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)

    setLastMockSummary({
      total: questions.length,
      answered,
      correct,
      incorrect: Math.max(answered - correct, 0),
      skipped: Math.max(questions.length - answered, 0),
      score: Math.round(score * 10) / 10,
      focusTopics
    })

    refetch()
    setCurrentView('dashboard')
    setMockTestConfig(null)
    setShowMockSummary(true)
  }

  const handleMockTestExit = () => {
    if (confirm('Exit test? Progress will be lost.')) {
      setCurrentView('dashboard')
      setMockTestConfig(null)
    }
  }

  const handleSignOut = async () => {
    await signOut()
    setShowLanding(true)
    setCurrentView('dashboard')
  }

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
        <Loader2 className="animate-spin text-blue-500" size={48} />
      </div>
    )
  }

  if (!user) {
    return showLanding ? (
      <LandingPage onGetStarted={() => setShowLanding(false)} />
    ) : (
      <Auth />
    )
  }

  if (currentView === 'mockSetup') {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 py-8 px-4">
        <MockTestSetup
          mistakes={mistakes}
          onStartTest={handleMockTestStart}
          onCancel={() => setCurrentView('dashboard')}
        />
      </div>
    )
  }

  if (currentView === 'mockTest' && mockTestConfig) {
    return (
      <MockTest
        questions={mockTestConfig.questions}
        timeLimit={mockTestConfig.timeLimit}
        onComplete={handleMockTestComplete}
        onExit={handleMockTestExit}
      />
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 via-white to-blue-50/30 dark:from-gray-950 dark:via-gray-950 dark:to-gray-900">
      <TopNav
        user={user}
        darkMode={darkMode}
        currentView={currentView}
        onChangeView={setCurrentView}
        onToggleDarkMode={() => setDarkMode(!darkMode)}
        onOpenSettings={() => setShowApiKeySettings(true)}
        onSignOut={handleSignOut}
      />

      {currentView === 'profile' ? (
        <ProfilePage user={user} mistakes={mistakes} />
      ) : currentView === 'community' ? (
        <CommunityPage user={user} />
      ) : (
        <Dashboard
          mistakes={mistakes}
          loading={questionsLoading}
          onUploadClick={() => setShowUploadModal(true)}
          onBulkUploadClick={() => setShowBulkModal(true)}
          onMockTestClick={handleMockTest}
          onQuestionClick={handleQuestionClick}
          onAddNote={addNote}
          onDeleteQuestion={async (q) => {
            if (confirm('Delete this question permanently?')) {
              await deleteQuestion(q.id)
              if (selectedQuestionId === q.id) setSelectedQuestionId(null)
            }
          }}
          onExportClick={() => setShowExportModal(true)}
          onManualEntryClick={() => setShowManualEntry(true)}
          onLoadMore={loadMore}
          hasMore={hasMore}
          loadingMore={loadingMore}
          darkMode={darkMode}
        />
      )}

      <UploadModal
        isOpen={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        onUpload={handleUpload}
        loading={uploadLoading}
        error={uploadError}
      />

      <BulkUploadModal
        isOpen={showBulkModal}
        onClose={() => {
          setShowBulkModal(false)
          setBulkSummary(null)
          setBulkProgress({ current: 0, total: 0 })
        }}
        onUpload={handleBulkUpload}
        loading={uploadLoading}
        progress={bulkProgress}
        summary={bulkSummary}
      />

      <StudyView
        isOpen={!!selectedQuestion}
        question={selectedQuestion}
        onClose={handleCloseAnalysis}
        onPrev={() => handleNavigateQuestion(-1)}
        onNext={() => handleNavigateQuestion(1)}
        hasPrev={selectedQuestionIndex > 0}
        hasNext={selectedQuestionIndex >= 0 && selectedQuestionIndex < mistakes.length - 1}
        onDelete={async (q) => {
          if (confirm('Delete this question permanently?')) {
            await deleteQuestion(q.id)
            handleCloseAnalysis()
          }
        }}
        onSave={updateQuestion}
        onAddNote={addNote}
      />

      <ManualEntryModal
        isOpen={showManualEntry}
        onClose={() => setShowManualEntry(false)}
        onSubmit={createManualQuestion}
      />

      <ExportModal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        mistakes={mistakes}
      />

      <ApiKeySettingsModal
        isOpen={showApiKeySettings}
        onClose={() => setShowApiKeySettings(false)}
      />

      <MockSummaryModal
        isOpen={showMockSummary}
        summary={lastMockSummary}
        onClose={() => setShowMockSummary(false)}
        onStartNextMock={handleMockTest}
      />
    </div>
  )
}

export default App
