import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Settings, BookOpen, MessageCircle, PenTool, ChevronLeft, Send, Sparkles, X, Loader2, Volume2, TrendingUp } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { createAiClient, chatWithAI } from './services/aiService';
import { getSupabase } from './services/supabaseClient';
import './index.css';

function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [apiKey, setApiKey] = useState(localStorage.getItem('ai_api_key') || '');
  const [model, setModel] = useState(localStorage.getItem('ai_model') || 'gpt-3.5-turbo');
  const [baseURL, setBaseURL] = useState(localStorage.getItem('ai_base_url') || 'https://api.openai.com/v1');

  // Supabase State (Hardcoded & Hidden)
  const [sbUrl] = useState('https://exwejgqnbrtnwmncpkih.supabase.co');
  const [sbKey] = useState('sb_publishable_UbOzWOseE86hIDoz6OFffw_RokGxNPJ');
  const [user, setUser] = useState(null);
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [isLoginView, setIsLoginView] = useState(true);
  const [vocabHistory, setVocabHistory] = useState([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [selectedTopic, setSelectedTopic] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Auth Listener
  useEffect(() => {
    const supabase = getSupabase(sbUrl, sbKey);
    if (!supabase) return;

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    // Listen for changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        // Tải lịch sử ngay khi đăng nhập để tránh lặp từ khi tạo mới
        fetchVocabHistory(true);
      } else {
        setVocabHistory([]);
      }
    });

    return () => subscription.unsubscribe();
  }, [sbUrl, sbKey]);

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
        content: 'You are a helpful Chinese learning assistant. Your answers must be short and educational. You can communicate in both Vietnamese and Chinese. When the user speaks Chinese, correct their grammar if necessary.'
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

  const handleGenerateVocab = async (e) => {
    e.preventDefault();
    if (!vocabTopic.trim() || isGeneratingVocab) return;

    setIsGeneratingVocab(true);
    setFlashcards([]);
    setFlippedCards({});

    try {
      const client = createAiClient(apiKey, baseURL);

      // Lấy danh sách từ đã học để yêu cầu AI không lặp lại
      const learnedWords = vocabHistory
        .filter(item => (item.topic || '').toLowerCase() === vocabTopic.toLowerCase())
        .map(item => item.hanzi)
        .slice(0, 50) // Giới hạn để tránh prompt quá dài
        .join(', ');

      const prompt = `Generate a JSON array of 6 NEW and UNIQUE Chinese vocabulary words related to the topic "${vocabTopic}". 
      ${learnedWords ? `IMPORTANT: Do NOT repeat any of these already learned words: ${learnedWords}.` : ''}
      Each object must have exactly these keys: 
      "hanzi" (Chinese characters), 
      "pinyin" (Pinyin), 
      "meaning" (Vietnamese translation), 
      "example" (A short Chinese example sentence containing the word). 
      Return ONLY the JSON array without markdown backticks.`;

      const responseContent = await chatWithAI(client, [{ role: 'user', content: prompt }], model);
      let cleanedJSON = responseContent.replace(/<(think|thinking)>[\s\S]*?<\/\1>/gi, '').trim();

      // Ưu tiên trích xuất từ khối markdown nếu có
      const jsonMatch = cleanedJSON.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
      if (jsonMatch) {
        cleanedJSON = jsonMatch[1];
      } else {
        // Fallback: Tìm dấu ngoặc vuông đầu và cuối
        const startIdx = cleanedJSON.indexOf('[');
        const endIdx = cleanedJSON.lastIndexOf(']');
        if (startIdx >= 0 && endIdx >= 0) {
          cleanedJSON = cleanedJSON.substring(startIdx, endIdx + 1);
        }
      }

      let parsedCards = JSON.parse(cleanedJSON);
      if (!Array.isArray(parsedCards)) {
        // Fallback: Nếu AI lỡ trả về object thay vì mảng, thử tìm mảng bên trong
        const possibleArray = Object.values(parsedCards).find(val => Array.isArray(val));
        if (possibleArray) {
          parsedCards = possibleArray;
        } else {
          throw new Error("Dữ liệu AI trả về không đúng định dạng (không phải mảng JSON)");
        }
      }
      
      setFlashcards(parsedCards);

      // Save to Supabase if configured and logged in
      const supabase = getSupabase(sbUrl, sbKey);
      if (supabase && user) {
        const dataToInsert = parsedCards.map(card => ({
          ...card,
          topic: vocabTopic,
          user_id: user.id
        }));
        const { error } = await supabase.from('vocab_history').insert(dataToInsert);
        if (error) console.error('Lỗi lưu Supabase:', error.message);
      }
    } catch (error) {
      console.error('Lỗi chi tiết:', error);
      alert(`Lỗi tạo từ vựng: ${error.message}. Hãy thử lại hoặc kiểm tra API Key.`);
    } finally {
      setIsGeneratingVocab(false);
    }
  };

  const handleAuth = async (e) => {
    e.preventDefault();
    const supabase = getSupabase(sbUrl, sbKey);
    if (!supabase) return;

    setIsLoading(true);
    try {
      if (isLoginView) {
        const { error } = await supabase.auth.signInWithPassword({
          email: authEmail,
          password: authPassword,
        });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signUp({
          email: authEmail,
          password: authPassword,
        });
        if (error) throw error;
        alert('Đăng ký thành công! Bạn có thể đăng nhập ngay.');
        setIsLoginView(true);
      }
    } catch (error) {
      alert(`Lỗi xác thực: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    const supabase = getSupabase(sbUrl, sbKey);
    await supabase?.auth.signOut();
  };

  const fetchVocabHistory = async (silent = false) => {
    const supabase = getSupabase(sbUrl, sbKey);
    if (!supabase) return;

    if (!silent) {
      setIsLoadingHistory(true);
      setSearchTerm(''); // Reset thanh tìm kiếm khi mở lịch sử
    }
    
    try {
      const { data, error } = await supabase
        .from('vocab_history')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setVocabHistory(data || []);
      setSelectedTopic(null); 
      if (!silent) setActiveTab('history');
    } catch (error) {
      if (!silent) alert(`Lỗi lấy lịch sử: ${error.message}`);
    } finally {
      if (!silent) setIsLoadingHistory(false);
    }
  };

  const handleSpeak = (text) => {
    if (!window.speechSynthesis) {
      alert('Trình duyệt của bạn không hỗ trợ phát âm.');
      return;
    }
    // Hủy các yêu cầu phát âm trước đó để tránh bị chồng chéo
    window.speechSynthesis.cancel();
    
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'zh-CN'; // Thiết lập tiếng Trung
    utterance.rate = 0.8;    // Tốc độ chậm một chút để dễ nghe
    window.speechSynthesis.speak(utterance);
  };

  const toggleCardFlip = (index) => {
    setFlippedCards(prev => ({ ...prev, [index]: !prev[index] }));
  };

  const chartData = useMemo(() => {
    const last7Days = [...Array(7)].map((_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      return d.toISOString().split('T')[0];
    });

    return last7Days.map(date => {
      const count = vocabHistory.filter(item => 
        item.created_at && item.created_at.startsWith(date)
      ).length;
      return { 
        day: new Date(date).toLocaleDateString('vi-VN', { weekday: 'short' }), 
        count: count 
      };
    });
  }, [vocabHistory]);

  const groupedTopics = useMemo(() => {
    const filtered = vocabHistory.filter(item => {
      const search = searchTerm.toLowerCase();
      return (
        (item.hanzi || '').toLowerCase().includes(search) ||
        (item.pinyin || '').toLowerCase().includes(search) ||
        (item.meaning || '').toLowerCase().includes(search) ||
        (item.topic || '').toLowerCase().includes(search)
      );
    });

    const grouped = filtered.reduce((acc, item) => {
      const topic = (item.topic || 'Chưa phân loại').trim().toLowerCase();
      acc[topic] = (acc[topic] || 0) + 1;
      return acc;
    }, {});

    return Object.keys(grouped).map(topicId => ({
      id: topicId,
      display: topicId.charAt(0).toUpperCase() + topicId.slice(1),
      count: vocabHistory.filter(item => (item.topic || '').toLowerCase() === topicId).length
    }));
  }, [vocabHistory, searchTerm]);

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
      let cleanedJSON = responseContent.replace(/<(think|thinking)>[\s\S]*?<\/\1>/gi, '').trim();

      // Ưu tiên trích xuất từ khối markdown nếu có
      const jsonMatch = cleanedJSON.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
      if (jsonMatch) {
        cleanedJSON = jsonMatch[1];
      } else {
        // Fallback: Tìm dấu ngoặc nhọn đầu và cuối
        const startIdx = cleanedJSON.indexOf('{');
        const endIdx = cleanedJSON.lastIndexOf('}');
        if (startIdx >= 0 && endIdx >= 0) {
          cleanedJSON = cleanedJSON.substring(startIdx, endIdx + 1);
        }
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
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          {user && (
            <div style={{ textAlign: 'right', marginRight: '1rem' }}>
              <p style={{ fontSize: '0.8rem', opacity: 0.7 }}>{user.email}</p>
              <button onClick={handleLogout} style={{ background: 'none', border: 'none', color: 'var(--secondary-color)', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 'bold' }}>Đăng xuất</button>
            </div>
          )}
          <button className="btn btn-outline" onClick={() => setIsSettingsOpen(true)}>
            <Settings size={20} /> Cài đặt AI
          </button>
        </div>
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

      {!user ? (
        <div className="glass-card animate-fade-in" style={{ maxWidth: '450px', margin: '4rem auto', padding: '3rem' }}>
          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <Sparkles size={48} style={{ color: 'var(--primary-color)', marginBottom: '1rem' }} />
            <h2>{isLoginView ? 'Chào mừng quay lại!' : 'Tạo tài khoản mới'}</h2>
            <p className="text-secondary">Đăng nhập để lưu lịch sử học tập của riêng bạn.</p>
          </div>

          <form onSubmit={handleAuth} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div className="input-group">
              <label>Email</label>
              <input type="email" placeholder="email@example.com" value={authEmail} onChange={(e) => setAuthEmail(e.target.value)} required />
            </div>
            <div className="input-group">
              <label>Mật khẩu</label>
              <input type="password" placeholder="••••••••" value={authPassword} onChange={(e) => setAuthPassword(e.target.value)} required />
            </div>
            <button className="btn" type="submit" disabled={isLoading}>
              {isLoading ? 'Đang xử lý...' : (isLoginView ? 'Đăng Nhập' : 'Đăng Ký')}
            </button>
          </form>

          <p style={{ textAlign: 'center', marginTop: '2rem', color: 'var(--text-secondary)' }}>
            {isLoginView ? 'Chưa có tài khoản?' : 'Đã có tài khoản?'} {' '}
            <span 
              onClick={() => setIsLoginView(!isLoginView)} 
              style={{ color: 'var(--primary-color)', cursor: 'pointer', fontWeight: 'bold' }}
            >
              {isLoginView ? 'Đăng ký ngay' : 'Đăng nhập'}
            </span>
          </p>
        </div>
      ) : (
        <main>
          {activeTab === 'dashboard' && (
            <>
              {/* Progress Chart Section */}
              <div className="glass-card animate-fade-in" style={{ marginBottom: '2rem', padding: '1.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', marginBottom: '1.5rem' }}>
                  <TrendingUp className="text-primary-color" size={24} />
                  <h3 style={{ fontSize: '1.2rem' }}>Tiến Trình Học Tập (7 ngày qua)</h3>
                </div>
                <div style={{ height: '200px', width: '100%' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData}>
                      <XAxis 
                        dataKey="day" 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fill: 'var(--text-secondary)', fontSize: 12 }} 
                      />
                      <YAxis hide />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'rgba(15, 23, 42, 0.9)', 
                          border: '1px solid var(--border-color)',
                          borderRadius: '8px',
                          color: 'white'
                        }}
                        itemStyle={{ color: 'var(--primary-color)' }}
                        cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                      />
                      <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                        {chartData.map((entry, index) => (
                          <Cell 
                            key={`cell-${index}`} 
                            fill={entry.count > 0 ? 'var(--primary-color)' : 'rgba(255,255,255,0.1)'} 
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <p style={{ marginTop: '1rem', fontSize: '0.85rem', color: 'var(--text-secondary)', textAlign: 'center' }}>
                  Tổng cộng: <span style={{ color: 'var(--primary-color)', fontWeight: 'bold' }}>{vocabHistory.length}</span> từ vựng đã được lưu trữ.
                </p>
              </div>

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
            <div className="glass-card feature-card animate-fade-in delay-4" onClick={() => fetchVocabHistory()}>
              <div className="feature-icon-wrapper" style={{ background: 'linear-gradient(135deg, #10b981, #3b82f6)' }}>
                <BookOpen size={32} />
              </div>
              <h3>Lịch Sử Từ Vựng</h3>
              <p className="text-secondary" style={{ color: 'var(--text-secondary)' }}>Xem lại tất cả các từ vựng bạn đã từng tạo từ AI và lưu trên Supabase.</p>
            </div>
          </div>
        </>
      )}

        {/* History Tab */}
        {activeTab === 'history' && (
          <div className="glass-card animate-fade-in">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '2rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <button className="btn btn-outline" style={{ padding: '0.5rem' }} onClick={() => selectedTopic ? setSelectedTopic(null) : setActiveTab('dashboard')}>
                  <ChevronLeft size={20} />
                </button>
                <h2>{selectedTopic ? `Chủ đề: ${selectedTopic}` : 'Lịch Sử Từ Vựng'}</h2>
              </div>
              
              {!isLoadingHistory && vocabHistory.length > 0 && (
                <div className="search-bar" style={{ position: 'relative' }}>
                  <input 
                    type="text" 
                    placeholder="Tìm kiếm chữ Hán, Pinyin, ý nghĩa hoặc chủ đề..." 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    style={{ paddingLeft: '2.5rem' }}
                  />
                  <Sparkles size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--primary-color)', opacity: 0.7 }} />
                </div>
              )}
            </div>

            {isLoadingHistory ? (
              <div style={{ textAlign: 'center', padding: '3rem' }}>
                <Loader2 size={40} className="animate-spin" style={{ margin: '0 auto 1rem' }} />
                <p>Đang tải dữ liệu từ Supabase...</p>
              </div>
            ) : vocabHistory.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
                <BookOpen size={48} style={{ margin: '0 auto 1rem', opacity: 0.5 }} />
                <p>Chưa có lịch sử từ vựng nào được lưu.</p>
              </div>
            ) : !selectedTopic ? (
              /* Topic Selection View */
              <div className="feature-grid">
                {groupedTopics.map((topic) => (
                  <div key={topic.id} className="glass-card animate-fade-in" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: '1rem', cursor: 'pointer', padding: '2rem' }} onClick={() => setSelectedTopic(topic.id)}>
                    <div className="feature-icon-wrapper" style={{ background: 'linear-gradient(135deg, var(--primary-color), var(--secondary-color))' }}>
                      <BookOpen size={32} />
                    </div>
                    <h3 style={{ marginTop: '0.5rem', marginBottom: '0' }}>{topic.display}</h3>
                    <p className="text-secondary" style={{ color: 'var(--text-secondary)', margin: '0' }}>
                      {topic.count} từ vựng
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              /* Words in Topic View */
              <div className="vocab-grid animate-fade-in">
                {vocabHistory
                  .filter(item => (item.topic || '').toLowerCase() === selectedTopic)
                  .filter(item => {
                    const search = searchTerm.toLowerCase();
                    return (
                      (item.hanzi || '').toLowerCase().includes(search) ||
                      (item.pinyin || '').toLowerCase().includes(search) ||
                      (item.meaning || '').toLowerCase().includes(search)
                    );
                  })
                  .map((item, idx) => (
                    <div key={item.id || idx} className="glass-card" style={{ padding: '1.5rem', background: 'rgba(255,255,255,0.03)', position: 'relative' }}>
                      <button className="speak-btn-small" style={{ position: 'absolute', right: '1rem', top: '1rem' }} onClick={() => handleSpeak(item.hanzi)}>
                        <Volume2 size={16} />
                      </button>
                      <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--primary-color)' }}>{item.hanzi}</div>
                      <div style={{ color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>{item.pinyin}</div>
                      <div style={{ fontWeight: '600', marginBottom: '0.5rem' }}>{item.meaning}</div>
                      <div style={{ fontSize: '0.9rem', fontStyle: 'italic', opacity: 0.8 }}>{item.example}</div>
                    </div>
                  ))}
              </div>
            )}
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
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <p style={{ fontSize: '1.2rem', fontWeight: '500' }}>{grammarResult.corrected_text}</p>
                    <button className="speak-btn" onClick={() => handleSpeak(grammarResult.corrected_text)}>
                      <Volume2 size={18} />
                    </button>
                  </div>
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
                        <button 
                          className="speak-btn-card" 
                          onClick={(e) => { e.stopPropagation(); handleSpeak(card.hanzi); }}
                        >
                          <Volume2 size={20} />
                        </button>
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
      )}
    </div>
  );
}

export default App;
