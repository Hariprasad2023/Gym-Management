import { auth, db } from "..firebase.js";
import { signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.1.0/firebase-auth.js";
import { collection, getDocs, query, where } from "https://www.gstatic.com/firebasejs/10.1.0/firebase-firestore.js";

// Function to check if the member exists in Firestore
async function checkMember(email) {
    const membersRef = collection(db, "members");
    const q = query(membersRef, where("email", "==", email));
    const querySnapshot = await getDocs(q);

    return !querySnapshot.empty; // Returns true if member exists
}

// Function to handle login
async function login(event) {
    event.preventDefault(); // Prevent form from refreshing

    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value.trim();
    const errorMessage = document.getElementById("error-message");

    if (!email || !password) {
        errorMessage.textContent = "Please enter both email and password!";
        return;
    }

    try {
        const isMember = await checkMember(email); // Check if email exists in Firestore

        if (isMember) {
            // Proceed with Firebase authentication
            await signInWithEmailAndPassword(auth, email, password);
            window.location.href = "member-dashboard.html"; // Redirect to member dashboard
        } else {
            errorMessage.textContent = "Member not found. Please check your email.";
        }
    } catch (error) {
        console.error("Login Error:", error);
        errorMessage.textContent = "Login failed. Please try again.";
    }
}

// Attach event listener to login button
document.getElementById("login-btn").addEventListener("click", login);
