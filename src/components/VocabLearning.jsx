import React, { useState } from 'react';
import { ChevronLeft, Sparkles, Loader2, Volume2 } from 'lucide-react';
import { createAiClient, chatWithAI } from '../services/aiService';
import { getSupabase } from '../services/supabaseClient';

const VocabLearning = ({ apiKey, baseURL, model, setActiveTab, handleSpeak, user, sbUrl, sbKey, vocabHistory }) => {
  const [vocabTopic, setVocabTopic] = useState('');
  const [flashcards, setFlashcards] = useState([]);
  const [isGeneratingVocab, setIsGeneratingVocab] = useState(false);
  const [flippedCards, setFlippedCards] = useState({});

  const toggleCardFlip = (index) => {
    setFlippedCards(prev => ({ ...prev, [index]: !prev[index] }));
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

  return (
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
          {isGeneratingVocab ? <><Loader2 size={20} className="animate-spin" /> Đang tạo...</> : <><Sparkles size={20} /> Tạo Flashcards</>}
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
  );
};

export default VocabLearning;
