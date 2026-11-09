export default function SetupGuide() {
  return (
    <div className="space-y-8">
      {/* Шаг 1 */}
      <section className="bg-white/5 rounded-xl border border-white/10 p-6">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-full bg-indigo-600 flex items-center justify-center text-lg font-bold shrink-0">
            1
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-white mb-2">Создай проект в Android Studio</h3>
            <div className="text-slate-300 space-y-2">
              <p>Открой Android Studio → <code className="bg-white/10 px-2 py-0.5 rounded text-indigo-300">New Project</code> → <code className="bg-white/10 px-2 py-0.5 rounded text-indigo-300">Empty Activity (Compose)</code></p>
              <ul className="list-disc list-inside space-y-1 text-sm text-slate-400 mt-2">
                <li>Package name: <code className="text-indigo-300">com.voiceassistant</code></li>
                <li>Minimum SDK: <code className="text-indigo-300">API 26 (Android 8.0)</code></li>
                <li>Language: <code className="text-indigo-300">Kotlin</code></li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Шаг 2 */}
      <section className="bg-white/5 rounded-xl border border-white/10 p-6">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-full bg-indigo-600 flex items-center justify-center text-lg font-bold shrink-0">
            2
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-white mb-2">Замени файлы проекта</h3>
            <div className="text-slate-300 space-y-2">
              <p>Скопируй файлы из вкладки "Код проекта" в соответствующие пути:</p>
              <div className="bg-black/30 rounded-lg p-4 mt-3 font-mono text-sm">
                <div className="text-slate-400">app/src/main/java/com/voiceassistant/</div>
                <div className="text-green-400 ml-4">├── MainActivity.kt</div>
                <div className="text-green-400 ml-4">├── VoiceEngine.kt</div>
                <div className="text-green-400 ml-4">├── VadDetector.kt</div>
                <div className="text-green-400 ml-4">├── ResponseGenerator.kt</div>
                <div className="text-green-400 ml-4">└── ui/</div>
                <div className="text-green-400 ml-8">└── MainScreen.kt</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Шаг 3 */}
      <section className="bg-white/5 rounded-xl border border-white/10 p-6">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-full bg-indigo-600 flex items-center justify-center text-lg font-bold shrink-0">
            3
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-white mb-2">Установи офлайн-пакеты на телефоне</h3>
            <div className="text-slate-300 space-y-3">
              <p className="font-medium text-amber-400">⚠️ Это критично! Без пакетов ничего не заработает офлайн.</p>

              <div className="bg-white/5 rounded-lg p-4 space-y-3">
                <div>
                  <h4 className="font-semibold text-white mb-1">📝 Распознавание речи (STT)</h4>
                  <p className="text-sm text-slate-400">
                    Настройки телефона → Система → Язык и ввод → Голосовой ввод →
                    Распознавание речи от Google → Языки → <span className="text-indigo-300">Русский</span> →
                    Загрузить пакет (значок загрузки)
                  </p>
                </div>
                <div className="border-t border-white/10 pt-3">
                  <h4 className="font-semibold text-white mb-1">🔊 Синтез речи (TTS)</h4>
                  <p className="text-sm text-slate-400">
                    Настройки → Специальные возможности → Синтез речи →
                    Google Преобразование текста в речь → Настройки →
                    Голос → <span className="text-indigo-300">Русский</span> →
                    Загрузить голосовые данные
                  </p>
                </div>
              </div>

              <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-4">
                <p className="text-sm text-emerald-300">
                  💡 <strong>Альтернатива:</strong> при первом запуске приложение само откроет настройки TTS,
                  если русский голос не найден.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Шаг 4 */}
      <section className="bg-white/5 rounded-xl border border-white/10 p-6">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-full bg-indigo-600 flex items-center justify-center text-lg font-bold shrink-0">
            4
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-white mb-2">Запусти на устройстве</h3>
            <div className="text-slate-300 space-y-2">
              <p>Подключи Android-телефон по USB (с включённой отладкой) или используй эмулятор.</p>
              <p>Нажми <code className="bg-white/10 px-2 py-0.5 rounded text-indigo-300">▶ Run</code> в Android Studio.</p>
              <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 mt-3">
                <p className="text-sm text-amber-300">
                  ⚠️ Эмулятор не поддерживает микрофон полноценно — тестируй на реальном устройстве!
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Шаг 5 */}
      <section className="bg-white/5 rounded-xl border border-white/10 p-6">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-full bg-indigo-600 flex items-center justify-center text-lg font-bold shrink-0">
            5
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-white mb-2">Проверь работу</h3>
            <div className="text-slate-300 space-y-2">
              <ol className="list-decimal list-inside space-y-2">
                <li>При первом запуске разреши доступ к микрофону</li>
                <li>Нажми большую круглую кнопку</li>
                <li>Скажи что-нибудь, например: <em className="text-indigo-300">"Привет"</em></li>
                <li>Подожди 1.5 секунды тишины — распознавание завершится</li>
                <li>Приложение озвучит ответ через TTS</li>
                <li>Если начнёшь говорить во время ответа — TTS остановится</li>
              </ol>
            </div>
          </div>
        </div>
      </section>

      {/* Troubleshooting */}
      <section className="bg-white/5 rounded-xl border border-white/10 p-6">
        <h3 className="text-lg font-semibold text-white mb-4">🔧 Решение проблем</h3>
        <div className="space-y-3 text-sm">
          <div className="flex items-start gap-3">
            <span className="text-red-400">❌</span>
            <div>
              <p className="text-white font-medium">"Нет распознавания речи"</p>
              <p className="text-slate-400">→ Установи офлайн-пакет русского языка (шаг 3)</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <span className="text-red-400">❌</span>
            <div>
              <p className="text-white font-medium">"TTS не говорит"</p>
              <p className="text-slate-400">→ Настройки → TTS → выбери Google → загрузи русский голос</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <span className="text-red-400">❌</span>
            <div>
              <p className="text-white font-medium">"VAD не реагирует на голос"</p>
              <p className="text-slate-400">→ Проверь разрешение на микрофон. Порог адаптивный — первые 2 сек калибруется</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <span className="text-red-400">❌</span>
            <div>
              <p className="text-white font-medium">"Слишком рано обрезает речь"</p>
              <p className="text-slate-400">→ Увеличь SILENCE_THRESHOLD_MS в VoiceEngine.kt (сейчас 1500мс)</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
