import React, { useState, useRef, useEffect } from 'react';
import { ChevronLeft, Volume2, Loader2, Send, Mic } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { createAiClient, chatWithAI } from '../services/aiService';

const ChatAI = ({ apiKey, baseURL, model, setActiveTab, handleSpeak, hskLevel }) => {
  const [chatInput, setChatInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState([
    { role: 'assistant', content: '你好！Tôi là trợ lý AI học tiếng Trung của bạn. Bạn muốn luyện tập chủ đề gì hôm nay?' }
  ]);
  const messagesEndRef = useRef(null);
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef(null);

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.lang = 'zh-CN'; // Nhận diện tiếng Trung
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;

      recognitionRef.current.onstart = () => setIsListening(true);
      recognitionRef.current.onend = () => setIsListening(false);
      
      recognitionRef.current.onresult = (event) => {
        let finalTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          }
        }
        if (finalTranscript) {
          setChatInput(prev => (prev ? prev + ' ' : '') + finalTranscript);
        }
      };

      recognitionRef.current.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
        if(event.error === 'not-allowed') {
          alert('Vui lòng cấp quyền sử dụng microphone trong trình duyệt.');
        }
      };
    }
  }, []);

  const handleMicClick = () => {
    if (!recognitionRef.current) {
      alert("Trình duyệt của bạn không hỗ trợ nhận diện giọng nói. Vui lòng sử dụng Google Chrome hoặc Edge trên máy tính.");
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
    } else {
      try {
        recognitionRef.current.start();
      } catch (err) {
        console.error("Microphone start error:", err);
      }
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!chatInput.trim() || isLoading) return;

    const userMessage = { role: 'user', content: chatInput };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setChatInput('');
    setIsLoading(true);

    try {
      const client = createAiClient(apiKey, baseURL);
      const systemMessage = {
        role: 'system',
        content: `You are a helpful Chinese learning assistant. Target level: ${hskLevel || 'Any'}. 
        Your answers must be short and educational. You can communicate in both Vietnamese and Chinese. 
        When the user speaks Chinese, correct their grammar if necessary using words suitable for ${hskLevel || 'their level'}.
        CRITICAL RULE: You MUST ONLY answer questions or discuss topics strictly related to learning the Chinese language or Chinese culture. If the user asks about ANYTHING else, politely decline in Vietnamese and remind them you are a Chinese learning assistant.`
      };

      const responseContent = await chatWithAI(client, [systemMessage, ...newMessages], model);
      const cleanContent = responseContent.replace(/<(think|thinking)>[\s\S]*?<\/\1>/gi, '').trim();

      setMessages([...newMessages, { role: 'assistant', content: cleanContent }]);
    } catch (error) {
      setMessages([...newMessages, { role: 'assistant', content: `[Lỗi hệ thống]: ${error.message}. Hãy kiểm tra lại API Key hoặc Base URL trong Cài đặt.` }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="glass-card chat-container animate-fade-in">
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem' }}>
        <button className="btn btn-outline" style={{ padding: '0.5rem' }} onClick={() => setActiveTab('dashboard')}>
          <ChevronLeft size={20} />
        </button>
        <h2>Luyện Giao Tiếp AI</h2>
      </div>

      <div className="chat-messages">
        {messages.map((msg, idx) => (
          <div key={idx} className={`message ${msg.role === 'user' ? 'user' : 'ai'}`}>
            {msg.role === 'assistant' ? (
              <div style={{ position: 'relative' }}>
                <ReactMarkdown>{msg.content}</ReactMarkdown>
                <button
                  className="speak-btn-small"
                  onClick={() => handleSpeak(msg.content)}
                  title="Nghe phát âm"
                >
                  <Volume2 size={14} />
                </button>
              </div>
            ) : (
              msg.content
            )}
          </div>
        ))}
        {isLoading && (
          <div className="message ai" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Loader2 size={16} /> AI đang suy nghĩ...
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <form className="chat-input-area" onSubmit={handleSendMessage}>
        <button
          type="button"
          className="btn"
          onClick={handleMicClick}
          disabled={isLoading}
          style={{ 
            padding: '0.75rem', 
            background: isListening ? 'rgba(239, 68, 68, 0.2)' : 'transparent',
            borderColor: isListening ? '#ef4444' : 'var(--border-color)', 
            color: isListening ? '#ef4444' : 'var(--text-secondary)' 
          }}
          title="Nhập bằng giọng nói (Tiếng Trung)"
        >
          <Mic size={20} className={isListening ? "animate-pulse" : ""} />
        </button>
        <input
          type="text"
          placeholder="Nhập tin nhắn..."
          value={chatInput}
          onChange={(e) => setChatInput(e.target.value)}
          disabled={isLoading}
        />
        <button type="submit" className="btn" disabled={isLoading}>
          <Send size={20} />
        </button>
      </form>
    </div>
  );
};

export default ChatAI;
