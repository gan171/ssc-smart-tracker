import { motion } from 'framer-motion';
import CursorSparkles from './CursorSparkles';
import {
  Brain, Target, TrendingUp, Shield,
  ChevronRight, CheckCircle2, Zap
} from 'lucide-react';

export default function LandingPage({ onGetStarted }) {
  // Animation Variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.2 }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: { type: "spring", stiffness: 100 }
    }
  };

  return (
    <div className="min-h-screen overflow-hidden">
        <CursorSparkles />

      {/* --- HERO SECTION --- */}
      <section className="relative pt-20 pb-32 px-6">
        {/* Background Blobs */}
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl -z-10 animate-pulse" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl -z-10 animate-pulse delay-1000" />

        <div className="max-w-6xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <span className="px-4 py-2 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-sm font-semibold border border-blue-200 dark:border-blue-800">
              🚀 The #1 Mistake Tracker for SSC CGL
            </span>
          </motion.div>

          <motion.h1
            className="mt-8 text-5xl md:text-7xl font-extrabold tracking-tight leading-tight"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.2 }}
          >
            Turn Your <span className="text-gradient">Silly Mistakes</span> <br />
            Into <span className="text-gradient">Top Ranks</span>
          </motion.h1>

          <motion.p
            className="mt-6 text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
          >
            Don't just solve questions. Analyze them. Our AI-powered tracker identifies your weak spots and helps you fix them before exam day.
          </motion.p>

          <motion.div
            className="mt-10 flex flex-col sm:flex-row gap-4 justify-center"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
          >
            <button
              onClick={onGetStarted}
              className="px-8 py-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-lg shadow-lg hover:shadow-blue-500/25 transition-all flex items-center justify-center gap-2 group"
            >
              Start Tracking Now
              <ChevronRight className="group-hover:translate-x-1 transition-transform" />
            </button>
            <button className="px-8 py-4 rounded-xl glass text-gray-700 dark:text-white font-semibold hover:bg-white/40 dark:hover:bg-gray-800/60 transition-all">
              Watch Demo
            </button>
          </motion.div>
        </div>
      </section>

      {/* --- FEATURES GRID --- */}
      <section className="py-24 bg-white/50 dark:bg-gray-900/50 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-6">
          <motion.div
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            className="grid md:grid-cols-3 gap-8"
          >
            {/* Feature 1 */}
            <motion.div variants={itemVariants} className="glass-card p-8 rounded-2xl relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-2xl -mr-16 -mt-16 transition-all group-hover:bg-blue-500/20" />
              <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/50 rounded-lg flex items-center justify-center mb-6 text-blue-600 dark:text-blue-400">
                <Brain size={28} />
              </div>
              <h3 className="text-xl font-bold mb-3 dark:text-white">AI-Powered Analysis</h3>
              <p className="text-gray-600 dark:text-gray-400">
                Upload a screenshot, and our Gemini AI extracts the question, options, and explains the core concept instantly.
              </p>
            </motion.div>

            {/* Feature 2 */}
            <motion.div variants={itemVariants} className="glass-card p-8 rounded-2xl relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/10 rounded-full blur-2xl -mr-16 -mt-16 transition-all group-hover:bg-purple-500/20" />
              <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/50 rounded-lg flex items-center justify-center mb-6 text-purple-600 dark:text-purple-400">
                <Target size={28} />
              </div>
              <h3 className="text-xl font-bold mb-3 dark:text-white">Smart Mistake Bank</h3>
              <p className="text-gray-600 dark:text-gray-400">
                Never lose a wrong question again. Filter by subject, topic, or analysis status to focus your revision.
              </p>
            </motion.div>

            {/* Feature 3 */}
            <motion.div variants={itemVariants} className="glass-card p-8 rounded-2xl relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-green-500/10 rounded-full blur-2xl -mr-16 -mt-16 transition-all group-hover:bg-green-500/20" />
              <div className="w-12 h-12 bg-green-100 dark:bg-green-900/50 rounded-lg flex items-center justify-center mb-6 text-green-600 dark:text-green-400">
                <TrendingUp size={28} />
              </div>
              <h3 className="text-xl font-bold mb-3 dark:text-white">Analytics & Mocks</h3>
              <p className="text-gray-600 dark:text-gray-400">
                Re-attempt your mistakes in a timed mock environment. Track your accuracy improvement over time.
              </p>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* --- HOW IT WORKS --- */}
      <section className="py-24 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold dark:text-white">How It Works</h2>
            <p className="mt-4 text-gray-600 dark:text-gray-400">Three simple steps to mastery</p>
          </div>

          <div className="space-y-12">
            {[
              {
                step: "01",
                title: "Upload Screenshot",
                desc: "Take a screenshot of any question you got wrong in a mock test.",
                icon: <Zap size={24} />
              },
              {
                step: "02",
                title: "Get AI Analysis",
                desc: "Our AI breaks down the logic, points out the 'Examiner's Trap', and gives you a harder variation.",
                icon: <Brain size={24} />
              },
              {
                step: "03",
                title: "Re-Attempt Later",
                desc: "The question is saved. Take a custom mock test of ONLY your mistakes before the real exam.",
                icon: <CheckCircle2 size={24} />
              }
            ].map((item, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: index % 2 === 0 ? -50 : 50 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.2 }}
                className="flex items-center gap-6 glass p-6 rounded-2xl"
              >
                <div className="text-5xl font-bold text-gray-200 dark:text-gray-800">{item.step}</div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold dark:text-white flex items-center gap-2">
                    {item.title}
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 mt-1">{item.desc}</p>
                </div>
                <div className="hidden sm:block p-3 bg-blue-50 dark:bg-gray-800 rounded-full text-blue-500">
                  {item.icon}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* --- FINAL CTA --- */}
      <section className="py-20 px-6 text-center">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          whileInView={{ scale: 1, opacity: 1 }}
          className="max-w-3xl mx-auto bg-gradient-to-r from-blue-600 to-purple-600 rounded-3xl p-12 text-white shadow-2xl relative overflow-hidden"
        >
          <div className="absolute top-0 left-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>

          <h2 className="text-3xl md:text-4xl font-bold mb-6 relative z-10">Ready to Crack SSC CGL?</h2>
          <p className="text-blue-100 text-lg mb-8 max-w-xl mx-auto relative z-10">
            Join the smart aspirants who are fixing their mistakes instead of repeating them.
          </p>
          <button
            onClick={onGetStarted}
            className="px-10 py-4 bg-white text-blue-600 rounded-xl font-bold text-lg hover:shadow-xl hover:scale-105 transition-all relative z-10"
          >
            Get Started for Free
          </button>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="py-8 text-center text-gray-500 dark:text-gray-500 text-sm">
        <p>© 2025 SSC Smart Tracker. Built for champions.</p>
      </footer>
    </div>
  );
}