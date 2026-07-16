import { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Mic, MicOff, Sparkles } from 'lucide-react';

export default function Insights() {
  const [messages, setMessages] = useState([
    { role: 'ai', text: "Hello! I'm your health tracking assistant. I have full access to your historical logs, meals, supplements, and symptoms. What would you like to know?" }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [summaryData, setSummaryData] = useState(null);
  const [isLoadingSummary, setIsLoadingSummary] = useState(true);
  const [summaryError, setSummaryError] = useState(null);
  
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    // Fetch the weekly summary on component mount
    const fetchSummary = async () => {
      try {
        const res = await fetch((import.meta.env.VITE_API_URL || '') + '/api/insights/summary');
        const data = await res.json();
        if (!res.ok) {
            throw new Error(data.error || "Failed to load summary");
        }
        if (data && typeof data.summary !== 'undefined') {
          setSummaryData(data);
        }
      } catch (err) {
        console.error("Failed to load summary", err);
        setSummaryError(err.message);
      } finally {
        setIsLoadingSummary(false);
      }
    };
    fetchSummary();
  }, []);

  const handleSend = async (e, overrideText = null) => {
    if (e) e.preventDefault();
    
    const textToSend = overrideText || input;
    if (!textToSend.trim()) return;
    
    setMessages(prev => [...prev, { role: 'user', text: textToSend }]);
    setInput('');
    setIsLoading(true);

    try {
      const res = await fetch((import.meta.env.VITE_API_URL || '') + '/api/insights/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: textToSend })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setMessages(prev => [...prev, { role: 'ai', text: data.answer }]);
    } catch (err) {
      setMessages(prev => [...prev, { role: 'ai', text: "Sorry, I encountered an error: " + err.message }]);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleListen = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Your browser does not support voice input.");
      return;
    }

    // If currently listening, let it stop naturally or we could explicitly stop it.
    if (isListening) return; 

    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.interimResults = false;
    
    recognition.onstart = () => setIsListening(true);
    
    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      setInput(transcript);
    };

    recognition.onerror = (event) => {
      console.error(event.error);
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.start();
  };

  return (
    <div className="animate-fade-in" style={{ height: 'calc(100vh - 120px)', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <Sparkles color="var(--primary)" size={28} />
        <h1 style={{ margin: 0 }}>AI Health Insights</h1>
      </div>

      {/* Weekly Summary Card */}
      <div className="glass-panel" style={{ padding: '20px', background: 'var(--bg-surface)', borderLeft: '4px solid var(--primary)' }}>
        <h3 style={{ margin: '0 0 8px 0', fontSize: '1rem', color: 'var(--text-main)' }}>Past 7 Days Summary</h3>
        {isLoadingSummary ? (
          <p style={{ color: 'var(--text-muted)', margin: 0, fontStyle: 'italic' }}>Analyzing recent data...</p>
        ) : summaryError ? (
          <p style={{ color: '#ff7675', margin: 0, lineHeight: '1.5' }}>{summaryError}</p>
        ) : summaryData ? (
          <>
            <p style={{ color: 'var(--text-main)', margin: 0, lineHeight: '1.5' }}>{summaryData.summary}</p>
            {summaryData.symptomDetails && summaryData.symptomDetails.length > 0 && (
              <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <h4 style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-main)' }}>Symptom Analysis & Correlations</h4>
                {summaryData.symptomDetails.map((detail, idx) => (
                  <div key={idx} style={{ background: 'rgba(0,0,0,0.02)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border)' }}>
                    <div style={{ fontWeight: 'bold', color: 'var(--primary)', marginBottom: '4px', fontSize: '0.9rem' }}>{detail.symptom}</div>
                    <div style={{ color: 'var(--text-main)', fontSize: '0.85rem', lineHeight: '1.5' }}>{detail.analysis}</div>
                  </div>
                ))}
              </div>
            )}
          </>
        ) : (
          <p style={{ color: 'var(--text-main)', margin: 0, lineHeight: '1.5' }}>No recent data to summarize.</p>
        )}
      </div>

      {/* Chat Container */}
      <div className="glass-panel" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', padding: 0 }}>
        
        {/* Chatbot Title */}
        <div style={{ padding: '20px 24px 0 24px' }}>
          <h3 style={{ margin: '0', fontSize: '1rem', color: 'var(--text-main)' }}>Health Assistant</h3>
        </div>

        {/* Messages Area */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {messages.map((msg, idx) => (
            <div key={idx} style={{ 
              display: 'flex', 
              gap: '16px',
              flexDirection: msg.role === 'user' ? 'row-reverse' : 'row'
            }}>
              <div style={{ 
                width: '40px', height: '40px', borderRadius: '50%', 
                background: msg.role === 'user' ? 'var(--primary)' : 'var(--bg-surface-hover)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
              }}>
                {msg.role === 'user' ? <User size={20} color="white" /> : <Bot size={20} color="var(--primary)" />}
              </div>
              
              <div style={{ 
                background: msg.role === 'user' ? 'var(--primary)' : 'var(--bg-base)',
                color: msg.role === 'user' ? 'white' : 'var(--text-main)',
                padding: '16px', borderRadius: '12px', maxWidth: '80%',
                boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
                whiteSpace: 'pre-wrap', lineHeight: '1.5'
              }}>
                {msg.text}
              </div>
            </div>
          ))}
          
          {isLoading && (
            <div style={{ display: 'flex', gap: '16px' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'var(--bg-surface-hover)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Bot size={20} color="var(--primary)" />
              </div>
              <div style={{ padding: '16px', borderRadius: '12px', background: 'var(--bg-base)', color: 'var(--text-muted)' }}>
                Analyzing your database...
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div style={{ padding: '16px', borderTop: '1px solid var(--border)', background: 'var(--bg-base)' }}>
          <form onSubmit={handleSend} style={{ display: 'flex', gap: '12px' }}>
            
            <button 
              type="button" 
              className="btn"
              style={{ 
                padding: '12px', 
                background: isListening ? '#ff7675' : 'var(--bg-surface-hover)',
                color: isListening ? 'white' : 'var(--text-main)',
                transition: 'all 0.3s ease'
              }}
              onClick={toggleListen}
              title="Voice Intake"
            >
              {isListening ? <MicOff size={20} /> : <Mic size={20} />}
            </button>

            <input 
              type="text" 
              className="input-field"
              placeholder={isListening ? "Listening..." : "Ask a question (e.g., 'What did I eat before I got bloated?')"}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={isLoading || isListening}
              style={{ flex: 1, padding: '12px 16px', margin: 0 }}
            />

            <button 
              type="submit" 
              className="btn btn-primary"
              disabled={isLoading || (!input.trim() && !isListening)}
              style={{ padding: '12px 24px' }}
            >
              <Send size={18} /> Send
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
