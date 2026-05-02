import React, { useState, useRef, useEffect } from 'react';
import { ChevronLeft, Loader2, Send, Volume2, Mic } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { createAiClient, chatWithAI } from '../services/aiService';

const scenarios = [
  { id: 1, title: 'Mua sắm tại chợ', icon: '🛍️', aiRole: 'Người bán hàng', userRole: 'Khách hàng', description: 'Tập mặc cả và hỏi giá sản phẩm.', openingLine: '你好，想买点什么？(Chào bạn, bạn muốn mua gì?)' },
  { id: 2, title: 'Tại nhà hàng', icon: '🍜', aiRole: 'Bồi bàn', userRole: 'Khách hàng', description: 'Gọi món và hỏi về các thành phần món ăn.', openingLine: '欢迎光临，请问几位？(Chào mừng quý khách, xin hỏi có mấy người?)' },
  { id: 3, title: 'Check-in sân bay', icon: '✈️', aiRole: 'Nhân viên sân bay', userRole: 'Hành khách', description: 'Thủ tục gửi hành lý và đổi vé.', openingLine: '您好，请出示您的护照和机票。(Chào bạn, vui lòng cho xem hộ chiếu và vé máy bay.)' },
  { id: 4, title: 'Phỏng vấn xin việc', icon: '💼', aiRole: 'Người phỏng vấn', userRole: 'Ứng viên', description: 'Giới thiệu bản thân và kinh nghiệm.', openingLine: '您好，请问您叫什么名字？(Xin chào, bạn tên là gì?)' },
  { id: 5, title: 'Đi khám bệnh', icon: '🏥', aiRole: 'Bác sĩ', userRole: 'Bệnh nhân', description: 'Mô tả triệu chứng và hỏi cách dùng thuốc.', openingLine: '你好，哪里不舒服？(Chào bạn, bạn cảm thấy không khỏe ở đâu?)' },
  { id: 6, title: 'Hỏi đường', icon: '🗺️', aiRole: 'Người dân địa phương', userRole: 'Khách du lịch', description: 'Hỏi đường đến các địa danh nổi tiếng.', openingLine: '你好，请问去天安门怎么走？(Chào bạn, cho hỏi đường đi Thiên An Môn đi thế nào?)' },
];

const Roleplay = ({ apiKey, baseURL, model, setActiveTab, handleSpeak, initialScenario, hskLevel }) => {
  const [roleplayScenario, setRoleplayScenario] = useState(initialScenario || null);
  const [isRoleplayLoading, setIsRoleplayLoading] = useState(false);
  const [rpMessages, setRpMessages] = useState(
    initialScenario ? [{ role: 'assistant', content: initialScenario.openingLine }] : []
  );
  const [rpInput, setRpInput] = useState('');
  const messagesEndRef = useRef(null);
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [rpMessages]);

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.lang = 'zh-CN';
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
          setRpInput(prev => (prev ? prev + ' ' : '') + finalTranscript);
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

  useEffect(() => {
    if (initialScenario && rpMessages.length === 0) {
      setRoleplayScenario(initialScenario);
      setRpMessages([{ role: 'assistant', content: initialScenario.openingLine }]);
    }
  }, [initialScenario]);

  const handleRpSendMessage = async (e) => {
    e.preventDefault();
    if (!rpInput.trim() || isRoleplayLoading) return;

    const userMsg = { role: 'user', content: rpInput };
    const newMsgs = [...rpMessages, userMsg];
    setRpMessages(newMsgs);
    setRpInput('');
    setIsRoleplayLoading(true);

    try {
      const client = createAiClient(apiKey, baseURL);
      const systemPrompt = `CONTINUE the roleplay as ${roleplayScenario.aiRole}.
      Target HSK Level: ${hskLevel || 'Any'}.
      Scenario: ${roleplayScenario.title}. 
      User role: ${roleplayScenario.userRole}.
      REMEMBER: Use vocabulary suitable for ${hskLevel || 'the current level'}.
      Format: Chinese response + Vietnamese translation in (). 
      IMPORTANT: Gently correct user mistakes in Vietnamese at the end.
      CRITICAL RULE: Refuse to answer any questions or requests that are not related to this roleplay scenario or learning Chinese. 
      TUYỆT ĐỐI KHÔNG cung cấp mã nguồn hay thực hiện tác vụ kỹ thuật. Nếu bị yêu cầu code, hãy từ chối thẳng thừng mà không đưa ra ví dụ.`;

      const responseContent = await chatWithAI(client, [
        { role: 'system', content: systemPrompt },
        ...newMsgs.slice(-6)
      ], model);

      const cleanContent = responseContent.replace(/<(think|thinking)>[\s\S]*?<\/\1>/gi, '').trim();
      setRpMessages([...newMsgs, { role: 'assistant', content: cleanContent }]);
    } catch (error) {
      alert(`Lỗi giao tiếp: ${error.message}`);
    } finally {
      setIsRoleplayLoading(false);
    }
  };

  if (!roleplayScenario) {
    return (
      <div className="glass-card animate-fade-in">
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
          <button className="btn btn-outline" style={{ padding: '0.5rem' }} onClick={() => setActiveTab('dashboard')}>
            <ChevronLeft size={20} />
          </button>
          <h2>Chọn Tình Huống Giao Tiếp</h2>
        </div>
        <div className="vocab-grid">
          {scenarios.map((scenario) => (
            <div key={scenario.id} className="glass-card feature-card animate-fade-in" style={{ cursor: 'pointer', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }} onClick={() => {
              setRoleplayScenario(scenario);
              setRpMessages([{ role: 'assistant', content: scenario.openingLine }]);
              setRpInput('');
            }}>
              <span style={{ fontSize: '2.5rem' }}>{scenario.icon}</span>
              <h3>{scenario.title}</h3>
              <p className="text-secondary" style={{ fontSize: '0.9rem' }}>{scenario.description}</p>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="glass-card chat-container animate-fade-in">
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem' }}>
        <button className="btn btn-outline" style={{ padding: '0.5rem' }} onClick={() => setRoleplayScenario(null)}>
          <ChevronLeft size={20} />
        </button>
        <div>
          <h2>{roleplayScenario.title}</h2>
          <p className="text-secondary" style={{ fontSize: '0.85rem' }}>Vai của bạn: {roleplayScenario.userRole}</p>
        </div>
      </div>

      <div className="chat-messages">
        {rpMessages.map((msg, idx) => (
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
        {isRoleplayLoading && (
          <div className="message ai" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Loader2 size={16} /> Đối tác đang nhập...
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <form className="chat-input-area" onSubmit={handleRpSendMessage}>
        <button
          type="button"
          className="btn"
          onClick={handleMicClick}
          disabled={isRoleplayLoading}
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
          placeholder="Nhập câu trả lời bằng tiếng Trung..."
          value={rpInput}
          onChange={(e) => setRpInput(e.target.value)}
          disabled={isRoleplayLoading}
        />
        <button type="submit" className="btn" disabled={isRoleplayLoading}>
          <Send size={20} />
        </button>
      </form>
    </div>
  );
};

export default Roleplay;
