-- Mở SQL Editor trong Supabase Dashboard và chạy các lệnh sau:

-- 1. Bật Row Level Security (RLS) cho bảng vocab_history
ALTER TABLE vocab_history ENABLE ROW LEVEL SECURITY;

-- 2. Tạo Policy cho phép người dùng XEM dữ liệu của chính họ
CREATE POLICY "Users can view their own vocab history" 
ON vocab_history FOR SELECT 
USING (auth.uid() = user_id);

-- 3. Tạo Policy cho phép người dùng THÊM dữ liệu của chính họ
CREATE POLICY "Users can insert their own vocab history" 
ON vocab_history FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- 4. Tạo Policy cho phép người dùng CẬP NHẬT dữ liệu của chính họ
CREATE POLICY "Users can update their own vocab history" 
ON vocab_history FOR UPDATE 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- 5. Tạo Policy cho phép người dùng XÓA dữ liệu của chính họ
CREATE POLICY "Users can delete their own vocab history" 
ON vocab_history FOR DELETE 
USING (auth.uid() = user_id);
