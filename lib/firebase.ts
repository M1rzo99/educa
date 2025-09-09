import { initializeApp } from 'firebase/app'
import { getStorage,ref } from 'firebase/storage'

const firebaseConfig = {
  apiKey: "AIzaSyDwj9QFRqobDZwUOu0GRVKqQz9Cpq4hYy0",
  authDomain: "educa-7a873.firebaseapp.com",
  projectId: "educa-7a873",
  storageBucket: "educa-7a873.firebasestorage.app",
  messagingSenderId: "433128925940",
  appId: "1:433128925940:web:e93b845436897f65fb4ca1",
  measurementId: "G-TKGX351TV5"
}

const app = initializeApp(firebaseConfig)
const storage = getStorage(app)

const courseStringRefs = ref(storage, `educa/course/${new Date().getTime()}`)

export { storage, courseStringRefs }