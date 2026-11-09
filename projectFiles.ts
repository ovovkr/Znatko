export interface ProjectFile {
  path: string;
  language: string;
  description: string;
  content: string;
}

export const projectFiles: ProjectFile[] = [
  {
    path: 'app/src/main/java/com/voiceassistant/MainActivity.kt',
    language: 'kotlin',
    description: 'Главная Activity — точка входа приложения',
    content: `package com.voiceassistant

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import com.voiceassistant.ui.MainScreen
import com.voiceassistant.ui.theme.VoiceAssistantTheme

/**
 * Главная Activity приложения.
 * Использует Jetpack Compose для UI.
 */
class MainActivity : ComponentActivity() {

    // Оркестратор голосового движка — живёт вместе с Activity
    private lateinit var voiceEngine: VoiceEngine

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()

        // Инициализируем голосовой движок
        voiceEngine = VoiceEngine(this)

        setContent {
            VoiceAssistantTheme {
                MainScreen(voiceEngine = voiceEngine)
            }
        }
    }

    override fun onDestroy() {
        super.onDestroy()
        // Освобождаем ресурсы при уничтожении Activity
        voiceEngine.release()
    }
}`
  },
  {
    path: 'app/src/main/java/com/voiceassistant/VoiceEngine.kt',
    language: 'kotlin',
    description: 'Оркестратор: микрофон → STT → ответ → TTS',
    content: `package com.voiceassistant

import android.Manifest
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.media.AudioFormat
import android.media.AudioRecord
import android.media.MediaRecorder
import android.os.Bundle
import android.speech.RecognitionListener
import android.speech.RecognizerIntent
import android.speech.SpeechRecognizer
import android.speech.tts.TextToSpeech
import android.speech.tts.UtteranceProgressListener
import androidx.core.content.ContextCompat
import kotlinx.coroutines.*
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import java.util.Locale

/**
 * Оркестратор голосового взаимодействия.
 * Управляет циклом: слушание → распознавание → генерация ответа → озвучивание.
 *
 * Ключевое правило: если пользователь начинает говорить во время TTS —
 * TTS немедленно останавливается (не перебиваем пользователя).
 */
class VoiceEngine(private val context: Context) {

    // ===== Состояния движка =====
    enum class State {
        IDLE,           // Ожидание нажатия
        LISTENING,      // Слушаем пользователя
        THINKING,       // Генерируем ответ
        SPEAKING        // Озвучиваем ответ
    }

    // Поток состояния для UI
    private val _state = MutableStateFlow(State.IDLE)
    val state: StateFlow<State> = _state

    // Поток RMS для анимации волны
    private val _rmsLevel = MutableStateFlow(0f)
    val rmsLevel: StateFlow<Float> = _rmsLevel

    // Поток распознанного текста
    private val _recognizedText = MutableStateFlow("")
    val recognizedText: StateFlow<String> = _recognizedText

    // ===== Компоненты =====
    private var audioRecord: AudioRecord? = null
    private var speechRecognizer: SpeechRecognizer? = null
    private var tts: TextToSpeech? = null
    private var vadDetector: VadDetector? = null
    private val responseGenerator = ResponseGenerator()

    // Coroutine scope для управления потоками
    private val scope = CoroutineScope(Dispatchers.Main + SupervisorJob())
    private var listeningJob: Job? = null

    // Флаг: TTS активен (нужен для прерывания)
    private var isTtsSpeaking = false

    // ===== Инициализация =====

    /**
     * Инициализация TTS. Вызывается из UI после проверки разрешений.
     */
    fun initializeTts() {
        tts = TextToSpeech(context) { status ->
            if (status == TextToSpeech.SUCCESS) {
                // Устанавливаем русский язык
                val result = tts?.setLanguage(Locale("ru"))
                if (result == TextToSpeech.LANG_MISSING_DATA ||
                    result == TextToSpeech.LANG_NOT_SUPPORTED) {
                    // Предложить установить офлайн-пакет
                    context.startActivity(Intent(TextToSpeech.Engine.ACTION_TTS_SETTINGS))
                }
                // Уменьшаем скорость для лучшей разборчивости
                tts?.setSpeechRate(0.9f)
            }
        }
    }

    /**
     * Запуск цикла распознавания речи.
     * Вызывается по нажатию кнопки.
     */
    fun startListening() {
        if (!hasAudioPermission()) return

        // Если TTS говорит — останавливаем и начинаем заново
        if (isTtsSpeaking) {
            stopTts()
        }

        _state.value = State.LISTENING
        _recognizedText.value = ""

        // Инициализируем VAD
        vadDetector = VadDetector()

        // Запускаем AudioRecord для VAD
        startAudioRecord()

        // Запускаем SpeechRecognizer
        startSpeechRecognition()

        // Запускаем мониторинг VAD в фоне
        listeningJob = scope.launch {
            monitorVad()
        }
    }

    /**
     * Остановка всех процессов.
     */
    fun stopListening() {
        listeningJob?.cancel()
        stopAudioRecord()
        speechRecognizer?.stopListening()
        _state.value = State.IDLE
    }

    // ===== AudioRecord для VAD =====

    private fun startAudioRecord() {
        val bufferSize = AudioRecord.getMinBufferSize(
            16000,
            AudioFormat.CHANNEL_IN_MONO,
            AudioFormat.ENCODING_PCM_16BIT
        )

        if (ContextCompat.checkSelfPermission(context, Manifest.permission.RECORD_AUDIO)
            != PackageManager.PERMISSION_GRANTED) {
            return
        }

        audioRecord = AudioRecord(
            MediaRecorder.AudioSource.VOICE_RECOGNITION,
            16000,          // Частота дискретизации 16kHz
            AudioFormat.CHANNEL_IN_MONO,
            AudioFormat.ENCODING_PCM_16BIT,
            bufferSize
        )

        audioRecord?.startRecording()
    }

    private fun stopAudioRecord() {
        audioRecord?.stop()
        audioRecord?.release()
        audioRecord = null
    }

    // ===== SpeechRecognizer =====

    private fun startSpeechRecognition() {
        speechRecognizer = SpeechRecognizer.createSpeechRecognizer(context)
        speechRecognizer?.setRecognitionListener(object : RecognitionListener {

            override fun onResults(results: Bundle?) {
                // Распознавание завершено — получаем финальный текст
                val matches = results?.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION)
                val text = matches?.firstOrNull() ?: ""
                _recognizedText.value = text

                // Останавливаем запись
                stopAudioRecord()
                listeningJob?.cancel()

                // Переходим к генерации ответа
                processResult(text)
            }

            override fun onPartialResults(partialResults: Bundle?) {
                // Промежуточные результаты (для live-отображения)
                val matches = partialResults?.getStringArrayList(
                    SpeechRecognizer.RESULTS_RECOGNITION
                )
                matches?.firstOrNull()?.let {
                    _recognizedText.value = it
                }
            }

            override fun onError(error: Int) {
                // Ошибка распознавания — возвращаемся в IDLE
                _state.value = State.IDLE
                stopAudioRecord()
            }

            // Остальные методы — заглушки
            override fun onReadyForSpeech(params: Bundle?) {}
            override fun onBeginningOfSpeech() {}
            override fun onRmsChanged(rmsdB: Float) {}
            override fun onBufferReceived(buffer: ByteArray?) {}
            override fun onEndOfSpeech() {}
            override fun onEvent(eventType: Int, params: Bundle?) {}
        })

        // Настройки Intent для офлайн-распознавания
        val intent = Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH).apply {
            putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL,
                RecognizerIntent.LANGUAGE_MODEL_FREE_FORM)
            putExtra(RecognizerIntent.EXTRA_LANGUAGE, "ru-RU")
            putExtra(RecognizerIntent.EXTRA_PREFER_OFFLINE, true)  // Приоритет офлайн-пакетам
            putExtra(RecognizerIntent.EXTRA_PARTIAL_RESULTS, true) // Промежуточные результаты
            putExtra(RecognizerIntent.EXTRA_MAX_RESULTS, 1)
        }

        speechRecognizer?.startListening(intent)
    }

    // ===== Мониторинг VAD =====

    /**
     * Анализирует RMS каждые 50мс.
     * Если тишина > 1.5 секунды — останавливаем распознавание.
     * Если пользователь говорит во время TTS — прерываем TTS.
     */
    private suspend fun monitorVad() {
        val buffer = ShortArray(1600) // 100мс при 16kHz
        var silenceStartTime = 0L
        val SILENCE_THRESHOLD_MS = 1500L // 1.5 секунды тишины = конец речи

        while (isActive()) {
            delay(50) // Проверка каждые 50мс

            val readCount = audioRecord?.read(buffer, 0, buffer.size) ?: 0
            if (readCount <= 0) continue

            // Вычисляем RMS
            val rms = vadDetector?.calculateRms(buffer, readCount) ?: 0f
            _rmsLevel.value = rms

            val isSpeaking = vadDetector?.isVoiceActive(rms) ?: false

            if (isSpeaking) {
                silenceStartTime = 0L // Сбрасываем таймер тишины

                // КРИТИЧНО: если TTS говорит и пользователь начал — прерываем!
                if (isTtsSpeaking) {
                    stopTts()
                    _state.value = State.LISTENING
                }
            } else {
                // Тишина — запускаем таймер
                if (silenceStartTime == 0L) {
                    silenceStartTime = System.currentTimeMillis()
                }

                // Если тишина длится > 1.5 сек — конец речи
                if (_state.value == State.LISTENING &&
                    System.currentTimeMillis() - silenceStartTime > SILENCE_THRESHOLD_MS) {
                    // Останавливаем распознавание (onResults вызовется)
                    speechRecognizer?.stopListening()
                    stopAudioRecord()
                }
            }
        }
    }

    private fun isActive(): Boolean {
        return _state.value == State.LISTENING || _state.value == State.SPEAKING
    }

    // ===== Обработка результата =====

    private fun processResult(text: String) {
        if (text.isBlank()) {
            _state.value = State.IDLE
            return
        }

        _state.value = State.THINKING

        // Генерируем ответ (пока заглушка, позже заменим на LLM)
        scope.launch {
            val response = responseGenerator.generateResponse(text)

            // Озвучиваем
            _state.value = State.SPEAKING
            speak(response)
        }
    }

    // ===== TTS (Text-to-Speech) =====

    private fun speak(text: String) {
        isTtsSpeaking = true

        tts?.setOnUtteranceProgressListener(object : UtteranceProgressListener() {
            override fun onStart(utteranceId: String?) {
                isTtsSpeaking = true
            }

            override fun onDone(utteranceId: String?) {
                isTtsSpeaking = false
                _state.value = State.IDLE
                _rmsLevel.value = 0f
            }

            @Deprecated("Deprecated in Java")
            override fun onError(utteranceId: String?) {
                isTtsSpeaking = false
                _state.value = State.IDLE
            }
        })

        val params = Bundle().apply {
            putInt(TextToSpeech.Engine.KEY_PARAM_STREAM,
                android.media.AudioManager.STREAM_MUSIC)
        }

        tts?.speak(text, TextToSpeech.QUEUE_FLUSH, params, "voice_response")
    }

    private fun stopTts() {
        tts?.stop()
        isTtsSpeaking = false
    }

    // ===== Утилиты =====

    private fun hasAudioPermission(): Boolean {
        return ContextCompat.checkSelfPermission(
            context, Manifest.permission.RECORD_AUDIO
        ) == PackageManager.PERMISSION_GRANTED
    }

    /**
     * Освобождение всех ресурсов.
     */
    fun release() {
        scope.cancel()
        stopAudioRecord()
        speechRecognizer?.destroy()
        tts?.stop()
        tts?.shutdown()
    }
}`
  },
  {
    path: 'app/src/main/java/com/voiceassistant/VadDetector.kt',
    language: 'kotlin',
    description: 'Детектор голосовой активности по RMS амплитуде',
    content: `package com.voiceassistant

import kotlin.math.sqrt

/**
 * Детектор голосовой активности (Voice Activity Detector).
 * Работает на основе RMS (Root Mean Square) амплитуды аудиосигнала.
 *
 * Принцип: вычисляем среднеквадратичную амплитуду буфера сэмплов.
 * Если RMS выше порога — считаем, что пользователь говорит.
 *
 * Это самый простой подход к VAD, не требует ML-моделей.
 * Для продакшена можно заменить на WebRTC VAD или Silero VAD.
 */
class VadDetector {

    /**
     * Порог RMS для определения голосовой активности.
     * Значение подобрано эмпирически для 16-bit PCM.
     *
     * Шкала RMS для Short (16-bit):
     * - 0-100: полная тишина / фоновый шум
     * - 100-500: тихий звук
     * - 500-2000: нормальная речь на расстоянии ~30см
     * - 2000+: громкая речь / близко к микрофону
     */
    private var threshold: Float = 500f

    /**
     * Адаптивный порог — подстраивается под фоновый шум.
     * Первые 2 секунды работы считаем "фоновый уровень".
     */
    private var adaptiveThreshold: Float = 500f
    private var sampleCount = 0
    private var noiseFloorSum = 0f
    private val ADAPTATION_SAMPLES = 40 // 40 * 50мс = 2 секунды

    /**
     * Вычисляет RMS амплитуду для буфера аудиосэмплов.
     *
     * @param buffer Массив сэмплов (16-bit PCM, Short)
     * @param readCount Количество валидных сэмплов в буфере
     * @return RMS значение (0.0 — тишина, ~30000 — максимальная громкость)
     */
    fun calculateRms(buffer: ShortArray, readCount: Int): Float {
        if (readCount == 0) return 0f

        var sumOfSquares = 0.0
        for (i in 0 until readCount) {
            val sample = buffer[i].toFloat()
            sumOfSquares += (sample * sample).toDouble()
        }

        val rms = sqrt(sumOfSquares / readCount).toFloat()

        // Адаптация порога в первые 2 секунды
        if (sampleCount < ADAPTATION_SAMPLES) {
            noiseFloorSum += rms
            sampleCount++
            if (sampleCount == ADAPTATION_SAMPLES) {
                // Устанавливаем порог = 3x от среднего шума
                val avgNoise = noiseFloorSum / ADAPTATION_SAMPLES
                adaptiveThreshold = (avgNoise * 3f).coerceAtLeast(300f)
                threshold = adaptiveThreshold
            }
        }

        return rms
    }

    /**
     * Определяет, активна ли голосовая активность.
     *
     * @param rms Текущее значение RMS
     * @return true если пользователь говорит
     */
    fun isVoiceActive(rms: Float): Boolean {
        return rms > threshold
    }

    /**
     * Ручная установка порога (если адаптация не подходит).
     */
    fun setThreshold(value: Float) {
        threshold = value
    }

    /**
     * Получение текущего порога (для отладки).
     */
    fun getThreshold(): Float = threshold

    /**
     * Сброс адаптации (например, при новом запуске).
     */
    fun reset() {
        sampleCount = 0
        noiseFloorSum = 0f
        threshold = 500f
    }
}`
  },
  {
    path: 'app/src/main/java/com/voiceassistant/ResponseGenerator.kt',
    language: 'kotlin',
    description: 'Генератор ответов (заглушка, позже заменим на LLM)',
    content: `package com.voiceassistant

/**
 * Генератор ответов на распознанную речь.
 *
 * Текущая версия — заглушка (эхо + подтверждение).
 * В будущем здесь будет подключение к локальной LLM
 * (например, llama.cpp через JNI или ONNX Runtime).
 *
 * Интерфейс простой: принимает текст пользователя → возвращает ответ.
 * Это позволит легко заменить реализацию без изменения остального кода.
 */
class ResponseGenerator {

    /**
     * Генерирует ответ на распознанный текст.
     *
     * @param userText Текст, распознанный из речи пользователя
     * @return Ответ, который будет озвучен через TTS
     */
    fun generateResponse(userText: String): String {
        // Пока просто эхо — подтверждение что мы услышали
        return when {
            userText.isBlank() -> "Я не расслышала. Повтори, пожалуйста."

            // Простые команды для демонстрации
            userText.contains("привет", ignoreCase = true) ||
            userText.contains("здравствуй", ignoreCase = true) ->
                "Привет! Я твой голосовой помощник. Чем могу помочь?"

            userText.contains("как дела", ignoreCase = true) ->
                "У меня всё отлично, спасибо! Я работаю полностью офлайн."

            userText.contains("время", ignoreCase = true) -> {
                val now = java.time.LocalTime.now()
                "Сейчас " + now.hour + " часов " + now.minute + " минут."
            }

            userText.contains("дата", ignoreCase = true) ||
            userText.contains("какой день", ignoreCase = true) -> {
                val today = java.time.LocalDate.now()
                "Сегодня " + today.dayOfMonth + " " + getMonthName(today.monthValue) + " " + today.year + " года."
            }

            userText.contains("стоп", ignoreCase = true) ||
            userText.contains("хватит", ignoreCase = true) ->
                "Хорошо, замолкаю."

            // По умолчанию — эхо
            else -> "Ты сказал: " + userText + ". Я тебя слышу. В будущем здесь будет полноценный ИИ-ответ."
        }
    }

    /**
     * Возвращает название месяца по номеру.
     */
    private fun getMonthName(month: Int): String {
        return when (month) {
            1 -> "января"
            2 -> "февраля"
            3 -> "марта"
            4 -> "апреля"
            5 -> "мая"
            6 -> "июня"
            7 -> "июля"
            8 -> "августа"
            9 -> "сентября"
            10 -> "октября"
            11 -> "ноября"
            12 -> "декабря"
            else -> ""
        }
    }
}`
  },
  {
    path: 'app/src/main/java/com/voiceassistant/ui/MainScreen.kt',
    language: 'kotlin',
    description: 'Compose UI: кнопка + текст статуса + анимация волны',
    content: `package com.voiceassistant.ui

import android.Manifest
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.animation.core.*
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.scale
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.voiceassistant.VoiceEngine
import kotlinx.coroutines.flow.collectLatest

/**
 * Главный экран приложения.
 * Содержит:
 * - Кнопку управления (большая, круглая, по центру)
 * - Индикатор состояния (текст + анимация)
 * - Визуализацию уровня звука (волна)
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun MainScreen(voiceEngine: VoiceEngine) {
    // Запрашиваем разрешение на микрофон
    val permissionLauncher = rememberLauncherForActivityResult(
        ActivityResultContracts.RequestPermission()
    ) { isGranted ->
        if (isGranted) {
            voiceEngine.initializeTts()
        }
    }

    // Запрашиваем разрешение при первом запуске
    LaunchedEffect(Unit) {
        permissionLauncher.launch(Manifest.permission.RECORD_AUDIO)
    }

    // Наблюдаем за состоянием движка
    val currentState by voiceEngine.state.collectAsState()
    val rmsLevel by voiceEngine.rmsLevel.collectAsState()
    val recognizedText by voiceEngine.recognizedText.collectAsState()

    // Анимация пульсации для кнопки
    val infiniteTransition = rememberInfiniteTransition(label = "pulse")
    val pulseScale by infiniteTransition.animateFloat(
        initialValue = 1f,
        targetValue = if (currentState == VoiceEngine.State.LISTENING) 1.15f else 1f,
        animationSpec = infiniteRepeatable(
            animation = tween(800, easing = EaseInOutSine),
            repeatMode = RepeatMode.Reverse
        ),
        label = "pulseScale"
    )

    // Анимация волны (для визуализации RMS)
    val wavePhase by infiniteTransition.animateFloat(
        initialValue = 0f,
        targetValue = 360f,
        animationSpec = infiniteRepeatable(
            animation = linearRepeatable(2000),
            repeatMode = RepeatMode.Restart
        ),
        label = "wavePhase"
    )

    // Основной контейнер
    Scaffold(
        containerColor = MaterialTheme.colorScheme.background
    ) { padding ->
        Box(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .background(
                    Brush.verticalGradient(
                        colors = listOf(
                            Color(0xFF0F172A), // slate-900
                            Color(0xFF1E1B4B), // indigo-950
                        )
                    )
                ),
            contentAlignment = Alignment.Center
        ) {
            Column(
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.Center,
                modifier = Modifier.padding(32.dp)
            ) {
                // ===== Статус =====
                Text(
                    text = getStatusText(currentState),
                    fontSize = 22.sp,
                    fontWeight = FontWeight.Medium,
                    color = getStatusColor(currentState),
                    textAlign = TextAlign.Center
                )

                Spacer(modifier = Modifier.height(16.dp))

                // ===== Визуализация волны (при слушании) =====
                if (currentState == VoiceEngine.State.LISTENING ||
                    currentState == VoiceEngine.State.SPEAKING) {
                    WaveVisualizer(
                        rmsLevel = rmsLevel,
                        phase = wavePhase,
                        isActive = currentState == VoiceEngine.State.LISTENING,
                        modifier = Modifier
                            .size(200.dp)
                            .padding(16.dp)
                    )
                } else {
                    Spacer(modifier = Modifier.height(200.dp))
                }

                Spacer(modifier = Modifier.height(24.dp))

                // ===== Кнопка =====
                Box(
                    modifier = Modifier
                        .size(120.dp)
                        .scale(if (currentState == VoiceEngine.State.LISTENING) pulseScale else 1f)
                        .clip(CircleShape)
                        .background(
                            Brush.radialGradient(
                                colors = getButtonColors(currentState)
                            )
                        )
                        .clickable(
                            interactionSource = remember { MutableInteractionSource() },
                            indication = null
                        ) {
                            when (currentState) {
                                VoiceEngine.State.IDLE -> voiceEngine.startListening()
                                VoiceEngine.State.LISTENING -> voiceEngine.stopListening()
                                VoiceEngine.State.SPEAKING -> {
                                    // Принудительная остановка TTS
                                    voiceEngine.stopListening()
                                }
                                else -> {} // THINKING — не реагируем
                            }
                        },
                    contentAlignment = Alignment.Center
                ) {
                    // Иконка внутри кнопки
                    ButtonIcon(state = currentState)
                }

                Spacer(modifier = Modifier.height(32.dp))

                // ===== Распознанный текст =====
                if (recognizedText.isNotBlank()) {
                    Card(
                        modifier = Modifier.fillMaxWidth(),
                        colors = CardDefaults.cardColors(
                            containerColor = Color.White.copy(alpha = 0.05f)
                        ),
                        shape = RoundedCornerShape(16.dp)
                    ) {
                        Text(
                            text = "\\u00AB" + recognizedText + "\\u00BB",
                            modifier = Modifier.padding(20.dp),
                            fontSize = 16.sp,
                            color = Color.White.copy(alpha = 0.8f),
                            textAlign = TextAlign.Center,
                            lineHeight = 24.sp
                        )
                    }
                }
            }
        }
    }
}

/**
 * Визуализация звуковой волны на Canvas.
 */
@Composable
fun WaveVisualizer(
    rmsLevel: Float,
    phase: Float,
    isActive: Boolean,
    modifier: Modifier = Modifier
) {
    val normalizedLevel = (rmsLevel / 3000f).coerceIn(0f, 1f)
    val color = if (isActive) Color(0xFF818CF8) else Color(0xFF34D399) // indigo or emerald

    Canvas(modifier = modifier) {
        val centerX = size.width / 2
        val centerY = size.height / 2
        val maxRadius = size.minDimension / 2

        // Рисуем концентрические круги (волны)
        for (i in 0 until 4) {
            val baseRadius = maxRadius * (0.3f + i * 0.2f)
            val amplitude = normalizedLevel * maxRadius * 0.15f
            val radius = baseRadius + amplitude *
                kotlin.math.sin(Math.toRadians((phase + i * 90).toDouble())).toFloat()

            val alpha = (1f - i * 0.25f) * (0.3f + normalizedLevel * 0.7f)

            drawCircle(
                color = color.copy(alpha = alpha),
                radius = radius.coerceAtLeast(10f),
                center = Offset(centerX, centerY),
                style = Stroke(width = 3f)
            )
        }

        // Центральный круг (индикатор)
        val centerRadius = 20f + normalizedLevel * 30f
        drawCircle(
            color = color.copy(alpha = 0.6f),
            radius = centerRadius,
            center = Offset(centerX, centerY)
        )
    }
}

/**
 * Иконка кнопки в зависимости от состояния.
 */
@Composable
fun ButtonIcon(state: VoiceEngine.State) {
    val icon = when (state) {
        VoiceEngine.State.IDLE -> "\\uD83C\\uDFA4"
        VoiceEngine.State.LISTENING -> "\\u23F9"
        VoiceEngine.State.THINKING -> "\\uD83D\\uDCAD"
        VoiceEngine.State.SPEAKING -> "\\uD83D\\uDD0A"
    }

    Text(
        text = icon,
        fontSize = 40.sp
    )
}

// ===== Утилиты для UI =====

private fun getStatusText(state: VoiceEngine.State): String = when (state) {
    VoiceEngine.State.IDLE -> "Нажми, чтобы начать"
    VoiceEngine.State.LISTENING -> "Слушаю..."
    VoiceEngine.State.THINKING -> "Думаю..."
    VoiceEngine.State.SPEAKING -> "Говорю..."
}

private fun getStatusColor(state: VoiceEngine.State): Color = when (state) {
    VoiceEngine.State.IDLE -> Color.White.copy(alpha = 0.7f)
    VoiceEngine.State.LISTENING -> Color(0xFF818CF8) // indigo-400
    VoiceEngine.State.THINKING -> Color(0xFFFBBF24) // amber-400
    VoiceEngine.State.SPEAKING -> Color(0xFF34D399) // emerald-400
}

private fun getButtonColors(state: VoiceEngine.State): List<Color> = when (state) {
    VoiceEngine.State.IDLE -> listOf(Color(0xFF6366F1), Color(0xFF4F46E5)) // indigo
    VoiceEngine.State.LISTENING -> listOf(Color(0xFF818CF8), Color(0xFF6366F1)) // indigo light
    VoiceEngine.State.THINKING -> listOf(Color(0xFFFBBF24), Color(0xFFF59E0B)) // amber
    VoiceEngine.State.SPEAKING -> listOf(Color(0xFF34D399), Color(0xFF10B981)) // emerald
}`
  },
  {
    path: 'app/build.gradle.kts',
    language: 'kotlin',
    description: 'Build-конфигурация модуля app',
    content: `plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}

android {
    namespace = "com.voiceassistant"
    compileSdk = 34

    defaultConfig {
        applicationId = "com.voiceassistant"
        minSdk = 26  // Android 8.0+ для офлайн TTS
        targetSdk = 34
        versionCode = 1
        versionName = "1.0"
    }

    buildTypes {
        release {
            isMinifyEnabled = false
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro"
            )
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    kotlinOptions {
        jvmTarget = "17"
    }

    buildFeatures {
        compose = true
    }

    composeOptions {
        kotlinCompilerExtensionVersion = "1.5.8"
    }
}

dependencies {
    // ===== Jetpack Compose =====
    val composeBom = platform("androidx.compose:compose-bom:2024.02.00")
    implementation(composeBom)

    implementation("androidx.compose.material3:material3")
    implementation("androidx.compose.ui:ui")
    implementation("androidx.compose.ui:ui-tooling-preview")
    implementation("androidx.compose.foundation:foundation")
    implementation("androidx.compose.animation:animation")

    // Activity Compose
    implementation("androidx.activity:activity-compose:1.8.2")

    // ===== Lifecycle =====
    implementation("androidx.lifecycle:lifecycle-runtime-compose:2.7.0")
    implementation("androidx.lifecycle:lifecycle-viewmodel-compose:2.7.0")

    // ===== Coroutines =====
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-android:1.7.3")

    // ===== Core =====
    implementation("androidx.core:core-ktx:1.12.0")
    implementation("androidx.appcompat:appcompat:1.6.1")

    // Debug
    debugImplementation("androidx.compose.ui:ui-tooling")
}`
  },
  {
    path: 'app/src/main/AndroidManifest.xml',
    language: 'xml',
    description: 'Манифест приложения с разрешениями',
    content: `<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android">

    <!-- Разрешение на запись с микрофона (обязательно!) -->
    <uses-permission android:name="android.permission.RECORD_AUDIO" />

    <!-- Для работы офлайн-распознавания -->
    <uses-permission android:name="android.permission.INTERNET" />

    <application
        android:allowBackup="true"
        android:icon="@mipmap/ic_launcher"
        android:label="Voice Assistant"
        android:roundIcon="@mipmap/ic_launcher_round"
        android:supportsRtl="true"
        android:theme="@style/Theme.VoiceAssistant">

        <activity
            android:name=".MainActivity"
            android:exported="true"
            android:screenOrientation="portrait"
            android:theme="@style/Theme.VoiceAssistant">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
        </activity>
    </application>

</manifest>`
  }
];
