import { useState } from 'react';

export default function ArchitectureDiagram() {
  const [activeStep, setActiveStep] = useState<number | null>(null);

  const steps = [
    {
      id: 0,
      title: 'Пользователь нажимает кнопку',
      description: 'VoiceEngine.startListening() запускает AudioRecord и SpeechRecognizer параллельно',
      color: 'from-indigo-500 to-indigo-600',
      icon: '👆'
    },
    {
      id: 1,
      title: 'VAD анализирует RMS каждые 50мс',
      description: 'VadDetector вычисляет RMS из AudioRecord (16kHz, mono, PCM16). Если RMS > порога → "Слушаю"',
      color: 'from-purple-500 to-purple-600',
      icon: '📊'
    },
    {
      id: 2,
      title: 'SpeechRecognizer распознаёт речь',
      description: 'EXTRA_PREFER_OFFLINE=true, EXTRA_PARTIAL_RESULTS=true. Промежуточные результаты → UI',
      color: 'from-blue-500 to-blue-600',
      icon: '🎤'
    },
    {
      id: 3,
      title: 'Тишина > 1.5 сек → конец речи',
      description: 'VAD фиксирует тишину 1500мс → speechRecognizer.stopListening() → onResults()',
      color: 'from-cyan-500 to-cyan-600',
      icon: '🤫'
    },
    {
      id: 4,
      title: 'ResponseGenerator генерирует ответ',
      description: 'Текст передаётся в ResponseGenerator (заглушка). В будущем — локальная LLM',
      color: 'from-amber-500 to-amber-600',
      icon: '💭'
    },
    {
      id: 5,
      title: 'TTS озвучивает ответ',
      description: 'TextToSpeech.speak() с русским офлайн-голосом. VAD продолжает мониторить!',
      color: 'from-emerald-500 to-emerald-600',
      icon: '🔊'
    },
    {
      id: 6,
      title: '⚡ ПРАВИЛО "НЕ ПЕРЕБИВАТЬ"',
      description: 'Если VAD обнаруживает речь во время TTS → tts.stop() → цикл начинается заново',
      color: 'from-red-500 to-red-600',
      icon: '🛑'
    },
  ];

  return (
    <div className="space-y-8">
      {/* Flow diagram */}
      <div className="bg-white/5 rounded-xl border border-white/10 p-6">
        <h3 className="text-xl font-bold text-white mb-6">Поток данных (Data Flow)</h3>

        <div className="flex flex-wrap items-center justify-center gap-3 text-sm">
          <FlowBox label="Микрофон" sublabel="AudioRecord 16kHz" color="bg-indigo-600" />
          <Arrow />
          <FlowBox label="VAD" sublabel="RMS порог" color="bg-purple-600" />
          <Arrow />
          <FlowBox label="STT" sublabel="SpeechRecognizer" color="bg-blue-600" />
          <Arrow />
          <FlowBox label="Ответ" sublabel="ResponseGenerator" color="bg-amber-600" />
          <Arrow />
          <FlowBox label="TTS" sublabel="TextToSpeech" color="bg-emerald-600" />
        </div>

        {/* Обратная связь */}
        <div className="mt-6 flex justify-center">
          <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-red-500/20 border border-red-500/30">
            <span className="text-red-400 text-sm">🔄</span>
            <span className="text-red-300 text-sm">VAD → TTS.stop() (прерывание при начале речи)</span>
          </div>
        </div>
      </div>

      {/* Step-by-step */}
      <div className="bg-white/5 rounded-xl border border-white/10 p-6">
        <h3 className="text-xl font-bold text-white mb-6">Пошаговая логика</h3>

        <div className="space-y-3">
          {steps.map((step) => (
            <div
              key={step.id}
              className={`rounded-xl border transition-all cursor-pointer ${
                activeStep === step.id
                  ? 'bg-white/10 border-white/20 shadow-lg'
                  : 'bg-white/[0.02] border-white/5 hover:bg-white/5'
              }`}
              onClick={() => setActiveStep(activeStep === step.id ? null : step.id)}
            >
              <div className="flex items-center gap-4 p-4">
                <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${step.color} flex items-center justify-center text-lg shrink-0`}>
                  {step.icon}
                </div>
                <div className="flex-1">
                  <h4 className="font-medium text-white">{step.title}</h4>
                  {activeStep === step.id && (
                    <p className="text-sm text-slate-400 mt-1">{step.description}</p>
                  )}
                </div>
                <div className="text-slate-500">
                  <svg className={`w-5 h-5 transition-transform ${activeStep === step.id ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Component responsibilities */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <ComponentCard
          title="VoiceEngine"
          role="Оркестратор"
          description="Управляет всем циклом: запускает/останавливает компоненты, координирует переходы между состояниями"
          methods={['startListening()', 'stopListening()', 'processResult()', 'speak()', 'monitorVad()']}
          color="indigo"
        />
        <ComponentCard
          title="VadDetector"
          role="Детектор речи"
          description="Анализирует RMS амплитуду аудио. Адаптивный порог подстраивается под фоновый шум за 2 секунды"
          methods={['calculateRms()', 'isVoiceActive()', 'setThreshold()', 'reset()']}
          color="purple"
        />
        <ComponentCard
          title="ResponseGenerator"
          role="Генератор ответов"
          description="Заглушка: принимает текст → возвращает ответ. Позже заменим на локальную LLM (llama.cpp / ONNX)"
          methods={['generateResponse()']}
          color="amber"
        />
        <ComponentCard
          title="MainScreen (UI)"
          role="Интерфейс"
          description="Compose UI: кнопка, статус, анимация волны. Реагирует на StateFlow из VoiceEngine"
          methods={['WaveVisualizer', 'ButtonIcon', 'getStatusText()']}
          color="emerald"
        />
      </div>

      {/* State machine */}
      <div className="bg-white/5 rounded-xl border border-white/10 p-6">
        <h3 className="text-xl font-bold text-white mb-4">Машина состояний</h3>
        <div className="flex flex-wrap items-center justify-center gap-4">
          <StateBadge state="IDLE" color="bg-slate-600" />
          <Arrow />
          <StateBadge state="LISTENING" color="bg-indigo-600" />
          <Arrow />
          <StateBadge state="THINKING" color="bg-amber-600" />
          <Arrow />
          <StateBadge state="SPEAKING" color="bg-emerald-600" />
          <Arrow />
          <StateBadge state="IDLE" color="bg-slate-600" />
        </div>
        <p className="text-center text-sm text-slate-400 mt-4">
          Из любого состояния → прерывание пользователем → возврат в LISTENING
        </p>
      </div>
    </div>
  );
}

function FlowBox({ label, sublabel, color }: { label: string; sublabel: string; color: string }) {
  return (
    <div className={`${color} rounded-lg px-4 py-3 text-center min-w-[100px]`}>
      <div className="font-semibold text-white text-sm">{label}</div>
      <div className="text-xs text-white/70">{sublabel}</div>
    </div>
  );
}

function Arrow() {
  return (
    <svg className="w-6 h-6 text-slate-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
    </svg>
  );
}

function StateBadge({ state, color }: { state: string; color: string }) {
  return (
    <div className={`${color} px-4 py-2 rounded-full text-sm font-mono font-bold text-white`}>
      {state}
    </div>
  );
}

function ComponentCard({ title, role, description, methods, color }: {
  title: string;
  role: string;
  description: string;
  methods: string[];
  color: string;
}) {
  const colorMap: Record<string, string> = {
    indigo: 'border-indigo-500/30 bg-indigo-500/5',
    purple: 'border-purple-500/30 bg-purple-500/5',
    amber: 'border-amber-500/30 bg-amber-500/5',
    emerald: 'border-emerald-500/30 bg-emerald-500/5',
  };
  const textColorMap: Record<string, string> = {
    indigo: 'text-indigo-400',
    purple: 'text-purple-400',
    amber: 'text-amber-400',
    emerald: 'text-emerald-400',
  };

  return (
    <div className={`rounded-xl border p-5 ${colorMap[color]}`}>
      <div className="flex items-center gap-2 mb-2">
        <h4 className={`font-bold ${textColorMap[color]}`}>{title}</h4>
        <span className="text-xs bg-white/10 px-2 py-0.5 rounded-full text-slate-400">{role}</span>
      </div>
      <p className="text-sm text-slate-300 mb-3">{description}</p>
      <div className="flex flex-wrap gap-1">
        {methods.map(m => (
          <code key={m} className="text-xs bg-black/30 px-2 py-1 rounded text-slate-400 font-mono">
            {m}
          </code>
        ))}
      </div>
    </div>
  );
}
