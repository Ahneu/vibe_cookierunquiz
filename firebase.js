import { initializeApp } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs, query, where }
  from "https://www.gstatic.com/firebasejs/12.15.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey:            "AIzaSyAczR52PKCjm5K33RNcltFMOPMCrPC0T00",
  authDomain:        "cookierunquiz.firebaseapp.com",
  projectId:         "cookierunquiz",
  storageBucket:     "cookierunquiz.firebasestorage.app",
  messagingSenderId: "973054349359",
  appId:             "1:973054349359:web:20cbc79d4f6fa80bacb6da",
};

const app = initializeApp(firebaseConfig);
const db  = getFirestore(app);

export async function saveScoreRemote(entry) {
  try {
    await addDoc(collection(db, 'scores'), entry);
  } catch (e) {
    console.error('점수 저장 실패:', e);
  }
}

export async function loadScoresRemote(difficulty) {
  try {
    const q = query(
      collection(db, 'scores'),
      where('difficulty', '==', difficulty)
    );
    const snapshot = await getDocs(q);
    return snapshot.docs
      .map(d => d.data())
      .sort((a, b) => {
        const sa = a.score ?? 0;
        const sb = b.score ?? 0;
        if (sb !== sa) return sb - sa;
        return b.ts - a.ts;
      })
      .slice(0, 20);
  } catch (e) {
    console.error('리더보드 로드 실패:', e);
    return [];
  }
}
