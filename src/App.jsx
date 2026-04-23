import React, { useState, useEffect, useRef } from 'react';
import { Settings, BookOpen, MessageCircle, PenTool, ChevronLeft, Send, Sparkles, X, Loader2 } from 'lucide-react';
import { createAiClient, chatWithAI } from './services/aiService';
import './index.css';

function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [apiKey, setApiKey] = useState(localStorage.getItem('ai_api_key') || '');
  const [model, setModel] = useState(localStorage.getItem('ai_model') || 'qwen/qwen3-32b');
  const [baseURL, setBaseURL] = useState(localStorage.getItem('ai_base_url') || 'https://api.groq.com/openai/v1'); // Set default to Groq

  // Auto-fix base URL for Groq
  useEffect(() => {
    if (apiKey && apiKey.startsWith('gsk_') && baseURL === 'https://api.openai.com/v1') {
      setBaseURL('https://api.groq.com/openai/v1');
    }
  }, [apiKey, baseURL]);

  // Chat State
  const [chatInput, setChatInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState([
    { role: 'assistant', content: '你好！Tôi là trợ lý AI học tiếng Trung của bạn. Bạn muốn luyện tập chủ đề gì hôm nay?' }
  ]);
  const messagesEndRef = useRef(null);

  // Vocab State
  const [vocabTopic, setVocabTopic] = useState('');
  const [flashcards, setFlashcards] = useState([]);
  const [isGeneratingVocab, setIsGeneratingVocab] = useState(false);
  const [flippedCards, setFlippedCards] = useState({});

  // Grammar State
  const [grammarInput, setGrammarInput] = useState('');
  const [grammarResult, setGrammarResult] = useState(null);
  const [isCheckingGrammar, setIsCheckingGrammar] = useState(false);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSaveSettings = () => {
    localStorage.setItem('ai_api_key', apiKey);
    localStorage.setItem('ai_model', model);
    localStorage.setItem('ai_base_url', baseURL);
    setIsSettingsOpen(false);
  };

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
        content: 'Bạn là trợ lý học tiếng Trung chuyên nghiệp. Hãy trả lời ngắn gọn, tập trung vào kiến thức. Luôn trả lời bằng tiếng Việt và giải thích bằng tiếng Trung. Tuyệt đối không hiển thị quá trình suy nghĩ (thinking process) ra ngoài.'
      };

      const responseContent = await chatWithAI(client, [systemMessage, ...newMessages], model);

      setMessages([...newMessages, { role: 'assistant', content: responseContent }]);
    } catch (error) {
      setMessages([...newMessages, { role: 'assistant', content: `[Lỗi hệ thống]: ${error.message}. Hãy kiểm tra lại API Key hoặc Base URL trong Cài đặt.` }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateVocab = async (e) => {
    e.preventDefault();
    if (!vocabTopic.trim() || isGeneratingVocab) return;

    setIsGeneratingVocab(true);
    setFlashcards([]);
    setFlippedCards({});

    try {
      const client = createAiClient(apiKey, baseURL);
      const prompt = `Generate a JSON array of 6 Chinese vocabulary words related to the topic "${vocabTopic}". 
      Each object must have exactly these keys: 
      "hanzi" (Chinese characters), 
      "pinyin" (Pinyin), 
      "meaning" (Vietnamese translation), 
      "example" (A short Chinese example sentence containing the word). 
      Return ONLY the JSON array without markdown backticks.`;

      const responseContent = await chatWithAI(client, [{ role: 'user', content: prompt }], model);
      let cleanedJSON = responseContent.replace(/```json/gi, '').replace(/```/g, '').trim();

      const startIdx = cleanedJSON.indexOf('[');
      const endIdx = cleanedJSON.lastIndexOf(']');
      if (startIdx >= 0 && endIdx >= 0) {
        cleanedJSON = cleanedJSON.substring(startIdx, endIdx + 1);
      }

      const parsedCards = JSON.parse(cleanedJSON);
      setFlashcards(parsedCards);
    } catch (error) {
      alert(`Lỗi tạo từ vựng: ${error.message}`);
    } finally {
      setIsGeneratingVocab(false);
    }
  };

  const toggleCardFlip = (index) => {
    setFlippedCards(prev => ({ ...prev, [index]: !prev[index] }));
  };

  const handleCheckGrammar = async (e) => {
    e.preventDefault();
    if (!grammarInput.trim() || isCheckingGrammar) return;

    setIsCheckingGrammar(true);
    setGrammarResult(null);

    try {
      const client = createAiClient(apiKey, baseURL);
      const prompt = `Analyze the following Chinese text for any grammatical errors, awkward phrasing, or vocabulary mistakes.
      Text: "${grammarInput}"
      
      Respond STRICTLY in JSON format with exactly these keys:
      "corrected_text": The fully corrected version of the text (in Chinese).
      "is_correct": true or false (boolean) indicating if the original text was completely correct.
      "explanations": An array of strings, where each string explains an error found and why the correction was made (in Vietnamese). If no errors, put ["Câu của bạn đã hoàn hảo!"].
      
      Do not include any markdown backticks.`;

      const responseContent = await chatWithAI(client, [{ role: 'user', content: prompt }], model);
      let cleanedJSON = responseContent.replace(/```json/gi, '').replace(/```/g, '').trim();

      const startIdx = cleanedJSON.indexOf('{');
      const endIdx = cleanedJSON.lastIndexOf('}');
      if (startIdx >= 0 && endIdx >= 0) {
        cleanedJSON = cleanedJSON.substring(startIdx, endIdx + 1);
      }

      const parsedResult = JSON.parse(cleanedJSON);
      setGrammarResult(parsedResult);
    } catch (error) {
      alert(`Lỗi phân tích ngữ pháp: ${error.message}`);
    } finally {
      setIsCheckingGrammar(false);
    }
  };

  return (
    <div className="app-container">
      <header className="header animate-fade-in">
        <div>
          <h1>Học Tiếng Trung AI <Sparkles className="inline-block text-primary-color" size={32} /></h1>
          <p className="text-secondary">Nâng cao kỹ năng tiếng Trung của bạn với trợ lý AI thông minh.</p>
        </div>
        <button className="btn btn-outline" onClick={() => setIsSettingsOpen(true)}>
          <Settings size={20} /> Cài đặt API
        </button>
      </header>

      {/* Settings Modal */}
      <div className={`settings-panel ${isSettingsOpen ? 'active' : ''}`}>
        <div className="glass-card settings-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
            <h3>Cấu hình AI</h3>
            <button style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer' }} onClick={() => setIsSettingsOpen(false)}>
              <X size={24} />
            </button>
          </div>

          <div className="input-group">
            <label>API Key</label>
            <input
              type="password"
              placeholder="Nhập API key của bạn..."
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
            />
          </div>

          <div className="input-group">
            <label>Model</label>
            <input
              type="text"
              placeholder="VD: openai/gpt-oss-120b"
              value={model}
              onChange={(e) => setModel(e.target.value)}
            />
          </div>

          <div className="input-group">
            <label>Base URL (Tuỳ chọn)</label>
            <input
              type="text"
              placeholder="VD: https://api.openai.com/v1"
              value={baseURL}
              onChange={(e) => setBaseURL(e.target.value)}
            />
            <small style={{ color: 'var(--text-secondary)', marginTop: '0.5rem', display: 'block' }}>
              Key được lưu trữ an toàn trong trình duyệt (localStorage).
            </small>
          </div>

          <button className="btn" style={{ width: '100%' }} onClick={handleSaveSettings}>
            Lưu Cấu Hình
          </button>
        </div>
      </div>

      <main>
        {activeTab === 'dashboard' && (
          <div className="feature-grid">
            <div className="glass-card feature-card animate-fade-in delay-1" onClick={() => setActiveTab('chat')}>
              <div className="feature-icon-wrapper">
                <MessageCircle size={32} />
              </div>
              <h3>Luyện Giao Tiếp AI</h3>
              <p className="text-secondary" style={{ color: 'var(--text-secondary)' }}>Trò chuyện với AI bằng tiếng Trung để cải thiện phản xạ và phát âm.</p>
            </div>

            <div className="glass-card feature-card animate-fade-in delay-2" onClick={() => setActiveTab('vocab')}>
              <div className="feature-icon-wrapper">
                <BookOpen size={32} />
              </div>
              <h3>Học Từ Vựng</h3>
              <p className="text-secondary" style={{ color: 'var(--text-secondary)' }}>Flashcards thông minh tạo bởi AI kèm theo ví dụ ngữ cảnh.</p>
            </div>

            <div className="glass-card feature-card animate-fade-in delay-3" onClick={() => setActiveTab('grammar')}>
              <div className="feature-icon-wrapper">
                <PenTool size={32} />
              </div>
              <h3>Sửa Lỗi Ngữ Pháp</h3>
              <p className="text-secondary" style={{ color: 'var(--text-secondary)' }}>Phân tích câu của bạn, tìm lỗi và giải thích chi tiết bằng tiếng Việt.</p>
            </div>
          </div>
        )}

        {activeTab === 'chat' && (
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
                  {msg.content}
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
        )}

        {/* Grammar Tab */}
        {activeTab === 'grammar' && (
          <div className="glass-card animate-fade-in">
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
              <button className="btn btn-outline" style={{ padding: '0.5rem' }} onClick={() => setActiveTab('dashboard')}>
                <ChevronLeft size={20} />
              </button>
              <h2>Sửa Lỗi Ngữ Pháp</h2>
            </div>

            <form style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '2rem' }} onSubmit={handleCheckGrammar}>
              <textarea
                rows={4}
                placeholder="Nhập câu tiếng Trung bạn muốn kiểm tra (Ví dụ: 我昨天去买东西在超市)..."
                value={grammarInput}
                onChange={(e) => setGrammarInput(e.target.value)}
                disabled={isCheckingGrammar}
                style={{ resize: 'vertical' }}
              />
              <button type="submit" className="btn" disabled={isCheckingGrammar} style={{ alignSelf: 'flex-start' }}>
                {isCheckingGrammar ? <><Loader2 size={20} style={{ animation: 'spin 1s linear infinite' }} /> Đang phân tích...</> : <><PenTool size={20} /> Kiểm tra ngữ pháp</>}
              </button>
            </form>

            {grammarResult && (
              <div className="glass-card animate-fade-in" style={{ backgroundColor: 'rgba(15, 23, 42, 0.5)', border: `1px solid ${grammarResult.is_correct ? '#10b981' : 'var(--primary-color)'}` }}>
                <h3 style={{ color: grammarResult.is_correct ? '#10b981' : 'var(--primary-color)', marginBottom: '1rem' }}>
                  {grammarResult.is_correct ? 'Tuyệt vời! Không có lỗi sai.' : 'Đã tìm thấy lỗi cần sửa'}
                </h3>

                <div style={{ marginBottom: '1.5rem' }}>
                  <p className="text-secondary" style={{ fontSize: '0.9rem', marginBottom: '0.5rem' }}>Câu hoàn chỉnh:</p>
                  <p style={{ fontSize: '1.2rem', fontWeight: '500' }}>{grammarResult.corrected_text}</p>
                </div>

                <div>
                  <p className="text-secondary" style={{ fontSize: '0.9rem', marginBottom: '0.5rem' }}>Giải thích chi tiết:</p>
                  <ul style={{ listStylePosition: 'inside', color: 'var(--text-primary)', lineHeight: '1.6' }}>
                    {grammarResult.explanations.map((exp, idx) => (
                      <li key={idx} style={{ marginBottom: '0.5rem' }}>{exp}</li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Vocab Tab */}
        {activeTab === 'vocab' && (
          <div className="glass-card animate-fade-in">
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
              <button className="btn btn-outline" style={{ padding: '0.5rem' }} onClick={() => setActiveTab('dashboard')}>
                <ChevronLeft size={20} />
              </button>
              <h2>Học Từ Vựng AI</h2>
            </div>

            <form style={{ display: 'flex', gap: '1rem', marginBottom: '2rem' }} onSubmit={handleGenerateVocab}>
              <input
                type="text"
                placeholder="Nhập chủ đề (VD: Trái cây, Xin việc, Đồ ăn...)"
                value={vocabTopic}
                onChange={(e) => setVocabTopic(e.target.value)}
                disabled={isGeneratingVocab}
              />
              <button type="submit" className="btn" disabled={isGeneratingVocab} style={{ whiteSpace: 'nowrap' }}>
                {isGeneratingVocab ? <><Loader2 size={20} /> Đang tạo...</> : <><Sparkles size={20} /> Tạo Flashcards</>}
              </button>
            </form>

            {flashcards.length > 0 && (
              <div className="vocab-grid animate-fade-in">
                {flashcards.map((card, idx) => (
                  <div
                    key={idx}
                    className="flashcard-container"
                    onClick={() => toggleCardFlip(idx)}
                  >
                    <div className={`flashcard ${flippedCards[idx] ? 'flipped' : ''}`}>
                      <div className="flashcard-front">
                        <div className="word-hanzi">{card.hanzi}</div>
                        <div className="word-pinyin">{card.pinyin}</div>
                        <p style={{ marginTop: '1rem', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Nhấn để lật</p>
                      </div>
                      <div className="flashcard-back">
                        <div className="word-meaning">{card.meaning}</div>
                        <div className="word-example">"{card.example}"</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
