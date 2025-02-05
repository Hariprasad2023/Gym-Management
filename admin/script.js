import { db, auth } from "../firebase.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.1.0/firebase-auth.js";
import { createUserWithEmailAndPassword, deleteUser } from "https://www.gstatic.com/firebasejs/10.1.0/firebase-auth.js";
import { collection, addDoc, getDocs, deleteDoc, doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.1.0/firebase-firestore.js";

// Check auth state and admin status
onAuthStateChanged(auth, async (user) => {
    if (!user) {
        window.location.href = "../login/index.html";
        return;
    }

    try {
        const userDoc = await getDoc(doc(db, "members", user.uid));
        
        if (userDoc.exists() && userDoc.data().role === "admin") {
            console.log("Admin logged in");
            fetchMembers(); // Move fetch here after auth confirmation
        } else {
            alert("Access Denied! Only admins can access this page.");
            window.location.href = "../member/index.html";
        }
    } catch (error) {
        console.error("Error:", error);
        window.location.href = "../login/index.html";
    }
});

// Logout handler
const logoutBtn = document.getElementById("logoutBtn");
if (logoutBtn) {
    logoutBtn.addEventListener("click", async () => {
        try {
            await signOut(auth);
            window.location.href = "../login/index.html";
        } catch (error) {
            console.error("Logout failed:", error);
        }
    });
}

let selectedMemberId = null;

// Member functions
async function addMember() {
    const name = document.getElementById("memberName").value.trim();
    const email = document.getElementById("memberMail").value.trim();
    const password = document.getElementById("memberPassword").value.trim();

    if (!name || !email || !password) {
        alert("Please fill all fields!");
        return;
    }

    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        await setDoc(doc(db, "members", userCredential.user.uid), {
            uid: userCredential.user.uid,
            name,
            email,
            role: "member",
            createdAt: new Date()
        });

        // Clear form
        ["memberName", "memberMail", "memberPassword"].forEach(id => 
            document.getElementById(id).value = ""
        );
        
        alert("Member added!");
        fetchMembers();
    } catch (error) {
        alert(`Error: ${error.code?.replace('auth/', '') || error.message}`);
    }
}

async function fetchMembers() {
    const list = document.getElementById("memberList");
    if (!list) return;

    list.innerHTML = "Loading...";

    try {
        const snapshot = await getDocs(collection(db, "members"));
        list.innerHTML = ""; // Clear loading
        
        snapshot.forEach(doc => {
            const member = doc.data();
            list.innerHTML += `
                <li class="member-item">
                    ${member.name} 
                    <button onclick="deleteMember('${doc.id}')">Delete</button>
                    <button onclick="showBillForm('${doc.id}')">Bill</button>
                </li>`;
        });
    } catch (error) {
        list.innerHTML = "Failed to load members";
        console.error("Fetch error:", error);
    }
}

async function deleteMember(memberId) {
    if (!confirm("Delete member and all associated data?")) return;
    
    try {
        // First delete Firestore data
        await deleteDoc(doc(db, "members", memberId));
        
        // Then delete authentication user (requires admin privileges)
        // Note: Client-side deletion not recommended! Use Cloud Function instead
        // const user = await auth.getUser(memberId);
        // await deleteUser(user);
        
        fetchMembers();
    } catch (error) {
        alert("Deletion failed: " + error.message);
    }
}

// Billing functions
function showBillForm(memberId) {
    selectedMemberId = memberId;
    document.getElementById("billForm").classList.remove("hidden");
}

async function generateBill() {
    const amountInput = document.getElementById("billAmount");
    const amount = parseFloat(amountInput.value.trim());

    if (!selectedMemberId || !amount || amount <= 0) {
        alert("Invalid amount or member selection!");
        return;
    }

    try {
        await addDoc(collection(db, "members", selectedMemberId, "bills"), {
            amount,
            date: new Date().toISOString(),
            status: "pending"
        });
        
        amountInput.value = "";
        document.getElementById("billForm").classList.add("hidden");
        alert("Bill created!");
    } catch (error) {
        alert("Billing error: " + error.message);
    }
}

// Event listeners
document.getElementById('closeBillForm')?.addEventListener('click', () => {
    document.getElementById('billForm').classList.add('hidden');
});

document.getElementById("submitBill")?.addEventListener("click", generateBill);

// Global exposure
window.addMember = addMember;
window.deleteMember = deleteMember;
window.showBillForm = showBillForm;