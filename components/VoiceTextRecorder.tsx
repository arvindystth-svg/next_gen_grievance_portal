"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Mic, MicOff, X, Loader2 } from "lucide-react";

interface VoiceTextRecorderProps {
  text: string;
  onTextChange: (text: string) => void;
  language: string;
}

const LANGUAGE_PLACEHOLDERS: Record<string, string> = {
  en: "Describe your grievance in detail... e.g., 'The water supply has been cut for 3 days in our area near Koramangala Bus Stand.'",
  kn: "ನಿಮ್ಮ ದೂರನ್ನು ವಿವರವಾಗಿ ಬರೆಯಿರಿ...",
  hi: "अपनी शिकायत विस्तार से लिखें...",
  ta: "உங்கள் புகாரை விரிவாக எழுதுங்கள்...",
  hin: "Apni complaint detail mein likhein...",
};

const SPEECH_LANG_MAP: Record<string, string> = {
  en: "en-IN",
  kn: "kn-IN",
  hi: "hi-IN",
  ta: "ta-IN",
  hin: "en-IN",
};

const MAX_WORDS = 1000;
const SARVAM_MAX_AUDIO_SEC = 30; // Sarvam REST API limit — refinement only for short clips

function countWords(value: string): number {
  return value.trim() ? value.trim().split(/\s+/).length : 0;
}

interface SpeechRecognitionResult {
  readonly isFinal: boolean;
  readonly length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
  readonly transcript: string;
  readonly confidence: number;
}

interface SpeechRecognitionResultList {
  readonly length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionEvent extends Event {
  readonly resultIndex: number;
  readonly results: SpeechRecognitionResultList;
}

interface SpeechRecognitionInstance extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: Event & { error?: string }) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}

type SpeechRecognitionConstructor = new () => SpeechRecognitionInstance;

function getSpeechRecognition(): SpeechRecognitionConstructor | null {
  if (typeof window === "undefined") return null;
  const w = window as Window & {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  };
  return w.SpeechRecognition || w.webkitSpeechRecognition || null;
}

export default function VoiceTextRecorder({
  text,
  onTextChange,
  language,
}: VoiceTextRecorderProps) {
  const [isListening, setIsListening] = useState(false);
  const [isRefining, setIsRefining] = useState(false);
  const [interimText, setInterimText] = useState("");
  const [speechError, setSpeechError] = useState<string | null>(null);

  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const baseTextRef = useRef("");
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const recordingSecondsRef = useRef(0);
  const intentionalStopRef = useRef(false);
  const textRef = useRef(text);

  useEffect(() => {
    textRef.current = text;
  }, [text]);

  const clearTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const stopMediaRecorder = useCallback(() => {
    clearTimer();
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    mediaRecorderRef.current = null;
  }, []);

  /** Background Sarvam refinement — does not block live text already shown */
  const refineWithSarvam = useCallback(
    async (blob: Blob, duration: number, liveText: string) => {
      // Sarvam REST API only supports ≤30s clips — skip silently for longer speech
      if (duration > SARVAM_MAX_AUDIO_SEC || blob.size < 1000 || duration < 1) return;

      setIsRefining(true);
      try {
        const formData = new FormData();
        formData.append("audio", blob, "recording.webm");
        formData.append("language", language);
        formData.append("duration", String(duration));

        const res = await fetch("/api/transcribe", { method: "POST", body: formData });
        const data = await res.json();

        if (res.ok && data.transcript?.trim()) {
          const base = baseTextRef.current;
          const sarvamText = data.transcript.trim();
          // Prefer Sarvam transcript if live capture was empty or very short
          if (!liveText.trim() || liveText.trim().length < sarvamText.length * 0.5) {
            const combined = base ? `${base} ${sarvamText}`.trim() : sarvamText;
            onTextChange(combined);
          }
        }
      } catch {
        // Non-fatal — live Web Speech text is already in the box
      } finally {
        setIsRefining(false);
      }
    },
    [language, onTextChange]
  );

  const stopListening = useCallback(() => {
    intentionalStopRef.current = true;
    stopMediaRecorder();

    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }

    setIsListening(false);
    setInterimText("");
  }, [stopMediaRecorder]);

  const startWebSpeech = useCallback(() => {
    const SpeechRecognition = getSpeechRecognition();
    if (!SpeechRecognition) {
      setSpeechError(
        "Voice input is not supported in this browser. Please type your grievance instead."
      );
      return false;
    }

    setSpeechError(null);
    baseTextRef.current = text.trim();
    intentionalStopRef.current = false;

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = SPEECH_LANG_MAP[language] || "en-IN";

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let sessionFinal = "";
      let sessionInterim = "";

      for (let i = 0; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          sessionFinal += transcript;
        } else {
          sessionInterim += transcript;
        }
      }

      setInterimText(sessionInterim);

      const parts = [baseTextRef.current, sessionFinal.trim(), sessionInterim.trim()].filter(
        Boolean
      );
      const next = parts.join(" ");
      // Allow up to MAX_WORDS — do not cut off mid-speech
      onTextChange(next);
    };

    recognition.onerror = (event) => {
      const err = (event as Event & { error?: string }).error;
      if (err === "not-allowed") {
        setSpeechError("Microphone permission denied. Please allow access to use voice input.");
        stopListening();
      } else if (err !== "aborted" && err !== "no-speech") {
        setSpeechError("Voice recognition error. Please try again or type your grievance.");
      }
    };

    recognition.onend = () => {
      if (!intentionalStopRef.current) {
        baseTextRef.current = textRef.current.trim();
        try {
          recognition.start();
          return;
        } catch {
          // cannot restart
        }
      }
      setIsListening(false);
      setInterimText("");
      recognitionRef.current = null;
    };

    recognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);
    return true;
  }, [text, language, onTextChange, stopListening]);

  const startListening = useCallback(async () => {
    const started = startWebSpeech();
    if (!started) return;

    // Record in parallel for optional Sarvam refinement on stop (audio not saved)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      chunksRef.current = [];
      recordingSecondsRef.current = 0;

      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        streamRef.current = null;

        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        const duration = recordingSecondsRef.current;

        // Brief delay so final Web Speech result lands before Sarvam refinement
        setTimeout(() => {
          if (blob.size > 0) {
            refineWithSarvam(blob, duration, textRef.current);
          }
        }, 400);
      };

      mediaRecorder.start(250);

      // Track duration only — no auto-stop; user controls when to finish
      timerRef.current = setInterval(() => {
        recordingSecondsRef.current += 1;
      }, 1000);
    } catch {
      // Mic already in use by speech recognition in some browsers — live STT still works
    }
  }, [startWebSpeech, stopListening, refineWithSarvam]);

  const toggleListening = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  useEffect(() => {
    return () => {
      intentionalStopRef.current = true;
      clearTimer();
      recognitionRef.current?.abort();
      if (mediaRecorderRef.current?.state !== "inactive") {
        mediaRecorderRef.current?.stop();
      }
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  useEffect(() => {
    if (isListening) stopListening();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [language]);

  const wordCount = countWords(text);

  return (
    <div className="space-y-2">
      <div className="flex gap-3 items-start">
        <div className="relative flex-1 min-w-0">
          <textarea
            value={text}
            onChange={(e) => onTextChange(e.target.value)}
            placeholder={LANGUAGE_PLACEHOLDERS[language] || LANGUAGE_PLACEHOLDERS.en}
            rows={5}
            className={`w-full px-4 py-3 text-sm border-2 rounded-xl focus:outline-none resize-none bg-white text-slate-800 placeholder-slate-400 transition-colors ${
              isListening
                ? "border-red-300 focus:border-red-400"
                : "border-slate-200 focus:border-blue-500"
            }`}
          />
          <div className="absolute bottom-3 right-3 flex items-center gap-2">
            {isListening && (
              <span className="text-xs text-red-500 font-medium animate-pulse">Listening…</span>
            )}
            {isRefining && (
              <span className="text-xs text-blue-600 font-medium flex items-center gap-1">
                <Loader2 size={10} className="animate-spin" />
                Refining…
              </span>
            )}
            <span className={`text-xs ${wordCount > MAX_WORDS ? "text-amber-600" : "text-slate-400"}`}>
              {wordCount}/{MAX_WORDS} words
            </span>
            {text.length > 0 && !isListening && (
              <button
                type="button"
                onClick={() => onTextChange("")}
                className="text-slate-400 hover:text-red-400 transition-colors"
                aria-label="Clear text"
              >
                <X size={12} />
              </button>
            )}
          </div>
        </div>

        <div className="flex flex-col items-center gap-1.5 pt-1 flex-shrink-0">
          <button
            type="button"
            onClick={toggleListening}
            className={`relative w-10 h-10 rounded-full flex items-center justify-center transition-all duration-200 focus:outline-none focus:ring-2 ${
              isListening
                ? "bg-red-500 hover:bg-red-600 focus:ring-red-200 recording-pulse text-white"
                : "bg-[#1a3c6e] hover:bg-[#2563eb] focus:ring-blue-200 text-white"
            }`}
            aria-label={isListening ? "Stop voice input" : "Start voice input"}
            title={isListening ? "Stop listening" : "Speak your grievance"}
          >
            {isListening ? <MicOff size={16} /> : <Mic size={16} />}
          </button>

          {isListening && (
            <div className="flex flex-col items-center gap-1">
              <div className="flex items-end gap-0.5 h-5">
                {[...Array(5)].map((_, i) => (
                  <span
                    key={i}
                    className="wave-bar"
                    style={{ animationDelay: `${i * 0.1}s`, width: "2px" }}
                  />
                ))}
              </div>
              <span className="text-[10px] text-red-500 font-medium">REC</span>
            </div>
          )}

          {!isListening && (
            <span className="text-[10px] text-slate-400 text-center leading-tight w-12">
              Tap to speak
            </span>
          )}
        </div>
      </div>

      {speechError && (
        <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
          {speechError}
        </p>
      )}

      {isListening && interimText && (
        <p className="text-xs text-slate-500 italic px-1">
          Recognizing: &ldquo;{interimText}&rdquo;
        </p>
      )}

      <p className="text-[10px] text-slate-400 px-1">
        Live voice-to-text · Speak freely (up to {MAX_WORDS} words) · Tap mic to stop · Audio is not saved
      </p>
    </div>
  );
}
