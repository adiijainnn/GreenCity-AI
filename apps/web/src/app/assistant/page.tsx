'use client';

import React, { useState, useEffect, useRef } from 'react';
import { api } from '@/lib/api';
import { useTranslation, SupportedLanguage } from '@/lib/i18n';
import Link from 'next/link';
import { 
  Mic, 
  MicOff, 
  Send, 
  Volume2, 
  Bot, 
  User, 
  CheckCircle2, 
  AlertTriangle, 
  Navigation, 
  FileText, 
  Check, 
  RefreshCw,
  Sparkles,
  Info
} from 'lucide-react';

interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
  language: string;
  card_type?: string | null;
  card_data?: any | null;
}

export default function VoiceAssistantPage() {
  const { language, setLanguage, t } = useTranslation();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [speechStatus, setSpeechStatus] = useState<string | null>(null);
  const [speechError, setSpeechError] = useState<string | null>(null);

  // User coordinates if granted
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(null);

  // Draft report confirmation state
  const [submittingReport, setSubmittingReport] = useState(false);
  const [submittedReportId, setSubmittedReportId] = useState<string | null>(null);

  const recognitionRef = useRef<any>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const welcomeText = language === 'mr'
      ? "नमस्कार! मी ग्रीनसिटी एआय व्हॉईस असिस्टंट आहे. सोलापूरमधील उद्याने, थेट हवेची गुणवत्ता (AQI), रस्ता मार्गदर्शन किंवा महानगरपालिकेची तक्रार नोंदवण्यासाठी मला विचारा."
      : language === 'hi'
      ? "नमस्ते! मैं ग्रीनसिटी एआई वॉयस असिस्टेंट हूँ। सोलापुर में हरित पार्क खोजने, लाइव वायु गुणवत्ता (AQI) जांचने, नेविगेशन या नागरिक शिकायत दर्ज करने के लिए पूछें।"
      : "Hello! I am your GreenCity AI Voice Assistant. Ask me about Solapur parks, live air quality (AQI) & weather, turn-by-turn navigation, or filing a municipal complaint.";

    setMessages([
      {
        id: 'welcome-msg',
        sender: 'assistant',
        text: welcomeText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        language: language,
      }
    ]);

    if (typeof window !== 'undefined' && 'geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setUserCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => setUserCoords(null),
        { timeout: 5000 }
      );
    }
  }, [language]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  // Robust Microphone Request & Speech Recognition
  const handleToggleListening = async () => {
    if (isListening) {
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch {}
      }
      setIsListening(false);
      setSpeechStatus(null);
      return;
    }

    setSpeechError(null);
    setSpeechStatus(null);

    // 1. Explicitly prompt microphone permission, then immediately release the test track
    // so that SpeechRecognition gets unobstructed exclusive access to the audio hardware
    if (typeof window !== 'undefined' && navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      try {
        const testStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        testStream.getTracks().forEach((track) => track.stop());
      } catch (err: any) {
        setSpeechError('Microphone permission was denied. Please allow microphone access in your browser address bar (lock/settings icon), or click one of the quick ask buttons.');
        return;
      }
    }

    // 2. Initialize Speech Recognition
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setSpeechError('Web Speech Recognition is not supported on this browser. You can type in English, Marathi, or Hindi or click the quick ask prompts.');
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognitionRef.current = recognition;
      recognition.continuous = false; // set false for reliable single-turn speech query capture
      recognition.interimResults = true;

      // Set recognition language with fallback
      recognition.lang = language === 'mr' ? 'mr-IN' : language === 'hi' ? 'hi-IN' : 'en-IN';

      recognition.onstart = () => {
        setIsListening(true);
        setSpeechStatus(
          language === 'mr' 
            ? '🎙️ ऐकत आहे... आता मराठीत बोला' 
            : language === 'hi' 
            ? '🎙️ सुन रहा हूँ... अब हिंदी में बोलें' 
            : '🎙️ Listening... Speak your question now'
        );
      };

      recognition.onresult = (event: any) => {
        let transcript = '';
        for (let i = 0; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript;
        }
        setInputText(transcript);
        setSpeechStatus(`Captured: "${transcript}"`);
      };

      recognition.onerror = (event: any) => {
        console.warn('Speech recognition error:', event.error);
        if (event.error === 'not-allowed') {
          setSpeechError('Microphone permission blocked. Please enable microphone permissions in your browser.');
        } else if (event.error === 'no-speech') {
          setSpeechStatus('No speech detected. Please speak louder or tap mic again.');
        } else {
          setSpeechStatus(`Status: ${event.error}. You can also type or use sample voice buttons.`);
        }
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognition.start();
    } catch (exc: any) {
      setSpeechError(`Could not start voice recognition: ${exc.message}`);
      setIsListening(false);
    }
  };

  // Text-to-Speech via Web Speech Synthesis
  const handleSpeakText = (text: string, langCode: string) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;

    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = langCode === 'mr' ? 'mr-IN' : langCode === 'hi' ? 'hi-IN' : 'en-IN';
    utterance.rate = 0.95;

    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    setIsSpeaking(true);
    window.speechSynthesis.speak(utterance);
  };

  // Submit User Message
  const handleSendMessage = async (textToSend?: string) => {
    const query = (textToSend || inputText).trim();
    if (!query || isLoading) return;

    // Stop listening if active
    if (isListening) {
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch {}
      }
      setIsListening(false);
      setSpeechStatus(null);
    }

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: query,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      language: language,
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputText('');
    setIsLoading(true);

    try {
      const response = await api.assistantChat({
        query,
        language,
        latitude: userCoords?.lat,
        longitude: userCoords?.lng,
      });

      const assistantMsg: ChatMessage = {
        id: `assistant-${Date.now()}`,
        sender: 'assistant',
        text: response.reply,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        language: response.language || language,
        card_type: response.card_type,
        card_data: response.card_data,
      };

      setMessages((prev) => [...prev, assistantMsg]);
      handleSpeakText(response.reply, response.language || language);
    } catch {
      const errorMsg: ChatMessage = {
        id: `err-${Date.now()}`,
        sender: 'assistant',
        text: language === 'mr' 
          ? 'माफ करा, सेवा उपलब्ध नाही. कृपया थोड्या वेळाने पुन्हा प्रयत्न करा.' 
          : language === 'hi' 
          ? 'क्षमा करें, सर्वर से संपर्क नहीं हो सका। कृपया पुनः प्रयास करें।'
          : 'Unable to connect to service. Please check your connection and try again.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        language: language,
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  // Confirm and Submit Civic Report from ReportReviewCard
  const handleConfirmReport = async (cardData: any) => {
    setSubmittingReport(true);
    try {
      const result = await api.submitReport({
        category: cardData.category || 'Other',
        title: cardData.title || 'Civic issue report',
        description: cardData.description || 'Reported via Voice Assistant',
        latitude: cardData.latitude || 17.6599,
        longitude: cardData.longitude || 75.9064,
        ward_id: cardData.ward_id || 'smc-z01',
      });
      setSubmittedReportId(result.report_number);
    } catch (e: any) {
      alert(`Submission failed: ${e.message}`);
    } finally {
      setSubmittingReport(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-slate-100 flex flex-col">
      
      {/* Top Banner with Language Selector */}
      <div className="bg-white border-b border-slate-200 py-3 px-4 sm:px-6 shadow-2xs">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-700 text-white flex items-center justify-center shadow-sm">
              <Bot className="w-4 h-4" />
            </div>
            <div>
              <h1 className="text-sm sm:text-base font-extrabold text-slate-900 leading-tight">
                {t('assistant.title', 'Multilingual AI Voice Assistant')}
              </h1>
              <p className="text-[11px] text-slate-500">
                Solapur Citizen Service • English • हिन्दी • मराठी
              </p>
            </div>
          </div>

          {/* Language Toggle */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
            {(['en', 'hi', 'mr'] as SupportedLanguage[]).map((l) => (
              <button
                key={l}
                onClick={() => setLanguage(l)}
                className={`py-1 px-2.5 rounded-lg text-xs font-bold transition-all ${
                  language === l
                    ? 'bg-emerald-600 text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {l === 'en' ? 'English' : l === 'hi' ? 'हिन्दी' : 'मराठी'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Speech Feedback or Error Banner */}
      {speechError && (
        <div className="max-w-4xl w-full mx-auto px-4 pt-3">
          <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center justify-between gap-2 animate-in fade-in">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-red-600" />
              <span>{speechError}</span>
            </div>
            <button onClick={() => setSpeechError(null)} className="text-red-500 hover:text-red-700 font-bold">×</button>
          </div>
        </div>
      )}

      {isListening && (
        <div className="max-w-4xl w-full mx-auto px-4 pt-3">
          <div className="p-3 bg-emerald-600 text-white text-xs font-bold rounded-xl flex items-center gap-3 shadow-md animate-pulse">
            <span className="w-3 h-3 rounded-full bg-white animate-ping"></span>
            <span>{speechStatus || 'Microphone Active: Speak now in English, Hindi or Marathi...'}</span>
          </div>
        </div>
      )}

      {/* Main Conversation Panel */}
      <div className="flex-1 max-w-4xl w-full mx-auto p-4 sm:p-6 overflow-y-auto space-y-4">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex items-start gap-3 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            {msg.sender === 'assistant' && (
              <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-sm mt-1">
                <Bot className="w-4 h-4" />
              </div>
            )}

            <div className="space-y-3 max-w-[85%] sm:max-w-[75%]">
              <div
                className={`p-4 rounded-2xl shadow-sm text-xs sm:text-sm leading-relaxed ${
                  msg.sender === 'user'
                    ? 'bg-emerald-600 text-white rounded-br-none'
                    : 'bg-white text-slate-800 rounded-bl-none border border-slate-200'
                }`}
              >
                <p className="whitespace-pre-wrap">{msg.text}</p>
                <div className={`mt-2 flex items-center justify-between text-[10px] ${msg.sender === 'user' ? 'text-emerald-100' : 'text-slate-400'}`}>
                  <span>{msg.timestamp}</span>
                  {msg.sender === 'assistant' && (
                    <button
                      onClick={() => handleSpeakText(msg.text, msg.language)}
                      title="Play speech audio"
                      className="p-1 rounded-md text-emerald-600 hover:bg-emerald-50 transition-colors ml-2"
                    >
                      <Volume2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* RICH CARD 1: ENVIRONMENTAL CARD */}
              {msg.card_type === 'environmental_card' && msg.card_data && (
                <div className="bg-white p-4 rounded-2xl shadow-md border border-emerald-200 space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <span className="text-[10px] uppercase font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded">
                      {msg.card_data.place_name || 'Solapur'} Climate Snapshot
                    </span>
                    <span 
                      className="text-xs font-bold px-2 py-0.5 rounded text-white"
                      style={{ backgroundColor: msg.card_data.air_quality?.color || '#10b981' }}
                    >
                      AQI {msg.card_data.air_quality?.indian_aqi}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="bg-slate-50 p-2.5 rounded-xl">
                      <span className="text-slate-400 block text-[10px]">Air Quality</span>
                      <span className="font-extrabold text-slate-900">{msg.card_data.air_quality?.category}</span>
                    </div>
                    <div className="bg-slate-50 p-2.5 rounded-xl">
                      <span className="text-slate-400 block text-[10px]">Temperature</span>
                      <span className="font-extrabold text-slate-900">{msg.card_data.weather?.temperature_c}°C</span>
                    </div>
                  </div>

                  <p className="text-[11px] text-slate-600 italic">
                    {msg.card_data.suitability?.explanation}
                  </p>

                  <Link
                    href={`/environment`}
                    className="block text-center py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-2xs transition-all"
                  >
                    View Full 72h Charts
                  </Link>
                </div>
              )}

              {/* RICH CARD 2: PLACE RESULTS CARD */}
              {msg.card_type === 'place_card' && msg.card_data && (
                <div className="bg-white p-4 rounded-2xl shadow-md border border-slate-200 space-y-2.5">
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">
                    Discovered Nearby Places ({msg.card_data.radius_km} km radius)
                  </span>
                  <div className="divide-y divide-slate-100 text-xs">
                    {msg.card_data.places?.map((p: any) => (
                      <div key={p.id} className="py-2 flex items-center justify-between gap-2">
                        <div>
                          <p className="font-bold text-slate-900">{p.name}</p>
                          <p className="text-[11px] text-slate-500">{p.category} • {p.walking_distance_km} km walk</p>
                        </div>
                        <Link
                          href={`/map`}
                          className="py-1 px-2.5 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 rounded-lg font-bold text-[11px] shrink-0"
                        >
                          Directions
                        </Link>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* RICH CARD 3: ROUTE SUMMARY CARD */}
              {msg.card_type === 'route_card' && msg.card_data && (
                <div className="bg-white p-4 rounded-2xl shadow-md border border-blue-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-blue-700 flex items-center gap-1.5 uppercase">
                      <Navigation className="w-3.5 h-3.5 text-blue-600" /> Navigation Route
                    </span>
                    <span className="text-xs font-bold text-slate-800">
                      {msg.card_data.route?.distance_km} km
                    </span>
                  </div>
                  <p className="text-xs text-slate-700">
                    Route to <strong>{msg.card_data.destination_name}</strong> will take approximately <strong>{msg.card_data.route?.duration_minutes} minutes</strong> ({msg.card_data.route?.mode}).
                  </p>
                  <Link
                    href={`/map`}
                    className="block text-center py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-2xs transition-all"
                  >
                    Open Live Turn-by-Turn Map
                  </Link>
                </div>
              )}

              {/* RICH CARD 4: REPORT REVIEW & CONFIRMATION CARD */}
              {msg.card_type === 'report_review_card' && msg.card_data && (
                <div className="bg-white p-4 rounded-2xl shadow-md border border-amber-300 space-y-3">
                  <div className="flex items-center justify-between border-b border-amber-100 pb-2">
                    <span className="text-[10px] uppercase font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded flex items-center gap-1">
                      <FileText className="w-3.5 h-3.5" />
                      {t('assistant.reviewReport', 'Review Civic Complaint Draft')}
                    </span>
                  </div>

                  {submittedReportId ? (
                    <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-xs text-emerald-900 space-y-1">
                      <p className="font-bold flex items-center gap-1">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        {t('assistant.reportSuccess', 'Civic report submitted successfully!')}
                      </p>
                      <p>Tracking Number: <strong>{submittedReportId}</strong></p>
                    </div>
                  ) : (
                    <div className="space-y-2 text-xs">
                      <div>
                        <span className="text-slate-400 font-semibold block text-[10px]">Category</span>
                        <span className="font-bold text-slate-800">{msg.card_data.category}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 font-semibold block text-[10px]">Title</span>
                        <span className="font-medium text-slate-800">{msg.card_data.title}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 font-semibold block text-[10px]">Description</span>
                        <span className="text-slate-700">{msg.card_data.description}</span>
                      </div>

                      <button
                        onClick={() => handleConfirmReport(msg.card_data)}
                        disabled={submittingReport}
                        className="w-full mt-2 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-sm transition-all flex items-center justify-center gap-2"
                      >
                        {submittingReport ? (
                          <>
                            <RefreshCw className="w-4 h-4 animate-spin" />
                            <span>Submitting to SMC...</span>
                          </>
                        ) : (
                          <>
                            <Check className="w-4 h-4" />
                            <span>{t('assistant.confirmReport', 'Submit Official Complaint')}</span>
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {msg.sender === 'user' && (
              <div className="w-8 h-8 rounded-xl bg-slate-800 text-white flex items-center justify-center shrink-0 shadow-sm mt-1">
                <User className="w-4 h-4" />
              </div>
            )}
          </div>
        ))}

        {isLoading && (
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-sm">
              <Bot className="w-4 h-4" />
            </div>
            <div className="p-3 bg-white rounded-2xl rounded-bl-none border border-slate-200 shadow-sm flex items-center gap-2 text-xs text-slate-500">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-bounce"></span>
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-bounce delay-100"></span>
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-bounce delay-200"></span>
              <span className="font-medium ml-1">Analyzing Solapur data...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Quick Voice Prompt Chips in English, Marathi and Hindi */}
      <div className="max-w-4xl w-full mx-auto px-4 pb-2 flex flex-wrap gap-1.5 text-xs">
        <span className="text-[11px] text-slate-400 font-semibold self-center mr-1">
          Quick Ask / विचारा:
        </span>
        {[
          "What is the AQI near Solapur railway station right now?",
          "सिद्धेश्वर तलावाजवळ फिरायला कोणती जागा चांगली आहे?",
          "सोलापूर रेल्वे स्टेशन ते सिद्धेश्वर तलाव रस्ता दाखवा",
          "पार्क में टूटी बेंच और कचरा है, शिकायत दर्ज करें।",
          "Show nearby parks within 2 km"
        ].map((ex, i) => (
          <button
            key={i}
            onClick={() => handleSendMessage(ex)}
            className="py-1 px-2.5 rounded-full bg-white hover:bg-emerald-50 text-slate-700 hover:text-emerald-800 border border-slate-200 text-[11px] font-medium transition-colors shadow-2xs"
          >
            {ex}
          </button>
        ))}
      </div>

      {/* Bottom Input & Voice Control Bar */}
      <div className="bg-white border-t border-slate-200 p-4 shadow-lg">
        <div className="max-w-4xl mx-auto flex items-center gap-2">
          
          {/* Microphone Speech Recognition Button */}
          <button
            type="button"
            onClick={handleToggleListening}
            className={`p-3 rounded-2xl flex items-center justify-center transition-all ${
              isListening
                ? 'bg-red-500 text-white shadow-md animate-pulse ring-4 ring-red-200'
                : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
            }`}
            title={isListening ? 'Stop Listening' : 'Click to Speak (Microphone)'}
          >
            {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          </button>

          {/* Text Input */}
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleSendMessage(); }}
            placeholder={
              isListening
                ? 'Listening to microphone... Speak now'
                : 'Type question or click mic to speak (English, हिन्दी, मराठी)...'
            }
            className="flex-1 py-3 px-4 bg-slate-50 rounded-2xl text-xs sm:text-sm font-medium border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-slate-900 transition-all"
          />

          {/* Send Button */}
          <button
            type="button"
            onClick={() => handleSendMessage()}
            disabled={!inputText.trim() || isLoading}
            className="p-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white rounded-2xl shadow-sm transition-all flex items-center justify-center shrink-0 active:scale-95"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
