import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
    apiKey: "AIzaSyC5DRmMdAuDZ79hG90Cv69bfYkz_XffOws",
    authDomain: "ultimate-study-sync.firebaseapp.com",
    projectId: "ultimate-study-sync",
    storageBucket: "ultimate-study-sync.firebasestorage.app",
    messagingSenderId: "457301692716",
    appId: "1:457301692716:web:2b0f75be32259415e2dc89",
    measurementId: "G-VNFXGLDFXH"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const db = getFirestore(app);
