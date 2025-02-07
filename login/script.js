import { auth, db } from "../firebase.js";
import { signInWithEmailAndPassword, setPersistence, browserLocalPersistence } from "https://www.gstatic.com/firebasejs/10.1.0/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.1.0/firebase-firestore.js";

const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const loginBtn = document.getElementById("login-btn");
const errorMessage = document.getElementById("error-message");
const guestLogin=document.getElementById("guest-btn");
//guest login
guestLogin.addEventListener("click", async (e) => {
  e.preventDefault(); // Prevent form submission
 window.location.href = "../User/index.html";
});

loginBtn.addEventListener("click", async (e) => {
  e.preventDefault(); // Prevent form submission

  const email = emailInput.value.trim();
  const password = passwordInput.value.trim();

  if (email && password) {
    try {
      // Set persistence to keep the user logged in
      await setPersistence(auth, browserLocalPersistence);

      // Authenticate user
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      console.log("Authenticated user UID:", user.uid);

      // Fetch user data from Firestore
      const userRef = doc(db, "members", user.uid); // Ensure correct collection name
      const userSnap = await getDoc(userRef);

      if (userSnap.exists()) {
        const userData = userSnap.data();
        console.log("Firestore document snapshot:", userSnap.exists());
        console.log("User data:", userData);

        // Redirect based on role
        if (userData.role === "admin") {
          console.log("Redirecting to admin dashboard...");
          window.location.href = "../admin/index.html";
        } else {
          console.log("Redirecting to member dashboard...");
          window.location.href = "../member/dashboard.html";
        }
      } else {
        console.error("User data not found in Firestore.");
        errorMessage.textContent = "User data not found.";
      }
    } catch (error) {
      console.error("Login failed:", error.message);
      errorMessage.textContent = "Invalid email or password";
    }
  } else {
    errorMessage.textContent = "Please fill in all fields.";
  }
});

