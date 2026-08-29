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

const MAX_RECORDING_SEC = 30; // Sarvam REST API limit

// Web Speech API fallback types
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
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [speechError, setSpeechError] = useState<string | null>(null);
  const [usingFallback, setUsingFallback] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const recordingSecondsRef = useRef(0);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const baseTextRef = useRef("");

  const clearTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const stopWebSpeech = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setUsingFallback(false);
  }, []);

  const stopRecording = useCallback(() => {
    clearTimer();
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    } else {
      setIsRecording(false);
    }
  }, []);

  const transcribeWithSarvam = useCallback(
    async (blob: Blob, duration: number) => {
      setIsTranscribing(true);
      setSpeechError(null);

      try {
        const formData = new FormData();
        formData.append("audio", blob, "recording.webm");
        formData.append("language", language);
        formData.append("duration", String(duration));

        const res = await fetch("/api/transcribe", { method: "POST", body: formData });
        const data = await res.json();

        if (res.ok && data.transcript) {
          const base = baseTextRef.current;
          const combined = base
            ? `${base} ${data.transcript}`.trim()
            : data.transcript.trim();
          onTextChange(combined);
          return;
        }

        // Sarvam unavailable — fall back to browser speech recognition
        throw new Error(data.error || "Sarvam transcription unavailable");
      } catch {
        const SpeechRecognition = getSpeechRecognition();
        if (!SpeechRecognition) {
          setSpeechError(
            "Voice transcription failed. Please type your grievance instead."
          );
          return;
        }

        setUsingFallback(true);
        setSpeechError(
          "Sarvam unavailable — using browser voice recognition. Speak now…"
        );

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

          const parts = [baseTextRef.current, sessionFinal.trim(), sessionInterim.trim()].filter(
            Boolean
          );
          onTextChange(parts.join(" "));
        };

        recognition.onerror = () => {
          setSpeechError("Voice recognition failed. Please type your grievance.");
          stopWebSpeech();
        };

        recognition.onend = () => {
          setUsingFallback(false);
          recognitionRef.current = null;
        };

        recognitionRef.current = recognition;
        recognition.start();
      } finally {
        setIsTranscribing(false);
      }
    },
    [language, onTextChange, stopWebSpeech]
  );

  const startRecording = useCallback(async () => {
    setSpeechError(null);
    baseTextRef.current = text.trim();
    stopWebSpeech();

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      chunksRef.current = [];

      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
        setIsRecording(false);

        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        if (blob.size > 0) {
          transcribeWithSarvam(blob, recordingSecondsRef.current);
        }
      };

      mediaRecorder.start(250);
      setIsRecording(true);
      setRecordingSeconds(0);
      recordingSecondsRef.current = 0;

      timerRef.current = setInterval(() => {
        recordingSecondsRef.current += 1;
        setRecordingSeconds(recordingSecondsRef.current);
        if (recordingSecondsRef.current >= MAX_RECORDING_SEC) {
          stopRecording();
        }
      }, 1000);
    } catch {
      setSpeechError(
        "Microphone permission denied. Please allow access to use voice input."
      );
    }
  }, [text, stopRecording, stopWebSpeech, transcribeWithSarvam]);

  const toggleListening = () => {
    if (isTranscribing) return;
    if (isRecording) {
      stopRecording();
    } else if (usingFallback) {
      stopWebSpeech();
    } else {
      startRecording();
    }
  };

  useEffect(() => {
    return () => {
      clearTimer();
      if (mediaRecorderRef.current?.state !== "inactive") {
        mediaRecorderRef.current?.stop();
      }
      streamRef.current?.getTracks().forEach((t) => t.stop());
      recognitionRef.current?.abort();
    };
  }, []);

  useEffect(() => {
    if (isRecording) stopRecording();
    if (usingFallback) stopWebSpeech();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [language]);

  const isActive = isRecording || isTranscribing || usingFallback;

  return (
    <div className="space-y-2">
      <div className="flex gap-3 items-start">
        <div className="relative flex-1 min-w-0">
          <textarea
            value={text}
            onChange={(e) => onTextChange(e.target.value)}
            placeholder={LANGUAGE_PLACEHOLDERS[language] || LANGUAGE_PLACEHOLDERS.en}
            rows={5}
            disabled={isTranscribing}
            className={`w-full px-4 py-3 text-sm border-2 rounded-xl focus:outline-none resize-none bg-white text-slate-800 placeholder-slate-400 transition-colors disabled:opacity-70 ${
              isActive
                ? "border-red-300 focus:border-red-400"
                : "border-slate-200 focus:border-blue-500"
            }`}
          />
          <div className="absolute bottom-3 right-3 flex items-center gap-2">
            {isRecording && (
              <span className="text-xs text-red-500 font-medium animate-pulse">
                Recording {recordingSeconds}s
              </span>
            )}
            {isTranscribing && (
              <span className="text-xs text-blue-600 font-medium flex items-center gap-1">
                <Loader2 size={10} className="animate-spin" />
                Transcribing…
              </span>
            )}
            {usingFallback && (
              <span className="text-xs text-amber-600 font-medium animate-pulse">
                Listening…
              </span>
            )}
            <span className={`text-xs ${text.length > 500 ? "text-red-500" : "text-slate-400"}`}>
              {text.length}/500
            </span>
            {text.length > 0 && !isActive && (
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
            disabled={isTranscribing}
            className={`relative w-10 h-10 rounded-full flex items-center justify-center transition-all duration-200 focus:outline-none focus:ring-2 disabled:opacity-50 ${
              isActive
                ? "bg-red-500 hover:bg-red-600 focus:ring-red-200 recording-pulse text-white"
                : "bg-[#1a3c6e] hover:bg-[#2563eb] focus:ring-blue-200 text-white"
            }`}
            aria-label={isActive ? "Stop voice input" : "Start voice input"}
            title={
              isTranscribing
                ? "Transcribing with Sarvam AI…"
                : isActive
                ? "Stop"
                : "Record & transcribe (Sarvam AI)"
            }
          >
            {isTranscribing ? (
              <Loader2 size={16} className="animate-spin" />
            ) : isActive ? (
              <MicOff size={16} />
            ) : (
              <Mic size={16} />
            )}
          </button>

          {isRecording && (
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

          {!isActive && !isTranscribing && (
            <span className="text-[10px] text-slate-400 text-center leading-tight w-12">
              Tap to speak
            </span>
          )}
        </div>
      </div>

      {speechError && (
        <p className="text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
          {speechError}
        </p>
      )}

      <p className="text-[10px] text-slate-400 px-1">
        Voice powered by Sarvam AI (Saaras v3) · Max {MAX_RECORDING_SEC}s per recording · Audio is not saved
      </p>
    </div>
  );
}
