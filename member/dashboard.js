import { db, auth } from "../firebase.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.1.0/firebase-auth.js";
import { getDoc, doc, collection, getDocs, query, where,onSnapshot,orderBy } from "https://www.gstatic.com/firebasejs/10.1.0/firebase-firestore.js";

// Enhanced auth state handler
onAuthStateChanged(auth, async (user) => {
    if (!user) {
        window.location.href = "../member/index.html";
        return;
    }

    console.log("Authenticated user UID:", user.uid); // Debug log

    try {
        const userDocRef = doc(db, "members", user.uid);
        const userDoc = await getDoc(userDocRef);

        console.log("Firestore document snapshot:", userDoc.exists()); // Debug log

        if (userDoc.exists()) {
            initializeDashboard(userDoc.data());
        } else {
            console.error("Document path:", userDocRef.path); // Show full document path
            handleMissingDocument(user);
        }
    } catch (error) {
        console.error("Error details:", error);
        alert(`Error: ${error.message}`);
        await signOut(auth);
        window.location.href = "../login/index.html";
    }
});
//fetching notifications
const notificationList = document.getElementById("notificationList");

// Real-time listener for notifications
const q = query(collection(db, "notifications"), orderBy("timestamp", "desc"));
onSnapshot(q, (snapshot) => {
    notificationList.innerHTML = ""; // Clear previous notifications
    snapshot.forEach((doc) => {
        const notification = doc.data();
        
        // Create list item container
        const listItem = document.createElement("li");
        listItem.className = "bg-white shadow-md p-4 rounded-lg mb-3 flex items-center border-l-4 border-blue-500";
        
        // Create message text
        const messageText = document.createElement("span");
        messageText.className = "text-gray-800 font-medium";
        messageText.textContent = notification.message;
    
        // Append elements
        listItem.appendChild(messageText);
        notificationList.appendChild(listItem);
    });
});
//fetching diet details
async function fetchMemberDiet() {
    const dietList = document.getElementById("dietList");
    if (!dietList) return;

    dietList.innerHTML = "Loading...";

    onAuthStateChanged(auth, async (user) => {
        if (!user) {
            dietList.innerHTML = "Not logged in.";
            return;
        }

        try {
            const dietCollection = collection(db, "members", user.uid, "diet");
            const dietSnapshot = await getDocs(dietCollection);
            
            dietList.innerHTML = ""; // Clear previous data

            if (dietSnapshot.empty) {
                dietList.innerHTML = "<p>No diet assigned.</p>";
                return;
            }

            dietSnapshot.forEach((dietDoc) => {
                const dietData = dietDoc.data();
                dietList.innerHTML += `
                    <li class="p-2 bg-gray-200 rounded mb-2">
                        <strong>Meal:</strong> ${dietData.details || "N/A"} <br>
                        <strong>Date:</strong> ${new Date(dietData.date).toLocaleDateString()}
                    </li>`;
            });

        } catch (error) {
            dietList.innerHTML = "Error fetching diet details.";
            console.error("Diet fetch error:", error);
        }
    });
}
// Enhanced initialization
async function initializeDashboard(userData) {
    console.log("Initializing dashboard for:", userData);
    
    const memberName = document.getElementById("memberName");
    if (memberName) {
        memberName.textContent = userData.name || "Member";
    }

    try {
        const bills = await fetchBills(userData.uid);
        renderBills(bills);
    } catch (error) {
        console.error("Bills fetch error:", error);
        alert("Failed to load bills");
    }
}

// Improved bills fetching
async function fetchBills(uid) {
    try {
        const billsRef = collection(db, "members", uid, "bills");
        const q = query(billsRef, where("status", "==", "pending"));
        const querySnapshot = await getDocs(q);
        
        return querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
    } catch (error) {
        console.error("Bills query error:", error);
        throw new Error("Failed to fetch bills");
    }
}

// Better rendering
function renderBills(bills) {
    const billsList = document.getElementById("billsList");
    if (!billsList) return;

    billsList.innerHTML = bills.length > 0 
    ? bills.map(bill => `
        <li class="bill-item mb-4 p-6 bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow">
            <div class="flex items-center justify-between">
                <div class="flex items-center space-x-4">
                    <div class="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center">
                        <i class="fas fa-receipt text-blue-600 text-xl"></i>
                    </div>
                    <div>
                        <h3 class="text-lg font-semibold text-gray-800">
                            $${(bill.amount || 0).toFixed(2)}
                        </h3>
                        <div class="flex items-center space-x-2 text-sm text-gray-500">
                            <i class="fas fa-calendar-day"></i>
                            <span>${new Date(bill.date).toLocaleDateString('en-US', { 
                                year: 'numeric', 
                                month: 'short', 
                                day: 'numeric' 
                            })}</span>
                        </div>
                    </div>
                </div>
                <span class="px-3 py-1 rounded-full text-sm font-medium ${
                    bill.status === 'paid' 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-red-100 text-red-800'
                }">
                    <i class="fas ${
                        bill.status === 'paid' 
                        ? 'fa-check-circle' 
                        : 'fa-exclamation-triangle'
                    } mr-2"></i>
                    ${bill.status.charAt(0).toUpperCase() + bill.status.slice(1)}
                </span>
            </div>
        </li>
    `).join('')
    : `<li class="text-center py-8">
        <div class="max-w-md mx-auto">
            <div class="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <i class="fas fa-check text-green-600 text-2xl"></i>
            </div>
            <h4 class="text-gray-500 font-medium">All clear! No pending bills</h4>
            <p class="text-gray-400 text-sm mt-1">Your payments are up to date</p>
        </div>
    </li>`;
}

// Enhanced error handling
async function handleMissingDocument(user) {
    console.warn("Document missing for UID:", user.uid);
    
    // Add temporary logout to prevent infinite loop
    await signOut(auth);
    alert("Account configuration error - please contact support");
    window.location.href = "../login/index.html";
}

// Safe logout handler
document.getElementById("logoutBtn")?.addEventListener("click", async () => {
    try {
        await signOut(auth);
        window.location.href = "../login/index.html";
    } catch (error) {
        console.error("Logout failed:", error);
        alert("Logout failed - please try again");
    }
});
fetchMemberDiet();