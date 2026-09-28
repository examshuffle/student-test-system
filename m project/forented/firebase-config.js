import { initializeApp } from
    "https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js";

import {
    getAuth,
    createUserWithEmailAndPassword
} from
    "https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js";

import {
    getFirestore,
    doc,
    setDoc,
    serverTimestamp
} from
    "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";


const firebaseConfig = {
    apiKey: "AIzaSyBgt7-ylx8_xspiMhe2BdkccfYyIDH6vPY",
    authDomain: "examshuffle-f3b1c.firebaseapp.com",
    projectId: "examshuffle-f3b1c",
    storageBucket: "examshuffle-f3b1c.firebasestorage.app",
    messagingSenderId: "728193021150",
    appId: "1:728193021150:web:0fb773e550ebd46e703e4f"
};


// Initialize Firebase
const app = initializeApp(firebaseConfig);


// Authentication
const auth = getAuth(app);


// Firestore
const db = getFirestore(app);


// Make Firebase available to script.js
window.firebaseAuth = auth;
window.firebaseDB = db;

window.firebaseCreateUser =
    createUserWithEmailAndPassword;

window.firebaseDoc = doc;
window.firebaseSetDoc = setDoc;
window.firebaseServerTimestamp = serverTimestamp;


console.log("Firebase connected successfully!");