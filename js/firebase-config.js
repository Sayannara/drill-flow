// firebase-config.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// TODO: Remplacer ces valeurs par celles de votre projet Firebase
const firebaseConfig = {
  apiKey: "AIzaSyC_Xtlt7EngA0g2Tv4OgBC4zmcGc-U9bWI",
  authDomain: "drill-flow.firebaseapp.com",
  projectId: "drill-flow",
  storageBucket: "drill-flow.firebasestorage.app",
  messagingSenderId: "798761063342",
  appId: "1:798761063342:web:ed5397da7474a2777b6e3f",
  measurementId: "G-LRL9Y9ZFQ0"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

export { auth, db };
