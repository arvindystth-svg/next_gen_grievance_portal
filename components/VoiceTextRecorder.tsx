"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Mic, MicOff, X } from "lucide-react";

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

// Web Speech API types (not in all TS libs)
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
  const [speechError, setSpeechError] = useState<string | null>(null);
  const [interimText, setInterimText] = useState("");

  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const baseTextRef = useRef("");

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setIsListening(false);
    setInterimText("");
  }, []);

  const startListening = useCallback(() => {
    const SpeechRecognition = getSpeechRecognition();
    if (!SpeechRecognition) {
      setSpeechError(
        "Voice input is not supported in this browser. Please type your grievance instead."
      );
      return;
    }

    setSpeechError(null);
    baseTextRef.current = text.trim();

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
      setInterimText(sessionInterim);
    };

    recognition.onerror = (event) => {
      const err = (event as Event & { error?: string }).error;
      if (err === "not-allowed") {
        setSpeechError("Microphone permission denied. Please allow access to use voice input.");
      } else if (err !== "aborted" && err !== "no-speech") {
        setSpeechError("Voice recognition error. Please try again or type your grievance.");
      }
      stopListening();
    };

    recognition.onend = () => {
      setIsListening(false);
      setInterimText("");
      recognitionRef.current = null;
    };

    recognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);
  }, [text, language, onTextChange, stopListening]);

  const toggleListening = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  // Stop recognition if language changes while listening
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, []);

  useEffect(() => {
    if (isListening) {
      stopListening();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [language]);

  const displayText = text;

  return (
    <div className="space-y-2">
      <div className="flex gap-3 items-start">
        {/* Text input */}
        <div className="relative flex-1 min-w-0">
          <textarea
            value={displayText}
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
            <span className={`text-xs ${displayText.length > 500 ? "text-red-500" : "text-slate-400"}`}>
              {displayText.length}/500
            </span>
            {displayText.length > 0 && !isListening && (
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

        {/* Mic button beside textarea */}
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
    </div>
  );
}
