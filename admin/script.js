import { db,auth } from "../firebase.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.1.0/firebase-auth.js";
import { collection, addDoc, getDocs, deleteDoc, doc } from "https://www.gstatic.com/firebasejs/10.1.0/firebase-firestore.js";


onAuthStateChanged(auth, (user) => {
  if (!user) {
      // Redirect to login page if not logged in
      window.location.href = "../login/index.html";
  }
});
document.getElementById("logoutBtn")?.addEventListener("click", async () => {
  await signOut(auth);
  window.location.href = "../login/index.html"; // Redirect after logout
});
let selectedMemberId = null; // Store selected member for billing

// Function to add a member
async function addMember() {
    let name = document.getElementById("memberName").value.trim();
    let email = document.getElementById("memberMail").value.trim();
    let password = document.getElementById("memberPassword").value.trim();

    if (name === "") return alert("Enter a valid name!");

    try {
        await addDoc(collection(db, "members"), { name: name, email: email, password: password });
        document.getElementById("memberName").value = "";
        document.getElementById("memberMail").value = "";
        document.getElementById("memberPassword").value = "";
        fetchMembers();
    } catch (error) {
        console.error("Error adding member:", error);
    }
}

// Function to fetch members
async function fetchMembers() {
    let list = document.getElementById("memberList");
    list.innerHTML = "";

    try {
        const querySnapshot = await getDocs(collection(db, "members"));
        querySnapshot.forEach((docSnap) => {
            let member = docSnap.data();
            let memberId = docSnap.id;

            list.innerHTML += `
                <li class="flex justify-between bg-gray-200 p-2 rounded">
                    ${member.name} 
                    <button onclick="deleteMember('${memberId}')" class="text-red-600">Delete</button>
                    <button onclick="showBillForm('${memberId}')" class="bg-blue-500 text-white px-2 py-1 rounded">Bill</button>
                </li>`;
        });
    } catch (error) {
        console.error("Error fetching members:", error);
    }
}

// Function to delete a member
async function deleteMember(memberId) {
    try {
        await deleteDoc(doc(db, "members", memberId));
        fetchMembers();
    } catch (error) {
        console.error("Error deleting member:", error);
    }
}

// Function to show the bill form
function showBillForm(memberId) {
    selectedMemberId = memberId;
    document.getElementById("billForm").classList.remove("hidden");
}

// Function to generate a bill
async function generateBill() {
    if (!selectedMemberId) return alert("Select a member first!");
    
    let amount = document.getElementById("billAmount").value.trim();
    if (amount === "" || amount <= 0) return alert("Enter a valid amount!");

    try {
        await addDoc(collection(db, "members", selectedMemberId, "bills"), {
            amount: Number(amount),
            date: new Date().toISOString().split("T")[0], // YYYY-MM-DD format
            status: "Pending",
        });

        alert("Bill generated successfully!");
        document.getElementById("billForm").classList.add("hidden");
        document.getElementById("billAmount").value = "";
    } catch (error) {
        console.error("Error generating bill:", error);
    }
}

// Event listener for submitting the bill
document.getElementById("submitBill").addEventListener("click", generateBill);

// Fetch members on page load
document.addEventListener("DOMContentLoaded", fetchMembers);

// Make functions accessible globally
window.addMember = addMember;
window.deleteMember = deleteMember;
window.showBillForm = showBillForm;
