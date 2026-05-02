import React, { useState, useRef, useEffect } from 'react';
import { ChevronLeft, Volume2, Loader2, Send } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { createAiClient, chatWithAI } from '../services/aiService';

const ChatAI = ({ apiKey, baseURL, model, setActiveTab, handleSpeak }) => {
  const [chatInput, setChatInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState([
    { role: 'assistant', content: '你好！Tôi là trợ lý AI học tiếng Trung của bạn. Bạn muốn luyện tập chủ đề gì hôm nay?' }
  ]);
  const messagesEndRef = useRef(null);

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
        content: 'You are a helpful Chinese learning assistant. Your answers must be short and educational. You can communicate in both Vietnamese and Chinese. When the user speaks Chinese, correct their grammar if necessary. CRITICAL RULE: You MUST ONLY answer questions or discuss topics strictly related to learning the Chinese language or Chinese culture. If the user asks about ANYTHING else (e.g., coding, math, general knowledge, etc.), politely decline in Vietnamese, remind them that you are strictly a Chinese learning assistant, and ask them to return to the topic of studying Chinese.'
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
        <input
          type="text"
          placeholder="Nhập tin nhắn bằng tiếng Trung hoặc tiếng Việt..."
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
