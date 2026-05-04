const fs = require('fs');

let content = fs.readFileSync('src/App.jsx', 'utf8');

// 1. Remove functions from handleDictSearch to handleQuizAnswer
const funcRegex = /const handleDictSearch = async[\s\S]*?setIsQuizFinished\(true\);\r?\n\s*\}\r?\n\s*\}, 1500\);\r?\n\s*\};/m;
content = content.replace(funcRegex, '// Functions extracted to components');

// 2. Replace Quiz Tab
const quizRegex = /\{\/\* Quiz Tab \*\/\}[\s\S]*?(?=\{\/\* Reading Tab \*\/|\{\/\* Stats Tab \*\/)/m;
const newQuiz = `{/* Quiz Tab */}
            {activeTab === 'quiz' && (
              <Quiz
                vocabHistory={vocabHistory}
                setActiveTab={setActiveTab}
                handleSpeak={handleSpeak}
              />
            )}\n            `;
content = content.replace(quizRegex, newQuiz);

// 3. Replace Reading Tab
const readingRegex = /\{\/\* Reading Tab \*\/\}[\s\S]*?(?=\{\/\* Stats Tab \*\/)/m;
const newReading = `{/* Reading Tab */}
            {activeTab === 'reading' && (
              <ReadingPractice
                vocabHistory={vocabHistory}
                setActiveTab={setActiveTab}
                handleSpeak={handleSpeak}
                apiKey={apiKey}
                baseURL={baseURL}
                model={model}
              />
            )}\n            `;
content = content.replace(readingRegex, newReading);

// 4. Replace Dictionary Tab
const dictRegex = /\{\/\* Dictionary Tab \*\/\}[\s\S]*?(?=\{\/\* Roleplay Tab \*\/|\{\/\* Settings Modal \*\/)/m;
// Wait, the comment is actually {activeTab === 'dictionary' && (
const dictRegex2 = /\{activeTab === 'dictionary'[\s\S]*?(?=\{\/\* Roleplay Tab \*\/)/m;
const newDict = `{activeTab === 'dictionary' && (
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
            )}\n            `;
content = content.replace(dictRegex2, newDict);

// 5. Replace Roleplay Tab
const roleplayRegex = /\{\/\* Roleplay Tab \*\/\}[\s\S]*?(?=<\/main>)/m;
const newRoleplay = `{/* Roleplay Tab */}
            {activeTab === 'roleplay' && (
              <Roleplay
                apiKey={apiKey}
                baseURL={baseURL}
                model={model}
                setActiveTab={setActiveTab}
                handleSpeak={handleSpeak}
              />
            )}\n          `;
content = content.replace(roleplayRegex, newRoleplay);

fs.writeFileSync('src/App.jsx', content);
console.log('Refactoring complete!');
