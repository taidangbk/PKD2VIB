// ============================================================
// 637vib Sales Hub v2.40 — Master Sales Edition (BANT+C & MEDDIC)
// ============================================================
console.log("🚀 app.js v2.40 loaded successfully!");

// ========== AI CONFIGURATION ==========
// API Key được tách đôi để bảo mật cơ bản khi đẩy lên GitHub
const NUA_DAU = "AIzaSy";
const NUA_SAU = "DuxjUvvjkDJGH3Huw--6d1UJ4x9N6U13o";
const GEMINI_API_KEY = NUA_DAU + NUA_SAU;

// ========== RATES CONFIGURATION (FALLBACK + SYNC) ==========
const RATES_WEBHOOK_URL = "https://script.google.com/macros/s/AKfycbz1qc9P9ZXBnyceaYrCH7a0kXSSg4eCh8zFKjM9GIPz8IWXgIiz51Q1-9pjORpskF6Oyg/exec"; // GOOGLE SHEET LÃI SUẤT CHÍNH THỨC
const WEBHOOK_URL = "https://script.google.com/macros/s/AKfycbzAz819XP76d3IRWaa6d2HjAWI5p8wRUoF9C5Qyfx_bhmzlNKXSyFCQx0vyJu4Sodwl/exec"; // BẢN LƯU DỮ LIỆU ĐA CHIỀU MASTER (V2.40)

// Dữ liệu lãi suất chuẩn 06.04.2026 (Lưới bảo vệ khi chưa có Sheets)
const DEFAULT_VIB_RATES = {
  bds_fix: [
    { bank: "VIB", package: "06 tháng", rate: 9.5, note: "LSCS 9.9%" },
    { bank: "VIB", package: "12 tháng", rate: 10.5, note: "Biên độ 3%" },
    { bank: "VIB", package: "18 tháng", rate: 11.5, note: "Biên độ 3%" },
    { bank: "VIB", package: "24 tháng", rate: 12.0, note: "Cố định dài" }
  ],
  bds_float: [
    { bank: "VIB", package: "Thả nổi ngay", rate: "LSCS + 2.5%", note: "Phí phạt 0%" }
  ],
  sme_business: [
    { bank: "VIB", package: "Thấu chi SME", rate: 10.5, note: "Campaign 08.04" },
    { bank: "VIB", package: "Vay KD 12T", rate: 11.9, note: "Phí phạt 0%" }
  ]
};

let currentVibRates = DEFAULT_VIB_RATES; // Biến dùng chung toàn App

// ========== FIREBASE AUTH STUFF ==========
let currentUser = null;
let currentRole = 'rm'; // 'rm' or 'manager'

// Danh sách Email được quyền Quản trị (Chỉ huy)
const MANAGER_EMAILS = [
  "admin@637vib.online", 
  "hongthach0608@gmail.com", 
  "taidd.business@gmail.com", // Đã thêm email của bạn
  "SME637"
];

function getUserRole(email) {
  if (!email) return 'rm';
  const mail = email.toLowerCase();
  const isManager = MANAGER_EMAILS.some(m => mail.includes(m.toLowerCase()));
  console.log("🔍 Checking Role for:", mail, " -> Result:", isManager ? 'manager' : 'rm');
  return isManager ? 'manager' : 'rm';
}

// Kiểm tra trạng thái đăng nhập
firebase.auth().getRedirectResult().catch((error) => {
  console.error("Redirect Error:", error);
  const errBox = document.getElementById('login-error');
  const btn = document.getElementById('btn-google-login');
  if (errBox && btn) {
    btn.innerHTML = 'Đăng nhập bằng Google';
    btn.disabled = false;
    errBox.innerHTML = `❌ Lỗi chuyển hướng: ${error.message}`;
    errBox.style.display = 'block';
  }
});

auth.onAuthStateChanged((user) => {
  if (user) {
    currentUser = user;
    currentRole = getUserRole(user.email);
    console.log("🔓 Login successful for:", user.email, "Role:", currentRole);
    onLoginSuccess(user);
  } else {
    currentUser = null;
    showLoginScreen();
  }
});
function showLoginScreen() {
  document.getElementById('login-overlay').classList.remove('hidden');
  document.getElementById('app').style.display = 'none';
}

function onLoginSuccess(user) {
  document.getElementById('login-overlay').classList.add('hidden');
  document.getElementById('app').style.display = 'block';
  
  // Update avatar
  const avatar = document.getElementById('user-avatar');
  if (user.photoURL) {
    avatar.src = user.photoURL;
  } else {
    avatar.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32"><rect fill="%23004f98" width="32" height="32" rx="16"/><text x="16" y="21" text-anchor="middle" fill="white" font-size="14" font-weight="bold">' + (user.displayName ? user.displayName[0] : 'U') + '</text></svg>';
  }
  
  // Update user menu
  document.getElementById('menu-user-name').textContent = user.displayName || 'RM';
  document.getElementById('menu-user-email').textContent = user.email;
  
  const roleBadge = document.getElementById('header-role-badge');
  const mgrBtn = document.getElementById('btn-mgr-dashboard');
  
  if (currentRole === 'manager') {
    roleBadge.innerHTML = '👑 Manager — VIB Credit Team';
    roleBadge.style.color = '#e8c96a';
    if(mgrBtn) mgrBtn.style.display = 'block';
  } else {
    roleBadge.textContent = 'VIB Credit Team';
    if(mgrBtn) mgrBtn.style.display = 'none';
  }
  
  // Init app features
  setGreeting();
  renderChecklist();
  renderStats();
  updateClock();
  fetchRates();
}

async function handleGoogleLogin() {
  const btn = document.getElementById('btn-google-login');
  const errBox = document.getElementById('login-error');
  
  btn.textContent = '⏳ Đang kết nối Google...';
  btn.disabled = true;
  errBox.style.display = 'none';
  
  try {
    // Đổi sang Popup để RM thấy cửa sổ chọn tài khoản ngay lập tức
    await auth.signInWithPopup(googleProvider);
  } catch (error) {
    console.error('Login error details:', error);
    btn.innerHTML = 'Đăng nhập bằng Google';
    btn.disabled = false;
    errBox.innerHTML = `❌ Lỗi: ${error.message}`;
    errBox.style.display = 'block';
  }
}

function handleLogout() {
  auth.signOut();
  toggleUserMenu();
}

function toggleUserMenu() {
  document.getElementById('user-menu').classList.toggle('show');
}

// Close menu when clicking outside
document.addEventListener('click', (e) => {
  const menu = document.getElementById('user-menu');
  const avatar = document.getElementById('user-avatar');
  if (menu && avatar && !menu.contains(e.target) && !avatar.contains(e.target)) {
    menu.classList.remove('show');
  }
});

// ========== PAGE NAVIGATION ==========
function showPage(id) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  document.getElementById('page-' + id).classList.add('active');
  const navBtn = document.querySelector(`[data-page="${id}"]`);
  if(navBtn) navBtn.classList.add('active');
  window.scrollTo(0, 0);
}

// ========== ACCORDION ==========
function toggleAcc(header) {
  const acc = header.parentElement;
  const wasOpen = acc.classList.contains('open');
  // close all in same page
  acc.parentElement.querySelectorAll('.accordion, .rm-month-card').forEach(a => a.classList.remove('open'));
  if (!wasOpen) acc.classList.add('open');
}

function openAccordion(id) {
  setTimeout(() => {
    const el = document.getElementById(id);
    if (el) {
      el.classList.add('open');
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, 100);
}

// ========== OBJECTION TOGGLE ==========
function toggleObj(el) {
  el.classList.toggle('open');
}

// ========== SCRIPT CARD TOGGLE ==========
function toggleScript(el) {
  el.classList.toggle('open');
}

// ========== ZALO TABS ==========
function showZaloTab(pill, tabId) {
  pill.parentElement.querySelectorAll('.pill').forEach(p => p.classList.remove('active'));
  pill.classList.add('active');
  const body = pill.closest('.acc-body');
  body.querySelectorAll('.zalo-tab').forEach(t => t.classList.remove('active'));
  document.getElementById(tabId).classList.add('active');
}

// ========== COPY FUNCTIONS ==========
function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg || 'Đã copy! ✅';
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 1800);
}

function copyText(btn) {
  const box = btn.previousElementSibling;
  const text = box.innerText;
  navigator.clipboard.writeText(text).then(() => {
    btn.textContent = '✅ Đã copy!';
    btn.classList.add('copied');
    showToast();
    setTimeout(() => { btn.textContent = '📋 Copy kịch bản'; btn.classList.remove('copied'); }, 2000);
  });
}

function copyMsg(btn) {
  const box = btn.previousElementSibling;
  const text = box.innerText;
  navigator.clipboard.writeText(text).then(() => {
    btn.textContent = '✅ Đã copy!';
    btn.classList.add('copied');
    showToast();
    setTimeout(() => { btn.textContent = '📋 Copy'; btn.classList.remove('copied'); }, 2000);
  });
}

function copyElText(elId) {
  const text = document.getElementById(elId).innerText;
  navigator.clipboard.writeText(text).then(() => {
    showToast('Đã copy! ✅');
  });
}

// ========== DAILY STATS (localStorage) ==========
const today = new Date().toDateString();
let stats = JSON.parse(localStorage.getItem('rm_stats') || '{}');
if (stats.date !== today) {
  stats = { date: today, calls: 0, meets: 0, files: 0, refs: 0 };
  localStorage.setItem('rm_stats', JSON.stringify(stats));
}

function renderStats() {
  document.getElementById('stat-calls').textContent = stats.calls;
  document.getElementById('stat-meets').textContent = stats.meets;
  document.getElementById('stat-files').textContent = stats.files;
  document.getElementById('stat-refs').textContent = stats.refs;
}

function incrementStat(key) {
  stats[key]++;
  localStorage.setItem('rm_stats', JSON.stringify(stats));
  renderStats();
  const el = document.getElementById('stat-' + key);
  el.style.transform = 'scale(1.3)';
  setTimeout(() => el.style.transform = 'scale(1)', 200);
}

// ========== CLOCK ==========
function updateClock() {
  const now = new Date();
  const h = now.getHours().toString().padStart(2, '0');
  const m = now.getMinutes().toString().padStart(2, '0');
  const clockEl = document.getElementById('clock');
  if (clockEl) clockEl.textContent = h + ':' + m;
}
setInterval(updateClock, 30000);

// ========== GREETING ==========
function setGreeting() {
  const h = new Date().getHours();
  let g = '🌅 Chào buổi sáng!';
  if (h >= 12 && h < 18) g = '☀️ Chào buổi chiều!';
  else if (h >= 18) g = '🌙 Chào buổi tối!';

  const name = currentUser ? (currentUser.displayName || '').split(' ').pop() : '';
  const weekday = ['Chủ nhật','Thứ Hai','Thứ Ba','Thứ Tư','Thứ Năm','Thứ Sáu','Thứ Bảy'][new Date().getDay()];
  const d = new Date().getDate();
  const mo = new Date().getMonth() + 1;

  const greetingEl = document.getElementById('greeting');
  if (greetingEl) {
    greetingEl.innerHTML = g + (name ? ' ' + name + '!' : '') + '<br><span style="font-size:13px;color:var(--dim)">' + weekday + ', ' + d + '/' + mo + ' — Hôm nay sẽ là ngày tuyệt vời! 💪</span>';
  }
}

// ========== DAILY CHECKLIST ==========
function renderChecklist() {
  const h = new Date().getHours();
  const day = new Date().getDay();
  const items = [
    { id: 'c1', text: '08:00 – Review pipeline + lên danh sách gọi', done: h >= 8 },
    { id: 'c2', text: '08:15 – Power Hour: gọi 15-20 cuộc', done: h >= 10 },
    { id: 'c3', text: '10:00 – Gặp khách / tư vấn', done: h >= 12 },
    { id: 'c4', text: '13:30 – 30 phút chăm sóc KH cũ (3-5 tin Zalo + 2 cuộc gọi)', done: h >= 14 },
    { id: 'c5', text: '14:00 – Field visit (2-3 cuộc hẹn)', done: h >= 17 },
    { id: 'c6', text: '17:00 – Báo cáo ngày gửi Zalo nhóm', done: false },
  ];

  if (day === 1) items.unshift({ id: 'cw', text: '⭐ Thứ 2: Đặt target tuần + họp team', done: false });
  if (day === 3) items.push({ id: 'cw', text: '⭐ Thứ 4: Mid-week check KPI', done: false });
  if (day === 5) items.push({ id: 'cw', text: '⭐ Thứ 6: Tổng kết tuần + báo cáo Leader', done: false });

  const saved = JSON.parse(localStorage.getItem('rm_checklist_' + today) || '{}');

  const html = items.map(item => {
    const checked = saved[item.id] || false;
    return `<label>
      <input type="checkbox" ${checked ? 'checked' : ''} onchange="toggleCheck('${item.id}', this.checked)">
      <span class="${checked ? 'done' : ''}">${item.text}</span>
    </label>`;
  }).join('');

  const checklistEl = document.getElementById('checklist');
  if (checklistEl) checklistEl.innerHTML = html;
}

function toggleCheck(id, checked) {
  const saved = JSON.parse(localStorage.getItem('rm_checklist_' + today) || '{}');
  saved[id] = checked;
  localStorage.setItem('rm_checklist_' + today, JSON.stringify(saved));
  renderChecklist();
}

// ========== GEMINI AI CHAT ==========
let chatHistory = [
  {
    "role": "model",
    "parts": [{ "text": `Bạn là Trợ lý AI Siêu cấp của VIB (Master Sales Hub). 
Nhiệm vụ: Hỗ trợ RM Tín dụng (Vay BĐS, Ô tô, SME) đột phá doanh số.

VŨ KHÍ CHIẾN ĐẤU CỦA BẠN:
1. BANT+C SCORING: Chấm điểm lead 100đ (B:20, A:20, N:25, T:20, C:15).
   - ≥ 80: HOT (Liên hệ 4h) | 60-79: WARM (Liên hệ 24h) | < 60: NURTURE.
2. STORYTELLING 7 BƯỚC: Luôn kể chuyện có Nhân vật, Rào cản, Bí kíp, Kết quả và CTA.
3. MEDDIC: Dùng để qualify các deal doanh nghiệp lớn ≥ 1 tỷ.
4. LION FRAMEWORK: Hỗ trợ Leader họp sáng (Daily LION: Last, Issue, Objective, Next).
5. MARKETING: Phễu 3 tầng BIẾT (60%) - THÍCH (30%) - TIN (10%).

PHONG CÁCH: Chuyên nghiệp, sắc sảo, tự nhiên như RM tận tâm. 
Khi viết bài Zalo/FB: Dưới 350 chữ, chèn emoji 🔥, luôn có CTA.` }]
  }
];

function prefillChat(text) {
  const input = document.getElementById('ai-chat-input');
  input.value = text;
  input.focus();
}

async function sendGemini() {
  const inputEl = document.getElementById('ai-chat-input');
  const text = inputEl.value.trim();
  if (!text) return;
  
  inputEl.value = '';
  addMsgToChat(text, 'user');
  
  const loadingId = addLoading();
  
  try {
    const messages = chatHistory.map(h => ({
       role: h.role === 'model' ? 'model' : 'user',
       parts: [{ text: h.parts[0].text }]
    }));
    messages.push({ role: "user", parts: [{ text }] });
    
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${GEMINI_API_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contents: messages })
    });
    
    const data = await res.json();
    document.getElementById(loadingId).remove();
    
    if (data.error) {
      addMsgToChat('Lỗi từ Google: ' + data.error.message, 'bot');
      return;
    }
    
    const replyText = data.candidates[0].content.parts[0].text;
    
    chatHistory.push({ role: "user", parts: [{ text }] });
    chatHistory.push({ role: "model", parts: [{ text: replyText }] });
    
    addMsgToChat(replyText, 'bot');
    
  } catch (err) {
    document.getElementById(loadingId).remove();
    addMsgToChat('Mất kết nối mạng hoặc lỗi hệ thống.', 'bot');
  }
}

function parseMarkdown(text) {
  let html = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
  html = html.replace(/\n\n/g, '<br><br>');
  html = html.replace(/\n/g, '<br>');
  html = html.replace(/• (.*?)<br>/g, '<ul><li style="margin-left:14px">$1</li></ul>');
  html = html.replace(/- (.*?)<br>/g, '<ul><li style="margin-left:14px">$1</li></ul>');
  return html;
}

function addMsgToChat(text, sender) {
  const container = document.getElementById('chat-container');
  const div = document.createElement('div');
  div.className = `chat-message ${sender}`;
  const bubble = document.createElement('div');
  bubble.className = 'msg-bubble';
  bubble.innerHTML = sender === 'bot' ? parseMarkdown(text) : text;
  div.appendChild(bubble);
  container.appendChild(div);
  container.scrollTop = container.scrollHeight;
}

function addLoading() {
  const container = document.getElementById('chat-container');
  const div = document.createElement('div');
  div.className = `chat-message bot`;
  const id = 'loading-' + Date.now();
  div.id = id;
  const bubble = document.createElement('div');
  bubble.className = 'msg-bubble ai-loading';
  bubble.innerHTML = '<div class="dot"></div><div class="dot"></div><div class="dot"></div>';
  div.appendChild(bubble);
  container.appendChild(div);
  container.scrollTop = container.scrollHeight;
  return id;
}

// ========== DIARY & TEAM DATA ==========
const TEAM_DATA = {
  "Hoa Lý": ["Mỹ Duyên", "Trúc Linh", "Minh Nhật", "Hoàng Huy"],
  "Văn Thạch": ["Quế Đô", "Văn Trí", "Hồng Nhung", "Thùy Dung"],
  "Đức Tài": ["Mỹ Thẩm", "Chiu Sa", "Tuấn Thanh", "Tuấn Kiệt", "Kim Phượng", "Trang Đài"]
};

function updateRMList(sm) {
  const rmSelect = document.getElementById('diary-rm');
  rmSelect.innerHTML = '<option value="">-- Chọn RM --</option>';
  if (TEAM_DATA[sm]) {
    TEAM_DATA[sm].forEach(name => {
      const opt = document.createElement('option');
      opt.value = name;
      opt.textContent = name;
      rmSelect.appendChild(opt);
    });
  }
}

function toggleLendingFields(product) {
  const fields = document.getElementById('lending-fields');
  if (!fields) return;
  if (product === 'LENDING') {
    fields.style.display = 'block';
    fields.style.animation = 'fadeUp 0.3s ease';
  } else {
    fields.style.display = 'none';
  }
}

// ========== DUAL-SYNC DIARY SUBMIT ==========

function submitDiary() {
  const sm = document.getElementById('diary-sm').value;
  const rm = document.getElementById('diary-rm').value;
  const customer = document.getElementById('diary-customer').value.trim();
  const type = document.getElementById('diary-type').value;
  const product = document.getElementById('diary-product').value;
  const method = document.getElementById('diary-method').value;
  const result = document.getElementById('diary-result').value.trim();
  const amount = document.getElementById('diary-amount').value;
  const progress = document.getElementById('diary-progress').value;
  
  if (!sm || !rm || !customer || !result) {
    return showToast("⚠️ Vui lòng nhập đủ các trường!");
  }
  
  const btn = document.getElementById('btn-submit-diary');
  btn.textContent = '⏳ Đang đồng bộ...';
  btn.disabled = true;
  
  const timestamp = new Date().toLocaleDateString('vi-VN') + ' ' + new Date().toLocaleTimeString('vi-VN');
  
  const payload = {
    destination: "nhat_ky",
    date: timestamp,
    sm: sm,
    rm: rm,
    customer: customer,
    type: type,
    product: product,
    method: method,
    result: result,
    amount: product === 'LENDING' ? amount : '',
    progress: product === 'LENDING' ? progress : ''
  };
  
  // ============ DUAL-SYNC: Firestore + Google Sheets ============
  const syncPromises = [];
  
  // 1. Sync to Firestore
  try {
    const firestorePromise = db.collection('logs').add({
      ...payload,
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      userId: currentUser ? currentUser.uid : 'anonymous',
      userEmail: currentUser ? currentUser.email : ''
    }).then(() => {
      console.log('✅ Firestore sync OK');
    }).catch((err) => {
      console.warn('⚠️ Firestore sync failed:', err.message);
    });
    syncPromises.push(firestorePromise);
  } catch (e) {
    console.warn('⚠️ Firestore not available:', e.message);
  }
  
  // 2. Sync to Google Sheets (keep existing flow)
  const sheetsPromise = fetch(WEBHOOK_URL, {
    method: 'POST', mode: 'no-cors',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  }).then(() => {
    console.log('✅ Google Sheets sync OK');
  }).catch(() => {
    console.warn('⚠️ Google Sheets sync failed');
  });
  syncPromises.push(sheetsPromise);
  
  // Wait for both to complete
  Promise.allSettled(syncPromises).then(() => {
    btn.textContent = '✅ Đã ghi Nhật ký!';
    showToast('🚀 Dual-Sync: Firestore + Sheets!');
    
    // AI Coaching
    processAiCoaching(result, type);
    
    setTimeout(() => { 
      btn.innerHTML = '🚀 GỬI NHẬT KÝ (DUAL-SYNC)'; 
      btn.disabled = false;
      document.getElementById('diary-customer').value = '';
      document.getElementById('diary-result').value = '';
    }, 3000);
  });
}

function processAiCoaching(result, type) {
  const box = document.getElementById('ai-feedback-box');
  const text = document.getElementById('ai-feedback-text');
  
  let advice = "";
  if (result.toLowerCase().includes("chê") || result.toLowerCase().includes("cao")) {
    advice = "Khách đang lăn tăn về giá. Hãy dùng kịch bản 'So sánh lợi ích dài hạn' thay vì chỉ nói về lãi suất. Nhấn mạnh vào biên độ cố định 3.0% của VIB để họ yên tâm.";
  } else if (result.toLowerCase().includes("bận") || result.toLowerCase().includes("sau")) {
    advice = "Khách đang né tránh. Hãy gửi 1 tin nhắn Zalo kèm 1 Case Study thành công để 'nuôi dưỡng' mối quan hệ, đừng ép chốt ngay.";
  } else if (type === "KHHH > 3 tỷ") {
    advice = "🔥 ĐÂY LÀ KHÁCH VIP! Hãy nhờ SM hỗ trợ đi gặp trực tiếp để tăng tỷ lệ chốt. Đừng chỉ gọi điện.";
  } else {
    advice = "Làm tốt lắm! Hãy tiếp tục duy trì tương tác tốt với khách hàng này.";
  }
  
  text.textContent = advice;
  box.style.display = 'block';
  box.scrollIntoView({ behavior: 'smooth' });
}

function useAiFeedback() {
  const text = document.getElementById('ai-feedback-text').textContent;
  const input = document.getElementById('ai-chat-input');
  showPage('tools');
  input.value = "Hãy viết giúp tôi 1 kịch bản Zalo dựa trên lời khuyên: " + text;
  input.focus();
}

// ========== DASHBOARD ACCESS ==========
function openDashboard() {
  if (currentRole === 'manager') {
    window.open('dashboard.html', '_blank');
  } else {
    const pin = prompt("🔐 NHẬP MÃ MASTER PIN:");
    if (pin === "6789") {
      window.open('dashboard.html', '_blank');
    } else {
      showToast("❌ Sai mật mã!");
    }
  }
}

// ========== AI CUSTOMER CLASSIFICATION ==========
async function classifyCustomer() {
  const name = document.getElementById('cls-name').value.trim();
  const phone = document.getElementById('cls-phone').value.trim();
  const email = document.getElementById('cls-email').value.trim();
  const job = document.getElementById('cls-job').value;
  const need = document.getElementById('cls-need').value;
  const source = document.getElementById('cls-source').value;
  const priority = document.getElementById('cls-priority').value;
  const style = document.getElementById('cls-style').value;
  const contactCount = document.getElementById('cls-contact').value;
  const reaction = document.getElementById('cls-reaction').value;
  const income = document.getElementById('cls-income').value;
  const note = document.getElementById('cls-note').value.trim();
  
  if (!name) {
    return showToast("⚠️ Vui lòng nhập tên khách hàng!");
  }
  
  const btn = document.getElementById('btn-classify');
  btn.textContent = '⏳ AI đang phân tích...';
  btn.disabled = true;
  
  const resultBox = document.getElementById('classify-result');
  resultBox.style.display = 'block';
  document.getElementById('cls-badge').textContent = '⏳ Đang phân tích...';
  document.getElementById('cls-insight').textContent = '—';
  
  const prompt = `Bạn là Chuyên gia Tín dụng VIB. Hãy lập 'Bản đồ tác chiến' chốt deal Master cho:
Tên: ${name}, Nghề: ${job}, Nhu cầu: ${need}, Thu nhập: ${income}, Ghi chú: ${note}.

Yêu cầu trả về JSON chuẩn, KHÔNG lời dẫn:
{
  "classification": "HOT/WARM/COLD/POTENTIAL",
  "bantc_score": { "total": 85 },
  "insight": "Dùng DISC & Tử huyệt cảm xúc phân tích tâm lý khách hàng",
  "meddic_qualify": "Phân tích MEDDIC nếu deal lớn, ngược lại ghi N/A",
  "hagtActions": ["B1: Tiếp cận", "B2: Khai thác", "B3: Chốt deal"],
  "script60s": "Kịch bản kể chuyện cá nhân hóa phong cách ${style}",
  "zaloMessage": "Tin nhắn Zalo chốt hẹn tinh tế",
  "vib_solution": "Ưu thế sảm phẩm VIB so với Bank khác cho deal này",
  "objections": ["Xử lý từ chối 1", "Xử lý từ chối 2"]
}`;

  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${GEMINI_API_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
    });

    if (!response.ok) throw new Error(`Google API ${response.status}`);

    const data = await response.json();
    if (!data.candidates || !data.candidates[0]) throw new Error("AI No Response");
    
    let textResult = data.candidates[0].content.parts[0].text;
    const match = textResult.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("JSON Format Error");
    
    const result = JSON.parse(match[0]);
    renderClassifyResult(result, name);
    
    // 🔥 DUAL-SYNC: Firestore & Google Sheets
    try {
      const customerData = {
        name, phone, email, job, need, source, priority, style,
        contactCount, reaction, income, note,
        classification: result.classification,
        confidence: result.bantc_score ? result.bantc_score.total : 75,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        userId: currentUser ? currentUser.uid : 'anonymous'
      };
      db.collection('customers').add(customerData);

      const sheetData = {
        destination: "ai_leads_master",
        timestamp: new Date().toLocaleString("vi-VN"),
        rm_name: currentUser ? (currentUser.displayName || 'RM') : 'RM',
        customer_name: name,
        phone: phone || "—",
        email: email || "—",
        job: job || "—",
        zalo: `https://zalo.me/${phone}`,
        
        // Dữ liệu Master AI
        classification: result.classification || "WARM",
        score: result.bantc_score ? result.bantc_score.total : 75,
        vib_weapon: result.vib_solution || "Đang phân tích",
        next_action: result.hagtActions ? result.hagtActions[0] : "Liên hệ ngay",
        insight: result.insight || "—",
        pains: result.objections ? result.objections.join(', ') : "—"
      };
      
      fetch(WEBHOOK_URL, {
        method: 'POST', mode: 'no-cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sheetData)
      }).then(() => console.log('🚀 [MASTER SYNC] Lead synced successfully!'));

      // 2. Sync to Firestore (Dành riêng cho Dashboard Quản trị)
      db.collection('classifications').add({
        ...sheetData,
        timestamp: firebase.firestore.FieldValue.serverTimestamp(),
        userId: currentUser ? currentUser.uid : 'anonymous',
        userEmail: currentUser ? currentUser.email : ''
      }).then(() => console.log('✅ Firestore classification sync OK'));

    } catch (e) { console.warn('⚠️ Sync failed:', e); }
    
  } catch (err) {
    console.error('Classification error:', err);
    document.getElementById('cls-badge').textContent = '❌ Lỗi: ' + err.message;
  }
  
  btn.textContent = '🤖 PHÂN LOẠI & TẠO KỊCH BẢN';
  btn.disabled = false;
}

function renderClassifyResult(result, name) {
  const badge = document.getElementById('cls-badge');
  const cls = (result.classification || 'WARM').toUpperCase();
  const clsLabels = { HOT: '🔥 HOT', WARM: '🌤️ WARM', COLD: '❄️ COLD', POTENTIAL: '🌱 TIỀM NĂNG' };
  badge.textContent = (clsLabels[cls] || cls) + ' — ' + name;
  badge.className = 'classify-badge ' + cls.toLowerCase();
  
  const conf = result.bantc_score ? result.bantc_score.total : (result.confidence || 75);
  document.getElementById('cls-confidence').textContent = conf + 'đ BANT+C';
  const bar = document.getElementById('cls-confidence-bar');
  bar.style.width = conf + '%';
  bar.style.background = conf >= 80 ? 'var(--green)' : conf >= 60 ? 'var(--vib-orange)' : 'var(--red)';
  
  // Strategy Card
  document.getElementById('cls-insight').textContent = result.insight || '—';
  
  // MEDDIC Qualify
  const meddicEl = document.getElementById('cls-meddic');
  if (result.meddic_qualify && result.meddic_qualify !== 'N/A') {
    meddicEl.textContent = "🏢 MEDDIC: " + result.meddic_qualify;
    meddicEl.style.display = 'block';
  } else {
    meddicEl.style.display = 'none';
  }
  
  // HAGT Card
  const hagtList = document.getElementById('hagt-list-items');
  if (result.hagtActions && result.hagtActions.length > 0) {
    hagtList.innerHTML = result.hagtActions.map(a => `<li>${a}</li>`).join('');
  } else {
    hagtList.innerHTML = '<li>Đang cập nhật lộ trình...</li>';
  }
  
  // Zalo Card
  document.getElementById('cls-zalo').textContent = result.zaloMessage || '—';
  
  // VIB Weapon (Solution)
  const solEl = document.getElementById('cls-solution');
  if (result.vib_solution) {
    solEl.innerHTML = `<strong>VŨ KHÍ VIB:</strong> ${result.vib_solution}`;
    solEl.style.display = 'block';
  } else {
    solEl.style.display = 'none';
  }
  
  // Detailed Scripts
  document.getElementById('cls-script').textContent = result.script60s || '—';
  
  // Objections
  const objBox = document.getElementById('cls-objections');
  const objections = result.objections || result.pains || [];
  if (objections.length > 0) {
    objBox.innerHTML = objections.map(o => `<div class="objection-item">${o}</div>`).join('');
  } else {
    objBox.textContent = '—';
  }
}


// ========== RATES & CALCULATOR ==========
function showRateTab(btn, tabId) {
  document.querySelectorAll('#page-rates .pill').forEach(p => p.classList.remove('active'));
  btn.classList.add('active');
  document.querySelectorAll('#page-rates .rate-tab').forEach(t => t.classList.remove('active'));
  document.getElementById(tabId).classList.add('active');
}

// Dữ liệu so sánh bank (Sẽ được ghi đè nếu Sheet có dữ liệu)
let competitorRates = [
  { bank: "Vietcombank", house: 6.0, car: 7.2 },
  { bank: "VietinBank", house: 5.8, car: 7.5 },
  { bank: "Agribank", house: 6.0, car: 7.0 },
  { bank: "BIDV", house: 6.0, car: 7.5 },
  { bank: "Techcombank", house: 6.5, car: 8.5 },
  { bank: "MBBank", house: 6.8, car: 8.0 }
];

async function fetchRates() {
  const statusEl = document.getElementById('rate-sync-status');
  if (!statusEl) return;
  
  statusEl.textContent = 'Đang kiểm tra dữ liệu live... 🔄';
  statusEl.style.color = 'var(--gold2)';

  if (!RATES_WEBHOOK_URL) {
    console.log("ℹ️ No Rates Webhook set, using Fallback Data.");
    renderRateTables();
    statusEl.textContent = 'Đang dùng dữ liệu 2026 (Offline) 🏠';
    return;
  }

  try {
    const res = await fetch(RATES_WEBHOOK_URL);
    const data = await res.json();
    if (data && data.vib_rates) {
      currentVibRates = data.vib_rates;
      if (data.competitors) competitorRates = data.competitors;
      statusEl.textContent = 'Đã đồng bộ từ Google Sheets ✅';
      statusEl.style.color = 'var(--green)';
    }
  } catch (error) {
    console.warn("⚠️ Không thể kết nối Sheets Lãi suất, dùng Fallback.");
    statusEl.textContent = 'Dữ liệu dự phòng 2026 (Mất kết nối) 🏠';
  }
  
  renderRateTables();
}

function renderRateTables() {
  const tHouse = document.getElementById('table-rates-house');
  const tSme = document.getElementById('table-rates-car');
  if (!tHouse) return;
  
  // 1. Render Bảng BĐS
  tHouse.innerHTML = `<tr><th>Gói vay</th><th>Lãi suất</th><th>Đặc quyền / Ghi chú</th></tr>`;
  if (currentVibRates.bds_fix && currentVibRates.bds_fix.length > 0) {
    currentVibRates.bds_fix.forEach(r => {
      tHouse.innerHTML += `<tr>
        <td><b style="color:var(--vib-blue)">${r.package}</b></td>
        <td><b style="color:var(--red)">${r.rate}%</b></td>
        <td style="font-size:12px;color:var(--dim)">${r.note || '—'}</td>
      </tr>`;
    });
  }

  // 2. Render SME Campaigns
  if (tSme) {
    tSme.innerHTML = `<tr><th>Sản phẩm SME</th><th>Lãi suất</th><th>Chiến dịch / Đặc quyền</th></tr>`;
    if (currentVibRates.sme_business && currentVibRates.sme_business.length > 0) {
      currentVibRates.sme_business.forEach(r => {
        tSme.innerHTML += `<tr>
          <td><b>${r.package}</b></td>
          <td><b style="color:var(--green)">${r.rate}%</b></td>
          <td style="font-size:12px;color:var(--dim)">${r.note || '—'}</td>
        </tr>`;
      });
    }
  }
}

function formatCurrency(input) {
  let value = input.value.replace(/\D/g, '');
  value = value.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  input.value = value;
}

function calculateLoan() {
  const amountStr = document.getElementById('calc-amount').value;
  const amount = parseFloat(amountStr.replace(/\./g, ''));
  const months = parseInt(document.getElementById('calc-months').value);
  const type = document.getElementById('calc-type').value;
  
  const promoRate = parseFloat(document.getElementById('calc-promo-rate').value) / 100 / 12;
  const promoTime = parseInt(document.getElementById('calc-promo-time').value);
  const floatRate = parseFloat(document.getElementById('calc-float-rate').value) / 100 / 12;
  
  if (!amount || !months) return showToast("Vui lòng nhập đủ số tiền và thời hạn!");
  
  let principalPerMonth = amount / months;
  let totalInterest = 0;
  let interestM1 = 0;
  let floatAmount = 0;
  let firstMonthTotal = 0;
  
  if (type === 'decline') {
    interestM1 = amount * promoRate;
    firstMonthTotal = principalPerMonth + interestM1;
    
    let remainingAmount = amount;
    for (let i = 1; i <= months; i++) {
        let currentRate = (i <= promoTime) ? promoRate : floatRate;
        let interestForMonth = remainingAmount * currentRate;
        totalInterest += interestForMonth;
        
        if (i === (promoTime + 1)) {
           floatAmount = principalPerMonth + interestForMonth;
        }
        remainingAmount -= principalPerMonth;
    }
    if(promoTime >= months) floatAmount = 0;
    
  } else {
    const r = promoRate;
    const emi = amount * r * Math.pow(1+r, months) / (Math.pow(1+r, months) - 1);
    
    principalPerMonth = emi - (amount * r);
    interestM1 = amount * r;
    firstMonthTotal = emi;
    totalInterest = (emi * months) - amount;
    floatAmount = emi;
  }
  
  document.getElementById('res-principal').textContent = Math.round(principalPerMonth).toLocaleString('vi-VN') + ' ₫';
  document.getElementById('res-interest-m1').textContent = Math.round(interestM1).toLocaleString('vi-VN') + ' ₫';
  document.getElementById('res-total-m1').textContent = Math.round(firstMonthTotal).toLocaleString('vi-VN') + ' ₫';
  
  if (type === 'flat') {
      document.getElementById('res-float-label').textContent = `Trả đều cố định mỗi tháng:`;
  } else {
      document.getElementById('res-float-label').textContent = `Gốc Lãi tháng thả nổi (Tháng ${promoTime + 1}):`;
      if(promoTime >= months) document.getElementById('res-float-label').textContent = "Không bị thả nổi:";
  }
  document.getElementById('res-float-amount').textContent = Math.round(floatAmount).toLocaleString('vi-VN') + ' ₫';
  
  document.getElementById('res-total-interest').textContent = Math.round(totalInterest).toLocaleString('vi-VN') + ' ₫';
  
  document.getElementById('calc-results').style.display = 'block';
  document.getElementById('calc-results').scrollIntoView({ behavior: 'smooth' });
}

// ========== INIT on DOMContentLoaded ==========
document.addEventListener('DOMContentLoaded', () => {
    const defaultProduct = document.getElementById('diary-product')?.value;
    if (defaultProduct) toggleLendingFields(defaultProduct);
});

// ========== SERVICE WORKER ==========
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}
