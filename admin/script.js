import { db, auth } from "../firebase.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.1.0/firebase-auth.js";
import { createUserWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.1.0/firebase-auth.js";
import { collection, addDoc, getDocs, deleteDoc, doc, getDoc, setDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.1.0/firebase-firestore.js";

// DOM Element References
const addNotificationBtn = document.getElementById("addNotificationBtn");
const logoutBtn = document.getElementById("logoutBtn");
let selectedMemberId = null;

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
            fetchMembers();
        } else {
            alert("Access Denied! Only admins can access this page.");
            window.location.href = "../member/index.html";
        }
    } catch (error) {
        console.error("Auth error:", error);
        window.location.href = "../login/index.html";
    }
});

// Notification Handler
if (addNotificationBtn) {
    addNotificationBtn.addEventListener("click", async () => {
        const message = notificationInput.value.trim();

        if (!message) {
            alert("Please enter a notification message.");
            return;
        }

        try {
            // Use auto-generated ID instead of timestamp
            await addDoc(collection(db, "notifications"), {
                message: message,
                timestamp: serverTimestamp(),
            });

            notificationInput.value = "";
            alert("Notification added successfully!");
        } catch (error) {
            console.error("Notification error:", error);
            alert("Error adding notification: " + error.message);
        }
    });
}

// Logout Handler
if (logoutBtn) {
    logoutBtn.addEventListener("click", async () => {
        try {
            await signOut(auth);
            window.location.href = "../login/index.html";
        } catch (error) {
            console.error("Logout failed:", error);
            alert("Logout failed: " + error.message);
        }
    });
}

// Member Functions
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
            createdAt: serverTimestamp()
        });

        // Clear form
        ["memberName", "memberMail", "memberPassword"].forEach(id => {
            document.getElementById(id).value = "";
        });
        
        alert("Member added successfully!");
        fetchMembers();
    } catch (error) {
        console.error("Add member error:", error);
        alert(`Error: ${error.code?.replace('auth/', '') || error.message}`);
    }
}

// Improved fetchMembers with error handling
async function fetchMembers() {
    const list = document.getElementById("memberList");
    if (!list) return;

    try {
        list.innerHTML = "<li class='p-3 text-gray-500'>Loading members...</li>";
        const snapshot = await getDocs(collection(db, "members"));
        list.innerHTML = "";

        if (snapshot.empty) {
            list.innerHTML = "<li class='p-3 text-gray-500'>No members found</li>";
            return;
        }

        snapshot.forEach(docSnap => {
            const member = docSnap.data();
            const listItem = createMemberListItem(member, docSnap.id);
            list.appendChild(listItem);
        });
    } catch (error) {
        console.error("Fetch members error:", error);
        list.innerHTML = "<li class='p-3 text-red-500'>Error loading members</li>";
    }
}

function createMemberListItem(member, memberId) {
    const listItem = document.createElement("li");
    listItem.className = "bg-gray-100 p-4 rounded shadow flex flex-col sm:flex-row justify-between items-center mb-2 space-y-2 sm:space-y-0";

    const memberInfo = document.createElement("div");
    memberInfo.className = "flex-1";
    memberInfo.innerHTML = `
        <span class="font-medium">${member.name || "Unnamed Member"}</span>
        <span class="text-sm text-gray-500 block sm:inline">(${member.email})</span>
    `;

    const buttonGroup = document.createElement("div");
    buttonGroup.className = "flex space-x-2";

    const deleteBtn = createButton("Delete", "red", () => deleteMember(memberId));
    const billBtn = createButton("Bill", "blue", () => showBillForm(memberId));
    const dietBtn = createButton("Diet", "green", () => showDietForm(memberId));

    buttonGroup.append(deleteBtn, billBtn, dietBtn);
    listItem.append(memberInfo, buttonGroup);

    return listItem;
}

function createButton(text, color, onClick) {
    const btn = document.createElement("button");
    btn.textContent = text;
    btn.className = `bg-${color}-500 hover:bg-${color}-700 text-white px-3 py-1 rounded transition-colors`;
    btn.onclick = onClick;
    return btn;
}

// Delete Member with confirmation
async function deleteMember(memberId) {
    if (!confirm("Permanently delete this member and all associated data?")) return;
    
    try {
        await deleteDoc(doc(db, "members", memberId));
        // Note: Add Cloud Function to delete auth user
        fetchMembers();
        alert("Member deleted successfully");
    } catch (error) {
        console.error("Delete error:", error);
        alert("Deletion failed: " + error.message);
    }
}

// Bill Functions
function showBillForm(memberId) {
    selectedMemberId = memberId;
    const billForm = document.getElementById("billForm");
    if (billForm) {
        billForm.classList.remove("hidden");
        document.getElementById("billAmount").value = "";
    }
}

async function generateBill() {
    const amountInput = document.getElementById("billAmount");
    const amount = parseFloat(amountInput.value.trim());

    if (!selectedMemberId || !amount || amount <= 0) {
        alert("Please enter a valid amount");
        return;
    }

    try {
        await addDoc(collection(db, "members", selectedMemberId, "bills"), {
            amount: amount,
            date: serverTimestamp(),
            status: "pending"
        });
        
        amountInput.value = "";
        document.getElementById("billForm").classList.add("hidden");
        alert("Bill generated successfully!");
    } catch (error) {
        console.error("Billing error:", error);
        alert("Billing error: " + error.message);
    }
}

// Diet Plan Functions
function showDietForm(memberId) {
    const dietForm = document.getElementById("dietForm");
    if (!dietForm) return;

    dietForm.classList.remove("hidden");
    dietForm.dataset.memberId = memberId;
    document.getElementById("dietDetails").value = "";

    // Clean up previous listeners
    const closeBtn = document.getElementById("closeDietForm");
    closeBtn.replaceWith(closeBtn.cloneNode(true));
    
    document.getElementById("closeDietForm").addEventListener("click", () => {
        dietForm.classList.add("hidden");
    });
}

document.getElementById("submitDiet")?.addEventListener("click", async () => {
    const dietForm = document.getElementById("dietForm");
    const memberId = dietForm?.dataset.memberId;
    const dietDetails = document.getElementById("dietDetails").value.trim();

    if (!memberId || !dietDetails) {
        alert("Please enter diet details");
        return;
    }

    try {
        await addDoc(collection(db, "members", memberId, "dietPlans"), {
            details: dietDetails,
            date: serverTimestamp()
        });

        dietForm.classList.add("hidden");
        alert("Diet plan assigned successfully!");
    } catch (error) {
        console.error("Diet plan error:", error);
        alert("Error assigning diet: " + error.message);
    }
});

// Event Listeners
document.getElementById('closeBillForm')?.addEventListener('click', () => {
    document.getElementById('billForm').classList.add('hidden');
});

document.getElementById("submitBill")?.addEventListener("click", generateBill);

// Prevent global exposure - use proper event listeners instead
// Remove window.* exposures and use event listeners in your HTML