# 🏮 AI Chinese Learning Assistant

Một ứng dụng web học tiếng Trung hiện đại, tích hợp trí tuệ nhân tạo (AI) để giúp bạn nâng cao kỹ năng giao tiếp, phát âm, từ vựng và ngữ pháp một cách chuyên nghiệp.

👉 **Live Demo:** [https://chinese-ai-app.vercel.app/](https://chinese-ai-app.vercel.app/)

![UI Design](https://img.shields.io/badge/Design-Glassmorphism-pink)
![Tech Stack](https://img.shields.io/badge/Stack-React%20%2B%20Vite-blue)
![Backend](https://img.shields.io/badge/Database-Supabase-green)
![AI Powered](https://img.shields.io/badge/AI-Custom%20Model-purple)

## ✨ Tính năng nổi bật

- 🎙️ **Luyện Phát Âm (Voice Input)**: Tích hợp Web Speech API cho phép bạn nhập liệu bằng giọng nói tiếng Trung. Đây là cách tuyệt vời để kiểm tra khả năng phát âm của bạn có chính xác hay không.
- 💬 **Luyện Giao Tiếp AI**: Trò chuyện trực tiếp với trợ lý AI. AI sẽ tự động sửa lỗi và phản hồi bằng cả tiếng Trung lẫn tiếng Việt.
- 🎭 **Mô Phỏng Tình Huống**: Đóng vai trong các kịch bản thực tế (Mua sắm, Sân bay, Nhà hàng...). AI đóng vai đối tác, có sẵn câu mở đầu và hỗ trợ sửa lỗi ngữ pháp trực tiếp.
- 🔍 **Từ Điển Thông Minh**: Tra cứu từ vựng với phân tích Hán tự chuyên sâu (bộ thủ, nguồn gốc) và các ví dụ thực tế do AI cung cấp.
- 📊 **Thống Kê Nâng Cao**: Theo dõi tiến trình học tập qua biểu đồ trực quan (Recharts). Phân tích phân bổ chủ đề từ vựng và xu hướng học tập hàng tuần.
- 📖 **Luyện Đọc Hiểu**: AI tự động viết các đoạn văn ngắn dựa trên chính kho từ vựng bạn đã học, kèm câu hỏi trắc nghiệm để kiểm tra mức độ hiểu bài.
- 🧠 **Trắc Nghiệm AI**: Tự động tạo bài kiểm tra từ vựng 4 đáp án từ lịch sử học tập của cá nhân bạn.
- 🗃️ **Lưu Trữ Đám Mây**: Tích hợp **Supabase** để lưu trữ lịch sử, điểm số và tiến trình học tập an toàn.
- 🎨 **Giao diện Premium**: Thiết kế Glassmorphism hiện đại, tối ưu cho cả máy tính và thiết bị di động.

## 🛠️ Công nghệ sử dụng

- **Frontend**: React.js 18 (Vite), Modular Component-based Architecture.
- **Styling**: Vanilla CSS (Custom Glassmorphism Design System) + Keyframe Animations.
- **Backend/Database**: Supabase (PostgreSQL, Auth & Row Level Security).
- **AI Integration**: OpenAI SDK (Hỗ trợ cấu hình Custom Base URL để dùng các provider như Groq, OpenRouter, Glhf.chat, DeepSeek...).
- **Speech**: Web Speech API (SpeechRecognition & SpeechSynthesis).
- **Visualization**: Recharts.

## 🚀 Cài đặt và Chạy thử

### 1. Cài đặt môi trường
Đảm bảo bạn đã cài đặt [Node.js](https://nodejs.org/).

### 2. Cài đặt dependencies
```bash
npm install
```

### 3. Chạy ứng dụng locally
```bash
npm run dev
```

> 💡 **Lưu ý (Windows PowerShell):** Nếu gặp lỗi bảo mật thực thi script, hãy dùng:
> ```bash
> cmd /c npm run dev
> ```

### 4. Cấu hình Backend (Supabase)
Dự án sử dụng Supabase để lưu trữ. Bạn cần tạo các bảng sau:
- `vocab_history`: Lưu trữ từ vựng (columns: `hanzi`, `pinyin`, `meaning`, `example`, `topic`, `user_id`).


### 5. Cấu hình AI
Nhấn vào icon **Cài đặt** trên giao diện ứng dụng để nhập:
- **API Key**
- **Model ID** (ví dụ: gpt-3.5-turbo, deepseek-chat...)
- **Base URL** (nếu dùng provider khác OpenAI)

---
*Dự án được phát triển với mục tiêu cá nhân hóa lộ trình học tiếng Trung thông qua sức mạnh của AI.* 🏮
