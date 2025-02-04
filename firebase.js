// firebase.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.1.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.1.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.1.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyAPwqu5WTuLi2RUOY2MaRHaukG1FPDe0PY",
  authDomain: "gym-management-e5f65.firebaseapp.com",
  projectId: "gym-management-e5f65",
  storageBucket: "gym-management-e5f65.firebasestorage.app",
  messagingSenderId: "451093400458",
  appId: "1:451093400458:web:b0608ce27b2487d5d49673",
  measurementId: "G-7LG7MN5Y73"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

export { auth, db };