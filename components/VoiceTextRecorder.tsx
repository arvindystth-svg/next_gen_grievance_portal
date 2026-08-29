"use client";

import { useState, useRef, useCallback } from "react";
import { Mic, MicOff, Upload, X, Play, Pause, Volume2 } from "lucide-react";

interface VoiceTextRecorderProps {
  text: string;
  onTextChange: (text: string) => void;
  onAudioFile: (file: File) => void;
  language: string;
}

const LANGUAGE_PLACEHOLDERS: Record<string, string> = {
  en: "Describe your grievance in detail... e.g., 'The water supply has been cut for 3 days in our area near Koramangala Bus Stand.'",
  kn: "ನಿಮ್ಮ ದೂರನ್ನು ವಿವರವಾಗಿ ಬರೆಯಿರಿ...",
  hi: "अपनी शिकायत विस्तार से लिखें...",
  ta: "உங்கள் புகாரை விரிவாக எழுதுங்கள்...",
  hin: "Apni complaint detail mein likhein...",
};

export default function VoiceTextRecorder({
  text,
  onTextChange,
  onAudioFile,
  language,
}: VoiceTextRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        const url = URL.createObjectURL(blob);
        setAudioBlob(blob);
        setAudioUrl(url);
        const file = new File([blob], `recording-${Date.now()}.webm`, { type: "audio/webm" });
        onAudioFile(file);
        stream.getTracks().forEach((t) => t.stop());
      };

      mediaRecorder.start(100);
      setIsRecording(true);
      setRecordingSeconds(0);
      timerRef.current = setInterval(() => {
        setRecordingSeconds((s) => {
          if (s >= 120) {
            stopRecording();
            return s;
          }
          return s + 1;
        });
      }, 1000);
    } catch {
      alert("Microphone permission denied. Please allow microphone access to use voice input.");
    }
  }, [onAudioFile]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    if (timerRef.current) clearInterval(timerRef.current);
    setIsRecording(false);
  }, []);

  const clearAudio = () => {
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioBlob(null);
    setAudioUrl(null);
    setIsPlaying(false);
    setUploadedFileName(null);
  };

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setAudioUrl(url);
    setUploadedFileName(file.name);
    onAudioFile(file);
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60).toString().padStart(2, "0");
    const s = (secs % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  return (
    <div className="space-y-4">
      {/* Recording Button + Wave */}
      <div className="flex flex-col items-center gap-4">
        <div className="flex items-center gap-6">
          {/* Big mic button */}
          <div className="relative">
            <button
              onClick={isRecording ? stopRecording : startRecording}
              className={`relative w-20 h-20 rounded-full flex items-center justify-center shadow-lg transition-all duration-200 focus:outline-none focus:ring-4 ${
                isRecording
                  ? "bg-red-600 hover:bg-red-700 focus:ring-red-200 recording-pulse"
                  : "bg-[#1a3c6e] hover:bg-[#2563eb] focus:ring-blue-200"
              }`}
              aria-label={isRecording ? "Stop recording" : "Start recording"}
            >
              {isRecording ? (
                <MicOff size={28} className="text-white" />
              ) : (
                <Mic size={28} className="text-white" />
              )}
            </button>
            {isRecording && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full animate-pulse">
                REC
              </span>
            )}
          </div>

          {/* Wave visualizer or status */}
          <div className="flex flex-col items-start gap-1">
            {isRecording ? (
              <>
                <div className="flex items-end gap-1 h-8">
                  {[...Array(7)].map((_, i) => (
                    <span
                      key={i}
                      className="wave-bar"
                      style={{ animationDelay: `${i * 0.08}s` }}
                    />
                  ))}
                </div>
                <span className="text-red-500 font-mono text-sm font-bold">
                  {formatTime(recordingSeconds)}
                </span>
                <span className="text-xs text-slate-500">Recording... (max 2 min)</span>
              </>
            ) : audioUrl ? (
              <div className="flex items-center gap-3">
                <button
                  onClick={togglePlay}
                  className="w-10 h-10 rounded-full bg-blue-100 hover:bg-blue-200 flex items-center justify-center transition-colors"
                >
                  {isPlaying ? (
                    <Pause size={16} className="text-blue-700" />
                  ) : (
                    <Play size={16} className="text-blue-700" />
                  )}
                </button>
                <div>
                  <span className="text-sm font-medium text-slate-700 flex items-center gap-1">
                    <Volume2 size={14} className="text-blue-500" />
                    {uploadedFileName ? (
                      <span className="truncate max-w-[120px]">{uploadedFileName}</span>
                    ) : (
                      "Audio recorded"
                    )}
                  </span>
                  <span className="text-xs text-slate-500">
                    {uploadedFileName ? "Uploaded file" : `${formatTime(recordingSeconds)} captured`}
                  </span>
                </div>
                <button
                  onClick={clearAudio}
                  className="w-6 h-6 rounded-full bg-slate-100 hover:bg-red-100 flex items-center justify-center transition-colors"
                >
                  <X size={12} className="text-slate-500 hover:text-red-500" />
                </button>
                <audio
                  ref={audioRef}
                  src={audioUrl}
                  onEnded={() => setIsPlaying(false)}
                  className="hidden"
                />
              </div>
            ) : (
              <div>
                <p className="text-sm font-medium text-slate-700">Press to record</p>
                <p className="text-xs text-slate-400">Speak your complaint clearly</p>
              </div>
            )}
          </div>
        </div>

        {/* Upload audio */}
        <div className="flex items-center gap-2">
          <div className="h-px flex-1 bg-slate-200 w-16" />
          <span className="text-xs text-slate-400 uppercase tracking-wider">or</span>
          <div className="h-px flex-1 bg-slate-200 w-16" />
        </div>
        <button
          onClick={() => fileInputRef.current?.click()}
          className="flex items-center gap-2 text-sm text-slate-600 hover:text-blue-600 bg-slate-50 hover:bg-blue-50 border border-slate-200 hover:border-blue-200 px-4 py-2 rounded-lg transition-colors"
        >
          <Upload size={14} />
          Upload audio file (MP3 / M4A / WAV)
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="audio/*"
          onChange={handleFileUpload}
          className="hidden"
        />
      </div>

      {/* Text input */}
      <div className="relative">
        <textarea
          value={text}
          onChange={(e) => onTextChange(e.target.value)}
          placeholder={LANGUAGE_PLACEHOLDERS[language] || LANGUAGE_PLACEHOLDERS.en}
          rows={4}
          className="w-full px-4 py-3 text-sm border-2 border-slate-200 rounded-xl focus:border-blue-500 focus:outline-none resize-none bg-white text-slate-800 placeholder-slate-400 transition-colors"
        />
        <div className="absolute bottom-3 right-3 flex items-center gap-2">
          <span className={`text-xs ${text.length > 500 ? "text-red-500" : "text-slate-400"}`}>
            {text.length}/500
          </span>
          {text.length > 0 && (
            <button
              onClick={() => onTextChange("")}
              className="text-slate-400 hover:text-red-400 transition-colors"
            >
              <X size={12} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
