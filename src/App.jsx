import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Settings, BookOpen, MessageCircle, PenTool, ChevronLeft, Send, Sparkles, X, Loader2, Volume2, TrendingUp, Brain, FileText, Search, Users, PieChart, Calendar, Award } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart as RePieChart, Pie, Legend } from 'recharts';
import { createAiClient, chatWithAI } from './services/aiService';
import { getSupabase } from './services/supabaseClient';
import GrammarCheck from './components/GrammarCheck';
import ChatAI from './components/ChatAI';
import VocabLearning from './components/VocabLearning';
import Quiz from './components/Quiz';
import Dictionary from './components/Dictionary';
import ReadingPractice from './components/ReadingPractice';
import Roleplay from './components/Roleplay';
import './index.css';

function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [apiKey, setApiKey] = useState(localStorage.getItem('ai_api_key') || '');
  const [model, setModel] = useState(localStorage.getItem('ai_model') || 'gpt-3.5-turbo');
  const [baseURL, setBaseURL] = useState(localStorage.getItem('ai_base_url') || 'https://api.openai.com/v1');

  // Supabase State (Using Environment Variables)
  const sbUrl = import.meta.env.VITE_SUPABASE_URL;
  const sbKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
  const [user, setUser] = useState(null);
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [isLoginView, setIsLoginView] = useState(true);
  const [vocabHistory, setVocabHistory] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
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

  // Chat State extracted to ChatAI.jsx

  // Vocab State extracted to VocabLearning.jsx

  // Grammar State has been extracted to GrammarCheck component

  // Other states extracted to components

  // Functions extracted to components

  // Chat scroll logic extracted to ChatAI.jsx

  const handleSaveSettings = () => {
    localStorage.setItem('ai_api_key', apiKey);
    localStorage.setItem('ai_model', model);
    localStorage.setItem('ai_base_url', baseURL);
    setIsSettingsOpen(false);
  };

  // handleSendMessage extracted to ChatAI.jsx

  // handleGenerateVocab extracted to VocabLearning.jsx

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

    // toggleCardFlip extracted to VocabLearning.jsx

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

    // handleCheckGrammar moved to GrammarCheck component

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

                  <div className="glass-card feature-card animate-fade-in delay-5" onClick={() => setActiveTab('quiz')}>
                    <div className="feature-icon-wrapper" style={{ background: 'linear-gradient(135deg, #f59e0b, #ef4444)' }}>
                      <Brain size={32} />
                    </div>
                    <h3>Trắc Nghiệm AI</h3>
                    <p className="text-secondary" style={{ color: 'var(--text-secondary)' }}>Kiểm tra trí nhớ với 5 câu hỏi ngẫu nhiên từ kho từ vựng của bạn.</p>
                  </div>

                  <div className="glass-card feature-card animate-fade-in delay-6" onClick={() => setActiveTab('reading')}>
                    <div className="feature-icon-wrapper" style={{ background: 'linear-gradient(135deg, #8b5cf6, #3b82f6)' }}>
                      <FileText size={32} />
                    </div>
                    <h3>Luyện Đọc Hiểu</h3>
                    <p className="text-secondary" style={{ color: 'var(--text-secondary)' }}>Đọc các đoạn văn do AI viết riêng dựa trên từ vựng bạn đã học.</p>
                  </div>

                  <div className="glass-card feature-card animate-fade-in delay-7" onClick={() => setActiveTab('dictionary')}>
                    <div className="feature-icon-wrapper" style={{ background: 'linear-gradient(135deg, #06b6d4, #3b82f6)' }}>
                      <Search size={32} />
                    </div>
                    <h3>Từ Điển Thông Minh</h3>
                    <p className="text-secondary" style={{ color: 'var(--text-secondary)' }}>Tra cứu từ vựng với giải nghĩa sâu sắc và nguồn gốc Hán tự từ AI.</p>
                  </div>

                  <div className="glass-card feature-card animate-fade-in delay-8" onClick={() => setActiveTab('roleplay')}>
                    <div className="feature-icon-wrapper" style={{ background: 'linear-gradient(135deg, #ec4899, #f43f5e)' }}>
                      <Users size={32} />
                    </div>
                    <h3>Mô Phỏng Tình Huống</h3>
                    <p className="text-secondary" style={{ color: 'var(--text-secondary)' }}>Đóng vai giao tiếp trong các tình huống thực tế như mua sắm, sân bay.</p>
                  </div>

                  <div className="glass-card feature-card animate-fade-in delay-9" onClick={() => setActiveTab('stats')}>
                    <div className="feature-icon-wrapper" style={{ background: 'linear-gradient(135deg, #14b8a6, #10b981)' }}>
                      <PieChart size={32} />
                    </div>
                    <h3>Thống Kê Nâng Cao</h3>
                    <p className="text-secondary" style={{ color: 'var(--text-secondary)' }}>Phân tích thói quen học tập, điểm mạnh và điểm yếu của bạn.</p>
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
              <ChatAI
                apiKey={apiKey}
                baseURL={baseURL}
                model={model}
                setActiveTab={setActiveTab}
                handleSpeak={handleSpeak}
              />
            )}

            {/* Grammar Tab */}
            {activeTab === 'grammar' && (
              <GrammarCheck 
                apiKey={apiKey} 
                baseURL={baseURL} 
                model={model} 
                setActiveTab={setActiveTab} 
                handleSpeak={handleSpeak} 
              />
            )}

            {/* Vocab Tab */}
            {activeTab === 'vocab' && (
              <VocabLearning
                apiKey={apiKey}
                baseURL={baseURL}
                model={model}
                setActiveTab={setActiveTab}
                handleSpeak={handleSpeak}
                user={user}
                sbUrl={sbUrl}
                sbKey={sbKey}
                vocabHistory={vocabHistory}
              />
            )}
            {/* Quiz Tab */}
            {activeTab === 'quiz' && (
              <Quiz
                vocabHistory={vocabHistory}
                setActiveTab={setActiveTab}
                handleSpeak={handleSpeak}
              />
            )}
            {/* Reading Tab */}
            {activeTab === 'reading' && (
              <ReadingPractice
                vocabHistory={vocabHistory}
                setActiveTab={setActiveTab}
                handleSpeak={handleSpeak}
                apiKey={apiKey}
                baseURL={baseURL}
                model={model}
              />
            )}
            {/* Stats Tab */}
            {activeTab === 'stats' && (
              <div className="glass-card animate-fade-in" style={{ maxWidth: '1000px', margin: '0 auto' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
                  <button className="btn btn-outline" style={{ padding: '0.5rem' }} onClick={() => setActiveTab('dashboard')}>
                    <ChevronLeft size={20} />
                  </button>
                  <h2>Phân Tích & Thống Kê</h2>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem', marginBottom: '3rem' }}>
                  <div style={{ background: 'rgba(59, 130, 246, 0.1)', padding: '1.5rem', borderRadius: '16px', textAlign: 'center', border: '1px solid rgba(59, 130, 246, 0.2)' }}>
                    <BookOpen size={24} color="#3b82f6" style={{ marginBottom: '0.5rem' }} />
                    <div style={{ fontSize: '2rem', fontWeight: '800' }}>{vocabHistory.length}</div>
                    <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Tổng số từ vựng</div>
                  </div>
                  <div style={{ background: 'rgba(236, 72, 153, 0.1)', padding: '1.5rem', borderRadius: '16px', textAlign: 'center', border: '1px solid rgba(236, 72, 153, 0.2)' }}>
                    <Calendar size={24} color="#ec4899" style={{ marginBottom: '0.5rem' }} />
                    <div style={{ fontSize: '2rem', fontWeight: '800' }}>{new Set(vocabHistory.map(v => new Date(v.created_at).toLocaleDateString())).size}</div>
                    <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Số ngày học tập</div>
                  </div>
                  <div style={{ background: 'rgba(139, 92, 246, 0.1)', padding: '1.5rem', borderRadius: '16px', textAlign: 'center', border: '1px solid rgba(139, 92, 246, 0.2)' }}>
                    <TrendingUp size={24} color="#8b5cf6" style={{ marginBottom: '0.5rem' }} />
                    <div style={{ fontSize: '2rem', fontWeight: '800' }}>{Math.round(vocabHistory.length / Math.max(1, new Set(vocabHistory.map(v => new Date(v.created_at).toLocaleDateString())).size))}</div>
                    <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Từ mỗi ngày (TB)</div>
                  </div>
                  <div style={{ background: 'rgba(16, 185, 129, 0.1)', padding: '1.5rem', borderRadius: '16px', textAlign: 'center', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
                    <Award size={24} color="#10b981" style={{ marginBottom: '0.5rem' }} />
                    <div style={{ fontSize: '2rem', fontWeight: '800' }}>{Math.floor(vocabHistory.length / 50) + 1}</div>
                    <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Cấp độ đạt được</div>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '2rem' }}>
                  <div className="glass-card" style={{ padding: '2rem', background: 'rgba(0,0,0,0.2)' }}>
                    <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <PieChart size={20} color="var(--primary-color)" /> Phân bổ theo chủ đề
                    </h3>
                    <div style={{ height: '300px' }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <RePieChart>
                          <Pie
                            data={(() => {
                              const topicStats = Object.entries(vocabHistory.reduce((acc, curr) => {
                                const topic = curr.topic || 'Khác';
                                acc[topic] = (acc[topic] || 0) + 1;
                                return acc;
                              }, {})).sort((a, b) => b[1] - a[1]);
                              
                              const top5 = topicStats.slice(0, 5).map(([name, value]) => ({ name, value }));
                              const othersCount = topicStats.slice(5).reduce((sum, t) => sum + t[1], 0);
                              if (othersCount > 0) top5.push({ name: 'Khác', value: othersCount });
                              return top5;
                            })()}
                            cx="50%"
                            cy="45%"
                            innerRadius={70}
                            outerRadius={100}
                            paddingAngle={8}
                            dataKey="value"
                            stroke="none"
                            cornerRadius={6}
                          >
                            {[0, 1, 2, 3, 4, 5].map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={[`#6366f1`, `#ec4899`, `#8b5cf6`, `#10b981`, `#f59e0b`, `#64748b`][index % 6]} />
                            ))}
                          </Pie>
                          <Tooltip 
                            contentStyle={{ background: '#18181b', border: '1px solid var(--border-color)', borderRadius: '16px', boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }}
                            itemStyle={{ color: '#fff', fontSize: '14px', fontWeight: '500' }}
                          />
                          <Legend 
                            verticalAlign="bottom" 
                            align="center" 
                            iconType="circle"
                            iconSize={10}
                            wrapperStyle={{ paddingTop: '20px', fontSize: '13px' }}
                          />
                        </RePieChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  <div className="glass-card" style={{ padding: '2rem', background: 'rgba(0,0,0,0.2)' }}>
                    <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <TrendingUp size={20} color="var(--secondary-color)" /> Xu hướng 7 ngày qua
                    </h3>
                    <div style={{ height: '300px' }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart 
                          data={Object.entries(vocabHistory.reduce((acc, curr) => {
                            const date = new Date(curr.created_at).toLocaleDateString('vi-VN', { weekday: 'short' });
                            acc[date] = (acc[date] || 0) + 1;
                            return acc;
                          }, {})).map(([name, value]) => ({ name, value })).reverse().slice(-7)}
                          margin={{ top: 20, right: 30, left: 0, bottom: 0 }}
                        >
                          <XAxis 
                            dataKey="name" 
                            stroke="var(--text-secondary)" 
                            fontSize={12} 
                            tickLine={false} 
                            axisLine={false} 
                            dy={10}
                          />
                          <Tooltip 
                            cursor={{ fill: 'rgba(255,255,255,0.03)', radius: 10 }}
                            contentStyle={{ background: '#18181b', border: '1px solid var(--border-color)', borderRadius: '16px', boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }}
                          />
                          <Bar dataKey="value" barSize={35} radius={[10, 10, 10, 10]}>
                            {Object.entries(vocabHistory.reduce((acc, curr) => {
                                const date = new Date(curr.created_at).toLocaleDateString('vi-VN', { weekday: 'short' });
                                acc[date] = (acc[date] || 0) + 1;
                                return acc;
                              }, {})).map((entry, index) => (
                              <Cell key={`cell-${index}`} fill="url(#barGradient)" />
                            ))}
                          </Bar>
                          <defs>
                            <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="var(--primary-color)" />
                              <stop offset="100%" stopColor="var(--secondary-color)" />
                            </linearGradient>
                          </defs>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>
              </div>
            )}
            {/* Dictionary Tab */}
            {activeTab === 'dictionary' && (
              <Dictionary
                apiKey={apiKey}
                baseURL={baseURL}
                model={model}
                setActiveTab={setActiveTab}
                handleSpeak={handleSpeak}
                user={user}
                sbUrl={sbUrl}
                sbKey={sbKey}
                fetchVocabHistory={fetchVocabHistory}
              />
            )}
            {/* Roleplay Tab */}
            {activeTab === 'roleplay' && (
              <Roleplay
                apiKey={apiKey}
                baseURL={baseURL}
                model={model}
                setActiveTab={setActiveTab}
                handleSpeak={handleSpeak}
              />
            )}
          </main>
        )}
      </div>
    );
  }

  export default App;
