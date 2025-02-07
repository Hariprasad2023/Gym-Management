// Consolidated imports
import { db, auth } from "../firebase.js";
import { 
    onAuthStateChanged, 
    signOut, 
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword
} from "https://www.gstatic.com/firebasejs/10.1.0/firebase-auth.js";
import { 
    collection, 
    addDoc, 
    getDocs, 
    deleteDoc, 
    doc, 
    getDoc, 
    setDoc, 
    serverTimestamp 
} from "https://www.gstatic.com/firebasejs/10.1.0/firebase-firestore.js";

// Utility functions
const showError = (error, context) => {
    console.error(`${context}:`, error);
    alert(`${context}: ${error.message}`);
};

const setLoading = (element, isLoading) => {
    if (!element) return;
    element.disabled = isLoading;
    element.innerHTML = isLoading ? 
        '<i class="fas fa-spinner fa-spin"></i> Loading...' : 
        element.dataset.originalText || element.textContent;
};

// DOM Elements
const elements = {
    addNotificationBtn: document.getElementById("addNotificationBtn"),
    logoutBtn: document.getElementById("logoutBtn"),
    addMemberBtn: document.getElementById("addMemberBtn"),
    notificationInput: document.getElementById("notificationInput"),
    billForm: document.getElementById("billForm"),
    dietForm: document.getElementById("dietForm")
};


let selectedMemberId = null;

// Auth state observer
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
        } 
        else {
            alert("Login session completed. Please log in again as an admin.");
            window.location.href = "../login/index.html";
          

            
        }
    } catch (error) {
        showError(error, "Authentication error");
        window.location.href = "../login/index.html";
    }
});

// Notification handler
elements.addNotificationBtn?.addEventListener("click", async () => {
    const message = elements.notificationInput?.value.trim();
    if (!message) {
        alert("Please enter a notification message.");
        return;
    }

    setLoading(elements.addNotificationBtn, true);
    try {
        await addDoc(collection(db, "notifications"), {
            message,
            timestamp: serverTimestamp(),
        });
        elements.notificationInput.value = "";
        alert("Notification added successfully!");
    } catch (error) {
        showError(error, "Notification error");
    } finally {
        setLoading(elements.addNotificationBtn, false);
    }
});

// Member management functions
async function addMember() {
    const name = document.getElementById("memberName")?.value.trim();
    const email = document.getElementById("memberMail")?.value.trim();
    const password = document.getElementById("memberPassword")?.value.trim();

    if (!name || !email || !password) {
        alert("Please fill all fields!");
        return;
    }

    const addMemberBtn = document.getElementById("addMemberBtn");
    addMemberBtn.disabled = true; // Disable button while processing

    try {
        const currentAdmin = auth.currentUser;
        const adminEmail = currentAdmin.email;
        const adminPassword = prompt("Re-enter admin password to confirm:");

        if (!adminPassword) {
            alert("Admin password required!");
            addMemberBtn.disabled = false;
            return;
        }

        // Create new member in Firebase Auth
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const userId = userCredential.user.uid;

        console.log("User created:", userId); // ✅ Debugging log

        // Store member data in Firestore BEFORE sign-out
        await setDoc(doc(db, "members", userId), {
            uid: userId,
            name,
            email,
            role: "member",
            createdAt: serverTimestamp(),
        });

        console.log("User added to Firestore:", userId); // ✅ Debugging log

        // Sign out the new user (important)
        await signOut(auth);

        // Sign back in as admin
        await signInWithEmailAndPassword(auth, adminEmail, adminPassword);
        console.log("Signed back in as admin");

        alert("Member added successfully!");
        fetchMembers(); // Refresh members list
    } catch (error) {
        console.error("Add member error:", error);
        alert("Error: " + (error.code?.replace("auth/", "") || error.message));
    } finally {
        addMemberBtn.disabled = false;
    }
}


async function fetchMembers() {
    const list = document.getElementById("memberList");
    if (!list) return;

    list.innerHTML = "<li class='p-3 text-gray-500'>Loading members...</li>";

    try {
        const snapshot = await getDocs(collection(db, "members"));
        list.innerHTML = "";

        if (snapshot.empty) {
            list.innerHTML = "<li class='p-3 text-gray-500'>No members found</li>";
            return;
        }

        snapshot.forEach(doc => {
            const member = doc.data();
            const listItem = createMemberListItem(member, doc.id);
            list.appendChild(listItem);
        });
    } catch (error) {
        showError(error, "Fetch members error");
        list.innerHTML = "<li class='p-3 text-red-500'>Error loading members</li>";
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

    const buttons = [
        ["Delete", "red", () => deleteMember(memberId)],
        ["Bill", "blue", () => showBillForm(memberId)],
        ["Diet", "green", () => showDietForm(memberId)]
    ].map(([text, color, onClick]) => createButton(text, color, onClick));

    buttonGroup.append(...buttons);
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

// Bill and Diet functions
async function generateBill() {
    const amountInput = document.getElementById("billAmount");
    const amount = parseFloat(amountInput?.value.trim());

    if (!selectedMemberId || !amount || amount <= 0) {
        alert("Please enter a valid amount");
        return;
    }

    const submitBtn = document.getElementById("submitBill");
    setLoading(submitBtn, true);

    try {
        await addDoc(collection(db, "members", selectedMemberId, "bills"), {
            amount,
            date: serverTimestamp(),
            status: "pending"
        });
        
        amountInput.value = "";
        elements.billForm?.classList.add("hidden");
        alert("Bill generated successfully!");
    } catch (error) {
        showError(error, "Billing error");
    } finally {
        setLoading(submitBtn, false);
    }
}

// Event listeners
document.addEventListener('DOMContentLoaded', () => {
    elements.addMemberBtn?.addEventListener("click", addMember);
    elements.logoutBtn?.addEventListener("click", async () => {
        try {
            await signOut(auth);
            window.location.href = "../login/index.html";
        } catch (error) {
            showError(error, "Logout error");
        }
    });

    document.getElementById("submitBill")?.addEventListener("click", generateBill);
    document.getElementById("closeBillForm")?.addEventListener("click", () => {
        elements.billForm?.classList.add("hidden");
    });

    document.getElementById("submitDiet")?.addEventListener("click", async () => {
        const dietDetails = document.getElementById("dietDetails")?.value.trim();
        const memberId = elements.dietForm?.dataset.memberId;

        if (!memberId || !dietDetails) {
            alert("Please enter diet details");
            return;
        }

        const submitBtn = document.getElementById("submitDiet");
        setLoading(submitBtn, true);

        try {
            await addDoc(collection(db, "members", memberId, "diet"), {
                details: dietDetails,
                date: serverTimestamp()
            });

            elements.dietForm?.classList.add("hidden");
            alert("Diet plan assigned successfully!");
        } catch (error) {
            showError(error, "Diet plan error");
        } finally {
            setLoading(submitBtn, false);
        }
    });
});