import { auth } from "../firebase.js";
import { signInWithEmailAndPassword, setPersistence, browserLocalPersistence } from "https://www.gstatic.com/firebasejs/10.1.0/firebase-auth.js";

const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const loginBtn = document.getElementById("login-btn");
const errorMessage = document.getElementById("error-message");

loginBtn.addEventListener("click", async (e) => {
  e.preventDefault(); // Prevent form submission

  const email = emailInput.value.trim();
  const password = passwordInput.value.trim();

  if (email && password) {
    try {
      // Set persistence to keep the user logged in
      await setPersistence(auth, browserLocalPersistence);

      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      window.location.href = "../member/dashboard.html"; // Redirect to admin page after login
    } catch (error) {
      errorMessage.textContent = "Login failed: " + error.message;
    }
  } else {
    errorMessage.textContent = "Please fill in all fields.";
  }
});