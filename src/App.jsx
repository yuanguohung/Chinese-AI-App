import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Settings, BookOpen, MessageCircle, PenTool, ChevronLeft, Send, Sparkles, X, Loader2, Volume2, TrendingUp, Brain, FileText, Search, Users, PieChart, Calendar, Award } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart as RePieChart, Pie, Legend } from 'recharts';
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

  // Quiz State
  const [quizQuestions, setQuizQuestions] = useState([]);
  const [currentQuizIndex, setCurrentQuizIndex] = useState(0);
  const [quizScore, setQuizScore] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [isQuizFinished, setIsQuizFinished] = useState(false);

  // Reading State
  const [readingData, setReadingData] = useState(null);
  const [isGeneratingReading, setIsGeneratingReading] = useState(false);
  const [showPinyin, setShowPinyin] = useState(false);
  const [showTranslation, setShowTranslation] = useState(false);
  const [readingAnswers, setReadingAnswers] = useState({});

  // Dictionary State
  const [dictInput, setDictInput] = useState('');
  const [dictResult, setDictResult] = useState(null);
  const [isSearchingDict, setIsSearchingDict] = useState(false);

  const handleDictSearch = async (e) => {
    e.preventDefault();
    if (!dictInput.trim() || isSearchingDict) return;
    
    setIsSearchingDict(true);
    setDictResult(null);

    try {
      const client = createAiClient(apiKey, baseURL);
      const prompt = `Analyze the Chinese word or phrase: "${dictInput}". 
      Respond strictly in JSON format with these keys:
      "hanzi": "The word in Chinese characters",
      "pinyin": "The Pinyin",
      "meaning": "Detailed Vietnamese meaning",
      "etymology": "Detailed explanation of character origin, components, and bộ thủ in Vietnamese",
      "examples": [
        {"chinese": "...", "pinyin": "...", "vietnamese": "..."}
      ] (Generate 3 common examples)
      
      Do not include markdown backticks.`;

      const responseContent = await chatWithAI(client, [{ role: 'user', content: prompt }], model);
      let cleanedJSON = responseContent.replace(/<(think|thinking)>[\s\S]*?<\/\1>/gi, '').trim();
      
      const jsonMatch = cleanedJSON.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
      if (jsonMatch) {
        cleanedJSON = jsonMatch[1];
      } else {
        const startIdx = cleanedJSON.indexOf('{');
        const endIdx = cleanedJSON.lastIndexOf('}');
        if (startIdx >= 0 && endIdx >= 0) {
          cleanedJSON = cleanedJSON.substring(startIdx, endIdx + 1);
        }
      }

      const parsedResult = JSON.parse(cleanedJSON);
      setDictResult(parsedResult);
    } catch (error) {
      console.error('Lỗi tra từ điển:', error);
      alert(`Lỗi tra từ điển: ${error.message}`);
    } finally {
      setIsSearchingDict(false);
    }
  };

  const saveDictToHistory = async () => {
    if (!dictResult || !user) return;
    const supabase = getSupabase(sbUrl, sbKey);
    if (!supabase) return;

    try {
      const { error } = await supabase.from('vocab_history').insert([{
        user_id: user.id,
        hanzi: dictResult.hanzi,
        pinyin: dictResult.pinyin,
        meaning: dictResult.meaning,
        example: dictResult.examples[0]?.chinese || '',
        topic: 'Tra từ điển'
      }]);
      if (error) throw error;
      alert('Đã lưu vào lịch sử!');
      fetchVocabHistory(true);
    } catch (error) {
      alert(`Lỗi lưu từ: ${error.message}`);
    }
  };

  // Roleplay State
  const [roleplayScenario, setRoleplayScenario] = useState(null);
  const [isRoleplayLoading, setIsRoleplayLoading] = useState(false);
  const [rpMessages, setRpMessages] = useState([]);
  const [rpInput, setRpInput] = useState('');

  const scenarios = [
    { id: 1, title: 'Mua sắm tại chợ', icon: '🛍️', aiRole: 'Người bán hàng', userRole: 'Khách hàng', description: 'Tập mặc cả và hỏi giá sản phẩm.', openingLine: '你好，想买点什么？(Chào bạn, bạn muốn mua gì?)' },
    { id: 2, title: 'Tại nhà hàng', icon: '🍜', aiRole: 'Bồi bàn', userRole: 'Khách hàng', description: 'Gọi món và hỏi về các thành phần món ăn.', openingLine: '欢迎光临，请问几位？(Chào mừng quý khách, xin hỏi có mấy người?)' },
    { id: 3, title: 'Check-in sân bay', icon: '✈️', aiRole: 'Nhân viên sân bay', userRole: 'Hành khách', description: 'Thủ tục gửi hành lý và đổi vé.', openingLine: '您好，请出示您的护照和机票。(Chào bạn, vui lòng cho xem hộ chiếu và vé máy bay.)' },
    { id: 4, title: 'Phỏng vấn xin việc', icon: '💼', aiRole: 'Người phỏng vấn', userRole: 'Ứng viên', description: 'Giới thiệu bản thân và kinh nghiệm.', openingLine: '您好，请问您叫什么名字？(Xin chào, bạn tên là gì?)' },
    { id: 5, title: 'Đi khám bệnh', icon: '🏥', aiRole: 'Bác sĩ', userRole: 'Bệnh nhân', description: 'Mô tả triệu chứng và hỏi cách dùng thuốc.', openingLine: '你好，哪里不舒服？(Chào bạn, bạn cảm thấy không khỏe ở đâu?)' },
    { id: 6, title: 'Hỏi đường', icon: '🗺️', aiRole: 'Người dân địa phương', userRole: 'Khách du lịch', description: 'Hỏi đường đến các địa danh nổi tiếng.', openingLine: '你好，请问去天安门怎么走？(Chào bạn, cho hỏi đường đi Thiên An Môn đi thế nào?)' },
  ];

  const startRoleplay = (scenario) => {
    setRoleplayScenario(scenario);
    setRpMessages([{ role: 'assistant', content: scenario.openingLine }]);
    setRpInput('');
    setActiveTab('roleplay');
  };

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
      Scenario: ${roleplayScenario.title}. 
      User role: ${roleplayScenario.userRole}.
      REMEMBER: Chinese response + Vietnamese translation in (). 
      IMPORTANT: Gently correct user mistakes in Vietnamese at the end.`;

      const responseContent = await chatWithAI(client, [
        { role: 'system', content: systemPrompt },
        ...newMsgs.slice(-6) // Keep context
      ], model);
      
      const cleanContent = responseContent.replace(/<(think|thinking)>[\s\S]*?<\/\1>/gi, '').trim();
      setRpMessages([...newMsgs, { role: 'assistant', content: cleanContent }]);
    } catch (error) {
      alert(`Lỗi giao tiếp: ${error.message}`);
    } finally {
      setIsRoleplayLoading(false);
    }
  };

  const generateReading = async () => {
    if (vocabHistory.length < 5) {
      alert("Bạn cần có ít nhất 5 từ vựng trong lịch sử để tạo bài đọc!");
      return;
    }
    setIsGeneratingReading(true);
    setReadingData(null);
    setShowPinyin(false);
    setShowTranslation(false);
    setReadingAnswers({});

    try {
      const client = createAiClient(apiKey, baseURL);

      const shuffledVocab = [...vocabHistory].sort(() => 0.5 - Math.random());
      const selectedWords = shuffledVocab.slice(0, 10).map(w => w.hanzi).join(', ');

      const prompt = `Write a short, engaging Chinese story (about 100-150 words) that includes as many of these words as possible: ${selectedWords}.
      Respond STRICTLY in JSON format with exactly these keys:
      "title": "Story title in Chinese",
      "content_hanzi": "The story in Chinese characters only",
      "content_pinyin": "Pinyin for the entire story",
      "translation": "Vietnamese translation of the story",
      "questions": [
        {
          "question": "A reading comprehension question in Vietnamese about the story",
          "options": ["Option A", "Option B", "Option C", "Option D"],
          "answer": "The exact string of the correct option"
        }
      ] (Generate exactly 3 questions)
      
      Do not include any markdown backticks.`;

      const responseContent = await chatWithAI(client, [{ role: 'user', content: prompt }], model);
      let cleanedJSON = responseContent.replace(/<(think|thinking)>[\s\S]*?<\/\1>/gi, '').trim();

      const jsonMatch = cleanedJSON.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
      if (jsonMatch) {
        cleanedJSON = jsonMatch[1];
      } else {
        const startIdx = cleanedJSON.indexOf('{');
        const endIdx = cleanedJSON.lastIndexOf('}');
        if (startIdx >= 0 && endIdx >= 0) {
          cleanedJSON = cleanedJSON.substring(startIdx, endIdx + 1);
        }
      }

      const parsedData = JSON.parse(cleanedJSON);
      setReadingData(parsedData);
    } catch (error) {
      console.error('Lỗi tạo bài đọc:', error);
      alert(`Lỗi tạo bài đọc: ${error.message}`);
    } finally {
      setIsGeneratingReading(false);
    }
  };

  const startQuiz = () => {
    if (vocabHistory.length < 5) {
      alert('Bạn cần lưu ít nhất 5 từ vựng trong lịch sử để làm trắc nghiệm!');
      return;
    }

    const shuffledVocab = [...vocabHistory].sort(() => 0.5 - Math.random());
    const selectedWords = shuffledVocab.slice(0, 5);

    const questions = selectedWords.map(word => {
      let wrongOptions = vocabHistory
        .filter(w => w.meaning !== word.meaning)
        .sort(() => 0.5 - Math.random())
        .slice(0, 3)
        .map(w => w.meaning);

      // Đảm bảo đủ 4 đáp án nếu lịch sử quá ít từ khác nhau
      while (wrongOptions.length < 3) {
        wrongOptions.push("Đáp án ảo " + Math.floor(Math.random() * 100));
      }

      const options = [word.meaning, ...wrongOptions].sort(() => 0.5 - Math.random());

      return {
        word: word,
        options: options,
        correctAnswer: word.meaning
      };
    });

    setQuizQuestions(questions);
    setCurrentQuizIndex(0);
    setQuizScore(0);
    setSelectedAnswer(null);
    setIsQuizFinished(false);
    setActiveTab('quiz');
  };

  const handleQuizAnswer = (answer) => {
    if (selectedAnswer) return; // Không cho chọn lại

    setSelectedAnswer(answer);
    if (answer === quizQuestions[currentQuizIndex].correctAnswer) {
      setQuizScore(prev => prev + 1);
    }

    setTimeout(() => {
      if (currentQuizIndex < quizQuestions.length - 1) {
        setCurrentQuizIndex(prev => prev + 1);
        setSelectedAnswer(null);
      } else {
        setIsQuizFinished(true);
      }
    }, 1500);
  };

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

      const prompt = `Generate a JSON array of 8 NEW and UNIQUE Chinese vocabulary words related to the topic "${vocabTopic}". 
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

                  <div className="glass-card feature-card animate-fade-in delay-5" onClick={() => startQuiz()}>
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
            {/* Quiz Tab */}
            {activeTab === 'quiz' && quizQuestions.length > 0 && (
              <div className="glass-card animate-fade-in" style={{ maxWidth: '600px', margin: '0 auto' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
                  <button className="btn btn-outline" style={{ padding: '0.5rem' }} onClick={() => setActiveTab('dashboard')}>
                    <ChevronLeft size={20} />
                  </button>
                  <h2>Trắc Nghiệm Từ Vựng</h2>
                </div>

                {!isQuizFinished ? (
                  <div className="quiz-container animate-fade-in">
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', color: 'var(--text-secondary)' }}>
                      <span>Câu hỏi {currentQuizIndex + 1}/{quizQuestions.length}</span>
                      <span>Điểm: {quizScore}</span>
                    </div>

                    <div style={{ textAlign: 'center', padding: '3rem 1rem', background: 'rgba(0,0,0,0.2)', borderRadius: '16px', marginBottom: '2rem' }}>
                      <div style={{ fontSize: '4rem', fontWeight: 'bold', color: 'var(--primary-color)', marginBottom: '1rem' }}>
                        {quizQuestions[currentQuizIndex].word.hanzi}
                      </div>
                      <div style={{ fontSize: '1.2rem', color: 'var(--text-secondary)' }}>
                        {selectedAnswer ? quizQuestions[currentQuizIndex].word.pinyin : '???'}
                      </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                      {quizQuestions[currentQuizIndex].options.map((option, idx) => {
                        let btnStyle = { textAlign: 'left', padding: '1rem 1.5rem', fontSize: '1.1rem', justifyContent: 'flex-start' };
                        let className = "btn btn-outline";

                        if (selectedAnswer) {
                          if (option === quizQuestions[currentQuizIndex].correctAnswer) {
                            className = "btn";
                            btnStyle.background = '#10b981'; // Green for correct
                            btnStyle.borderColor = '#10b981';
                          } else if (option === selectedAnswer) {
                            className = "btn";
                            btnStyle.background = '#ef4444'; // Red for wrong
                            btnStyle.borderColor = '#ef4444';
                          } else {
                            btnStyle.opacity = 0.5;
                          }
                        }

                        return (
                          <button
                            key={idx}
                            className={className}
                            style={btnStyle}
                            onClick={() => handleQuizAnswer(option)}
                            disabled={!!selectedAnswer}
                          >
                            {option}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="quiz-result animate-fade-in" style={{ textAlign: 'center', padding: '3rem 1rem' }}>
                    <Brain size={64} style={{ color: 'var(--primary-color)', margin: '0 auto 1.5rem' }} />
                    <h2 style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>Kết quả của bạn</h2>
                    <div style={{ fontSize: '4rem', fontWeight: 'bold', color: 'var(--secondary-color)', marginBottom: '2rem' }}>
                      {quizScore}/{quizQuestions.length}
                    </div>
                    <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                      <button className="btn" onClick={startQuiz}>
                        Làm lại
                      </button>
                      <button className="btn btn-outline" onClick={() => setActiveTab('dashboard')}>
                        Về trang chủ
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
            {/* Reading Tab */}
            {activeTab === 'reading' && (
              <div className="glass-card animate-fade-in" style={{ maxWidth: '800px', margin: '0 auto' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <button className="btn btn-outline" style={{ padding: '0.5rem' }} onClick={() => setActiveTab('dashboard')}>
                      <ChevronLeft size={20} />
                    </button>
                    <h2>Luyện Đọc Hiểu AI</h2>
                  </div>
                  <button className="btn" onClick={generateReading} disabled={isGeneratingReading}>
                    {isGeneratingReading ? <><Loader2 size={20} className="animate-spin" /> Đang soạn bài...</> : <><Sparkles size={20} /> Tạo bài đọc mới</>}
                  </button>
                </div>

                {!readingData && !isGeneratingReading && (
                  <div style={{ textAlign: 'center', padding: '4rem 2rem', color: 'var(--text-secondary)' }}>
                    <FileText size={48} style={{ margin: '0 auto 1rem', opacity: 0.5 }} />
                    <p style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>AI sẽ lấy ngẫu nhiên 10 từ vựng bạn đã học để sáng tác một câu chuyện độc nhất.</p>
                    <p>Nhấn "Tạo bài đọc mới" để bắt đầu luyện tập!</p>
                  </div>
                )}

                {isGeneratingReading && (
                  <div style={{ textAlign: 'center', padding: '4rem 2rem', color: 'var(--text-secondary)' }}>
                    <Loader2 size={48} className="animate-spin" style={{ margin: '0 auto 1rem', color: 'var(--primary-color)' }} />
                    <p>AI đang dệt nên câu chuyện từ những từ vựng của bạn...</p>
                  </div>
                )}

                {readingData && !isGeneratingReading && (
                  <div className="animate-fade-in">
                    <div style={{ background: 'rgba(0,0,0,0.2)', padding: '2rem', borderRadius: '16px', marginBottom: '2rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
                        <h3 style={{ fontSize: '1.8rem', color: 'var(--primary-color)', margin: 0 }}>{readingData.title}</h3>
                        <button className="speak-btn-card" onClick={() => handleSpeak(readingData.content_hanzi)}>
                          <Volume2 size={24} />
                        </button>
                      </div>

                      <div style={{ fontSize: '1.3rem', lineHeight: '2', color: 'var(--text-primary)', marginBottom: '1.5rem' }}>
                        {readingData.content_hanzi}
                      </div>

                      {showPinyin && (
                        <div className="animate-fade-in" style={{ fontSize: '1.1rem', lineHeight: '1.8', color: 'var(--text-secondary)', padding: '1rem', background: 'rgba(255,255,255,0.05)', borderRadius: '12px', marginBottom: '1rem' }}>
                          <strong style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--secondary-color)' }}>Pinyin:</strong>
                          {readingData.content_pinyin}
                        </div>
                      )}

                      {showTranslation && (
                        <div className="animate-fade-in" style={{ fontSize: '1.1rem', lineHeight: '1.8', color: 'var(--text-secondary)', padding: '1rem', background: 'rgba(255,255,255,0.05)', borderRadius: '12px', marginBottom: '1rem' }}>
                          <strong style={{ display: 'block', marginBottom: '0.5rem', color: '#10b981' }}>Dịch nghĩa:</strong>
                          {readingData.translation}
                        </div>
                      )}

                      <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
                        <button className="btn btn-outline" style={{ flex: 1 }} onClick={() => setShowPinyin(!showPinyin)}>
                          {showPinyin ? 'Ẩn Pinyin' : 'Xem Pinyin'}
                        </button>
                        <button className="btn btn-outline" style={{ flex: 1 }} onClick={() => setShowTranslation(!showTranslation)}>
                          {showTranslation ? 'Ẩn Dịch nghĩa' : 'Xem Dịch nghĩa'}
                        </button>
                      </div>
                    </div>

                    <div style={{ padding: '1rem 0' }}>
                      <h3 style={{ fontSize: '1.4rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Brain size={24} color="var(--primary-color)" /> Câu hỏi Đọc Hiểu
                      </h3>

                      {readingData.questions.map((q, qIdx) => (
                        <div key={qIdx} style={{ marginBottom: '2rem', padding: '1.5rem', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                          <h4 style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>{qIdx + 1}. {q.question}</h4>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '0.8rem' }}>
                            {q.options.map((opt, oIdx) => {
                              const isAnswered = readingAnswers[qIdx] !== undefined;
                              const isSelected = readingAnswers[qIdx] === opt;
                              const isCorrect = opt === q.answer;

                              let btnStyle = { textAlign: 'left', padding: '1rem', justifyContent: 'flex-start' };
                              let className = "btn btn-outline";

                              if (isAnswered) {
                                if (isCorrect) {
                                  className = "btn";
                                  btnStyle.background = '#10b981';
                                  btnStyle.borderColor = '#10b981';
                                } else if (isSelected) {
                                  className = "btn";
                                  btnStyle.background = '#ef4444';
                                  btnStyle.borderColor = '#ef4444';
                                } else {
                                  btnStyle.opacity = 0.5;
                                }
                              }

                              return (
                                <button
                                  key={oIdx}
                                  className={className}
                                  style={btnStyle}
                                  onClick={() => {
                                    if (!isAnswered) {
                                      setReadingAnswers(prev => ({ ...prev, [qIdx]: opt }));
                                    }
                                  }}
                                  disabled={isAnswered}
                                >
                                  {opt}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
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
              <div className="glass-card animate-fade-in" style={{ maxWidth: '800px', margin: '0 auto' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
                  <button className="btn btn-outline" style={{ padding: '0.5rem' }} onClick={() => setActiveTab('dashboard')}>
                    <ChevronLeft size={20} />
                  </button>
                  <h2>Từ Điển Thông Minh AI</h2>
                </div>

                <form className="chat-input-area" onSubmit={handleDictSearch} style={{ marginBottom: '2rem' }}>
                  <input
                    type="text"
                    placeholder="Nhập từ Hán, Pinyin hoặc Tiếng Việt để tra cứu..."
                    value={dictInput}
                    onChange={(e) => setDictInput(e.target.value)}
                    disabled={isSearchingDict}
                  />
                  <button type="submit" className="btn" disabled={isSearchingDict}>
                    {isSearchingDict ? <Loader2 size={20} className="animate-spin" /> : <Search size={20} />}
                  </button>
                </form>

                {dictResult && (
                  <div className="animate-fade-in">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem' }}>
                      <div>
                        <h1 style={{ fontSize: '4rem', margin: '0 0 0.5rem', background: 'linear-gradient(135deg, var(--secondary-color), var(--primary-color))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
                          {dictResult.hanzi}
                        </h1>
                        <div style={{ fontSize: '1.5rem', color: 'var(--text-secondary)', fontWeight: '500' }}>{dictResult.pinyin}</div>
                      </div>
                      <div style={{ display: 'flex', gap: '1rem' }}>
                        <button className="btn btn-outline" onClick={() => handleSpeak(dictResult.hanzi)}>
                          <Volume2 size={24} />
                        </button>
                        <button className="btn" onClick={saveDictToHistory}>
                          <BookOpen size={20} /> Lưu vào lịch sử
                        </button>
                      </div>
                    </div>

                    <div className="glass-card" style={{ padding: '2rem', background: 'rgba(0,0,0,0.2)', marginBottom: '2rem' }}>
                      <h3 style={{ color: 'var(--primary-color)', marginBottom: '1rem' }}>Ý nghĩa & Giải thích</h3>
                      <p style={{ fontSize: '1.2rem', lineHeight: '1.8', marginBottom: '1.5rem' }}>{dictResult.meaning}</p>
                      
                      <div style={{ padding: '1.5rem', background: 'rgba(255,255,255,0.03)', borderRadius: '12px', borderLeft: '4px solid var(--secondary-color)' }}>
                        <h4 style={{ marginBottom: '0.5rem', color: 'var(--secondary-color)' }}>Phân tích Hán tự:</h4>
                        <p style={{ color: 'var(--text-secondary)', lineHeight: '1.6' }}>{dictResult.etymology}</p>
                      </div>
                    </div>

                    <div className="glass-card" style={{ padding: '2rem', background: 'rgba(0,0,0,0.2)' }}>
                      <h3 style={{ color: 'var(--tertiary-color)', marginBottom: '1.5rem' }}>Ví dụ sử dụng</h3>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                        {dictResult.examples.map((ex, idx) => (
                          <div key={idx} style={{ paddingBottom: idx < 2 ? '1rem' : '0', borderBottom: idx < 2 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <div style={{ fontSize: '1.2rem', color: 'var(--text-primary)', marginBottom: '0.3rem' }}>{ex.chinese}</div>
                              <button onClick={() => handleSpeak(ex.chinese)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                                <Volume2 size={16} />
                              </button>
                            </div>
                            <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '0.3rem' }}>{ex.pinyin}</div>
                            <div style={{ fontSize: '0.95rem', color: '#10b981' }}>{ex.vietnamese}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {!dictResult && !isSearchingDict && (
                  <div style={{ textAlign: 'center', padding: '4rem 2rem', color: 'var(--text-secondary)' }}>
                    <Search size={48} style={{ margin: '0 auto 1.5rem', opacity: 0.3 }} />
                    <p>Nhập bất kỳ từ vựng nào để khám phá nguồn gốc và cách dùng.</p>
                  </div>
                )}
              </div>
            )}
            {/* Roleplay Tab */}
            {activeTab === 'roleplay' && (
              <div className="glass-card animate-fade-in" style={{ maxWidth: '900px', margin: '0 auto', height: '85vh', display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', flexShrink: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <button className="btn btn-outline" style={{ padding: '0.5rem' }} onClick={() => { setActiveTab('dashboard'); setRoleplayScenario(null); }}>
                      <ChevronLeft size={20} />
                    </button>
                    <h2>{roleplayScenario ? roleplayScenario.title : 'Chọn Tình Huống Mô Phỏng'}</h2>
                  </div>
                  {roleplayScenario && (
                    <button className="btn btn-outline" style={{ color: '#ef4444', borderColor: 'rgba(239, 68, 68, 0.2)' }} onClick={() => setRoleplayScenario(null)}>
                      Đổi tình huống
                    </button>
                  )}
                </div>

                {!roleplayScenario ? (
                  <div style={{ flex: 1, overflowY: 'auto', padding: '0.5rem' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem' }}>
                      {scenarios.map(s => (
                        <div key={s.id} className="glass-card" style={{ padding: '1.5rem', cursor: 'pointer', transition: 'all 0.3s ease', border: '1px solid rgba(255,255,255,0.05)' }} 
                             onClick={() => startRoleplay(s)}
                             onMouseOver={e => e.currentTarget.style.borderColor = 'var(--primary-color)'}
                             onMouseOut={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.05)'}>
                          <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>{s.icon}</div>
                          <h3 style={{ marginBottom: '0.5rem' }}>{s.title}</h3>
                          <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>{s.description}</p>
                          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                            <span style={{ fontSize: '0.75rem', padding: '0.2rem 0.6rem', borderRadius: '10px', background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6' }}>Bạn: {s.userRole}</span>
                            <span style={{ fontSize: '0.75rem', padding: '0.2rem 0.6rem', borderRadius: '10px', background: 'rgba(236, 72, 153, 0.1)', color: '#ec4899' }}>AI: {s.aiRole}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="chat-messages" style={{ flex: 1, overflowY: 'auto', padding: '1rem', background: 'rgba(0,0,0,0.1)', borderRadius: '16px' }}>
                      {rpMessages.map((msg, idx) => (
                        <div key={idx} className={`message ${msg.role === 'user' ? 'user' : 'ai'}`}>
                          <ReactMarkdown>{msg.content}</ReactMarkdown>
                          {msg.role === 'assistant' && (
                            <button className="speak-btn-small" onClick={() => handleSpeak(msg.content.split('(')[0])}>
                              <Volume2 size={14} />
                            </button>
                          )}
                        </div>
                      ))}
                      {isRoleplayLoading && (
                        <div className="message ai">
                          <Loader2 size={20} className="animate-spin" />
                        </div>
                      )}
                      <div ref={messagesEndRef} />
                    </div>

                    <form className="chat-input-area" onSubmit={handleRpSendMessage} style={{ marginTop: '1.5rem', flexShrink: 0 }}>
                      <input
                        type="text"
                        placeholder="Nhập câu trả lời bằng tiếng Trung..."
                        value={rpInput}
                        onChange={(e) => setRpInput(e.target.value)}
                        disabled={isRoleplayLoading}
                      />
                      <button type="submit" className="btn" disabled={isRoleplayLoading}>
                        {isRoleplayLoading ? <Loader2 size={20} className="animate-spin" /> : <Send size={20} />}
                      </button>
                    </form>
                  </>
                )}
              </div>
            )}
          </main>
        )}
      </div>
    );
  }

  export default App;
