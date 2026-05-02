import React, { useState, useEffect } from 'react';
import { ChevronLeft, Volume2, Award, Brain } from 'lucide-react';

const Quiz = ({ vocabHistory, setActiveTab, handleSpeak }) => {
  const [quizQuestions, setQuizQuestions] = useState([]);
  const [currentQuizIndex, setCurrentQuizIndex] = useState(0);
  const [quizScore, setQuizScore] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [isQuizFinished, setIsQuizFinished] = useState(false);

  const generateQuiz = () => {
    if (vocabHistory.length < 5) {
      alert('Bạn cần lưu ít nhất 5 từ vựng trong lịch sử để làm trắc nghiệm!');
      setActiveTab('dashboard');
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
  };

  useEffect(() => {
    generateQuiz();
  }, []);

  const playSound = (type) => {
    const soundUrls = {
      correct: 'https://assets.mixkit.co/active_storage/sfx/600/600-preview.mp3',
      wrong: 'https://assets.mixkit.co/active_storage/sfx/601/601-preview.mp3',
      finish: 'https://assets.mixkit.co/active_storage/sfx/1435/1435-preview.mp3'
    };
    const audio = new Audio(soundUrls[type]);
    audio.volume = 0.4;
    audio.play().catch(e => console.log('Audio play blocked:', e));
  };

  const handleQuizAnswer = (answer) => {
    if (selectedAnswer) return;

    setSelectedAnswer(answer);
    const isCorrect = answer === quizQuestions[currentQuizIndex].correctAnswer;
    
    if (isCorrect) {
      setQuizScore(prev => prev + 1);
      playSound('correct');
    } else {
      playSound('wrong');
    }

    setTimeout(() => {
      if (currentQuizIndex < quizQuestions.length - 1) {
        setCurrentQuizIndex(prev => prev + 1);
        setSelectedAnswer(null);
      } else {
        setIsQuizFinished(true);
        playSound('finish');
      }
    }, 1500);
  };

  if (quizQuestions.length === 0) return null;

  return (
    <div className="glass-card animate-fade-in">
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
        <button className="btn btn-outline" style={{ padding: '0.5rem' }} onClick={() => setActiveTab('dashboard')}>
          <ChevronLeft size={20} />
        </button>
        <h2>Ôn Tập Trắc Nghiệm</h2>
      </div>

      {!isQuizFinished ? (
        <div className="quiz-container animate-fade-in">
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', color: 'var(--text-secondary)' }}>
            <span>Câu {currentQuizIndex + 1}/{quizQuestions.length}</span>
            <span>Điểm: {quizScore}</span>
          </div>

          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <h3 style={{ fontSize: '3rem', marginBottom: '0.5rem', color: 'var(--primary-color)' }}>
              {quizQuestions[currentQuizIndex].word.hanzi}
            </h3>
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem' }}>
              <p style={{ fontSize: '1.2rem', color: 'var(--text-secondary)' }}>
                {quizQuestions[currentQuizIndex].word.pinyin}
              </p>
              <button
                className="speak-btn-small"
                onClick={() => handleSpeak(quizQuestions[currentQuizIndex].word.hanzi)}
              >
                <Volume2 size={16} />
              </button>
            </div>
          </div>

          <div className="quiz-options">
            {quizQuestions[currentQuizIndex].options.map((opt, idx) => {
              let btnClass = "quiz-option";
              if (selectedAnswer) {
                if (opt.trim() === quizQuestions[currentQuizIndex].correctAnswer.trim()) {
                  btnClass += " correct";
                } else if (opt === selectedAnswer) {
                  btnClass += " wrong";
                }
              }

              return (
                <button
                  key={idx}
                  className={btnClass}
                  onClick={() => handleQuizAnswer(opt)}
                  disabled={!!selectedAnswer}
                  style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}
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
      ) : (
        <div className="quiz-container animate-fade-in" style={{ textAlign: 'center', padding: '3rem 1rem' }}>
          <Award size={64} style={{ color: 'var(--primary-color)', margin: '0 auto 1rem' }} />
          <h2 style={{ marginBottom: '1rem' }}>Hoàn thành bài kiểm tra!</h2>
          <p style={{ fontSize: '1.2rem', marginBottom: '2rem' }}>Bạn đúng {quizScore}/{quizQuestions.length} câu.</p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem' }}>
            <button className="btn btn-outline" onClick={() => setActiveTab('dashboard')}>Về trang chủ</button>
            <button className="btn" onClick={generateQuiz}>Làm lại bài</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Quiz;
