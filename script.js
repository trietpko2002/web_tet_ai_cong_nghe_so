// ============================================================
// CẤU HÌNH FIREBASE (ĐỂ LƯU ĐIỂM & ĐĂNG NHẬP)
// ============================================================
// BẠN CẦN THAY THẾ BẰNG CONFIG CỦA BẠN TỪ FIREBASE CONSOLE
 const firebaseConfig = {
  apiKey: "AIzaSyCNyI8-gGrql58m9xvjzkrgNIfCLsei67g",
  authDomain: "tetaiweb.firebaseapp.com",
  projectId: "tetaiweb",
  storageBucket: "tetaiweb.firebasestorage.app",
    messagingSenderId: "836797908697",
    appId: "1:836797908697:web:cdf8b23c8e604d2479e0c8"
};

// Khởi tạo Firebase
let auth, db;
try {
    firebase.initializeApp(firebaseConfig);
    auth = firebase.auth();
    db = firebase.firestore();
    console.log("Firebase initialized");
} catch (e) {
    console.error("Chưa cấu hình Firebase hoặc lỗi khởi tạo. Tính năng lưu điểm sẽ không hoạt động.", e);
}

let currentUser = null;

// Lắng nghe trạng thái đăng nhập (Giữ đăng nhập khi F5 & Kiểm tra hết hạn 1 ngày)
if (auth) {
    auth.onAuthStateChanged((user) => {
        const ONE_DAY_MS = 24 * 60 * 60 * 1000; // 1 ngày
        const now = Date.now();
        const lastActivity = localStorage.getItem('tet_last_activity');

        if (user) {
            // Nếu đã quá 1 ngày không vào -> Đăng xuất
            if (lastActivity && (now - parseInt(lastActivity) > ONE_DAY_MS)) {
                console.log("Phiên đăng nhập hết hạn (quá 1 ngày).");
                logout();
            } else {
                // Chưa hết hạn -> Cập nhật lại thời gian hoạt động mới nhất
                localStorage.setItem('tet_last_activity', now);
                currentUser = user;
                updateUserUI();
            }
        } else {
            currentUser = null;
            updateUserUI();
        }
    });
}

// Xử lý đăng nhập Google
function loginWithGoogle() {
    if (!auth) return alert("Chưa cấu hình Firebase!");
    const provider = new firebase.auth.GoogleAuthProvider();
    auth.signInWithPopup(provider).then((result) => {
        currentUser = result.user;
        updateUserUI();
        // Đăng nhập thành công -> Lưu thời gian hoạt động
        localStorage.setItem('tet_last_activity', Date.now());
    }).catch((error) => {
        console.error(error);
        alert("Đăng nhập thất bại: " + error.message);
    });
}

// Xử lý đăng nhập Ẩn danh
function toggleAnonForm() {
    const form = document.getElementById("anon-form");
    const btns = document.getElementById("login-buttons");
    if (form.classList.contains("hidden")) {
        form.classList.remove("hidden");
        btns.classList.add("hidden");
    } else {
        form.classList.add("hidden");
        btns.classList.remove("hidden");
    }
}

function loginAnonymously() {
    const name = document.getElementById("anon-name").value;
    if (!name) return alert("Vui lòng nhập tên để hiển thị trên bảng xếp hạng!");

    auth.signInAnonymously().then((result) => {
        // Cập nhật tên và avatar giả cho user ẩn danh
        result.user.updateProfile({
            displayName: name,
            photoURL: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random&color=fff`
        }).then(() => {
            currentUser = auth.currentUser; // Cập nhật lại biến currentUser với thông tin mới
            updateUserUI();
            // Đăng nhập thành công -> Lưu thời gian hoạt động
            localStorage.setItem('tet_last_activity', Date.now());
            // onAuthStateChanged sẽ tự động chạy sau đó để cập nhật UI
        });
    }).catch((error) => {
        alert("Lỗi đăng nhập: " + error.message);
    });
}

function logout() {
    if (!auth) return;
    auth.signOut().then(() => {
        currentUser = null;
        updateUserUI();
        localStorage.removeItem('tet_last_activity'); // Xóa thời gian hoạt động
        // onAuthStateChanged sẽ tự động xử lý UI về trạng thái chưa đăng nhập
    });
}

function updateUserUI() {
    if (currentUser) {
        document.getElementById("login-buttons").classList.add("hidden");
        document.getElementById("anon-form").classList.add("hidden");
        document.getElementById("user-info").classList.remove("hidden");
        document.getElementById("user-avatar").src = currentUser.photoURL;
        document.getElementById("user-name").innerText = currentUser.displayName;
    } else {
        document.getElementById("login-buttons").classList.remove("hidden");
        document.getElementById("user-info").classList.add("hidden");
    }
}

// ============================================================
// CẤU HÌNH API (CHUYỂN SANG OPENAI / GROQ)
// ============================================================
const API_KEY = "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".trim(); // <-- Dán Key Groq (gsk_...) vào đây

// 1. Cấu hình OpenAI (Mất phí):
// const API_URL = "https://api.openai.com/v1/chat/completions";
// const API_MODEL = "gpt-3.5-turbo";

// 2. Cấu hình Groq (Miễn phí & Nhanh - Khuyên dùng):
const API_URL = "https://api.groq.com/openai/v1/chat/completions";
const API_MODEL = "llama-3.3-70b-versatile";
const VISION_MODEL = "llama-3.2-11b-vision-preview"; // Model AI nhìn được hình ảnh

// Hàm gọi AI chung
async function callAI(promptText) {
    if (API_KEY === "" || API_KEY === "YOUR_API_KEY_HERE") {
        alert("Bạn chưa nhập API Key trong file script.js!");
        return "Lỗi: Chưa cấu hình API Key.";
    }

    const data = {
        model: API_MODEL,
        messages: [
            { role: "user", content: promptText }
        ]
    };

    try {
        const response = await fetch(API_URL, {
            method: "POST",
            headers: { 
                "Content-Type": "application/json",
                "Authorization": "Bearer " + API_KEY
            },
            body: JSON.stringify(data)
        });

        if (!response.ok) {
            const errorData = await response.json();
            let errorMessage = errorData.error?.message || "Lỗi API: " + response.status;
            throw new Error(errorMessage);
        }

        const result = await response.json();
        return result.choices[0].message.content;
    } catch (error) {
        console.error("Lỗi gọi AI:", error);
        return "⚠️ Lỗi: " + error.message;
    }
}

// Hàm gọi AI Vision (Để phân tích ảnh)
async function callAIVision(text, base64Image) {
    const data = {
        model: VISION_MODEL,
        messages: [
            {
                role: "user",
                content: [
                    { type: "text", text: text },
                    { type: "image_url", image_url: { url: base64Image } }
                ]
            }
        ]
    };

    const response = await fetch(API_URL, {
        method: "POST",
        headers: { 
            "Content-Type": "application/json",
            "Authorization": "Bearer " + API_KEY
        },
        body: JSON.stringify(data)
    });
    const result = await response.json();
    return result.choices[0].message.content;
}

// --- 0. Landing Page Logic ---
function enterWebsite() {
    const landing = document.getElementById('landing-page');
    landing.style.opacity = '0';
    landing.style.transform = 'scale(1.1)';
    
    // Tự động phát nhạc nền
    const audio = document.getElementById('tet-music');
    audio.play().catch(e => console.log("Trình duyệt chặn tự phát nhạc:", e));
    document.getElementById('music-toggle').innerHTML = '<i class="fas fa-volume-up"></i>';

    setTimeout(() => {
        landing.style.display = 'none';
    }, 800);
}

// --- 1. Đếm ngược đến Tết Bính Ngọ 2026 (17/02/2026 Dương lịch) ---
const tetDate = new Date("February 17, 2026 00:00:00").getTime();

function updateCountdown() {
    const now = new Date().getTime();
    const distance = tetDate - now;

    if (distance < 0) {
        document.getElementById("timer-container").classList.add("hidden");
        document.getElementById("happy-new-year").classList.remove("hidden");
        return;
    }

    const days = Math.floor(distance / (1000 * 60 * 60 * 24));
    const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((distance % (1000 * 60)) / 1000);

    document.getElementById("days").innerText = days < 10 ? "0" + days : days;
    document.getElementById("hours").innerText = hours < 10 ? "0" + hours : hours;
    document.getElementById("minutes").innerText = minutes < 10 ? "0" + minutes : minutes;
    document.getElementById("seconds").innerText = seconds < 10 ? "0" + seconds : seconds;
}
setInterval(updateCountdown, 1000);

// --- 1.5. Lịch Trình Đón Tết (22 - 29 Tết) ---
const tetTasks = [
    { day: 22, date: "2026-02-09", title: "Dọn dẹp nhà cửa sơ bộ", desc: "Giặt giũ chăn màn, rèm cửa, lau dọn trần nhà, sắp xếp đồ đạc." },
    { day: 23, date: "2026-02-10", title: "Cúng Ông Công Ông Táo", desc: "Chuẩn bị mâm cúng, thả cá chép tiễn Táo Quân về trời (Nên cúng trước 12h trưa)." },
    { day: 24, date: "2026-02-11", title: "Lau dọn bàn thờ", desc: "Rút tỉa chân nhang, đánh bóng lư đồng, lau dọn bàn thờ gia tiên sạch sẽ." },
    { day: 25, date: "2026-02-12", title: "Đi chợ sắm Tết", desc: "Mua bánh kẹo, mứt, hạt dưa, đồ khô, phong bao lì xì, quần áo mới." },
    { day: 26, date: "2026-02-13", title: "Chuẩn bị gói bánh", desc: "Rửa lá dong, ngâm gạo nếp, đãi đỗ xanh, ướp thịt để gói bánh chưng/bánh tét." },
    { day: 27, date: "2026-02-14", title: "Gói và luộc bánh", desc: "Tổ chức gói bánh chưng/bánh tét, luộc bánh qua đêm, quây quần bên bếp lửa." },
    { day: 28, date: "2026-02-15", title: "Trang trí nhà cửa", desc: "Cắm hoa đào/mai/quất. Bày mâm ngũ quả. Treo câu đối đỏ." },
    { day: 29, date: "2026-02-16", title: "Cúng Tất Niên", desc: "Làm mâm cơm tất niên cúng gia tiên. Chuẩn bị đón Giao Thừa thiêng liêng." }
];

function renderTetTasks() {
    const container = document.getElementById("tet-tasks-container");
    if (!container) return;
    container.innerHTML = "";

    tetTasks.forEach(task => {
        const div = document.createElement("div");
        div.className = "task-item";
        div.innerHTML = `
            <div class="task-date">
                <span class="lunar-day">${task.day} Tết</span>
                <span class="solar-date">${task.date.split("-").reverse().join("/")}</span>
            </div>
            <div class="task-info">
                <h4>${task.title}</h4>
                <p>${task.desc}</p>
            </div>
            <div class="task-actions">
                <button onclick="addToCalendar('${task.title}', '${task.date}', '${task.desc}')" title="Thêm vào Lịch (App)"><i class="fas fa-calendar-plus"></i></button>
            </div>
        `;
        container.appendChild(div);
    });
}

function addToCalendar(title, dateStr, desc) {
    // Tạo file .ics để thêm vào lịch (Google Calendar, Apple Calendar, Outlook...)
    const startDate = new Date(dateStr);
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 1); // Sự kiện cả ngày, kết thúc vào ngày hôm sau

    const start = startDate.toISOString().split('T')[0].replace(/-/g, "");
    const end = endDate.toISOString().split('T')[0].replace(/-/g, "");

    const icsContent = `BEGIN:VCALENDAR\nVERSION:2.0\nPRODID:-//TetAI//Tet Schedule//EN\nBEGIN:VEVENT\nUID:${Date.now()}@tetai.com\nDTSTAMP:${new Date().toISOString().replace(/[-:]/g, "").split(".")[0]}Z\nDTSTART;VALUE=DATE:${start}\nDTEND;VALUE=DATE:${end}\nSUMMARY:${title}\nDESCRIPTION:${desc}\nEND:VEVENT\nEND:VCALENDAR`;

    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const link = document.createElement('a');
    link.href = window.URL.createObjectURL(blob);
    link.setAttribute('download', `${title}.ics`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// Gọi hàm render khi tải trang
document.addEventListener('DOMContentLoaded', renderTetTasks);

// --- 2. AI Tạo Lời Chúc (Dùng Gemini API) ---
let lastAiWish = ""; // Biến lưu lời chúc gần nhất để copy/share

async function generateWish(type = 'text') {
    const targetSelect = document.getElementById("wish-target");
    const targetText = targetSelect.options[targetSelect.selectedIndex].text;
    
    const styleSelect = document.getElementById("wish-style");
    const styleText = styleSelect.options[styleSelect.selectedIndex].text;
    
    const lengthSelect = document.getElementById("wish-length");
    const lengthText = lengthSelect.options[lengthSelect.selectedIndex].text;

    const themeSelect = document.getElementById("wish-theme");
    const themeText = themeSelect.options[themeSelect.selectedIndex].text;

    const resultBox = document.getElementById("wish-result");

    resultBox.classList.remove("hidden");
    resultBox.innerHTML = "<i class='fas fa-spinner fa-spin'></i> AI đang sáng tác...";

    // Tạo prompt cho AI
    let promptType = "một lời chúc Tết";
    if (type === 'poem') promptType = "một bài thơ chúc Tết (4 câu)";
    if (type === 'couplet') promptType = "một câu đối Tết";

    let prompt = `Đóng vai một chuyên gia văn hóa Việt Nam, hãy sáng tác ${promptType} cho năm mới Bính Ngọ 2026 thật hay, ý nghĩa và độc đáo.
    - Đối tượng nhận: "${targetText}"
    - Phong cách: "${styleText}"
    - Độ dài: "${lengthText}"
    - Chủ đề chính: "${themeText}"
    - Yêu cầu: Sử dụng từ ngữ chau chuốt, có vần điệu (nếu là thơ/câu đối), mang đậm không khí Tết cổ truyền kết hợp hiện đại.`;
    
    prompt += ` Trình bày rõ ràng, dùng icon cho sinh động.`;

    const aiResponse = await callAI(prompt);
    lastAiWish = aiResponse; // Lưu lại nội dung gốc
    
    // Xử lý xuống dòng để hiển thị đẹp hơn
    const formattedResponse = aiResponse.replace(/\n/g, "<br>");
    
    resultBox.innerHTML = `
        <strong>Kết quả từ AI:</strong><br>
        <div style="background: rgba(255,255,255,0.1); padding: 15px; border-radius: 8px; margin: 10px 0; text-align: left; border: 1px dashed var(--tet-gold); line-height: 1.6;">${formattedResponse}</div>
        <div style="display: flex; gap: 10px; justify-content: center; margin-top: 10px;">
            <button onclick="copyWish()" style="background: #4caf50; flex: 1;"><i class="fas fa-copy"></i> Copy</button>
            <button onclick="shareWish()" style="background: #2196f3; flex: 1;"><i class="fas fa-share-alt"></i> Gửi Ngay</button>
        </div>
    `;
}

function copyWish() {
    if (!lastAiWish) return;
    navigator.clipboard.writeText(lastAiWish).then(() => {
        alert("Đã sao chép lời chúc! Hãy dán vào tin nhắn (Zalo/Messenger) để gửi người thân nhé.");
    });
}

function shareWish() {
    if (!lastAiWish) return;
    if (navigator.share) {
        navigator.share({
            title: 'Lời chúc Tết AI 2026',
            text: lastAiWish,
        }).catch(console.error);
    } else {
        copyWish();
        alert("Thiết bị không hỗ trợ Share nhanh. Đã tự động Copy cho bạn!");
    }
}

// --- 3. Chia Lì Xì (Thuật toán đảm bảo tổng chính xác) ---
function allocateMoney() {
    const total = parseInt(document.getElementById("total-money").value);
    const count = parseInt(document.getElementById("total-packets").value);
    const resultDiv = document.getElementById("lixi-result");

    if (!total || !count || count <= 0 || total < count * 1000) {
        alert("Vui lòng nhập số tiền và số lượng hợp lý (tối thiểu 1000đ/bao).");
        return;
    }

    // Hiện nút Chia Lại
    document.getElementById("btn-reallocate").classList.remove("hidden");

    // Thuật toán chia ngẫu nhiên nhưng tổng không đổi
    let amounts = [];
    let currentSum = 0;
    
    // Bước 1: Random thô
    for(let i = 0; i < count; i++) {
        let val = Math.random();
        amounts.push(val);
        currentSum += val;
    }

    // Bước 2: Chuẩn hóa về tổng tiền
    let finalAmounts = amounts.map(val => Math.floor((val / currentSum) * total));

    // Bước 3: Làm tròn số cho đẹp (chia hết cho 1000 hoặc 500) và sửa lỗi làm tròn
    let sumFinal = 0;
    finalAmounts = finalAmounts.map(val => {
        let rounded = Math.floor(val / 1000) * 1000; 
        if (rounded === 0) rounded = 1000; // Tối thiểu 1k
        sumFinal += rounded;
        return rounded;
    });

    // Bước 4: Bù trừ phần dư
    let diff = total - sumFinal;
    while (diff !== 0) {
        let luckyIndex = Math.floor(Math.random() * count);
        if (diff > 0) {
            finalAmounts[luckyIndex] += 1000;
            diff -= 1000;
        } else if (diff < 0 && finalAmounts[luckyIndex] >= 2000) { // Đảm bảo không bị âm hoặc về 0
            finalAmounts[luckyIndex] -= 1000;
            diff += 1000;
        }
    }

    // Bước 5: Cố gắng làm cho các số không trùng lặp (nếu có thể)
    // Logic: Nếu tìm thấy 2 số giống nhau, thử bớt của A đưa cho B nếu trong giới hạn
    for (let i = 0; i < count * 2; i++) { // Lặp vài vòng để xáo trộn
        let idx1 = Math.floor(Math.random() * count);
        let idx2 = Math.floor(Math.random() * count);
        
        if (idx1 !== idx2 && finalAmounts[idx1] === finalAmounts[idx2]) {
            if (finalAmounts[idx1] > 1000) {
                finalAmounts[idx1] -= 1000;
                finalAmounts[idx2] += 1000;
            }
        }
    }

    // Bước 6: Xáo trộn vị trí lần cuối để người dùng chọn
    finalAmounts.sort(() => Math.random() - 0.5);

    // --- TÍNH NĂNG MỚI: Tìm Vua Lì Xì & Random Lời Chúc ---
    const maxVal = Math.max(...finalAmounts);
    const funnyWishes = [
        "Hay ăn chóng lớn", "Sớm có người yêu", "Bớt tạo nghiệp", "Tiền vào như nước",
        "Năm mới bớt ngáo", "Học giỏi chăm ngoan", "Thoát kiếp F.A", "Giàu ú ụ",
        "May mắn cả năm", "Vạn sự như ý", "Tỷ sự như mơ", "Triệu điều bất ngờ",
        "Cười nhiều lên", "Đừng đòi thêm", "Lộc lá đầy nhà", "Tâm sinh tướng"
    ];

    // Hiển thị
    resultDiv.classList.remove("hidden");
    resultDiv.innerHTML = "";
    
    finalAmounts.forEach((amt, index) => {
        const div = document.createElement("div");
        div.className = "lixi-packet";
        
        // Lưu dữ liệu vào element
        div.dataset.amount = amt;
        const isKing = (amt === maxVal && amt > 0);
        const wish = funnyWishes[Math.floor(Math.random() * funnyWishes.length)];
        div.dataset.wish = wish;
        div.dataset.isKing = isKing;

        // Nội dung mặt trước (Bao đóng - Kịch tính)
        div.innerHTML = `
            <div class="packet-cover">
                <i class="fas fa-envelope" style="font-size: 2rem; margin-bottom: 5px; color: var(--tet-gold);"></i>
                <span style="font-size: 1.1rem;">Bao số ${index + 1}</span>
                <small style="font-size: 0.7rem; opacity: 0.8; margin-top: 5px;">(Chạm để mở)</small>
            </div>
        `;
        
        // Sự kiện click để mở bao
        div.onclick = function() {
            if (this.classList.contains('opened')) return;
            this.classList.add('opened');
            
            let content = `<div class="packet-content"><div class="money-text">${new Intl.NumberFormat('vi-VN').format(amt)} đ</div>`;
            if (isKing) content += `<div class="king-badge"><i class="fas fa-crown"></i> VUA LÌ XÌ</div>`;
            content += `<div class="wish-text">"${wish}"</div></div>`;
            
            this.innerHTML = content;
        };
        
        resultDiv.appendChild(div);
    });
}

// --- 4. Gieo Quẻ AI (Dùng Gemini API) ---
async function getFortune() {
    const age = document.getElementById("fortune-age").value;
    const genderSelect = document.getElementById("fortune-gender");
    const genderText = genderSelect.options[genderSelect.selectedIndex].text;
    const topicSelect = document.getElementById("fortune-topic");
    const topicText = topicSelect.options[topicSelect.selectedIndex].text;

    const resultBox = document.getElementById("fortune-result");
    resultBox.classList.remove("hidden");
    resultBox.innerHTML = "<i class='fas fa-spinner fa-spin'></i> Thầy phán AI đang xem thiên văn...";
    
    const prompt = `Hãy đóng vai một thầy phong thủy/tử vi lão làng, gieo quẻ đầu năm Bính Ngọ 2026.
    - Thông tin tín chủ: ${age ? age + " tuổi" : "Không rõ tuổi"}, ${genderText}.
    - Muốn xin quẻ về: ${topicText}.
    
    Hãy trả về kết quả gồm:
    1. Tên quẻ (Đặt tên theo phong cách Hán Việt nghe thật kêu, ví dụ: Hỏa Thiên Đại Hữu, Lôi Địa Dự...).
    2. Lời phán: Một đoạn thơ hoặc văn vần ngắn gọn, súc tích nói về vận hạn năm nay theo chủ đề đã chọn.
    3. Con số may mắn (0-99) và Màu sắc hợp mệnh.
    Văn phong huyền bí nhưng tích cực.`;

    const aiResponse = await callAI(prompt);
    const formattedResponse = aiResponse.replace(/\n/g, "<br>");
    
    resultBox.innerHTML = `<strong>Quẻ năm nay:</strong><br>${formattedResponse}`;
}

// --- 5. Xông đất đầu năm ---
async function suggestFirstFooting() {
    const ownerInput = document.getElementById("owner-input").value;
    const genderSelect = document.getElementById("owner-gender");
    const genderText = genderSelect.options[genderSelect.selectedIndex].text;
    const resultBox = document.getElementById("footing-result");

    if (!ownerInput) {
        alert("Vui lòng nhập năm sinh của gia chủ!");
        return;
    }

    resultBox.classList.remove("hidden");
    resultBox.innerHTML = "<i class='fas fa-spinner fa-spin'></i> Thầy phong thủy AI đang tính toán...";

    const prompt = `Gia chủ sinh năm ${ownerInput} (${genderText}). Với tư cách là chuyên gia phong thủy, hãy phân tích kỹ Thiên Can, Địa Chi, Ngũ Hành và gợi ý 3 tuổi đẹp nhất (Tam Hợp, Lục Hợp) để xông đất cho gia chủ vào năm mới Bính Ngọ 2026.
    Giải thích ngắn gọn tại sao hợp (Thiên can, Địa chi, Ngũ hành).
    Gợi ý thêm giờ đẹp để xông đất.`;

    const aiResponse = await callAI(prompt);
    const formattedResponse = aiResponse.replace(/\n/g, "<br>");
    
    resultBox.innerHTML = `<strong>Gợi ý xông đất:</strong><br>${formattedResponse}`;
}

// --- 6. Game Đoán Lì Xì (Troll theo tuổi) ---
function playGuessGame() {
    const age = parseInt(document.getElementById("user-age").value);
    const isTroll = document.getElementById("troll-mode").checked;
    const resultBox = document.getElementById("guess-result");

    if (!age) {
        alert("Vui lòng nhập tuổi!");
        return;
    }

    resultBox.classList.remove("hidden");
    let money = 0;
    let message = "";
    
    if (!isTroll) {
        // Chế độ vui vẻ (Không troll)
        const luckyMoney = [10000, 20000, 50000, 68000, 86000, 100000, 200000, 500000];
        money = luckyMoney[Math.floor(Math.random() * luckyMoney.length)];
        const wishes = ["Năm mới phát tài!", "Vạn sự như ý!", "Tiền vào như nước!", "Sức khỏe dồi dào!"];
        message = wishes[Math.floor(Math.random() * wishes.length)];
    } else {
        // Chế độ Troll (Logic cũ)
        if (age < 10) {
            money = 50000;
            message = "Bé ngoan, hay ăn chóng lớn nhé!";
        } else if (age >= 10 && age < 18) {
            money = 20000;
            message = "Lo học hành đi nhé, đừng chơi game nhiều!";
        } else if (age >= 18 && age < 25) {
            money = 10000;
            message = "Sinh viên nghèo vượt khó, lấy lộc là chính.";
        } else if (age >= 25 && age < 50) {
            const troll = Math.random() > 0.5;
            if (troll) {
                money = 5000;
                message = "Lớn rồi còn đòi lì xì? Thôi cầm tạm tiền gửi xe.";
            } else {
                money = 0;
                message = "Bạn đã quá tuổi nhận lì xì. Hãy lì xì lại cho người làm web này!";
            }
        } else {
            money = 100000;
            message = "Kính chúc bác sống lâu trăm tuổi, sức khỏe dồi dào.";
        }
    }

    // Random biến động nhẹ để không trùng lặp hoàn toàn
    if (money > 0) {
        money += Math.floor(Math.random() * 5) * 1000; 
    }

    resultBox.innerHTML = `Bạn nhận được: <strong>${new Intl.NumberFormat('vi-VN').format(money)} đ</strong><br>${message}`;
}

// --- 7. Thử Thách Lì Xì Chéo ---
function runExchange() {
    const text = document.getElementById("participants").value;
    const min = parseInt(document.getElementById("min-amount").value) || 10000;
    const max = parseInt(document.getElementById("max-amount").value) || 50000;
    const includeTask = document.getElementById("exchange-task").checked;
    const resultBox = document.getElementById("exchange-result");

    let names = text.split("\n").map(n => n.trim()).filter(n => n !== "");

    if (names.length < 2) {
        alert("Cần ít nhất 2 người chơi!");
        return;
    }

    // Xáo trộn danh sách (Fisher-Yates Shuffle)
    for (let i = names.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [names[i], names[j]] = [names[j], names[i]];
    }

    resultBox.classList.remove("hidden");
    resultBox.innerHTML = "<h4>Kết quả ghép đôi:</h4>";

    const tasks = [
        "Hát một đoạn nhạc Xuân", "Chúc tết bằng tiếng Anh", "Kể một chuyện vui", 
        "Uống 100% ly nước ngọt/bia", "Múa phụ họa 10 giây", "Cười 3 kiểu khác nhau",
        "Khen người nhận 3 câu", "Làm mặt xấu chụp ảnh"
    ];

    // Ghép đôi vòng tròn: A -> B, B -> C, ..., Z -> A
    for (let i = 0; i < names.length; i++) {
        const giver = names[i];
        const receiver = names[(i + 1) % names.length];
        
        // Random tiền trong khoảng min-max
        const amount = Math.floor(Math.random() * ((max - min) / 1000 + 1)) * 1000 + min;
        
        let taskStr = "";
        if (includeTask) {
            const task = tasks[Math.floor(Math.random() * tasks.length)];
            taskStr = `<br><em style="font-size: 0.9rem; color: #555;">👉 Thử thách: ${task}</em>`;
        }

        const div = document.createElement("div");
        div.className = "exchange-item";
        div.innerHTML = `<strong>${giver}</strong> lì xì cho <strong>${receiver}</strong>: <span style="color:green">${new Intl.NumberFormat('vi-VN').format(amount)} đ</span>${taskStr}`;
        resultBox.appendChild(div);
    }
}

// --- 8. Tạo Mã VietQR ---
const banks = [
    { id: "VCB", name: "Vietcombank" },
    { id: "ICB", name: "VietinBank" },
    { id: "BIDV", name: "BIDV" },
    { id: "VBA", name: "Agribank" },
    { id: "OCB", name: "OCB" },
    { id: "MB", name: "MBBank" },
    { id: "TCB", name: "Techcombank" },
    { id: "ACB", name: "ACB" },
    { id: "VPB", name: "VPBank" },
    { id: "TPB", name: "TPBank" },
    { id: "STB", name: "Sacombank" },
    { id: "HDB", name: "HDBank" },
    { id: "VCCB", name: "VietCapitalBank" },
    { id: "SCB", name: "SCB" },
    { id: "VIB", name: "VIB" },
    { id: "SHB", name: "SHB" },
    { id: "EIB", name: "Eximbank" },
    { id: "MSB", name: "MSB" },
    { id: "CAKE", name: "CAKE by VPBank" },
    { id: "UBANK", name: "Ubank by VPBank" },
    { id: "TIMO", name: "Timo" },
    { id: "VTLMONEY", name: "Viettel Money" },
    { id: "VNPTMONEY", name: "VNPT Money" },
    { id: "SGICB", name: "SaigonBank" },
    { id: "BAB", name: "Bac A Bank" },
    { id: "PVCB", name: "PVcomBank" },
    { id: "OCEANBANK", name: "Oceanbank" },
    { id: "NCB", name: "NCB" },
    { id: "SHINHAN", name: "Shinhan Bank" },
    { id: "ABB", name: "ABBANK" },
    { id: "VIETBANK", name: "VietBank" },
    { id: "NAMABANK", name: "Nam A Bank" },
    { id: "PGB", name: "PGBank" },
    { id: "VIETABANK", name: "VietABank" },
    { id: "COOPBANK", name: "Co-op Bank" },
    { id: "LPB", name: "LPBank" },
    { id: "KLB", name: "KienLongBank" },
    { id: "KBHN", name: "KBank" },
    { id: "KB", name: "Kookmin Bank" },
    { id: "HSBC", name: "HSBC" },
    { id: "SCVN", name: "Standard Chartered" },
    { id: "PBVN", name: "Public Bank" },
    { id: "HLBVN", name: "Hong Leong" },
    { id: "VRB", name: "VRB" },
    { id: "IVB", name: "Indovina Bank" },
    { id: "WVN", name: "Woori Bank" },
    { id: "UOB", name: "UOB" },
    { id: "CIMB", name: "CIMB" },
    { id: "CBB", name: "CBBank" }
];

// Đổ dữ liệu vào select ngân hàng
const bankSelect = document.getElementById("bank-list");
if (bankSelect) {
    banks.forEach(bank => {
        const option = document.createElement("option");
        option.value = bank.id;
        option.text = `${bank.id} - ${bank.name}`;
        bankSelect.appendChild(option);
    });
}

async function generateQRContent() {
    const contentInput = document.getElementById("qr-content");
    contentInput.value = "Đang suy nghĩ...";
    contentInput.disabled = true;

    const prompt = "Hãy tạo 1 câu nội dung chuyển khoản lì xì Tết Bính Ngọ 2026 thật ngắn gọn (tối đa 10 từ), hài hước hoặc ý nghĩa. Chỉ trả về nội dung.";
    
    const aiResponse = await callAI(prompt);
    // Làm sạch nội dung (bỏ dấu ngoặc kép nếu có)
    let cleanContent = aiResponse.replace(/^"|"$/g, '').trim();
    
    // VietQR yêu cầu nội dung không dấu và không ký tự đặc biệt để đảm bảo tương thích tốt nhất
    // Tuy nhiên các app ngân hàng giờ hỗ trợ tiếng Việt tốt, ta cứ để nguyên hoặc convert nếu cần.
    // Ở đây ta giữ nguyên để hiển thị cho đẹp.
    
    contentInput.value = cleanContent;
    contentInput.disabled = false;
}

function createVietQR() {
    const bankId = document.getElementById("bank-list").value;
    const accountNo = document.getElementById("bank-account").value;
    const accountName = document.getElementById("account-name").value.toUpperCase(); // VietQR thường cần viết hoa
    const amount = document.getElementById("qr-amount").value;
    const content = document.getElementById("qr-content").value;
    const resultBox = document.getElementById("qr-result");

    if (!bankId || !accountNo) {
        alert("Vui lòng chọn ngân hàng và nhập số tài khoản!");
        return;
    }

    // Tạo URL VietQR (Sử dụng dịch vụ public của VietQR.io)
    // Format: https://img.vietqr.io/image/<BANK_ID>-<ACCOUNT_NO>-<TEMPLATE>.png?amount=<AMOUNT>&addInfo=<CONTENT>&accountName=<NAME>
    let qrUrl = `https://img.vietqr.io/image/${bankId}-${accountNo}-compact.png?`;
    
    if (amount) qrUrl += `amount=${amount}&`;
    if (content) qrUrl += `addInfo=${encodeURIComponent(content)}&`;
    if (accountName) qrUrl += `accountName=${encodeURIComponent(accountName)}`;

    resultBox.classList.remove("hidden");
    resultBox.innerHTML = `<p>Quét mã để lì xì ngay:</p>
                           <img src="${qrUrl}" alt="Mã QR Lì Xì" />
                           <p style="margin-top:5px; font-size: 0.9rem; color: #555;">${content}</p>`;
}

// --- 9. Xử lý chuyển Tab ---
function switchTab(tabId) {
    // 1. Ẩn tất cả các tab content
    const contents = document.querySelectorAll('.tab-content');
    contents.forEach(content => content.classList.remove('active'));

    // 2. Bỏ active ở tất cả các nút menu
    const buttons = document.querySelectorAll('.nav-btn');
    buttons.forEach(btn => btn.classList.remove('active'));

    // 3. Hiện tab được chọn
    document.getElementById(tabId).classList.add('active');

    // 4. Active nút menu tương ứng (tìm nút có onclick chứa tabId)
    const activeButton = Array.from(buttons).find(btn => btn.getAttribute('onclick').includes(tabId));
    if (activeButton) {
        activeButton.classList.add('active');
    }

    // Tự động đóng menu mobile khi chọn xong chức năng
    if (window.innerWidth <= 768) {
        toggleMobileMenu(false);
    }
}

// --- 9.5. Mobile Menu & Swipe Gestures (Vuốt để mở) ---
function toggleMobileMenu(forceState) {
    const sidebar = document.querySelector('.sidebar');
    const overlay = document.getElementById('mobile-overlay');
    
    const isOpen = sidebar.classList.contains('open');
    const shouldOpen = forceState !== undefined ? forceState : !isOpen;

    if (shouldOpen) {
        sidebar.classList.add('open');
        overlay.classList.add('active');
    } else {
        sidebar.classList.remove('open');
        overlay.classList.remove('active');
    }
}

// Xử lý sự kiện Vuốt (Swipe)
let touchStartX = 0;
document.addEventListener('touchstart', e => {
    touchStartX = e.changedTouches[0].screenX;
}, {passive: true});

document.addEventListener('touchend', e => {
    const touchEndX = e.changedTouches[0].screenX;
    // Vuốt từ trái sang phải (chỉ nhận khi vuốt từ mép trái < 50px) để mở menu
    if (touchEndX - touchStartX > 50 && touchStartX < 50) {
        toggleMobileMenu(true);
    }
    // Vuốt từ phải sang trái để đóng menu
    if (touchStartX - touchEndX > 50) {
        toggleMobileMenu(false);
    }
}, {passive: true});

// --- 10. Hiệu ứng Hoa Rơi (Mai & Đào) ---
function createBlossom() {
    const container = document.getElementById('blossom-container');
    if (!container) return;

    const petal = document.createElement('div');
    petal.classList.add('petal');
    
    // Ngẫu nhiên hoa đào (hồng) hoặc hoa mai (vàng)
    if (Math.random() > 0.5) petal.classList.add('peach');
    else petal.classList.add('apricot');

    // Ngẫu nhiên vị trí, kích thước và thời gian rơi
    petal.style.left = Math.random() * 100 + 'vw';
    const size = Math.random() * 10 + 10; // 10px - 20px
    petal.style.width = size + 'px';
    petal.style.height = size + 'px';
    petal.style.animationDuration = Math.random() * 3 + 5 + 's'; // 5s - 8s

    container.appendChild(petal);

    // Xóa cánh hoa sau khi rơi xong để tránh nặng máy
    setTimeout(() => { petal.remove(); }, 8000);
}

// Tạo hoa liên tục
setInterval(createBlossom, 300);

// --- 11. Hiệu ứng Pháo Hoa (Canvas Loop) ---
const fwCanvas = document.getElementById('fireworks');
const fwCtx = fwCanvas.getContext('2d');
let fireworks = [];
let particles = [];

function resizeCanvas() {
    fwCanvas.width = window.innerWidth;
    fwCanvas.height = window.innerHeight;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

class Firework {
    constructor() {
        this.x = Math.random() * fwCanvas.width;
        this.y = fwCanvas.height;
        this.sx = Math.random() * 3 - 1.5;
        this.sy = Math.random() * -3 - 3;
        this.size = 2;
        this.hue = Math.random() * 360;
    }
    update() {
        this.x += this.sx;
        this.y += this.sy;
        this.sy += 0.05; // Gravity
        this.size -= 0.02;
    }
    draw() {
        fwCtx.fillStyle = `hsl(${this.hue}, 100%, 50%)`;
        fwCtx.beginPath();
        fwCtx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        fwCtx.fill();
    }
}

class Particle {
    constructor(x, y, hue) {
        this.x = x;
        this.y = y;
        this.sx = Math.random() * 3 - 1.5;
        this.sy = Math.random() * 3 - 1.5;
        this.size = Math.random() * 2 + 1;
        this.hue = hue;
        this.life = 100;
    }
    update() {
        this.x += this.sx;
        this.y += this.sy;
        this.life -= 2;
    }
    draw() {
        fwCtx.fillStyle = `hsla(${this.hue}, 100%, 50%, ${this.life / 100})`;
        fwCtx.beginPath();
        fwCtx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        fwCtx.fill();
    }
}

function animateFireworks() {
    // Tạo hiệu ứng vệt mờ (trails)
    fwCtx.fillStyle = 'rgba(0, 0, 0, 0.1)'; 
    // Lưu ý: Vì nền web là gradient, ta dùng clearRect để trong suốt, 
    // nhưng muốn trail thì phải vẽ đè. 
    // Để đơn giản và đẹp trên nền web, ta chỉ clearRect:
    fwCtx.clearRect(0, 0, fwCanvas.width, fwCanvas.height);

    // Random bắn pháo hoa
    if (Math.random() < 0.05) { // Tỷ lệ xuất hiện
        fireworks.push(new Firework());
    }

    for (let i = 0; i < fireworks.length; i++) {
        fireworks[i].update();
        fireworks[i].draw();
        if (fireworks[i].sy >= 0 || fireworks[i].size <= 0) {
            // Nổ
            for (let j = 0; j < 30; j++) {
                particles.push(new Particle(fireworks[i].x, fireworks[i].y, fireworks[i].hue));
            }
            fireworks.splice(i, 1);
            i--;
        }
    }

    for (let i = 0; i < particles.length; i++) {
        particles[i].update();
        particles[i].draw();
        if (particles[i].life <= 0) {
            particles.splice(i, 1);
            i--;
        }
    }
    requestAnimationFrame(animateFireworks);
}
animateFireworks();

// --- 12. Minigame: Hứng Lộc Đầu Năm ---
const gameCanvas = document.getElementById('game-canvas');
const gameCtx = gameCanvas.getContext('2d');
let gameRunning = false;
let score = 0;
let playerX = 150;
let items = []; // {x, y, type: 'lixi' | 'bomb', speed}
let gameTimeLeft = 60;
let gameTimerInterval = null;

function initGame() {
    const container = document.getElementById('game-container');
    gameCanvas.width = container.clientWidth;
    gameCanvas.height = container.clientHeight;
    playerX = gameCanvas.width / 2;
    
    // Mouse move handler
    container.addEventListener('mousemove', (e) => {
        const rect = gameCanvas.getBoundingClientRect();
        playerX = e.clientX - rect.left;
    });
    
    // Touch handler for mobile
    container.addEventListener('touchmove', (e) => {
        e.preventDefault();
        const rect = gameCanvas.getBoundingClientRect();
        playerX = e.touches[0].clientX - rect.left;
    }, { passive: false });
}

function startGame() {
    if (gameRunning) return;
    initGame();
    gameRunning = true;
    score = 0;
    items = [];
    document.getElementById('game-ui').style.display = 'none';
    document.getElementById('score-board').innerText = 'Điểm: 0';
    
    // Reset Timer
    gameTimeLeft = 60;
    document.getElementById('game-timer-display').innerText = gameTimeLeft + 's';
    clearInterval(gameTimerInterval);
    
    gameTimerInterval = setInterval(() => {
        gameTimeLeft--;
        document.getElementById('game-timer-display').innerText = gameTimeLeft + 's';
        if (gameTimeLeft <= 0) {
            endGame();
        }
    }, 1000);

    gameLoop();
}

function endGame() {
    gameRunning = false;
    clearInterval(gameTimerInterval);
    
    // Vẽ màn hình kết thúc lên Canvas
    gameCtx.fillStyle = "rgba(0, 0, 0, 0.7)";
    gameCtx.fillRect(0, 0, gameCanvas.width, gameCanvas.height);
    
    gameCtx.fillStyle = "#ffd700";
    gameCtx.font = "bold 30px Arial";
    gameCtx.textAlign = "center";
    gameCtx.fillText("HẾT GIỜ!", gameCanvas.width / 2, gameCanvas.height / 2 - 20);
    
    gameCtx.fillStyle = "#fff";
    gameCtx.font = "20px Arial";
    gameCtx.fillText("Tổng điểm: " + score, gameCanvas.width / 2, gameCanvas.height / 2 + 20);

    // Hiển thị lại nút chơi lại sau 1 chút
    setTimeout(() => {
        document.getElementById('game-ui').style.display = 'block';
        
        // Xử lý lưu điểm (Yêu cầu đăng nhập)
        saveScoreToLeaderboard(score, 'catch-lixi');
    }, 1000);
}

function gameLoop() {
    if (!gameRunning) return;

    gameCtx.clearRect(0, 0, gameCanvas.width, gameCanvas.height);

    // Vẽ người chơi (Cái túi)
    gameCtx.font = "40px Arial";
    gameCtx.textAlign = "center";
    gameCtx.fillText("💰", playerX, gameCanvas.height - 10);

    // Tạo vật phẩm rơi
    if (Math.random() < 0.03) {
        const isBomb = Math.random() < 0.2; // 20% là pháo
        items.push({
            x: Math.random() * gameCanvas.width,
            y: -30,
            type: isBomb ? 'bomb' : 'lixi',
            speed: Math.random() * 2 + 2
        });
    }

    // Cập nhật vật phẩm
    for (let i = 0; i < items.length; i++) {
        items[i].y += items[i].speed;
        
        // Vẽ
        gameCtx.fillText(items[i].type === 'lixi' ? "🧧" : "🧨", items[i].x, items[i].y);

        // Va chạm
        if (items[i].y > gameCanvas.height - 50 && items[i].y < gameCanvas.height && Math.abs(items[i].x - playerX) < 30) {
            if (items[i].type === 'lixi') {
                score += 10;
            } else {
                score -= 20;
                // Hiệu ứng nổ nhẹ (rung màn hình game)
                gameCanvas.style.transform = "translateX(5px)";
                setTimeout(() => gameCanvas.style.transform = "translateX(0)", 100);
            }
            document.getElementById('score-board').innerText = 'Điểm: ' + score;
            items.splice(i, 1);
            i--;
        } else if (items[i].y > gameCanvas.height) {
            items.splice(i, 1);
            i--;
        }
    }

    requestAnimationFrame(gameLoop);
}

// --- 13. Nhạc Nền ---
function toggleMusic() {
    const audio = document.getElementById('tet-music');
    const btn = document.getElementById('music-toggle');
    if (audio.paused) {
        audio.play();
        btn.innerHTML = '<i class="fas fa-volume-up"></i>';
    } else {
        audio.pause();
        btn.innerHTML = '<i class="fas fa-volume-mute"></i>';
    }
}

// --- 14. Đố Vui Tết AI ---
let currentQuizData = null;
let challengeState = { active: false, current: 0, total: 10, score: 0, timeLeft: 0, timerInterval: null, mode: 10 };
let askedQuestions = JSON.parse(localStorage.getItem('tet_asked_questions')) || []; // Load lịch sử câu hỏi từ LocalStorage

async function generateTetQuiz(forcedTopic = null, forcedDifficulty = null) {
    let topicText = "";
    let difficultyText = "";

    if (forcedTopic) {
        if (forcedTopic === 'random') {
            const topics = ["Phong tục truyền thống", "Ẩm thực ngày Tết", "Sự tích & Lịch sử", "Đố vui hài hước/Mẹo"];
            topicText = topics[Math.floor(Math.random() * topics.length)];
        } else {
            const map = {
                'tradition': "Phong tục truyền thống",
                'food': "Ẩm thực ngày Tết",
                'history': "Sự tích & Lịch sử",
                'funny': "Đố vui hài hước/Mẹo"
            };
            topicText = map[forcedTopic] || "Chủ đề Tết";
        }
    } else {
        const topicSelect = document.getElementById("quiz-topic");
        topicText = topicSelect.options[topicSelect.selectedIndex].text;
    }

    if (forcedDifficulty) {
        const diffMap = { 'easy': "Dễ", 'medium': "Trung bình", 'hard': "Khó (Thử thách)" };
        difficultyText = diffMap[forcedDifficulty];
    } else {
        const difficultySelect = document.getElementById("quiz-difficulty");
        difficultyText = difficultySelect.options[difficultySelect.selectedIndex].text;
    }
    
    const container = document.getElementById("quiz-container");
    container.classList.remove("hidden");
    container.innerHTML = "<div style='text-align:center'><i class='fas fa-spinner fa-spin'></i> AI đang soạn câu hỏi...</div>";

    // Nếu đang trong thử thách, cập nhật trạng thái
    if (challengeState.active) {
        document.getElementById("quiz-progress").innerText = `${challengeState.current}/${challengeState.total}`;
        document.getElementById("quiz-score").innerText = challengeState.score;
    }

    // Prompt yêu cầu định dạng đặc biệt để dễ xử lý
    // Thêm yếu tố ngẫu nhiên vào prompt để AI không trả về câu giống nhau
    const prompt = `Hãy tạo một câu hỏi trắc nghiệm về Tết Nguyên Đán.
    - Chủ đề: ${topicText}
    - Độ khó: ${difficultyText}
    - Yêu cầu: Câu hỏi phải độc đáo, thú vị, không được trùng lặp với các câu phổ biến. Random seed: ${Math.random()}
    Yêu cầu trả về ĐÚNG định dạng sau (ngăn cách bởi dấu |):
    Câu hỏi|Đáp án A|Đáp án B|Đáp án C|Đáp án D|Vị trí đáp án đúng (0, 1, 2 hoặc 3)|Giải thích ngắn gọn
    
    Ví dụ:
    Bánh chưng hình gì?|Hình tròn|Hình vuông|Hình tam giác|Hình chữ nhật|1|Bánh chưng hình vuông tượng trưng cho Đất.`;

    try {
        // Tạm dừng đồng hồ khi AI đang nghĩ để công bằng
        if (challengeState.active) clearInterval(challengeState.timerInterval);
        const aiResponse = await callAI(prompt);
        if (challengeState.active) startQuizTimer(); // Chạy lại đồng hồ
        const parts = aiResponse.split('|');
        
        if (parts.length < 7) {
            throw new Error("AI trả về sai định dạng, vui lòng thử lại.");
        }

        const questionText = parts[0].trim();

        // Kiểm tra trùng lặp (Nếu đã hỏi rồi thì gọi lại hàm để lấy câu khác)
        if (askedQuestions.includes(questionText)) {
            console.log("Phát hiện câu hỏi trùng, đang đổi câu khác...");
            return generateTetQuiz(forcedTopic, forcedDifficulty);
        }
        askedQuestions.push(questionText); // Lưu vào danh sách đã hỏi
        localStorage.setItem('tet_asked_questions', JSON.stringify(askedQuestions)); // Lưu ngay vào LocalStorage

        currentQuizData = {
            question: questionText,
            options: [parts[1].trim(), parts[2].trim(), parts[3].trim(), parts[4].trim()],
            correctIndex: parseInt(parts[5].trim()),
            explanation: parts[6].trim()
        };

        // Cập nhật giao diện mới: Sử dụng class .quiz-question-text thay vì style cứng
        let html = `<div class="quiz-question-text">${currentQuizData.question}</div>`;
        html += `<div style="display: grid; gap: 10px;">`;
        currentQuizData.options.forEach((opt, index) => {
            html += `<button class="quiz-option" onclick="checkQuizAnswer(${index}, this)">${['A', 'B', 'C', 'D'][index]}. ${opt}</button>`;
        });
        html += `</div><div id="quiz-feedback"></div>`;
        
        container.innerHTML = html;

    } catch (e) {
        container.innerHTML = `<div style="color:red; text-align:center">Lỗi: ${e.message} <br> <button onclick="generateTetQuiz()">Thử lại</button></div>`;
    }
}

function checkQuizAnswer(selectedIndex, btnElement) {
    if (!currentQuizData) return;
    
    const feedbackDiv = document.getElementById("quiz-feedback");
    const allButtons = document.querySelectorAll(".quiz-option");
    
    // Vô hiệu hóa các nút sau khi chọn
    allButtons.forEach(btn => btn.disabled = true);
    
    let isCorrect = false;

    if (selectedIndex === currentQuizData.correctIndex) {
        isCorrect = true;
        btnElement.classList.add("correct");
        feedbackDiv.innerHTML = `<div class="quiz-explanation" style="border-color: #4caf50; background: #e8f5e9; color: #2e7d32;">
            <strong><i class="fas fa-check-circle"></i> Chính xác!</strong><br>${currentQuizData.explanation}
        </div>`;
        if (challengeState.active) challengeState.score += 10;
    } else {
        btnElement.classList.add("wrong");
        // Hiện đáp án đúng
        allButtons[currentQuizData.correctIndex].classList.add("correct");
        feedbackDiv.innerHTML = `<div class="quiz-explanation" style="border-color: #f44336; background: #ffebee; color: #c62828;">
            <strong><i class="fas fa-times-circle"></i> Sai rồi!</strong><br>${currentQuizData.explanation}
        </div>`;
        if (challengeState.active) challengeState.score -= 5;
    }

    // Xử lý logic Thử Thách (Tự động chuyển câu)
    if (challengeState.active) {
        // Cập nhật điểm ngay lập tức
        document.getElementById("quiz-score").innerText = challengeState.score;
        
        if (challengeState.current < challengeState.total) {
            // Tự động chuyển câu sau 1.5 giây
            setTimeout(() => {
                nextChallengeQuestion();
            }, 1500);
        } else {
            // Kết thúc sau 1.5 giây
            setTimeout(() => {
                endQuizChallenge();
            }, 1500);
        }
    }
}

function startQuizChallenge(totalQs, minutes) {
    // Hiển thị đếm ngược 3s trước khi bắt đầu
    const container = document.getElementById("quiz-container");
    container.classList.remove("hidden");
    
    let count = 3;
    container.innerHTML = `<div style="font-size: 5rem; color: #d00000; text-align: center; margin-top: 50px; animation: popIn 0.5s infinite;">${count}</div>`;
    
    // Âm thanh beep (Tạo trực tiếp không cần thẻ audio)
    const beep = new Audio("https://assets.mixkit.co/sfx/preview/mixkit-simple-countdown-beep-1607.mp3");
    beep.play();

    const countdownInterval = setInterval(() => {
        count--;
        if (count > 0) {
            container.innerHTML = `<div style="font-size: 5rem; color: #d00000; text-align: center; margin-top: 50px; animation: popIn 0.5s infinite;">${count}</div>`;
            beep.currentTime = 0;
            beep.play();
        } else {
            clearInterval(countdownInterval);
            // Bắt đầu game chính thức
            challengeState = { 
                active: true, 
                current: 0, 
                total: totalQs, 
                score: 0, 
                timeLeft: minutes * 60, 
                mode: totalQs 
            };
            
            // askedQuestions = []; // BỎ DÒNG NÀY: Không reset nữa để đảm bảo không trùng lặp vĩnh viễn
            document.getElementById("challenge-status").classList.remove("hidden");
            startQuizTimer();
            nextChallengeQuestion();
        }
    }, 1000);
}

function startQuizTimer() {
    clearInterval(challengeState.timerInterval);
    challengeState.timerInterval = setInterval(() => {
        challengeState.timeLeft--;
        
        const m = Math.floor(challengeState.timeLeft / 60);
        const s = challengeState.timeLeft % 60;
        document.getElementById("quiz-timer").innerText = `${m < 10 ? '0'+m : m}:${s < 10 ? '0'+s : s}`;

        if (challengeState.timeLeft <= 0) {
            clearInterval(challengeState.timerInterval);
            alert("Hết giờ!");
            endQuizChallenge();
        }
    }, 1000);
}

function endQuizChallenge() {
    clearInterval(challengeState.timerInterval);
    challengeState.active = false;
    
    const container = document.getElementById("quiz-container");
    let html = `<div style="text-align:center; margin-top:15px; padding: 20px; background: #fff; border: 2px solid var(--tet-red); border-radius: 10px;">
        <h3 style="color: var(--tet-red)">🎉 HOÀN THÀNH! 🎉</h3>
        <p style="font-size: 1.2rem;">Chế độ: ${challengeState.mode} câu</p>
        <p style="font-size: 1.5rem;">Tổng điểm: <strong>${challengeState.score}</strong></p>
        <p>Đang lưu điểm và chuyển sang bảng xếp hạng...</p>`;

    container.innerHTML = html;

    // Logic bắt buộc đăng nhập để lưu điểm Đố Vui
    saveScoreToLeaderboard(challengeState.score, challengeState.mode);
}

// Hàm chung để lưu điểm
function saveScoreToLeaderboard(scoreVal, modeVal) {
    db.collection("leaderboard").add({
        uid: currentUser.uid,
        name: currentUser.displayName,
        photo: currentUser.photoURL,
        score: scoreVal,
        mode: modeVal, // 'catch-lixi' hoặc số câu hỏi (10, 20, 30)
        timestamp: firebase.firestore.FieldValue.serverTimestamp()
    }).then(() => {
        if (modeVal === 'catch-lixi') {
            // alert("Đã lưu điểm Hứng Lộc thành công!");
            openLeaderboardModal();
            loadLeaderboard('catch-lixi');
        } else {
            // Tự động chuyển tab sau khi lưu thành công
            setTimeout(() => {
                openLeaderboardModal(); // Mở modal thay vì chuyển tab
                loadLeaderboard(modeVal); // Load đúng mode vừa chơi
            }, 1500);
        }
    }).catch((err) => {
        alert("Lỗi lưu điểm: " + err.message);
    });
    } else {
        // LƯU VÀO LOCAL STORAGE NẾU CHƯA ĐĂNG NHẬP
        const localData = {
            uid: 'local_' + Date.now(),
            name: 'Khách (Máy này)',
            photo: 'https://ui-avatars.com/api/?name=Guest&background=random&color=fff',
            score: scoreVal,
            mode: modeVal,
            timestamp: new Date().toISOString(),
            isLocal: true
        };
        
        let localScores = JSON.parse(localStorage.getItem('tet_leaderboard')) || [];
        localScores.push(localData);
        localStorage.setItem('tet_leaderboard', JSON.stringify(localScores));
        
        alert("Bạn chưa đăng nhập: Kết quả đã được lưu trên máy này!");
        
        if (modeVal === 'catch-lixi') {
            openLeaderboardModal();
            loadLeaderboard('catch-lixi');
        } else {
            setTimeout(() => {
                openLeaderboardModal();
                loadLeaderboard(modeVal);
            }, 1500);
        }
    }
}

function nextChallengeQuestion() {
    challengeState.current++;
    // Random chủ đề và độ khó cho thú vị
    const topics = ['tradition', 'food', 'history', 'funny'];
    const randomTopic = topics[Math.floor(Math.random() * topics.length)];
    generateTetQuiz(randomTopic, 'medium');
}

// --- 16. Bảng Tổng Sắp (Firestore) ---
let leaderboardUnsubscribe = null; // Biến lưu listener để hủy khi cần thiết

function openLeaderboardModal() {
    document.getElementById('leaderboard-modal').style.display = 'flex';
    loadLeaderboard(10); // Mặc định load top 10 câu
}

function closeLeaderboardModal() {
    document.getElementById('leaderboard-modal').style.display = 'none';
}

function loadLeaderboard(mode) {
    if (!db) return alert("Chưa cấu hình Firebase!");
    
    const tbody = document.getElementById("leaderboard-body");
    tbody.innerHTML = "<tr><td colspan='4' style='text-align:center'><i class='fas fa-spinner fa-spin'></i> Đang tải dữ liệu trực tiếp...</td></tr>";

    // Lấy dữ liệu Local
    let allLocal = JSON.parse(localStorage.getItem('tet_leaderboard')) || [];
    let localModeScores = allLocal.filter(item => item.mode == mode);

    // Hủy đăng ký listener cũ nếu có (để tránh chạy chồng chéo khi chuyển tab)
    if (leaderboardUnsubscribe) {
        leaderboardUnsubscribe();
    }

    // Hàm render chung (kết hợp Local + Firebase)
    const renderTable = (firebaseDocs = []) => {
        let combined = [...localModeScores];
        
        firebaseDocs.forEach(doc => {
            combined.push(doc.data()); // Gộp dữ liệu Firebase vào
        });

        // Sắp xếp giảm dần theo điểm
        combined.sort((a, b) => b.score - a.score);
        // Lấy Top 20
        combined = combined.slice(0, 20);

        tbody.innerHTML = "";
        let rank = 1;

        combined.forEach((data) => {
            // Xử lý ngày tháng (Firebase Timestamp vs ISO String)
            let dateStr = "";
            if (data.timestamp && data.timestamp.toDate) {
                dateStr = new Date(data.timestamp.toDate()).toLocaleString('vi-VN');
            } else if (data.timestamp) {
                dateStr = new Date(data.timestamp).toLocaleString('vi-VN');
            }

            // Highlight
            let highlightStyle = "";
            let icon = `#${rank}`;
            if (rank === 1) icon = "🥇";
            if (rank === 2) icon = "🥈";
            if (rank === 3) icon = "🥉";

            if (currentUser && data.uid === currentUser.uid) {
                highlightStyle = "background-color: #fff9c4; border: 2px solid var(--tet-gold); font-weight: bold; color: #333;";
            } else if (data.isLocal) {
                highlightStyle = "background-color: #e3f2fd; border: 2px dashed #2196f3; color: #333;";
            }

            const row = `<tr style="${highlightStyle}">
                <td style="font-size: 1.2rem;">${icon}</td>
                <td><img src="${data.photo}" style="width:30px; height:30px; border-radius:50%; vertical-align:middle; border:1px solid #ccc; margin-right: 5px;"> ${data.name}</td>
                <td style="font-weight:bold; color:#d00000; font-size: 1.1rem;">${data.score}</td>
                <td style="font-size:0.8rem; color:#666">${dateStr}</td>
            </tr>`;
            tbody.innerHTML += row;
            rank++;
        });

        if (combined.length === 0) {
            tbody.innerHTML = "<tr><td colspan='4' style='text-align:center'>Chưa có dữ liệu. Hãy là người đầu tiên ghi danh!</td></tr>";
        }
    };

    if (db && navigator.onLine) { // Chỉ gọi Firebase khi có mạng và db đã init
    // Sử dụng onSnapshot để cập nhật Real-time (Tất cả người dùng đều thấy ngay lập tức)
    leaderboardUnsubscribe = db.collection("leaderboard")
        .where("mode", "==", mode)
        .orderBy("score", "desc")
        .limit(10)
        .onSnapshot((querySnapshot) => {
            renderTable(querySnapshot.docs);
        }, (error) => {
            console.error("Error getting leaderboard: ", error);
            renderTable([]); // Vẫn hiện local nếu lỗi mạng
            
            // Hướng dẫn người dùng tạo Index nếu lỗi (Lỗi này chắc chắn sẽ gặp lần đầu tiên)
            if (error.message.includes("requires an index")) {
                tbody.innerHTML += `<tr><td colspan='4' style='text-align:center; color:red'>
                    <strong>Lỗi thiếu Index Firebase!</strong><br>
                    Vui lòng mở Console (F12) và bấm vào đường link do Firebase cung cấp để tạo Index tự động cho bảng xếp hạng này.
                </td></tr>`;
            }
        });
    } else {
        renderTable([]);
    }
}

// --- 16.5 Chia sẻ & Chụp ảnh Bảng Xếp Hạng ---
function captureLeaderboard() {
    const element = document.getElementById("leaderboard-content");
    const closeBtn = element.querySelector("button[onclick='closeLeaderboardModal()']");
    
    // 1. Ẩn các nút điều khiển để ảnh đẹp hơn
    element.classList.add("capturing");
    closeBtn.style.display = "none";

    // 2. Dùng html2canvas chụp lại
    html2canvas(element, {
        backgroundColor: "#4a0404", // Màu nền đỏ Tết thay vì trong suốt
        scale: 2, // Tăng độ nét
        useCORS: true // Cho phép tải ảnh avatar từ nguồn ngoài
    }).then(canvas => {
        // 3. Tạo link tải về
        const link = document.createElement('a');
        link.download = 'bang-vang-tet-2026.png';
        link.href = canvas.toDataURL("image/png");
        link.click();

        // 4. Khôi phục giao diện
        element.classList.remove("capturing");
        closeBtn.style.display = "block";
        
        alert("Đã tải ảnh thành tích! Bạn có thể đăng lên Facebook ngay.");
    }).catch(err => {
        console.error(err);
        alert("Lỗi khi chụp ảnh: " + err.message);
        element.classList.remove("capturing");
        closeBtn.style.display = "block";
    });
}

function shareWebsite() {
    const url = encodeURIComponent(window.location.href);
    const text = encodeURIComponent("Chơi Tết AI 2026 cực vui! Xem bói, Lì xì, Đố vui có thưởng tại đây 👇");
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${url}&quote=${text}`, '_blank');
}

// --- 15. Tạo Lệnh Ảnh (Prompt Engineering) ---
async function generateImagePrompt() {
    const promptInput = document.getElementById("img-prompt").value;
    const style = document.getElementById("prompt-style").value;
    const mood = document.getElementById("prompt-mood").value;
    const lighting = document.getElementById("prompt-lighting").value;
    const camera = document.getElementById("prompt-camera").value;
    const ratio = document.getElementById("prompt-ratio").value;
    
    const resultBox = document.getElementById("prompt-result");
    const textArea = document.getElementById("generated-prompt");

    if (!promptInput) {
        alert("Hãy nhập ý tưởng chính!");
        return;
    }

    resultBox.classList.remove("hidden");
    textArea.value = "AI đang viết lệnh...";

    // Thêm các từ khóa chất lượng cao để lệnh không bị "thưa"
    const qualityBoosters = "Masterpiece, best quality, 8k resolution, highly detailed, sharp focus, HDR, intricate details";

    // Prompt cho LLM (Groq) để tạo Image Prompt
    let systemPrompt = `Act as an expert Prompt Engineer for Midjourney/DALL-E 3. 
    Create a VERY DETAILED, rich, and high-quality image generation prompt in English based on the following inputs. Expand on the user's idea with artistic descriptions.
    
    User Idea: ${promptInput}
    Style: ${style}
    Mood/Atmosphere: ${mood}
    Lighting: ${lighting}
    Camera: ${camera}
    Aspect Ratio: ${ratio}

    Output ONLY the final prompt text. Do not add explanations.
    Structure: [Subject Description + Action], [Environment & Background], [Art Style & Medium], [Mood & Atmosphere], [Lighting & Camera Angles], [Quality Boosters: ${qualityBoosters}], [Aspect Ratio]`;

    const finalPrompt = await callAI(systemPrompt);
    textArea.value = finalPrompt.replace(/^"|"$/g, ''); // Xóa dấu ngoặc kép nếu có
}

function copyPrompt() {
    const copyText = document.getElementById("generated-prompt");
    copyText.select();
    copyText.setSelectionRange(0, 99999);
    navigator.clipboard.writeText(copyText.value);
    alert("Đã copy lệnh! Hãy dán vào công cụ tạo ảnh.");
}

// --- Helper: Xử lý ảnh upload ---
// --- 16. Hướng Dẫn & Giới Thiệu ---
function toggleHelp() {
    const modal = document.getElementById('help-modal');
    if (modal.style.display === 'none' || modal.style.display === '') {
        modal.style.display = 'flex';
    } else {
        modal.style.display = 'none';
    }
}

// --- 17. Tập Thể Dục ---
let exerciseInterval;
function startExercise(minutes) {
    // Tạm dừng nhạc nền Tết
    const bgMusic = document.getElementById('tet-music');
    bgMusic.pause();
    document.getElementById('music-toggle').innerHTML = '<i class="fas fa-volume-mute"></i>';

    // Phát nhạc tập thể dục
    const exMusic = document.getElementById('exercise-music');
    exMusic.currentTime = 0;
    exMusic.play();

    const statusDiv = document.getElementById('exercise-status');
    statusDiv.classList.remove('hidden');
    
    let timeLeft = minutes * 60;
    updateExerciseTimer(timeLeft);

    clearInterval(exerciseInterval);
    exerciseInterval = setInterval(() => {
        timeLeft--;
        updateExerciseTimer(timeLeft);
        if (timeLeft <= 0) {
            stopExercise();
            alert("Đã hoàn thành bài tập! Chúc bạn năm mới dẻo dai, khỏe mạnh!");
        }
    }, 1000);
}

function updateExerciseTimer(seconds) {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    document.getElementById('exercise-timer').innerText = `${m < 10 ? '0'+m : m}:${s < 10 ? '0'+s : s}`;
}

function stopExercise() {
    clearInterval(exerciseInterval);
    const exMusic = document.getElementById('exercise-music');
    exMusic.pause();
    exMusic.currentTime = 0;
    document.getElementById('exercise-status').classList.add('hidden');
    
    // Bật lại nhạc nền Tết
    const bgMusic = document.getElementById('tet-music');
    bgMusic.play();
    document.getElementById('music-toggle').innerHTML = '<i class="fas fa-volume-up"></i>';
}

// --- 18. Donate VietQR ---
function donate() {
    document.getElementById('donate-modal').style.display = 'flex';
}

function closeDonateModal() {
    document.getElementById('donate-modal').style.display = 'none';
}

function confirmDonate() {
    const amount = document.getElementById('donate-amount').value;
    
    const bankId = "OCB"; 
    const accountNo = "0332628943"; 
    const accountName = "VO NGUYEN NHAT TRIET"; 
    const memo = "Donate Web Tet"; 

    // Tạo link VietQR có kèm số tiền (nếu người dùng nhập)
    let url = `https://img.vietqr.io/image/${bankId}-${accountNo}-compact.png?addInfo=${encodeURIComponent(memo)}&accountName=${encodeURIComponent(accountName)}`;
    
    if (amount && parseInt(amount) > 0) {
        url += `&amount=${amount}`;
    }
    
    // Mở trong tab mới
    window.open(url, '_blank');
    closeDonateModal();
}

// --- 19. Thiệp Tết Online ---
let uploadedImage = null;

function handleImageUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        const img = new Image();
        img.onload = function() {
            uploadedImage = img;
            drawCard();
        };
        img.src = e.target.result;
    };
    reader.readAsDataURL(file);
}

function drawCard() {
    const canvas = document.getElementById('card-canvas');
    const ctx = canvas.getContext('2d');
    const text = document.getElementById('card-text').value;
    const frameType = document.getElementById('card-frame').value;
    const textColor = document.getElementById('card-text-color') ? document.getElementById('card-text-color').value : '#ffffff';
    const fontSize = document.getElementById('card-font-size') ? parseInt(document.getElementById('card-font-size').value) : 50;

    // 1. Thiết lập kích thước canvas theo ảnh (giới hạn chiều rộng để không quá to)
    const maxWidth = 800;
    let w = 800;
    let h = 600;

    if (uploadedImage) {
        w = uploadedImage.width;
        h = uploadedImage.height;
        if (w > maxWidth) {
            h = (maxWidth / w) * h;
            w = maxWidth;
        }
    }

    canvas.width = w;
    canvas.height = h;

    // 2. Vẽ nền hoặc ảnh
    if (uploadedImage) {
        ctx.drawImage(uploadedImage, 0, 0, w, h);
    } else {
        // Nền mặc định nếu chưa có ảnh
        const grd = ctx.createLinearGradient(0, 0, w, h);
        grd.addColorStop(0, "#c0392b");
        grd.addColorStop(1, "#8e44ad");
        ctx.fillStyle = grd;
        ctx.fillRect(0, 0, w, h);
        
        if (!text) {
            ctx.fillStyle = 'rgba(255,255,255,0.5)';
            ctx.font = '20px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('Tải ảnh lên hoặc chọn khung để bắt đầu', w/2, h/2);
        }
    }

    // 3. Vẽ khung (Nâng cấp)
    ctx.save();
    if (frameType === 'red') {
        // Khung đỏ cổ điển
        const border = 20;
        ctx.strokeStyle = '#b71c1c';
        ctx.lineWidth = border;
        ctx.strokeRect(0, 0, w, h);
        
        // Viền vàng bên trong
        ctx.strokeStyle = '#ffd700';
        ctx.lineWidth = 2;
        ctx.strokeRect(border/2, border/2, w-border, h-border);

        // Góc trang trí
        ctx.fillStyle = '#ffd700';
        const cornerSize = 40;
        // Top-Left
        ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(cornerSize, 0); ctx.lineTo(0, cornerSize); ctx.fill();
        // Top-Right
        ctx.beginPath(); ctx.moveTo(w,0); ctx.lineTo(w-cornerSize, 0); ctx.lineTo(w, cornerSize); ctx.fill();
        // Bottom-Left
        ctx.beginPath(); ctx.moveTo(0,h); ctx.lineTo(cornerSize, h); ctx.lineTo(0, h-cornerSize); ctx.fill();
        // Bottom-Right
        ctx.beginPath(); ctx.moveTo(w,h); ctx.lineTo(w-cornerSize, h); ctx.lineTo(w, h-cornerSize); ctx.fill();

    } else if (frameType === 'gold') {
        // Khung vàng sang trọng
        const border = 25;
        ctx.strokeStyle = '#ffd700';
        ctx.lineWidth = border;
        ctx.strokeRect(0, 0, w, h);
        
        // Họa tiết chấm bi trên khung
        ctx.fillStyle = '#b71c1c';
        for(let i=0; i<w; i+=40) {
            ctx.beginPath(); ctx.arc(i, border/2, 5, 0, Math.PI*2); ctx.fill();
            ctx.beginPath(); ctx.arc(i, h-border/2, 5, 0, Math.PI*2); ctx.fill();
        }
        for(let i=0; i<h; i+=40) {
            ctx.beginPath(); ctx.arc(border/2, i, 5, 0, Math.PI*2); ctx.fill();
            ctx.beginPath(); ctx.arc(w-border/2, i, 5, 0, Math.PI*2); ctx.fill();
        }

    } else if (frameType === 'flower') {
        // Khung hoa đào (Hồng phấn)
        const border = 30;
        ctx.strokeStyle = '#ffcdd2';
        ctx.lineWidth = border;
        ctx.strokeRect(0, 0, w, h);
        
        // Vẽ hoa đơn giản ở 4 góc
        const drawFlower = (cx, cy) => {
            ctx.fillStyle = '#e91e63';
            for(let i=0; i<5; i++) {
                ctx.beginPath();
                ctx.ellipse(cx, cy, 15, 5, i * (Math.PI*2/5), 0, Math.PI*2);
                ctx.fill();
            }
            ctx.beginPath(); ctx.arc(cx, cy, 5, 0, Math.PI*2); ctx.fillStyle='#ffeb3b'; ctx.fill();
        };
        
        drawFlower(border, border);
        drawFlower(w-border, border);
        drawFlower(border, h-border);
        drawFlower(w-border, h-border);
    }
    ctx.restore();

    // 4. Vẽ chữ (Lời chúc) - Có wrap text
    if (text) {
        ctx.save();
        ctx.font = `bold ${fontSize}px "Dancing Script", cursive, Arial`;
        ctx.fillStyle = textColor;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        
        // Shadow cho chữ dễ đọc
        ctx.shadowColor = "rgba(0,0,0,0.8)";
        ctx.shadowBlur = 8;
        ctx.shadowOffsetX = 2;
        ctx.shadowOffsetY = 2;

        const x = w / 2;
        const y = h - 40; // Cách đáy một chút
        const maxWidthText = w - 60;
        const lineHeight = fontSize * 1.2;

        wrapText(ctx, text, x, y, maxWidthText, lineHeight);
        ctx.restore();
    }
}

// Hàm xử lý xuống dòng
function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
    const words = text.split(' ');
    let line = '';
    let lines = [];

    // Tính toán các dòng
    for(let n = 0; n < words.length; n++) {
        const testLine = line + words[n] + ' ';
        const metrics = ctx.measureText(testLine);
        const testWidth = metrics.width;
        if (testWidth > maxWidth && n > 0) {
            lines.push(line);
            line = words[n] + ' ';
        } else {
            line = testLine;
        }
    }
    lines.push(line);

    // Vẽ từ dưới lên trên
    for(let k = 0; k < lines.length; k++) {
        // Dòng cuối cùng vẽ ở vị trí y, các dòng trước đó vẽ cao hơn
        ctx.fillText(lines[lines.length - 1 - k], x, y - (k * lineHeight));
    }
}

function downloadCard() {
    const canvas = document.getElementById('card-canvas');
    // Cho phép tải về ngay cả khi không có ảnh upload (chỉ có nền gradient)
    // if (!uploadedImage) return alert("Vui lòng tạo thiệp trước!");
    
    const link = document.createElement('a');
    link.download = 'thiep-tet-2026.png';
    link.href = canvas.toDataURL();
    link.click();
}
