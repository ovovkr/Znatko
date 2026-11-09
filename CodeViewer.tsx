import { useState } from 'react';
import { ProjectFile } from '../data/projectFiles';

interface CodeViewerProps {
  file: ProjectFile;
}

export default function CodeViewer({ file }: CodeViewerProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(file.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-white/5 rounded-xl border border-white/10 overflow-hidden">
      {/* File header */}
      <div className="flex items-center justify-between px-4 py-3 bg-white/5 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-red-500/70"></div>
            <div className="w-3 h-3 rounded-full bg-yellow-500/70"></div>
            <div className="w-3 h-3 rounded-full bg-green-500/70"></div>
          </div>
          <span className="text-sm text-slate-400 font-mono">{file.path}</span>
        </div>
        <button
          onClick={handleCopy}
          className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-white/10 hover:bg-white/20 text-sm text-slate-300 transition-colors"
        >
          {copied ? (
            <>
              <svg className="w-4 h-4 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span className="text-green-400">Скопировано!</span>
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              Копировать
            </>
          )}
        </button>
      </div>

      {/* Description */}
      <div className="px-4 py-2 bg-indigo-500/10 border-b border-white/5">
        <p className="text-sm text-indigo-300">💡 {file.description}</p>
      </div>

      {/* Code content */}
      <div className="overflow-x-auto">
        <pre className="p-4 text-sm leading-relaxed">
          <code className="text-slate-200 font-mono">
            {file.content.split('\n').map((line, i) => (
              <div key={i} className="flex">
                <span className="inline-block w-10 text-right pr-4 text-slate-600 select-none text-xs leading-relaxed">
                  {i + 1}
                </span>
                <span className="flex-1">
                  <HighlightedLine line={line} language={file.language} />
                </span>
              </div>
            ))}
          </code>
        </pre>
      </div>
    </div>
  );
}

// Простая подсветка синтаксиса для Kotlin
function HighlightedLine({ line, language }: { line: string; language: string }) {
  if (language !== 'kotlin' && language !== 'xml') {
    return <>{line}</>;
  }

  // Подсветка ключевых слов Kotlin
  const keywords = /\b(package|import|class|fun|val|var|if|else|when|return|for|while|private|public|override|object|interface|enum|data|sealed|companion|const|suspend|inline|abstract|open|inner|lateinit|by|lazy|get|set|init|constructor|this|super|null|true|false|is|as|in|out|try|catch|finally|throw)\b/g;
  const annotations = /(@\w+)/g;
  const strings = /(".*?")/g;
  const comments = /(\/\/.*$|\/\*[\s\S]*?\*\/)/g;
  const numbers = /\b(\d+\.?\d*[fL]?)\b/g;
  const types = /\b(String|Int|Float|Boolean|Long|Double|Unit|Any|List|Map|Set|Array|ShortArray|Bundle|Intent|Context|Job|StateFlow|MutableStateFlow|CoroutineScope|Dispatchers|SupervisorJob|Color|Modifier|Text|Box|Column|Row|Scaffold|Card|Canvas|Spacer)\b/g;

  // XML подсветка
  const xmlTags = /(<\/?[\w.-]+)/g;
  const xmlAttrs = /\b([\w:-]+)=/g;
  const xmlStrings = /(".*?")/g;

  if (language === 'xml') {
    const parts: React.ReactNode[] = [];
    let lastIndex = 0;
    let match;
    const regex = /(<\/?[\w.-]+)|(".*?")|(\b[\w:-]+=)/g;

    while ((match = regex.exec(line)) !== null) {
      if (match.index > lastIndex) {
        parts.push(<span key={lastIndex} className="text-slate-200">{line.slice(lastIndex, match.index)}</span>);
      }
      if (match[1]) {
        parts.push(<span key={match.index} className="text-indigo-400">{match[1]}</span>);
      } else if (match[2]) {
        parts.push(<span key={match.index} className="text-green-400">{match[2]}</span>);
      } else if (match[3]) {
        parts.push(<span key={match.index} className="text-yellow-400">{match[3]}</span>);
      }
      lastIndex = match.index + match[0].length;
    }
    if (lastIndex < line.length) {
      parts.push(<span key={lastIndex} className="text-slate-200">{line.slice(lastIndex)}</span>);
    }
    return <>{parts}</>;
  }

  // Kotlin подсветка
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match;
  const regex = /(\/\/.*$)|(@\w+)|(".*?")|(\b\d+\.?\d*[fL]?\b)|(\b(?:package|import|class|fun|val|var|if|else|when|return|for|while|private|public|override|object|interface|enum|data|sealed|companion|const|suspend|inline|abstract|open|inner|lateinit|by|lazy|get|set|init|constructor|this|super|null|true|false|is|as|in|out|try|catch|finally|throw)\b)|(\b(?:String|Int|Float|Boolean|Long|Double|Unit|Any|List|Map|Set|Array|ShortArray|Bundle|Intent|Context|Job|StateFlow|MutableStateFlow|CoroutineScope|Dispatchers|SupervisorJob|Color|Modifier|Text|Box|Column|Row|Scaffold|Card|Canvas|Spacer)\b)/g;

  while ((match = regex.exec(line)) !== null) {
    if (match.index > lastIndex) {
      parts.push(<span key={lastIndex} className="text-slate-200">{line.slice(lastIndex, match.index)}</span>);
    }
    if (match[1]) {
      parts.push(<span key={match.index} className="text-slate-500 italic">{match[1]}</span>);
    } else if (match[2]) {
      parts.push(<span key={match.index} className="text-yellow-400">{match[2]}</span>);
    } else if (match[3]) {
      parts.push(<span key={match.index} className="text-green-400">{match[3]}</span>);
    } else if (match[4]) {
      parts.push(<span key={match.index} className="text-orange-400">{match[4]}</span>);
    } else if (match[5]) {
      parts.push(<span key={match.index} className="text-purple-400 font-semibold">{match[5]}</span>);
    } else if (match[6]) {
      parts.push(<span key={match.index} className="text-cyan-400">{match[6]}</span>);
    }
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < line.length) {
    parts.push(<span key={lastIndex} className="text-slate-200">{line.slice(lastIndex)}</span>);
  }
  return <>{parts}</>;
}
