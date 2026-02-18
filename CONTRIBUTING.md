# Hướng Dẫn Đóng Góp

Chào mừng và cảm ơn bạn đã quan tâm đến việc đóng góp cho dự án **Web Tết AI**! Mọi đóng góp của bạn, dù lớn hay nhỏ, đều rất quý giá và giúp dự án trở nên tốt hơn.

Dưới đây là một vài hướng dẫn để giúp quá trình đóng góp của bạn diễn ra suôn sẻ.

## 💬 Quy Tắc Ứng Xử

Để duy trì một môi trường thân thiện và tích cực, chúng tôi mong rằng tất cả mọi người tham gia dự án sẽ tuân thủ các quy tắc ứng xử cơ bản: tôn trọng, lịch sự và cùng nhau xây dựng. Mọi hành vi quấy rối, công kích cá nhân sẽ không được chấp nhận.

## 💡 Cách Đóng Góp

Bạn có thể đóng góp cho dự án theo nhiều cách:

### 🐞 Báo Lỗi (Reporting Bugs)

Nếu bạn phát hiện một lỗi, vui lòng tạo một **Issue** mới trên GitHub với các thông tin sau:
- **Tiêu đề rõ ràng:** Mô tả ngắn gọn về lỗi.
- **Các bước tái hiện lỗi (Steps to Reproduce):**
  1. Đi tới trang...
  2. Nhấp vào nút...
  3. Lỗi xảy ra.
- **Hành vi mong muốn (Expected Behavior):** Điều gì đáng lẽ phải xảy ra.
- **Hành vi thực tế (Actual Behavior):** Điều gì đã thực sự xảy ra.
- **Ảnh chụp màn hình (Screenshots):** Nếu có thể, hãy đính kèm ảnh chụp màn hình để minh họa cho lỗi.
- **Thông tin môi trường:** Trình duyệt (Chrome, Firefox...), Hệ điều hành (Windows, macOS...).

### ✨ Đề Xuất Tính Năng Mới (Suggesting Enhancements)

Nếu bạn có ý tưởng cho một tính năng mới hoặc cải tiến, hãy tạo một **Issue** mới và mô tả chi tiết:
- **Vấn đề cần giải quyết:** Tính năng này giúp giải quyết vấn đề gì cho người dùng?
- **Mô tả giải pháp:** Bạn đề xuất tính năng hoạt động như thế nào?
- **Phương án thay thế (nếu có):** Có cách nào khác để giải quyết vấn đề này không?

### 🚀 Đóng Góp Code (Pull Requests)

Đây là quy trình chuẩn để đóng góp code:

1.  **Fork the Repository:** Nhấn nút "Fork" ở góc trên bên phải trang GitHub của dự án để tạo một bản sao về tài khoản của bạn.

2.  **Clone repo của bạn về máy:**
    ```bash
    git clone https://github.com/TEN_CUA_BAN/web_tet_ai_cong_nghe_so.git
    ```

3.  **Tạo một Branch mới:**
    ```bash
    git checkout -b ten-tinh-nang-moi
    ```
    *(Ví dụ: `git checkout -b feat/them-boi-bai-tarot`)*

4.  **Thực hiện thay đổi:** Viết code, sửa lỗi, hoặc cải tiến tính năng trên branch mới này.

5.  **Commit các thay đổi:**
    ```bash
    git commit -m "feat: Thêm tính năng Bói bài Tarot"
    ```
    *(Xem thêm phần Hướng Dẫn Viết Commit bên dưới)*

6.  **Push lên Branch của bạn:**
    ```bash
    git push origin ten-tinh-nang-moi
    ```

7.  **Tạo một Pull Request (PR):**
    - Truy cập repository của bạn trên GitHub, bạn sẽ thấy một thông báo để tạo Pull Request.
    - Nhấn vào đó, điền tiêu đề và mô tả chi tiết cho PR của bạn. Hãy giải thích rõ những gì bạn đã thay đổi và tại sao.
    - Gửi PR và chờ review từ chủ dự án.

## ⚙️ Cài Đặt Môi Trường Phát Triển

Vui lòng tham khảo hướng dẫn chi tiết trong file `README.md` để cài đặt dự án và chạy trên máy local của bạn.

## ✍️ Hướng Dẫn Viết Code

### ⭐ Hướng Dẫn Viết Commit

Chúng tôi khuyến khích sử dụng chuẩn commit message để giữ cho lịch sử commit rõ ràng. Cấu trúc cơ bản:

`<type>: <subject>`

- **`type`**:
  - `feat`: Một tính năng mới.
  - `fix`: Sửa một lỗi.
  - `docs`: Thay đổi về tài liệu (documentation).
  - `style`: Thay đổi về định dạng code (dấu chấm phẩy, thụt lề...).
  - `refactor`: Tái cấu trúc code mà không thay đổi chức năng.
  - `chore`: Các công việc khác (cập nhật build script, dependencies...).
- **`subject`**: Mô tả ngắn gọn về thay đổi.

**Ví dụ:**
- `feat: Thêm tính năng gieo quẻ bằng AI`
- `fix: Sửa lỗi hiển thị sai ngày trên đồng hồ đếm ngược`
- `docs: Cập nhật hướng dẫn cài đặt Firebase`

### ⭐ JavaScript / HTML / CSS

- Dự án sử dụng **Vanilla JavaScript (JS thuần)**, không dùng framework. Vui lòng giữ code sạch sẽ, dễ đọc.
- Thêm comment giải thích cho các đoạn code phức tạp hoặc logic quan trọng.
- Sử dụng thẻ HTML đúng ngữ nghĩa và giữ cấu trúc CSS gọn gàng, dễ bảo trì.

## ❓ Liên Hệ

Nếu bạn có bất kỳ câu hỏi nào, đừng ngần ngại tạo một **Issue** hoặc liên hệ qua email: `phanranggaming@gmail.com`.

Cảm ơn bạn một lần nữa vì đã dành thời gian đóng góp! 🎉