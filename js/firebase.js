
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyA-JedDmYqoo38Jaj9EZUcORMY5_lPAqxA",
    authDomain: "the-dressup-society.firebaseapp.com",
    projectId: "the-dressup-society",
    storageBucket: "the-dressup-society.firebasestorage.app",
    messagingSenderId: "1021729623063",
    appId: "1:1021729623063:web:7600bec648e98d73fbe052",
    measurementId: "G-5Z248S9ERF"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
