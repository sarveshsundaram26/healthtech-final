import { useState, useRef, useEffect } from 'react';
import { Send, User, Bot, Sparkles, Loader2, ExternalLink, Mic, MicOff } from 'lucide-react';
import { sendMessage, type ChatMessage } from '../services/chatService';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabaseClient';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';

const MessageText = ({ text }: { text: string }) => {
  const parts = text.split(/(\*\*.*?\*\*|\n)/g);
  return (
    <div className="space-y-1">
      {parts.map((part, i) => {
        if (part === '\n') return <br key={i} />;
        if (part.startsWith('**') && part.endsWith('**')) {
          return <strong key={i} className="text-white font-black">{part.slice(2, -2)}</strong>;
        }
        return <span key={i}>{part}</span>;
      })}
    </div>
  );
};

export default function ChatInterface() {
  const { user, role } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      text: t('welcome_message') || 'Hello! I am your AI Health Companion. How can I assist you today?',
      sender: 'ai',
      timestamp: new Date(),
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const fetchLatestVitals = async () => {
    if (!user) return null;
    const { data, error } = await supabase
      .from('vitals')
      .select('heart_rate, systolic_bp, diastolic_bp, weight, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();
    
    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching vitals for chat:', error);
    }
    return data;
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      text: inputText,
      sender: 'user',
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputText('');
    setLoading(true);

    try {
      const latestVitals = await fetchLatestVitals();
      
      // Filter out unrealistic vitals (e.g., diastolic > 200 is likely an error)
      let cleanVitals = undefined;
      if (latestVitals) {
        const isClean = (
           (!latestVitals.systolic_bp || latestVitals.systolic_bp < 300) &&
           (!latestVitals.diastolic_bp || latestVitals.diastolic_bp < 200) &&
           (!latestVitals.heart_rate || latestVitals.heart_rate < 300)
        );
        
        if (isClean) {
            console.log("✅ Vitals are clean:", latestVitals);
            cleanVitals = {
                heart_rate: latestVitals.heart_rate,
                systolic_bp: latestVitals.systolic_bp,
                diastolic_bp: latestVitals.diastolic_bp,
                weight: latestVitals.weight
            };
        } else {
            console.warn("⚠️ Skipping unrealistic vitals for AI context:", latestVitals);
        }
      } else {
         console.log("ℹ️ No vitals found.");
      }

      console.log("SENDING TO AI - Vitals Context:", cleanVitals);

      const response = await sendMessage(userMessage.text, {
        role,
        userName: user?.email?.split('@')[0],
        latestVitals: cleanVitals
      });
      setMessages((prev) => [...prev, response]);
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current?.stop();
    } else {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (!SpeechRecognition) {
        alert('Voice recognition is not supported in this browser.');
        return;
      }
      
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        console.log('[Speech] Recognition started');
        setIsListening(true);
      };
      
      recognition.onend = () => {
        console.log('[Speech] Recognition ended');
        setIsListening(false);
      };
      
      recognition.onerror = (event: any) => {
        console.error('[Speech] Recognition error:', event.error);
        setIsListening(false);
      };
      
      recognition.onresult = (event: any) => {
        let finalTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          }
        }
        
        if (finalTranscript) {
          console.log('[Speech] Final transcript:', finalTranscript);
          setInputText(prev => prev + (prev ? ' ' : '') + finalTranscript);
        }
      };

      recognitionRef.current = recognition;
      recognition.start();
    }
  };

  const handleAction = (action: string) => {
    if (action === 'trigger_sos') navigate('/emergency');
    else if (action === 'log_vitals') navigate('/dashboard/patient');
    else if (action === 'view_history') navigate('/dashboard/patient');
  };

  return (
    <div className="flex flex-col h-full w-full bg-transparent overflow-hidden">
      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar pb-32">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`flex max-w-[85%] ${
                msg.sender === 'user' ? 'flex-row-reverse' : 'flex-row'
              } gap-3`}
            >
              <div
                className={`flex-shrink-0 h-10 w-10 rounded-2xl flex items-center justify-center shadow-lg transform transition-transform hover:scale-110 ${
                  msg.sender === 'user' 
                    ? 'bg-gradient-to-br from-blue-500 to-cyan-400 text-white' 
                    : 'bg-gradient-to-br from-indigo-500 to-purple-400 text-white'
                }`}
              >
                {msg.sender === 'user' ? (
                  <User className="h-5 w-5" />
                ) : (
                  <Bot className="h-5 w-5" />
                )}
              </div>
              <div
                className={`flex flex-col gap-2 ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
              >
                <div
                    className={`px-5 py-4 rounded-3xl shadow-xl relative group ${
                    msg.sender === 'user'
                        ? 'bg-blue-600 text-white rounded-tr-sm border border-blue-500/30'
                        : 'bg-white/10 backdrop-blur-md text-slate-100 rounded-tl-sm border border-white/10'
                    }`}
                >
                    <MessageText text={msg.text} />
                    <div 
                    className={`text-[10px] mt-2 font-bold uppercase tracking-widest ${
                        msg.sender === 'user' ? 'text-blue-200' : 'text-slate-500'
                    }`}
                    >
                    {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                </div>
                
                {/* AI Actions */}
                {msg.sender === 'ai' && msg.actions && msg.actions.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-1">
                        {msg.actions.map((btn, idx) => (
                            <button
                                key={idx}
                                onClick={() => handleAction(btn.action)}
                                className="px-3 py-1.5 bg-indigo-500/20 hover:bg-indigo-500/40 border border-indigo-500/30 rounded-xl text-[10px] font-black uppercase tracking-widest text-indigo-300 transition-all flex items-center hover:scale-105 active:scale-95"
                            >
                                <ExternalLink className="h-3 w-3 mr-1.5" />
                                {btn.label}
                            </button>
                        ))}
                    </div>
                )}
              </div>
            </div>
          </div>
        ))}
        {loading && (
             <div className="flex justify-start">
                  <div className="flex flex-row gap-3">
                    <div className="flex-shrink-0 h-10 w-10 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-400 text-white flex items-center justify-center shadow-lg">
                        <Bot className="h-5 w-5" />
                    </div>
                    <div className="bg-white/10 backdrop-blur-md px-6 py-4 rounded-3xl rounded-tl-sm border border-white/10 shadow-xl">
                        <div className="flex space-x-2">
                            <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                            <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                            <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                        </div>
                    </div>
                  </div>
             </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-6 border-t border-white/5 bg-white/5 backdrop-blur-xl">
        <form onSubmit={handleSend} className="relative group flex gap-2">
          <div className="relative flex-1">
            <input
                type="text"
                className="w-full pl-6 pr-12 py-4 bg-white/5 border border-white/10 rounded-2xl text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-transparent transition-all shadow-inner"
                placeholder={t('ask_anything') || "Ask anything about your health..."}
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                disabled={loading}
            />
            <button
                type="button"
                onClick={toggleListening}
                className={`absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-lg transition-all ${
                    isListening ? 'text-red-400 animate-pulse bg-red-500/10' : 'text-slate-500 hover:text-white hover:bg-white/5'
                }`}
            >
                {isListening ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
            </button>
          </div>
          <button
            type="submit"
            disabled={loading || !inputText.trim()}
            className="p-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 rounded-2xl text-white shadow-lg transition-all active:scale-90 disabled:opacity-50 group-hover:shadow-indigo-500/20"
          >
            {loading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Send className="h-5 w-5" />
            )}
          </button>
        </form>
        <div className="mt-3 flex items-center justify-center gap-4">
           <div className="flex items-center text-[10px] font-black uppercase tracking-widest text-slate-500">
              <Sparkles className="h-3 w-3 mr-1.5 text-indigo-400" />
              Advanced Health Core
           </div>
           <div className="h-1 w-1 rounded-full bg-slate-800" />
           <div className="flex items-center text-[10px] font-black uppercase tracking-widest text-slate-500">
              Context-Aware Reasoning
           </div>
        </div>
      </div>
    </div>
  );
}
