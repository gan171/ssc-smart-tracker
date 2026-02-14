import { useState, useEffect } from 'react'
import { useAuth } from './AuthContext'
import { useQuestions } from './hooks/useQuestions'
import { useUpload } from './hooks/useUpload'

// Pages
import LandingPage from './LandingPage'
import Auth from './Auth'
import Dashboard from './Dashboard'
import MockTestSetup from './MockTestSetup'
import MockTest from './MockTest'

// Components
import UploadModal from './components/UploadModal'
import BulkUploadModal from './components/BulkUploadModal'
import AnalysisModal from './components/AnalysisModal'
import TopNav from './components/TopNav'

import { Loader2 } from 'lucide-react'

function App() {
  const { user, signOut, loading: authLoading } = useAuth()

  // Custom hooks
  const { mistakes, loading: questionsLoading, refetch, addNote, updateStatus } = useQuestions(user)
  const {
    loading: uploadLoading,
    error: uploadError,
    analysis,
    uploadSingle,
    uploadBulk,
    clearAnalysis,
    clearError
  } = useUpload(refetch)

  // View States
  const [showLanding, setShowLanding] = useState(!user)
  const [currentView, setCurrentView] = useState('dashboard')
  const [mockTestConfig, setMockTestConfig] = useState(null)

  // Modal States
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [showBulkModal, setShowBulkModal] = useState(false)
  const [bulkProgress, setBulkProgress] = useState({ current: 0, total: 0 })
  const [selectedQuestion, setSelectedQuestion] = useState(null)

  // Theme - FIXED
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('theme')
    return saved === 'dark'
  })

  // Theme Effect - FIXED
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark')
      localStorage.setItem('theme', 'dark')
    } else {
      document.documentElement.classList.remove('dark')
      localStorage.setItem('theme', 'light')
    }
  }, [darkMode])

  // Handlers
  const handleUpload = async (file) => {
    await uploadSingle(file)
    setShowUploadModal(false)
  }

  const handleBulkUpload = async (files) => {
    await uploadBulk(files, setBulkProgress)
    setShowBulkModal(false)
  }

  const handleQuestionClick = (question) => {
    // FIXED: Properly set the selected question for analysis modal
    setSelectedQuestion(question)
  }

  const handleCloseAnalysis = () => {
    setSelectedQuestion(null)
    clearAnalysis()
  }

  const handleMockTest = () => setCurrentView('mockSetup')

  const handleMockTestStart = (config) => {
    setMockTestConfig(config)
    setCurrentView('mockTest')
  }

  const handleMockTestComplete = async (answers) => {
    // TODO: Save results to backend
    refetch()
    setCurrentView('dashboard')
    setMockTestConfig(null)
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

  // Loading
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
        <Loader2 className="animate-spin text-blue-500" size={48} />
      </div>
    )
  }

  // Not logged in
  if (!user) {
    return showLanding ? (
      <LandingPage onGetStarted={() => setShowLanding(false)} />
    ) : (
      <Auth />
    )
  }

  // Mock Test Views
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

  // Main Dashboard
  return (
    <div className="min-h-screen">
      <TopNav
        user={user}
        darkMode={darkMode}
        onToggleDarkMode={() => setDarkMode(!darkMode)}
        onSignOut={handleSignOut}
      />

      <Dashboard
        mistakes={mistakes}
        onUploadClick={() => setShowUploadModal(true)}
        onBulkUploadClick={() => setShowBulkModal(true)}
        onMockTestClick={handleMockTest}
        onQuestionClick={handleQuestionClick}
        onAddNote={addNote}
        darkMode={darkMode}
      />

      {/* Modals */}
      <UploadModal
        isOpen={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        onUpload={handleUpload}
        loading={uploadLoading}
        error={uploadError}
      />

      <BulkUploadModal
        isOpen={showBulkModal}
        onClose={() => setShowBulkModal(false)}
        onUpload={handleBulkUpload}
        loading={uploadLoading}
        progress={bulkProgress}
      />

      {/* Analysis Modal - shows either new upload or clicked question */}
      <AnalysisModal
        isOpen={!!(analysis || selectedQuestion)}
        analysis={analysis || (selectedQuestion?.content)}
        question={selectedQuestion}
        onClose={handleCloseAnalysis}
      />
    </div>
  )
}

export default App