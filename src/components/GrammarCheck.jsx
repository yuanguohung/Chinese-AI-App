import React, { useState } from 'react';
import { ChevronLeft, PenTool, Loader2, Volume2 } from 'lucide-react';
import { createAiClient, chatWithAI } from '../services/aiService';

const GrammarCheck = ({ apiKey, baseURL, model, setActiveTab, handleSpeak }) => {
  const [grammarInput, setGrammarInput] = useState('');
  const [grammarResult, setGrammarResult] = useState(null);
  const [isCheckingGrammar, setIsCheckingGrammar] = useState(false);

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
      setGrammarResult(parsedResult);
    } catch (error) {
      alert(`Lỗi phân tích ngữ pháp: ${error.message}`);
    } finally {
      setIsCheckingGrammar(false);
    }
  };

  return (
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
  );
};

export default GrammarCheck;
