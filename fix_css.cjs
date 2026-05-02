const fs = require('fs');
let css = fs.readFileSync('src/index.css', 'utf8');
// remove anything after line 705 (or finding the end of the mobile media query)
const cleanEnd = css.indexOf('  .flashcard-container {\r\n    height: 280px;\r\n  }\r\n}');
if (cleanEnd > -1) {
  css = css.substring(0, cleanEnd + '  .flashcard-container {\r\n    height: 280px;\r\n  }\r\n}'.length);
  // Also check for \n instead of \r\n
} else {
  const cleanEndLF = css.indexOf('  .flashcard-container {\n    height: 280px;\n  }\n}');
  if (cleanEndLF > -1) {
    css = css.substring(0, cleanEndLF + '  .flashcard-container {\n    height: 280px;\n  }\n}'.length);
  }
}

css += `\n
@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: .5; }
}
.animate-pulse {
  animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}\n`;

fs.writeFileSync('src/index.css', css);
console.log('Fixed index.css');
