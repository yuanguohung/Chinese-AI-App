import React, { useState } from 'react';
import { ChevronLeft, Loader2, Search, Volume2, Save } from 'lucide-react';
import { createAiClient, chatWithAI } from '../services/aiService';
import { getSupabase } from '../services/supabaseClient';

const Dictionary = ({ apiKey, baseURL, model, setActiveTab, handleSpeak, user, sbUrl, sbKey, fetchVocabHistory }) => {
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
      fetchVocabHistory(true); // Cập nhật lại lịch sử
    } catch (error) {
      alert(`Lỗi lưu lịch sử: ${error.message}`);
    }
  };

  return (
    <div className="glass-card animate-fade-in">
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
        <button className="btn btn-outline" style={{ padding: '0.5rem' }} onClick={() => setActiveTab('dashboard')}>
          <ChevronLeft size={20} />
        </button>
        <h2>Từ Điển Thông Minh AI</h2>
      </div>

      <form style={{ display: 'flex', gap: '1rem', marginBottom: '2rem' }} onSubmit={handleDictSearch}>
        <input
          type="text"
          placeholder="Nhập tiếng Trung, Pinyin hoặc Tiếng Việt..."
          value={dictInput}
          onChange={(e) => setDictInput(e.target.value)}
          disabled={isSearchingDict}
        />
        <button type="submit" className="btn" disabled={isSearchingDict} style={{ whiteSpace: 'nowrap' }}>
          {isSearchingDict ? <><Loader2 size={20} className="animate-spin" /> Đang tra...</> : <><Search size={20} /> Tra cứu</>}
        </button>
      </form>

      {dictResult && (
        <div className="glass-card animate-fade-in" style={{ backgroundColor: 'rgba(15, 23, 42, 0.5)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '1.5rem' }}>
            <div>
              <h3 style={{ fontSize: '3rem', color: 'var(--primary-color)', marginBottom: '0.5rem' }}>
                {dictResult.hanzi}
              </h3>
              <div style={{ fontSize: '1.5rem', color: 'var(--text-secondary)', fontWeight: '500' }}>{dictResult.pinyin}</div>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button className="btn btn-outline" onClick={() => handleSpeak(dictResult.hanzi)}>
                <Volume2 size={20} /> Nghe
              </button>
              {user && (
                <button className="btn" onClick={saveDictToHistory}>
                  <Save size={20} /> Lưu
                </button>
              )}
            </div>
          </div>

          <div style={{ marginBottom: '2rem' }}>
            <h4 style={{ color: 'var(--text-secondary)', marginBottom: '0.5rem', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '1px' }}>Ý nghĩa</h4>
            <p style={{ fontSize: '1.2rem', lineHeight: '1.8', marginBottom: '1.5rem' }}>{dictResult.meaning}</p>
            
            <div className="glass-card" style={{ backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-color)' }}>
              <h4 style={{ color: 'var(--primary-color)', marginBottom: '0.5rem', fontSize: '1rem' }}>Nguồn gốc & Bộ thủ (Etymology)</h4>
              <p style={{ color: 'var(--text-secondary)', lineHeight: '1.6' }}>{dictResult.etymology}</p>
            </div>
          </div>

          <div>
            <h4 style={{ color: 'var(--text-secondary)', marginBottom: '1rem', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '1px' }}>Ví dụ</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {dictResult.examples.map((ex, idx) => (
                <div key={idx} style={{ padding: '1rem', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                    <p style={{ fontSize: '1.1rem', fontWeight: '500' }}>{ex.chinese}</p>
                    <button className="speak-btn-small" onClick={() => handleSpeak(ex.chinese)}>
                      <Volume2 size={14} />
                    </button>
                  </div>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '0.2rem' }}>{ex.pinyin}</p>
                  <p style={{ fontSize: '0.95rem' }}>{ex.vietnamese}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {!dictResult && !isSearchingDict && (
        <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-secondary)' }}>
          <Search size={48} style={{ opacity: 0.2, margin: '0 auto 1rem' }} />
          <p>Nhập từ vựng vào ô tìm kiếm để tra từ điển AI</p>
        </div>
      )}
    </div>
  );
};

export default Dictionary;
