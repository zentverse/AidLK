const API_BASE = ""; // same origin

const statTotal = document.getElementById("stat-total");
const statPending = document.getElementById("stat-pending");
const statPartial = document.getElementById("stat-partial");
const statCompleted = document.getElementById("stat-completed");
const topItemsList = document.getElementById("top-items-list");
const topLocationsList = document.getElementById("top-locations-list");

async function loadDashboard() {
    try {
        const res = await fetch(`${API_BASE}/api/get_dashboard_stats`);
        const data = await res.json();

        if (!res.ok || !data.success) {
            throw new Error(data.error || "Failed to load dashboard");
        }

        const summary = data.summary || {};
        statTotal.textContent = summary.total ?? "0";
        statPending.textContent = summary.pending ?? "0";
        statPartial.textContent = summary.partial ?? "0";
        statCompleted.textContent = summary.completed ?? "0";

        topItemsList.innerHTML = "";
        (data.top_items || []).forEach((item) => {
            const li = document.createElement("li");
            li.textContent = `${item.item} – remaining ${item.remaining}`;
            topItemsList.appendChild(li);
        });

        topLocationsList.innerHTML = "";
        (data.top_locations || []).forEach((loc) => {
            const li = document.createElement("li");
            li.textContent = `${loc.location} – remaining ${loc.remaining}`;
            topLocationsList.appendChild(li);
        });
    } catch (err) {
        statTotal.textContent = "Err";
        console.error(err);
    }
}

loadDashboard();
