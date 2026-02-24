import { Moon, Sun, LogOut, User, LayoutDashboard, IdCard } from 'lucide-react'

function TopNav({ user, darkMode, currentView, onChangeView, onToggleDarkMode, onSignOut }) {
  return (
    <div className="sticky top-0 z-50 backdrop-blur-xl bg-white/70 dark:bg-gray-900/70 border-b border-gray-200/50 dark:border-gray-700/50">
      <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            SSC Smart Tracker
          </div>
          <div className="hidden sm:flex items-center gap-2 px-3 py-1 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-sm">
            <User size={14} />
            {user?.email}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onChangeView('dashboard')}
            className={`p-2 rounded-lg transition-all ${currentView === 'dashboard' ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-300' : 'hover:bg-gray-100 dark:hover:bg-gray-800'}`}
            title="Dashboard"
          >
            <LayoutDashboard size={18} />
          </button>
          <button
            onClick={() => onChangeView('profile')}
            className={`p-2 rounded-lg transition-all ${currentView === 'profile' ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-300' : 'hover:bg-gray-100 dark:hover:bg-gray-800'}`}
            title="Profile"
          >
            <IdCard size={18} />
          </button>
          <button
            onClick={onToggleDarkMode}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-all"
          >
            {darkMode ? <Sun size={20} /> : <Moon size={20} />}
          </button>
          <button
            onClick={onSignOut}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300 hover:text-red-500 transition-all"
          >
            <LogOut size={20} />
          </button>
        </div>
      </div>
    </div>
  )
}

export default TopNav
