import { db, auth } from "../firebase.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.1.0/firebase-auth.js";
import { createUserWithEmailAndPassword, deleteUser } from "https://www.gstatic.com/firebasejs/10.1.0/firebase-auth.js";
import { collection, addDoc, getDocs, deleteDoc, doc, getDoc, setDoc,serverTimestamp } from "https://www.gstatic.com/firebasejs/10.1.0/firebase-firestore.js";

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
//notification handler
addNotificationBtn.addEventListener("click", async () => {
    const message = notificationInput.value.trim();

    if (message) {
        try {
            const user = auth.currentUser;

            if (user) {
                // Fetch user data from Firestore to check role
                const userRef = doc(db, "members", user.uid);
                const userSnap = await getDoc(userRef);
                
                if (userSnap.exists()) {
                    const userData = userSnap.data();
                    if (userData.role === "admin") {
                        // Admin can add notifications
                        const notificationId = new Date().getTime().toString(); // You can create a unique ID based on timestamp
                        const notificationRef = doc(db, "notifications", notificationId);

                        await setDoc(notificationRef, {
                            message: message,
                            timestamp: serverTimestamp(),
                        });

                        alert("Notification added successfully!");
                        notificationInput.value = ""; // Clear input after adding
                    } else {
                        alert("You do not have permission to add notifications.");
                    }
                } else {
                    alert("User data not found in Firestore.");
                }
            }
        } catch (error) {
            console.error("Error adding notification:", error);
            alert("Error adding notification: " + error.message);
        }
    } else {
        alert("Please enter a notification message.");
    }
});


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

    list.innerHTML = "<p class='text-gray-500'>Loading...</p>";

    try {
        const snapshot = await getDocs(collection(db, "members"));
        list.innerHTML = ""; // Clear previous content

        if (snapshot.empty) {
            list.innerHTML = "<p class='text-red-500'>No members found</p>";
            return;
        }

        snapshot.forEach(docSnap => {
            const member = docSnap.data();
            const memberId = docSnap.id;

            // Create list item
            const listItem = document.createElement("li");
            listItem.className = "bg-gray-100 p-4 rounded shadow flex justify-between items-center mb-2";

            // Member Name
            const memberName = document.createElement("span");
            memberName.textContent = member.name || "Unnamed Member";

            // Delete Button
            const deleteBtn = document.createElement("button");
            deleteBtn.textContent = "Delete";
            deleteBtn.className = "bg-red-500 text-white px-3 py-1 rounded hover:bg-red-700";
            deleteBtn.onclick = () => deleteMember(memberId);

            // Bill Button
            const billBtn = document.createElement("button");
            billBtn.textContent = "Bill";
            billBtn.className = "bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-700";
            billBtn.onclick = () => showBillForm(memberId);

            // Diet Button
            const dietBtn = document.createElement("button");
            dietBtn.textContent = "Diet";
            dietBtn.className = "bg-green-500 text-white px-3 py-1 rounded hover:bg-green-700";
            dietBtn.onclick = () => showDietForm(memberId);

            // Append elements
            listItem.appendChild(memberName);
            listItem.appendChild(deleteBtn);
            listItem.appendChild(billBtn);
            listItem.appendChild(dietBtn);
            list.appendChild(listItem);
        });
    } catch (error) {
        list.innerHTML = "<p class='text-red-500'>Failed to load members</p>";
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
//adding diet plan
function showDietForm(memberId) {
    const dietForm = document.getElementById("dietForm");
    if (!dietForm) return;

    dietForm.classList.remove("hidden"); // Show the form
    dietForm.dataset.memberId = memberId; // Store the member ID for later use

    // Clear previous input
    document.getElementById("dietDetails").value = "";

    // Close button event
    document.getElementById("closeDietForm").addEventListener("click", () => {
        dietForm.classList.add("hidden");
    });
}

document.getElementById("submitDiet").addEventListener("click", async () => {
    const dietForm = document.getElementById("dietForm");
    const memberId = dietForm.dataset.memberId;
    const dietDetails = document.getElementById("dietDetails").value.trim();

    if (!memberId || !dietDetails) {
        alert("Invalid diet details or member selection!");
        return;
    }

    try {
        const dietId = new Date().getTime().toString();
        console.log("Assigning diet to member:", memberId);
        await setDoc(doc(db, "members", memberId, "diet",dietId), {
            details: dietDetails,
            date: new Date().toISOString()
        });

        document.getElementById("dietDetails").value = "";
        dietForm.classList.add("hidden");
        alert("Diet assigned successfully!");
    } catch (error) {
        alert("Error assigning diet: " + error.message);
    }
});




// Event listeners
document.getElementById('closeBillForm')?.addEventListener('click', () => {
    document.getElementById('billForm').classList.add('hidden');
});

document.getElementById("submitBill")?.addEventListener("click", generateBill);

// Global exposure
window.addMember = addMember;
window.deleteMember = deleteMember;
window.showBillForm = showBillForm;
window.showDietForm = showDietForm;