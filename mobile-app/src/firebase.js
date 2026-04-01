import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyB-bd_MKI2gi8dY97WNK_0dHJDl2a7GJzM",
  authDomain: "internship-portal-340c9.firebaseapp.com",
  projectId: "internship-portal-340c9",
  storageBucket: "internship-portal-340c9.firebasestorage.app",
  messagingSenderId: "56120659200",
  appId: "1:56120659200:web:15cc54e658bc7ac34577e5",
  measurementId: "G-6WF397NC56"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();

export { auth, provider, signInWithPopup, signOut, onAuthStateChanged };
