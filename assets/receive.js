const API_BASE = ""; // same origin, so "" is fine on Vercel

// Tabs
const tabRequest = document.getElementById("tab-request");
const tabUpdate = document.getElementById("tab-update");
const requestSection = document.getElementById("request-section");
const updateSection = document.getElementById("update-section");

tabRequest.addEventListener("click", () => {
    tabRequest.classList.add("active");
    tabUpdate.classList.remove("active");
    requestSection.classList.remove("hidden");
    updateSection.classList.add("hidden");
});

tabUpdate.addEventListener("click", () => {
    tabUpdate.classList.add("active");
    tabRequest.classList.remove("active");
    updateSection.classList.remove("hidden");
    requestSection.classList.add("hidden");
});

// Request Aid logic
const itemsContainer = document.getElementById("items-container");
const addItemBtn = document.getElementById("add-item-btn");
const submitRequestBtn = document.getElementById("submit-request-btn");
const nicInput = document.getElementById("nic-input");
const phoneInput = document.getElementById("phone-input");
const locationSelect = document.getElementById("location-select");
const requestMessage = document.getElementById("request-message");

function createItemRow() {
    const row = document.createElement("div");
    row.className = "item-row";

    const categorySelect = document.createElement("select");
    categorySelect.innerHTML = `
    <option value="">Category</option>
    <option value="Food">Food</option>
    <option value="Medicine">Medicine</option>
    <option value="Clothes">Clothes</option>
    <option value="Hygiene">Hygiene</option>
    <option value="Other">Other</option>
  `;

    const itemInput = document.createElement("input");
    itemInput.type = "text";
    itemInput.placeholder = "Item (e.g. Rice)";

    const qtyInput = document.createElement("input");
    qtyInput.type = "number";
    qtyInput.min = "1";
    qtyInput.placeholder = "Qty";

    const removeBtn = document.createElement("button");
    removeBtn.textContent = "×";
    removeBtn.addEventListener("click", () => row.remove());

    row.appendChild(categorySelect);
    row.appendChild(itemInput);
    row.appendChild(qtyInput);
    row.appendChild(removeBtn);

    return row;
}

// Start with one row
itemsContainer.appendChild(createItemRow());

addItemBtn.addEventListener("click", () => {
    itemsContainer.appendChild(createItemRow());
});

async function submitRequest() {
    requestMessage.textContent = "";
    requestMessage.className = "message";

    const nic = nicInput.value.trim();
    const phone = phoneInput.value.trim();
    const location = locationSelect.value;

    if (!nic || !location) {
        requestMessage.textContent = "NIC and location are required.";
        requestMessage.classList.add("error");
        return;
    }

    const items = [];
    const rows = itemsContainer.querySelectorAll(".item-row");
    rows.forEach((row) => {
        const [catEl, itemEl, qtyEl] = row.querySelectorAll("select, input");
        const category = catEl.value;
        const item = itemEl.value.trim();
        const quantity = parseInt(qtyEl.value, 10);

        if (category && item && quantity > 0) {
            items.push({ category, item, quantity });
        }
    });

    if (items.length === 0) {
        requestMessage.textContent = "Please add at least one valid item.";
        requestMessage.classList.add("error");
        return;
    }

    submitRequestBtn.disabled = true;
    submitRequestBtn.textContent = "Submitting...";

    try {
        const res = await fetch(`${API_BASE}/api/create_request`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ nic, phone, location, items }),
        });

        const data = await res.json();
        if (!res.ok || !data.success) {
            throw new Error(data.error || "Failed to submit request");
        }

        requestMessage.textContent = "Request submitted successfully.";
        requestMessage.classList.add("success");

        // Clear items
        itemsContainer.innerHTML = "";
        itemsContainer.appendChild(createItemRow());
    } catch (err) {
        requestMessage.textContent = err.message;
        requestMessage.classList.add("error");
    } finally {
        submitRequestBtn.disabled = false;
        submitRequestBtn.textContent = "Submit Request";
    }
}

submitRequestBtn.addEventListener("click", submitRequest);

// Update status logic
const updateNicInput = document.getElementById("update-nic-input");
const fetchRequestsBtn = document.getElementById("fetch-requests-btn");
const updateMessage = document.getElementById("update-message");
const requestsList = document.getElementById("requests-list");

async function fetchRequests() {
    updateMessage.textContent = "";
    updateMessage.className = "message";
    requestsList.innerHTML = "";

    const nic = updateNicInput.value.trim();
    if (!nic) {
        updateMessage.textContent = "Please enter NIC.";
        updateMessage.classList.add("error");
        return;
    }

    fetchRequestsBtn.disabled = true;
    fetchRequestsBtn.textContent = "Loading...";

    try {
        const res = await fetch(`${API_BASE}/api/get_requests_by_nic?nic=${encodeURIComponent(nic)}`);
        const data = await res.json();

        if (!res.ok || !data.success) {
            throw new Error(data.error || "Failed to fetch requests");
        }

        const list = data.requests || [];
        if (list.length === 0) {
            updateMessage.textContent = "No requests found for this NIC.";
            updateMessage.classList.add("error");
            return;
        }

        list.forEach(renderRequestCard);
    } catch (err) {
        updateMessage.textContent = err.message;
        updateMessage.classList.add("error");
    } finally {
        fetchRequestsBtn.disabled = false;
        fetchRequestsBtn.textContent = "Find My Requests";
    }
}

function renderRequestCard(request) {
    const card = document.createElement("div");
    card.className = "request-card";

    const title = document.createElement("h3");
    title.textContent = `${request.category} – ${request.item}`;
    card.appendChild(title);

    const p1 = document.createElement("p");
    p1.textContent = `Requested: ${request.quantity_requested}`;
    card.appendChild(p1);

    const p2 = document.createElement("p");
    p2.textContent = `Received: ${request.quantity_received}`;
    card.appendChild(p2);

    const p3 = document.createElement("p");
    p3.textContent = `Status: ${request.status}`;
    card.appendChild(p3);

    const input = document.createElement("input");
    input.type = "number";
    input.min = "0";
    input.max = request.quantity_requested;
    input.value = request.quantity_received;
    card.appendChild(input);

    const btn = document.createElement("button");
    btn.className = "btn secondary";
    btn.textContent = "Mark Received";
    btn.addEventListener("click", () => updateReceived(request.id, input));
    card.appendChild(btn);

    requestsList.appendChild(card);
}

async function updateReceived(id, inputEl) {
    const value = parseInt(inputEl.value, 10);
    if (Number.isNaN(value) || value < 0) {
        alert("Please enter a valid received quantity.");
        return;
    }

    try {
        const res = await fetch(`${API_BASE}/api/update_request_status`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id, quantity_received: value }),
        });
        const data = await res.json();
        if (!res.ok || !data.success) {
            throw new Error(data.error || "Update failed");
        }
        fetchRequests(); // refresh list
    } catch (err) {
        alert(err.message);
    }
}

fetchRequestsBtn.addEventListener("click", fetchRequests);
