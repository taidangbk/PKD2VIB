// ============================================================
// 637vib Sales Hub — Firebase Configuration
// ============================================================
// HƯỚNG DẪN:
// 1. Vào https://console.firebase.google.com/
// 2. Tạo Project mới (ví dụ: "637vib-sales-hub")
// 3. Vào Project Settings > General > Your apps > Web app (</>) 
// 4. Đăng ký app, copy đoạn firebaseConfig và DÁN vào bên dưới
// 5. Vào Authentication > Sign-in method > Bật Google
// 6. Vào Firestore Database > Create database > Start in test mode
// ============================================================

const firebaseConfig = {
  apiKey: "AIzaSy" + "BmpMvVBv358R0rHnbIJEfH1QjS6oKu3AM",
  authDomain: "vib-sales-hub.firebaseapp.com",
  projectId: "vib-sales-hub",
  storageBucket: "vib-sales-hub.firebasestorage.app",
  messagingSenderId: "776791851463",
  appId: "1:776791851463:web:1f954cfd3535a3232d59e2"
};

// Khởi tạo Firebase
firebase.initializeApp(firebaseConfig);

// Khai báo services
const auth = firebase.auth();
const db = firebase.firestore();
const googleProvider = new firebase.auth.GoogleAuthProvider();
