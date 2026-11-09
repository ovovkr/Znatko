import { useState } from 'react';
import CodeViewer from './components/CodeViewer';
import SetupGuide from './components/SetupGuide';
import ArchitectureDiagram from './components/ArchitectureDiagram';
import { projectFiles } from './data/projectFiles';

function App() {
  const [activeFile, setActiveFile] = useState(0);
  const [activeTab, setActiveTab] = useState<'code' | 'setup' | 'architecture'>('code');

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 text-white">
      {/* Header */}
      <header className="border-b border-white/10 backdrop-blur-sm bg-white/5">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
            <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
            </svg>
          </div>
          <div>
            <h1 className="text-xl font-bold">Voice Assistant</h1>
            <p className="text-sm text-slate-400">Android Prototype • Kotlin + Jetpack Compose • Offline</p>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="max-w-7xl mx-auto px-4 pt-6">
        <div className="flex gap-2 mb-6">
          {[
            { id: 'code' as const, label: '📁 Код проекта', icon: '' },
            { id: 'architecture' as const, label: '🏗 Архитектура', icon: '' },
            { id: 'setup' as const, label: '🚀 Инструкция', icon: '' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-5 py-2.5 rounded-lg font-medium text-sm transition-all ${
                activeTab === tab.id
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30'
                  : 'bg-white/5 text-slate-300 hover:bg-white/10'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 pb-12">
        {activeTab === 'code' && (
          <div className="flex flex-col lg:flex-row gap-6">
            {/* File tree */}
            <div className="lg:w-72 shrink-0">
              <div className="bg-white/5 rounded-xl border border-white/10 p-4 sticky top-4">
                <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">
                  Структура проекта
                </h3>
                <nav className="space-y-1">
                  {projectFiles.map((file, index) => (
                    <button
                      key={file.path}
                      onClick={() => setActiveFile(index)}
                      className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-all flex items-center gap-2 ${
                        activeFile === index
                          ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/30'
                          : 'text-slate-300 hover:bg-white/5'
                      }`}
                    >
                      <span className="text-xs opacity-60">
                        {file.path.endsWith('.kt') ? '🟣' : file.path.endsWith('.gradle') ? '📦' : '📄'}
                      </span>
                      <span className="truncate">{file.path.split('/').pop()}</span>
                    </button>
                  ))}
                </nav>
              </div>
            </div>

            {/* Code viewer */}
            <div className="flex-1 min-w-0">
              <CodeViewer file={projectFiles[activeFile]} />
            </div>
          </div>
        )}

        {activeTab === 'architecture' && <ArchitectureDiagram />}
        {activeTab === 'setup' && <SetupGuide />}
      </div>
    </div>
  );
}

export default App;
