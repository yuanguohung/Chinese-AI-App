import React, { useState, useEffect } from 'react';
import { ChevronLeft, Loader2, Volume2, BookOpen, Eye, EyeOff } from 'lucide-react';
import { createAiClient, chatWithAI } from '../services/aiService';

const ReadingPractice = ({ vocabHistory, setActiveTab, handleSpeak, apiKey, baseURL, model, hskLevel }) => {
  const [readingData, setReadingData] = useState(null);
  const [isGeneratingReading, setIsGeneratingReading] = useState(false);
  const [showPinyin, setShowPinyin] = useState(false);
  const [showTranslation, setShowTranslation] = useState(false);
  const [readingAnswers, setReadingAnswers] = useState({});

  const generateReading = async () => {
    if (vocabHistory.length < 5) {
      alert("Bạn cần có ít nhất 5 từ vựng trong lịch sử để tạo bài đọc!");
      setActiveTab('dashboard');
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

      const prompt = `Write a short, engaging Chinese story (about 100-150 words) suitable for ${hskLevel || 'the current level'} learners.
      Include as many of these words as possible: ${selectedWords}.
      IMPORTANT: Ensure the Chinese text is highly natural, idiomatic, and written exactly how a native Chinese speaker would write it at the ${hskLevel || ''} level.
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

  useEffect(() => {
    if (!readingData && !isGeneratingReading) {
      generateReading();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleReadingAnswer = (qIndex, option) => {
    if (readingAnswers[qIndex]) return;
    setReadingAnswers(prev => ({
      ...prev,
      [qIndex]: option
    }));
  };

  return (
    <div className="glass-card animate-fade-in">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button className="btn btn-outline" style={{ padding: '0.5rem' }} onClick={() => setActiveTab('dashboard')}>
            <ChevronLeft size={20} />
          </button>
          <h2>Luyện Đọc Hiểu AI</h2>
        </div>
        <button className="btn" onClick={generateReading} disabled={isGeneratingReading}>
          {isGeneratingReading ? <Loader2 size={20} className="animate-spin" /> : <BookOpen size={20} />}
          Bài Mới
        </button>
      </div>

      {isGeneratingReading ? (
        <div style={{ textAlign: 'center', padding: '4rem 0' }}>
          <Loader2 size={48} className="animate-spin" style={{ color: 'var(--primary-color)', margin: '0 auto 1rem' }} />
          <p className="text-secondary">AI đang viết một câu chuyện thú vị dành riêng cho bạn...</p>
        </div>
      ) : readingData ? (
        <div className="animate-fade-in">
          <div className="glass-card" style={{ backgroundColor: 'rgba(15, 23, 42, 0.5)', marginBottom: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '1.8rem', color: 'var(--primary-color)' }}>{readingData.title}</h3>
              <button className="speak-btn" onClick={() => handleSpeak(readingData.content_hanzi)}>
                <Volume2 size={24} />
              </button>
            </div>

            <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
              <button
                className={`btn btn-outline ${showPinyin ? 'active' : ''}`}
                onClick={() => setShowPinyin(!showPinyin)}
                style={{ fontSize: '0.9rem', padding: '0.5rem 1rem' }}
              >
                {showPinyin ? <EyeOff size={16} /> : <Eye size={16} />} Pinyin
              </button>
              <button
                className={`btn btn-outline ${showTranslation ? 'active' : ''}`}
                onClick={() => setShowTranslation(!showTranslation)}
                style={{ fontSize: '0.9rem', padding: '0.5rem 1rem' }}
              >
                {showTranslation ? <EyeOff size={16} /> : <Eye size={16} />} Dịch nghĩa
              </button>
            </div>

            <div style={{ fontSize: '1.2rem', lineHeight: '2', letterSpacing: '1px', marginBottom: '1.5rem' }}>
              {readingData.content_hanzi}
            </div>

            {showPinyin && (
              <div style={{ fontSize: '1.1rem', color: 'var(--text-secondary)', marginBottom: '1.5rem', lineHeight: '1.8' }}>
                {readingData.content_pinyin}
              </div>
            )}

            {showTranslation && (
              <div style={{ fontSize: '1.1rem', color: 'var(--text-primary)', borderTop: '1px solid var(--border-color)', paddingTop: '1.5rem', lineHeight: '1.8' }}>
                {readingData.translation}
              </div>
            )}
          </div>

          <h3 style={{ marginBottom: '1rem', paddingLeft: '0.5rem', borderLeft: '4px solid var(--primary-color)' }}>Trả lời câu hỏi</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {readingData.questions.map((q, qIndex) => (
              <div key={qIndex} className="glass-card" style={{ padding: '1.5rem' }}>
                <p style={{ fontSize: '1.1rem', marginBottom: '1rem' }}><strong>Câu {qIndex + 1}:</strong> {q.question}</p>
                <div className="quiz-options">
                  {q.options.map((opt, idx) => {
                    let btnClass = "quiz-option";
                    if (readingAnswers[qIndex]) {
                      if (opt.trim() === q.answer.trim()) {
                        btnClass += " correct";
                      } else if (opt === readingAnswers[qIndex]) {
                        btnClass += " wrong";
                      }
                    }
                    return (
                      <button
                        key={idx}
                        className={btnClass}
                        onClick={() => handleReadingAnswer(qIndex, opt)}
                        disabled={!!readingAnswers[qIndex]}
                        style={{ textAlign: 'left', padding: '1rem', display: 'flex', gap: '1rem', alignItems: 'center' }}
                      >
                        <span style={{ 
                          width: '32px', 
                          height: '32px', 
                          borderRadius: '50%', 
                          background: 'rgba(255,255,255,0.1)', 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'center',
                          fontWeight: 'bold',
                          flexShrink: 0
                        }}>
                          {String.fromCharCode(65 + idx)}
                        </span>
                        {opt}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default ReadingPractice;
