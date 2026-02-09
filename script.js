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

// --- FIX: Ẩn Landing Page ngay lập tức nếu đã đăng nhập (Tránh bị nháy/giật) ---
(function() {
    const savedActivity = localStorage.getItem('tet_last_activity');
    const ONE_DAY_MS = 24 * 60 * 60 * 1000;
    if (savedActivity && (Date.now() - parseInt(savedActivity) < ONE_DAY_MS)) {
        const landing = document.getElementById('landing-page');
        if (landing) landing.style.display = 'none';
    }
})();

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
let userCompletedTasks = []; // Mảng lưu chỉ số các task đã hoàn thành
const defaultUserStats = { 
    fortuneCount: 0, 
    totalLixi: 0,
    wishCount: 0,
    lixiAllocatedCount: 0,
    footingCount: 0,
    guessGameCount: 0,
    catchLixiGameCount: 0,
    quizCount: 0,
    imgGenCount: 0,
    cardCount: 0,
    qrCount: 0
};
let userStats = { ...defaultUserStats }; // Thống kê người dùng

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
                loadUserProgress(); // Tải tiến trình làm việc Tết
                loadUserStats();    // Tải thống kê hồ sơ
                updateUserUI();
                
                // Nếu đã đăng nhập và đang ở Landing Page -> Vào thẳng web
                const landing = document.getElementById('landing-page');
                if (landing && landing.style.display !== 'none') {
                    // Làm mờ dần thay vì tắt cái rụp nếu lỡ hiển thị
                    landing.style.transition = 'opacity 0.5s ease';
                    landing.style.opacity = '0';
                    setTimeout(() => {
                        landing.style.display = 'none';
                    }, 500);
                    
                    // Thử bật nhạc
                    const audio = document.getElementById('tet-music');
                    audio.play().catch(() => {}); 
                }
            }
        } else {
            currentUser = null;
            loadUserProgress(); // Tải tiến trình từ LocalStorage (nếu chưa đăng nhập)
            loadUserStats();    // Tải thống kê Local
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
        closeLoginModal(); // Đóng modal
    }).catch((error) => {
        console.error(error);
        alert("Đăng nhập thất bại: " + error.message);
    });
}

// --- Xử lý Modal Đăng Nhập Mới ---
function openLoginModal(tab = 'default') {
    document.getElementById('login-modal').style.display = 'flex';
    if (tab === 'anon') {
        // Nếu mở từ nút Ẩn danh ở Landing page, focus vào phần nhập tên
        document.getElementById('anon-reg-name').focus();
    }
}

function closeLoginModal() {
    document.getElementById('login-modal').style.display = 'none';
}

// Chuyển tab trong phần Ẩn danh
function switchAnonTab(mode) {
    const regForm = document.getElementById('anon-register-form');
    const loginForm = document.getElementById('anon-login-form');
    const tabReg = document.getElementById('tab-register');
    const tabLogin = document.getElementById('tab-login');

    if (mode === 'register') {
        regForm.classList.remove('hidden');
        loginForm.classList.add('hidden');
        tabReg.classList.add('active');
        tabLogin.classList.remove('active');
        
        // Style active
        tabReg.style.background = 'var(--tet-gold)';
        tabReg.style.color = '#d00000';
        tabLogin.style.background = 'transparent';
        tabLogin.style.color = '#fff';
    } else {
        regForm.classList.add('hidden');
        loginForm.classList.remove('hidden');
        tabReg.classList.remove('active');
        tabLogin.classList.add('active');
        
        // Style active
        tabLogin.style.background = 'var(--tet-gold)';
        tabLogin.style.color = '#d00000';
        tabReg.style.background = 'transparent';
        tabReg.style.color = '#fff';
    }
}

// Helper: Bỏ dấu tiếng Việt để tạo username
function removeVietnameseTones(str) {
    str = str.replace(/à|á|ạ|ả|ã|â|ầ|ấ|ậ|ẩ|ẫ|ă|ằ|ắ|ặ|ẳ|ẵ/g,"a"); 
    str = str.replace(/è|é|ẹ|ẻ|ẽ|ê|ề|ế|ệ|ể|ễ/g,"e"); 
    str = str.replace(/ì|í|ị|ỉ|ĩ/g,"i"); 
    str = str.replace(/ò|ó|ọ|ỏ|õ|ô|ồ|ố|ộ|ổ|ỗ|ơ|ờ|ớ|ợ|ở|ỡ/g,"o"); 
    str = str.replace(/ù|ú|ụ|ủ|ũ|ư|ừ|ứ|ự|ử|ữ/g,"u"); 
    str = str.replace(/ỳ|ý|ỵ|ỷ|ỹ/g,"y"); 
    str = str.replace(/đ/g,"d");
    str = str.replace(/À|Á|Ạ|Ả|Ã|Â|Ầ|Ấ|Ậ|Ẩ|Ẫ|Ă|Ằ|Ắ|Ặ|Ẳ|Ẵ/g, "A");
    str = str.replace(/È|É|Ẹ|Ẻ|Ẽ|Ê|Ề|Ế|Ệ|Ể|Ễ/g, "E");
    str = str.replace(/Ì|Í|Ị|Ỉ|Ĩ/g, "I");
    str = str.replace(/Ò|Ó|Ọ|Ỏ|Õ|Ô|Ồ|Ố|Ộ|Ổ|Ỗ|Ơ|Ờ|Ớ|Ợ|Ở|Ỡ/g, "O");
    str = str.replace(/Ù|Ú|Ụ|Ủ|Ũ|Ư|Ừ|Ứ|Ự|Ử|Ữ/g, "U");
    str = str.replace(/Ỳ|Ý|Ỵ|Ỷ|Ỹ/g, "Y");
    str = str.replace(/Đ/g, "D");
    return str;
}

// --- CẤU HÌNH GUEST MODE & HÀM HỖ TRỢ ---
const GUEST_DOMAIN = "@tetai.guest";
const PASS_EXPIRY_MS = 30 * 60 * 1000; // 30 phút

function generateRandomString(length) {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

// 1. ĐĂNG KÝ TÀI KHOẢN ẨN DANH (CẤP USER/PASS)
function registerAnonAccount() {
    // Tạo Username ngẫu nhiên: guest_xxxxxx
    const username = "guest_" + generateRandomString(6);
    
    // Tạo Password ngẫu nhiên: 8 ký tự
    const password = generateRandomString(8);
    
    // Email giả lập (để dùng Firebase Auth)
    const email = username + GUEST_DOMAIN;

    auth.createUserWithEmailAndPassword(email, password).then((userCredential) => {
        const user = userCredential.user;
        
        // Lưu thông tin vào LocalStorage để hiện trong Menu
        localStorage.setItem('tet_anon_creds', JSON.stringify({ username: username, password: password }));
        
        // FIX: Hiện Modal thông tin tài khoản NGAY LẬP TỨC để đảm bảo người dùng thấy
        showCredentialModal(username, password);
        
        // Hiện thông báo JS (Alert) để người dùng chắc chắn thấy
        alert(`🎉 ĐĂNG KÝ THÀNH CÔNG!\n\n👤 Username: ${username}\n🔑 Password: ${password}\n\n⚠️ Lưu ý: Mật khẩu sẽ đổi sau 30 phút.`);

        closeLoginModal();

        // Cập nhật tên hiển thị
        user.updateProfile({
            displayName: username,
            photoURL: `https://ui-avatars.com/api/?name=${encodeURIComponent(username)}&background=random&color=fff`
        }).then(() => {
            // Cập nhật UI sau khi có tên
            currentUser = user;
            updateUserUI();

            // Lưu thời gian tạo pass vào Firestore để tính 30 phút
            db.collection('users').doc(user.uid).set({
                type: 'guest',
                passCreatedAt: Date.now(),
                username: username,
                score: 0
            }, { merge: true });

            // Vào trang chính
            localStorage.setItem('tet_last_activity', Date.now());
            enterWebsite();
        }).catch((err) => {
            console.error("Lỗi cập nhật profile:", err);
            // Vẫn vào web dù lỗi cập nhật tên
            enterWebsite();
        });

    }).catch((error) => {
        alert("Lỗi tạo tài khoản: " + error.message);
    });
}

// 2. ĐĂNG NHẬP TÀI KHOẢN ẨN DANH CŨ
function loginAnonAccount() {
    const username = document.getElementById("anon-login-user").value.trim();
    const password = document.getElementById("anon-login-pass").value.trim();

    if (!username || !password) return alert("Vui lòng nhập Username và Password!");

    // Tự động thêm domain nếu user chỉ nhập username
    let email = username;
    if (!email.includes("@")) {
        email = email + GUEST_DOMAIN;
    }

    auth.signInWithEmailAndPassword(email, password).then((userCredential) => {
        const user = userCredential.user;
        
        // Lưu lại pass hiện tại vào storage để hiển thị
        localStorage.setItem('tet_anon_creds', JSON.stringify({ username: username, password: password }));
        
        // Kiểm tra thời hạn mật khẩu
        db.collection('users').doc(user.uid).get().then((doc) => {
            if (doc.exists) {
                const data = doc.data();
                
                // Chỉ áp dụng cho tài khoản Guest
                if (data.type === 'guest') {
                    const now = Date.now();
                    const createdAt = data.passCreatedAt || 0;

                    // NẾU QUÁ 30 PHÚT -> ĐỔI PASS
                    if (now - createdAt > PASS_EXPIRY_MS) {
                        const newPassword = generateRandomString(8);
                        
                        user.updatePassword(newPassword).then(() => {
                            // Cập nhật thời gian mới vào Firestore
                            db.collection('users').doc(user.uid).update({
                                passCreatedAt: now
                            });

                            // Cập nhật pass mới vào storage
                            localStorage.setItem('tet_anon_creds', JSON.stringify({ username: username, password: newPassword }));
                            
                            // FIX: Hiện Modal khi cấp lại pass
                            showCredentialModal(username, newPassword);
                            
                            alert(`⏰ Mật khẩu cũ đã hết hạn (30 phút).\n\n🔑 MẬT KHẨU MỚI CỦA BẠN LÀ: ${newPassword}`);
                        });
                    }
                }
            }
        });

        closeLoginModal();
        localStorage.setItem('tet_last_activity', Date.now());
        enterWebsite();

    }).catch((error) => {
        console.error(error);
        alert("Đăng nhập thất bại! Kiểm tra lại Username/Password.");
    });
}

// --- Modal Hiển thị Credential ---
function showCredentialModal(user, pass) {
    document.getElementById('cred-username').innerText = user;
    document.getElementById('cred-password').innerText = pass;
    document.getElementById('credential-modal').style.display = 'flex';
}

function closeCredentialModal() {
    document.getElementById('credential-modal').style.display = 'none';
}

function captureCredential() {
    const element = document.getElementById("credential-card");
    // Ẩn các nút khi chụp để ảnh đẹp hơn
    const buttons = element.querySelectorAll("button");
    buttons.forEach(btn => btn.style.display = 'none');

    html2canvas(element, {
        backgroundColor: "#4a0404",
        scale: 2
    }).then(canvas => {
        const link = document.createElement('a');
        link.download = 'tai-khoan-tet-ai.png';
        link.href = canvas.toDataURL("image/png");
        link.click();

        // Hiện lại nút
        buttons.forEach(btn => btn.style.display = 'block');
        alert("Đã lưu ảnh tài khoản!");
    });
}

function resetAnonPassword() {
    if (!currentUser || !currentUser.email.endsWith(GUEST_DOMAIN)) return;
    
    if (confirm("Bạn muốn tạo mật khẩu mới? Mật khẩu cũ sẽ bị vô hiệu hóa.")) {
        const newPassword = generateRandomString(8);
        const username = currentUser.email.split('@')[0];

        currentUser.updatePassword(newPassword).then(() => {
            db.collection('users').doc(currentUser.uid).update({
                passCreatedAt: Date.now()
            });

            // Lưu pass mới vào storage
            localStorage.setItem('tet_anon_creds', JSON.stringify({ username: username, password: newPassword }));
            
            closeProfileModal();
            showCredentialModal(username, newPassword); // Hiện bảng thông tin để người dùng lưu lại
            alert(`🔑 MẬT KHẨU MỚI CỦA BẠN LÀ: ${newPassword}`);
        }).catch(err => {
            alert("Lỗi: " + err.message);
        });
    }
}

function logout() {
    if (!auth) return;
    auth.signOut().then(() => {
        currentUser = null;
        updateUserUI();
        localStorage.removeItem('tet_anon_creds'); // Xóa thông tin tạm khi đăng xuất
        localStorage.removeItem('tet_last_activity'); // Xóa thời gian hoạt động
        // onAuthStateChanged sẽ tự động xử lý UI về trạng thái chưa đăng nhập
    });
}

function updateUserUI() {
    if (currentUser) {
        document.getElementById("login-btn-container").classList.add("hidden");
        const userInfo = document.getElementById("user-info");
        userInfo.classList.remove("hidden");
        userInfo.style.display = "flex"; // Hiện flex để căn chỉnh
        
        // Fallback nếu chưa có ảnh/tên
        const photo = currentUser.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(currentUser.displayName || 'User')}&background=random&color=fff`;
        const name = currentUser.displayName || "Người dùng";

        document.getElementById("user-avatar").src = photo;
        document.getElementById("user-name").innerText = name;
    } else {
        document.getElementById("login-btn-container").classList.remove("hidden");
        const userInfo = document.getElementById("user-info");
        userInfo.classList.add("hidden");
        userInfo.style.display = "none"; // Ẩn hoàn toàn
    }
}

// --- Xử lý Dropdown Menu User ---
function toggleUserDropdown(event) {
    event.stopPropagation(); // Ngăn chặn sự kiện click lan ra ngoài ngay lập tức
    const dropdown = document.getElementById("user-dropdown-menu");
    dropdown.classList.toggle("show");

    // Hiển thị thông tin User/Pass nếu có trong LocalStorage
    const credsInfo = document.getElementById("anon-creds-info");
    if (currentUser && currentUser.email.endsWith(GUEST_DOMAIN)) {
        const creds = JSON.parse(localStorage.getItem('tet_anon_creds'));
        if (creds) {
            credsInfo.style.display = "block";
            document.getElementById("menu-anon-user").innerText = creds.username;
            document.getElementById("menu-anon-pass").innerText = creds.password;
        } else {
            credsInfo.style.display = "none";
        }
    } else {
        credsInfo.style.display = "none";
    }
}

// Đóng dropdown khi click ra ngoài
window.onclick = function(event) {
    if (!event.target.closest('#user-info')) {
        const dropdowns = document.getElementsByClassName("dropdown-content");
        for (let i = 0; i < dropdowns.length; i++) {
            if (dropdowns[i].classList.contains('show')) {
                dropdowns[i].classList.remove('show');
            }
        }
    }
}

// --- Xử lý Hồ Sơ & Thống Kê ---
function loadUserStats() {
    if (currentUser && db) {
        db.collection('users').doc(currentUser.uid).get().then((doc) => {
            if (doc.exists && doc.data().stats) {
                userStats = { ...defaultUserStats, ...doc.data().stats };
            } else {
                userStats = { ...defaultUserStats };
            }
        }).catch(console.error);
    } else {
        const localStats = localStorage.getItem('tet_user_stats');
        if (localStats) {
            userStats = { ...defaultUserStats, ...JSON.parse(localStats) };
        } else {
            userStats = { ...defaultUserStats };
        }
    }
}

function saveUserStats() {
    if (currentUser && db) {
        db.collection('users').doc(currentUser.uid).set({
            stats: userStats
        }, { merge: true });
    } else {
        localStorage.setItem('tet_user_stats', JSON.stringify(userStats));
    }
}

function updateUserStats(type, value = 1) {
    if (type === 'lixi') {
        userStats.totalLixi += value;
    } else if (type === 'fortune') {
        userStats.fortuneCount += value;
    } else if (userStats.hasOwnProperty(type)) {
        userStats[type] += value;
    }
    saveUserStats();
}

function openProfileModal() {
    const modal = document.getElementById('profile-modal');
    const avatar = document.getElementById('profile-avatar');
    const name = document.getElementById('profile-name');
    const titlesDiv = document.getElementById('profile-titles');
    const statsGrid = document.getElementById('profile-stats-grid');
    const btnResetPass = document.getElementById('btn-reset-pass');

    // Set thông tin cơ bản
    if (currentUser) {
        avatar.src = currentUser.photoURL;
        name.innerText = currentUser.displayName;
        // Hiện nút reset pass nếu là tài khoản ẩn danh
        btnResetPass.style.display = currentUser.email.endsWith(GUEST_DOMAIN) ? 'block' : 'none';
    } else {
        avatar.src = "https://ui-avatars.com/api/?name=Guest&background=random&color=fff";
        name.innerText = "Khách (Chưa đăng nhập)";
    }

    // Render thống kê
    const statsMap = [
        { icon: 'fas fa-money-bill-wave', color: '#4caf50', label: 'Tổng Lì Xì Ảo', value: new Intl.NumberFormat('vi-VN').format(userStats.totalLixi) + " đ" },
        { icon: 'fas fa-scroll', color: '#ff9800', label: 'Số lần gieo quẻ', value: userStats.fortuneCount },
        { icon: 'fas fa-robot', color: '#2196f3', label: 'Lời chúc AI', value: userStats.wishCount },
        { icon: 'fas fa-envelope-open-text', color: '#e91e63', label: 'Chia Lì Xì', value: userStats.lixiAllocatedCount },
        { icon: 'fas fa-door-open', color: '#9c27b0', label: 'Xem Xông Đất', value: userStats.footingCount },
        { icon: 'fas fa-question-circle', color: '#00bcd4', label: 'Đoán Lì Xì', value: userStats.guessGameCount },
        { icon: 'fas fa-gamepad', color: '#f44336', label: 'Game Hứng Lộc', value: userStats.catchLixiGameCount },
        { icon: 'fas fa-puzzle-piece', color: '#ffeb3b', label: 'Câu đố đã giải', value: userStats.quizCount },
        { icon: 'fas fa-paint-brush', color: '#795548', label: 'Tạo Lệnh Ảnh', value: userStats.imgGenCount },
        { icon: 'fas fa-id-card', color: '#607d8b', label: 'Thiệp đã tạo', value: userStats.cardCount },
        { icon: 'fas fa-qrcode', color: '#3f51b5', label: 'QR đã tạo', value: userStats.qrCount },
    ];

    statsGrid.innerHTML = statsMap.map(stat => `
        <div style="background: rgba(255,255,255,0.1); padding: 10px; border-radius: 10px; text-align: center; border: 1px solid rgba(255,255,255,0.2);">
            <i class="${stat.icon}" style="font-size: 1.2rem; color: ${stat.color}; margin-bottom: 5px;"></i>
            <div style="font-size: 0.8rem; color: #ccc;">${stat.label}</div>
            <div style="font-size: 1.1rem; font-weight: bold; color: #fff;">${stat.value}</div>
        </div>
    `).join('');

    // Tính toán danh hiệu
    let titles = [];
    if (userStats.fortuneCount >= 1) titles.push('<span style="background:#673ab7; color:white; padding:2px 8px; border-radius:10px; font-size:0.7rem; margin:2px;">Tín Đồ Tâm Linh</span>');
    if (userStats.fortuneCount >= 10) titles.push('<span style="background:#9c27b0; color:white; padding:2px 8px; border-radius:10px; font-size:0.7rem; margin:2px;">Thầy Bói Tập Sự</span>');
    
    if (userStats.totalLixi >= 100000) titles.push('<span style="background:#4caf50; color:white; padding:2px 8px; border-radius:10px; font-size:0.7rem; margin:2px;">Người Có Tiền</span>');
    if (userStats.totalLixi >= 1000000) titles.push('<span style="background:#ff9800; color:white; padding:2px 8px; border-radius:10px; font-size:0.7rem; margin:2px;">Đại Gia Ngầm</span>');
    if (userStats.totalLixi >= 10000000) titles.push('<span style="background:#ffd700; color:#d00000; padding:2px 8px; border-radius:10px; font-size:0.7rem; margin:2px; font-weight:bold; border:1px solid #d00000;">VUA LÌ XÌ</span>');

    if (titles.length === 0) {
        titlesDiv.innerHTML = '<span style="color:#888; font-size:0.8rem;">Chưa có danh hiệu</span>';
    } else {
        titlesDiv.innerHTML = titles.join(' ');
    }

    modal.style.display = 'flex';
}

function closeProfileModal() {
    document.getElementById('profile-modal').style.display = 'none';
}

function resetUserStats() {
    if (confirm("Bạn có chắc chắn muốn xóa toàn bộ dữ liệu thống kê không? Hành động này không thể hoàn tác.")) {
        userStats = { ...defaultUserStats };
        saveUserStats();
        alert("Đã xóa dữ liệu! Trang sẽ tự động tải lại...");
        setTimeout(() => {
            window.location.reload();
        }, 1500);
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

// --- Xử lý Đăng nhập từ Landing Page ---
function loginGoogleAndEnter() {
    if (!auth) return showCustomAlert("Chưa cấu hình Firebase!");
    const provider = new firebase.auth.GoogleAuthProvider();
    auth.signInWithPopup(provider).then((result) => {
        currentUser = result.user;
        updateUserUI();
        localStorage.setItem('tet_last_activity', Date.now());
        enterWebsite(); // Vào trang chính
    }).catch((error) => {
        console.error(error);
        showCustomAlert("Đăng nhập thất bại: " + error.message);
    });
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
    { day: 29, date: "2026-02-16", title: "Cúng Tất Niên", desc: "Làm mâm cơm tất niên cúng gia tiên. Chuẩn bị đón Giao Thừa thiêng liêng." },
    { day: "Mùng 1", date: "2026-02-17", title: "Tết Cha - Chúc Tết Nội", desc: "Cúng gia tiên sáng sớm, đi chùa hái lộc, chúc Tết ông bà cha mẹ bên Nội." },
    { day: "Mùng 2", date: "2026-02-18", title: "Tết Mẹ - Chúc Tết Ngoại", desc: "Cả gia đình sang thăm và chúc Tết ông bà, họ hàng bên Ngoại." },
    { day: "Mùng 3", date: "2026-02-19", title: "Tết Thầy - Họp Lớp", desc: "Đến thăm thầy cô giáo cũ, tụ tập bạn bè, họp lớp đầu năm." },
    { day: "Mùng 4", date: "2026-02-20", title: "Hóa Vàng (Tạ Âm)", desc: "Làm lễ tạ gia tiên, hóa vàng mã, tiễn ông bà về trời (Hết Tết)." },
    { day: "Mùng 5", date: "2026-02-21", title: "Du Xuân / Khai Trương", desc: "Đi du lịch, trẩy hội hoặc mở hàng khai trương lấy ngày đẹp." }
];

function renderTetTasks() {
    const container = document.getElementById("tet-tasks-container");
    if (!container) return;
    container.innerHTML = "";

    tetTasks.forEach((task, index) => {
        const isCompleted = userCompletedTasks.includes(index);
        const div = document.createElement("div");
        div.className = `task-item ${isCompleted ? 'completed' : ''}`;
        div.innerHTML = `
            <div class="task-checkbox-container">
                <input type="checkbox" class="task-checkbox" 
                    onchange="toggleTask(${index})" 
                    ${isCompleted ? 'checked' : ''}
                    title="Đánh dấu đã xong">
            </div>
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

function toggleTask(index) {
    if (userCompletedTasks.includes(index)) {
        userCompletedTasks = userCompletedTasks.filter(i => i !== index);
    } else {
        userCompletedTasks.push(index);
    }
    
    // Render lại giao diện ngay lập tức
    renderTetTasks();
    
    // Lưu dữ liệu
    saveUserProgress();
}

function loadUserProgress() {
    if (currentUser && db) {
        // Nếu đã đăng nhập -> Tải từ Firestore
        db.collection('users').doc(currentUser.uid).get().then((doc) => {
            if (doc.exists && doc.data().tetProgress) {
                userCompletedTasks = doc.data().tetProgress;
            } else {
                userCompletedTasks = [];
            }
            renderTetTasks();
        }).catch((error) => {
            console.error("Lỗi tải tiến trình:", error);
        });
    } else {
        // Nếu chưa đăng nhập -> Tải từ LocalStorage
        const localData = localStorage.getItem('tet_progress_local');
        if (localData) {
            userCompletedTasks = JSON.parse(localData);
        }
        renderTetTasks();
    }
}

function saveUserProgress() {
    if (currentUser && db) {
        // Lưu lên Firestore
        db.collection('users').doc(currentUser.uid).set({
            tetProgress: userCompletedTasks,
            lastUpdate: firebase.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
    } else {
        // Lưu vào LocalStorage
        localStorage.setItem('tet_progress_local', JSON.stringify(userCompletedTasks));
    }
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
    updateUserStats('wishCount', 1);
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
    updateUserStats('lixiAllocatedCount', 1);
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
    updateUserStats('fortune', 1); // Cập nhật thống kê
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
    updateUserStats('footingCount', 1);
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
    updateUserStats('lixi', money); // Cập nhật thống kê tiền
    updateUserStats('guessGameCount', 1);

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
    updateUserStats('qrCount', 1);
}

// --- 9. Xử lý chuyển Tab ---
function switchTab(tabId) {
    const currentTab = document.querySelector('.tab-content.active');
    const nextTab = document.getElementById(tabId);

    // Nếu đang ở tab đó rồi thì không làm gì
    if (currentTab && currentTab.id === tabId) return;

    // Cập nhật trạng thái nút menu ngay lập tức
    const buttons = document.querySelectorAll('.nav-btn');
    buttons.forEach(btn => btn.classList.remove('active'));
    
    const activeButton = Array.from(buttons).find(btn => btn.getAttribute('onclick').includes(tabId));
    if (activeButton) {
        activeButton.classList.add('active');
    }

    // Xử lý hiệu ứng chuyển cảnh
    if (currentTab) {
        currentTab.classList.add('hiding'); // Thêm class để chạy animation ẩn
        
        // Đợi animation kết thúc (300ms) rồi mới ẩn hẳn và hiện tab mới
        setTimeout(() => {
            currentTab.classList.remove('active', 'hiding');
            if (nextTab) {
                nextTab.classList.add('active');
                // Cuộn lên đầu trang nội dung
                const contentArea = document.querySelector('.content-area');
                if (contentArea) contentArea.scrollTop = 0;
            }
        }, 300);
    } else {
        // Trường hợp chưa có tab nào active (lần đầu load)
        if (nextTab) nextTab.classList.add('active');
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
        updateUserStats('lixi', score * 1000); // Quy đổi điểm game ra tiền ảo (1 điểm = 1000đ)
        updateUserStats('catchLixiGameCount', 1);
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
    updateUserStats('quizCount', 1);

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
    if (currentUser && db) {
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
    // Hiệu ứng pháo hoa ăn mừng (Bắn 10 quả liên tiếp)
    for (let i = 0; i < 10; i++) {
        setTimeout(() => fireworks.push(new Firework()), i * 100);
    }

    if (navigator.share) {
        navigator.share({
            title: 'Tết AI 2026 - Xuân Bính Ngọ',
            text: 'Chơi Tết AI 2026 cực vui! Xem bói, Lì xì, Đố vui có thưởng tại đây 👇',
            url: window.location.href
        }).catch(console.error);
    } else {
        const url = encodeURIComponent(window.location.href);
        const text = encodeURIComponent("Chơi Tết AI 2026 cực vui! Xem bói, Lì xì, Đố vui có thưởng tại đây 👇");
        window.open(`https://www.facebook.com/sharer/sharer.php?u=${url}&quote=${text}`, '_blank');
    }
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
    updateUserStats('imgGenCount', 1);
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

    const exVideo = document.getElementById('exercise-video');
    exVideo.currentTime = 0;
    exVideo.play();

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
    const exVideo = document.getElementById('exercise-video');
    exVideo.pause();
    exVideo.currentTime = 0;
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
// Biến toàn cục quản lý trạng thái thiệp
let cardState = {
    bgImage: null,
    bgProps: { x: 0, y: 0, scale: 1, rotate: 0 },
    objects: [], // Chứa sticker, text: { type, content, x, y, size, color, rotate }
    selectedIdx: -1,
    isDragging: false,
    dragStart: { x: 0, y: 0 },
    canvas: null,
    ctx: null
};

// Khởi tạo Canvas khi load trang
document.addEventListener('DOMContentLoaded', () => {
    cardState.canvas = document.getElementById('card-canvas');
    if (cardState.canvas) {
        cardState.ctx = cardState.canvas.getContext('2d');
        // Set kích thước mặc định
        cardState.canvas.width = 800;
        cardState.canvas.height = 600;
        initCardEvents();
        renderCard();
    }
});

function handleImageUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        const img = new Image();
        img.onload = function() {
            cardState.bgImage = img;
            // Reset vị trí ảnh nền về giữa
            cardState.bgProps = { x: 0, y: 0, scale: 1, rotate: 0 };
            
            // Fit ảnh vào canvas
            const scale = Math.min(800 / img.width, 600 / img.height);
            cardState.bgProps.scale = scale;
            cardState.bgProps.x = (800 - img.width * scale) / 2;
            cardState.bgProps.y = (600 - img.height * scale) / 2;

            renderCard();
        };
        img.src = e.target.result;
    };
    reader.readAsDataURL(file);
}

function updateBackgroundProp() {
    const scale = parseFloat(document.getElementById('bg-scale').value);
    const rotate = parseInt(document.getElementById('bg-rotate').value);
    cardState.bgProps.scale = scale;
    cardState.bgProps.rotate = rotate;
    renderCard();
}

function addSticker(emoji) {
    cardState.objects.push({
        type: 'sticker',
        content: emoji,
        x: 400,
        y: 300,
        size: 80,
        rotate: 0
    });
    cardState.selectedIdx = cardState.objects.length - 1;
    renderCard();
}

function addTextObject() {
    const text = document.getElementById('new-text-input').value;
    const color = document.getElementById('new-text-color').value;
    if (!text) return alert("Vui lòng nhập nội dung chữ!");

    cardState.objects.push({
        type: 'text',
        content: text,
        x: 400,
        y: 300,
        size: 50,
        color: color,
        rotate: 0
    });
    cardState.selectedIdx = cardState.objects.length - 1;
    document.getElementById('new-text-input').value = ""; // Clear input
    renderCard();
}

function deleteSelectedObject() {
    if (cardState.selectedIdx !== -1) {
        cardState.objects.splice(cardState.selectedIdx, 1);
        cardState.selectedIdx = -1;
        renderCard();
    }
}

function resetCardCanvas() {
    if (confirm("Bạn có chắc muốn xóa toàn bộ thiết kế?")) {
        cardState.bgImage = null;
        cardState.objects = [];
        cardState.selectedIdx = -1;
        renderCard();
    }
}

// --- Xử lý sự kiện Chuột/Cảm ứng trên Canvas ---
function initCardEvents() {
    const canvas = cardState.canvas;

    const getPos = (e) => {
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        return {
            x: (clientX - rect.left) * scaleX,
            y: (clientY - rect.top) * scaleY
        };
    };

    const handleStart = (e) => {
        e.preventDefault(); // Ngăn cuộn trang trên mobile
        const pos = getPos(e);
        
        // Kiểm tra click vào object nào (duyệt ngược từ trên xuống dưới)
        let found = false;
        for (let i = cardState.objects.length - 1; i >= 0; i--) {
            const obj = cardState.objects[i];
            // Ước lượng vùng chọn đơn giản (hình vuông quanh tâm)
            const halfSize = obj.size / 1.5; 
            if (pos.x >= obj.x - halfSize && pos.x <= obj.x + halfSize &&
                pos.y >= obj.y - halfSize && pos.y <= obj.y + halfSize) {
                
                cardState.selectedIdx = i;
                cardState.isDragging = true;
                cardState.dragStart = { x: pos.x - obj.x, y: pos.y - obj.y };
                found = true;
                break;
            }
        }

        if (!found) {
            // Nếu không click vào object, kiểm tra xem có click vào nền để di chuyển nền không
            if (cardState.bgImage) {
                cardState.selectedIdx = -1; // Bỏ chọn object
                cardState.isDragging = true; // Drag nền
                cardState.dragStart = { x: pos.x - cardState.bgProps.x, y: pos.y - cardState.bgProps.y };
            } else {
                cardState.selectedIdx = -1;
            }
        }
        renderCard();
    };

    const handleMove = (e) => {
        if (!cardState.isDragging) return;
        e.preventDefault();
        const pos = getPos(e);

        if (cardState.selectedIdx !== -1) {
            // Di chuyển object
            const obj = cardState.objects[cardState.selectedIdx];
            obj.x = pos.x - cardState.dragStart.x;
            obj.y = pos.y - cardState.dragStart.y;
        } else if (cardState.bgImage) {
            // Di chuyển nền
            cardState.bgProps.x = pos.x - cardState.dragStart.x;
            cardState.bgProps.y = pos.y - cardState.dragStart.y;
        }
        renderCard();
    };

    const handleEnd = (e) => {
        cardState.isDragging = false;
    };

    canvas.addEventListener('mousedown', handleStart);
    canvas.addEventListener('mousemove', handleMove);
    canvas.addEventListener('mouseup', handleEnd);
    canvas.addEventListener('mouseleave', handleEnd);

    canvas.addEventListener('touchstart', handleStart, { passive: false });
    canvas.addEventListener('touchmove', handleMove, { passive: false });
    canvas.addEventListener('touchend', handleEnd);
}

function renderCard() {
    const canvas = cardState.canvas;
    const ctx = cardState.ctx;
    const frameType = document.getElementById('card-frame').value;
    const deleteBtn = document.getElementById('btn-delete-obj');

    // Hiện/Ẩn nút xóa
    deleteBtn.style.display = cardState.selectedIdx !== -1 ? 'inline-block' : 'none';

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const w = canvas.width;
    const h = canvas.height;

    // 1. Vẽ nền
    if (cardState.bgImage) {
        ctx.save();
        // Dịch chuyển về vị trí ảnh
        ctx.translate(cardState.bgProps.x + (cardState.bgImage.width * cardState.bgProps.scale)/2, cardState.bgProps.y + (cardState.bgImage.height * cardState.bgProps.scale)/2);
        ctx.rotate(cardState.bgProps.rotate * Math.PI / 180);
        ctx.scale(cardState.bgProps.scale, cardState.bgProps.scale);
        ctx.drawImage(cardState.bgImage, -cardState.bgImage.width/2, -cardState.bgImage.height/2);
        ctx.restore();
    } else {
        // Nền mặc định nếu chưa có ảnh
        const grd = ctx.createLinearGradient(0, 0, w, h);
        grd.addColorStop(0, "#c0392b");
        grd.addColorStop(1, "#8e44ad");
        ctx.fillStyle = grd;
        ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = 'rgba(255,255,255,0.3)';
        ctx.font = '20px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('Kéo thả ảnh vào đây hoặc tải lên', w/2, h/2);
    }

    // 2. Vẽ các Objects (Sticker, Text)
    cardState.objects.forEach((obj, index) => {
        ctx.save();
        ctx.translate(obj.x, obj.y);
        ctx.rotate(obj.rotate * Math.PI / 180);

        if (obj.type === 'sticker') {
            ctx.font = `${obj.size}px Arial`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(obj.content, 0, 0);
        } else if (obj.type === 'text') {
            ctx.font = `bold ${obj.size}px "Dancing Script", cursive, Arial`;
            ctx.fillStyle = obj.color;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.shadowColor = "rgba(0,0,0,0.8)";
            ctx.shadowBlur = 4;
            ctx.fillText(obj.content, 0, 0);
        }

        // Vẽ viền bao quanh nếu đang chọn
        if (index === cardState.selectedIdx) {
            ctx.strokeStyle = '#00bcd4';
            ctx.lineWidth = 2;
            ctx.setLineDash([5, 5]);
            const boxSize = obj.size * (obj.type === 'text' ? obj.content.length * 0.5 : 1.2);
            ctx.strokeRect(-boxSize/2, -obj.size/2 - 10, boxSize, obj.size + 20);
        }
        ctx.restore();
    });

    // 3. Vẽ khung (Lớp trên cùng)
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
    } else if (frameType === 'modern') {
        // Khung kính hiện đại
        const border = 20;
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.lineWidth = 1;
        ctx.strokeRect(border, border, w - border*2, h - border*2);
        
        // Góc bo tròn
        ctx.beginPath();
        ctx.moveTo(border + 20, border); ctx.lineTo(border, border); ctx.lineTo(border, border + 20);
        ctx.moveTo(w - border - 20, border); ctx.lineTo(w - border, border); ctx.lineTo(w - border, border + 20);
        ctx.moveTo(border + 20, h - border); ctx.lineTo(border, h - border); ctx.lineTo(border, h - border - 20);
        ctx.moveTo(w - border - 20, h - border); ctx.lineTo(w - border, h - border); ctx.lineTo(w - border, h - border - 20);
        ctx.strokeStyle = '#ffd700';
        ctx.lineWidth = 4;
        ctx.stroke();
    }
    ctx.restore();
}

function downloadCard() {
    const canvas = document.getElementById('card-canvas');
    // Cho phép tải về ngay cả khi không có ảnh upload (chỉ có nền gradient)
    // if (!uploadedImage) return alert("Vui lòng tạo thiệp trước!");
    
    const link = document.createElement('a');
    link.download = 'thiep-tet-2026.png';
    link.href = canvas.toDataURL();
    link.click();
    updateUserStats('cardCount', 1);
}
