# 🏮 AI Chinese Learning Assistant

Một ứng dụng web học tiếng Trung hiện đại, tích hợp trí tuệ nhân tạo (AI) để giúp bạn nâng cao kỹ năng giao tiếp, từ vựng và ngữ pháp một cách chuyên nghiệp và có hệ thống.

👉 **Live Demo:** [https://chinese-ai-app.vercel.app/](https://chinese-ai-app.vercel.app/)

![UI Design](https://img.shields.io/badge/Design-Glassmorphism-pink)
![Tech Stack](https://img.shields.io/badge/Stack-React%20%2B%20Vite-blue)
![Backend](https://img.shields.io/badge/Database-Supabase-green)
![AI Powered](https://img.shields.io/badge/AI-Custom%20Model-purple)

## ✨ Tính năng nổi bật

- 💬 **Luyện Giao Tiếp AI**: Trò chuyện trực tiếp với trợ lý AI. AI sẽ tự động sửa lỗi và phản hồi bằng cả tiếng Trung lẫn tiếng Việt.
- 🎭 **Mô Phỏng Tình Huống**: Đóng vai trong các kịch bản thực tế (Mua sắm, Sân bay, Nhà hàng...). AI đóng vai đối tác, có sẵn câu mở đầu và hỗ trợ sửa lỗi ngữ pháp trực tiếp.
- 🔍 **Từ Điển Thông Minh**: Tra cứu từ vựng với phân tích Hán tự chuyên sâu (bộ thủ, nguồn gốc) và các ví dụ thực tế do AI cung cấp.
- 📊 **Thống Kê Nâng Cao**: Theo dõi tiến trình học tập qua biểu đồ trực quan. Phân tích phân bổ chủ đề từ vựng và xu hướng học tập trong tuần.
- 📖 **Luyện Đọc Hiểu**: AI tự động viết các đoạn văn ngắn dựa trên chính kho từ vựng bạn đã học để giúp bạn ôn tập hiệu quả.
- 🧠 **Trắc Nghiệm AI**: Kiểm tra trí nhớ với các câu hỏi ngẫu nhiên được tạo ra từ lịch sử học tập của bạn.
- 🗃️ **Lưu Trữ Đám Mây**: Tích hợp **Supabase** để lưu trữ lịch sử từ vựng, điểm số và tiến trình học tập của bạn mọi lúc mọi nơi.
- 🎨 **Giao diện Premium**: Thiết kế Glassmorphism hiện đại, sử dụng phông chữ **Montserrat** và **Manrope** tối ưu cho tiếng Việt và tiếng Trung.

## 🛠️ Công nghệ sử dụng

- **Frontend**: React.js (Hooks, Context API), Vite
- **Styling**: Vanilla CSS (Custom Glassmorphism Design System)
- **Backend/Database**: Supabase (Auth & PostgreSQL)
- **AI Integration**: OpenAI SDK (Tương thích với Groq, OpenRouter, Glhf.chat, DeepSeek...)
- **Data Visualization**: Recharts
- **Icons**: Lucide React
- **Typography**: Montserrat, Manrope (Google Fonts)

## 🚀 Cài đặt và Chạy thử

### 1. Cài đặt môi trường
Đảm bảo bạn đã cài đặt [Node.js](https://nodejs.org/).

### 2. Cài đặt dependencies
Mở Terminal trong thư mục dự án và chạy:
```bash
npm install
```

### 3. Chạy ứng dụng locally
```bash
npm run dev
```

### 4. Cấu hình API & Database
- Nhấn vào nút **Cài đặt** ở góc trên bên phải để cấu hình API Key cho AI.
- Hệ thống yêu cầu kết nối với dự án Supabase cá nhân để lưu trữ dữ liệu. Cấu hình trong file `src/services/supabaseClient.js`.


