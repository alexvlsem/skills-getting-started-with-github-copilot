document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");

  // Helper to escape HTML content
  function escapeHTML(str) {
    return String(str).replace(/[&<>"']/g, (m) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m])
    );
  }

  // Format an email into a nicer name (e.g., "jane.doe@example.com" -> "Jane Doe")
  function formatName(email) {
    if (!email) return "";
    const local = String(email).split("@")[0];
    const parts = local.split(/[._-]/).filter(Boolean);
    return parts.map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(" ");
  }

  // Function to fetch activities from API
  async function fetchActivities() {
    try {
      const response = await fetch("/activities");
      const activities = await response.json();

      // Clear loading message and reset activity select
      activitiesList.innerHTML = "";
      activitySelect.innerHTML = '<option value="">-- Select an activity --</option>';

      // Populate activities list
      Object.entries(activities).forEach(([name, details]) => {
        const activityCard = document.createElement("div");
        activityCard.className = "activity-card";

        const participants = Array.isArray(details.participants) ? details.participants : [];
        const spotsLeft = details.max_participants - participants.length;

        // Build participants section HTML
        const participantsHTML = participants.length
          ? `<div class="participants"><h5>Participants</h5><ul class="participant-list">` +
              participants.map(email => `
                <li data-email="${escapeHTML(email)}">
                  <span class="participant-name">${escapeHTML(formatName(email))}</span>
                  <button class="participant-delete" aria-label="Remove ${escapeHTML(formatName(email))}">✕</button>
                </li>
              `).join("") +
            `</ul></div>`
          : `<div class="participants"><h5>Participants</h5><p class="no-participants">No participants yet</p></div>`;

        activityCard.innerHTML = `
          <h4>${escapeHTML(name)}</h4>
          <p>${escapeHTML(details.description)}</p>
          <p><strong>Schedule:</strong> ${escapeHTML(details.schedule)}</p>
          <p><strong>Availability:</strong> ${escapeHTML(String(spotsLeft))} spots left</p>
          ${participantsHTML}
        `;

        activitiesList.appendChild(activityCard);

        // Attach delete handlers for participants in this card
        const deleteButtons = activityCard.querySelectorAll('.participant-delete');
        deleteButtons.forEach(btn => {
          btn.addEventListener('click', async (e) => {
            const li = btn.closest('li');
            if (!li) return;
            const email = li.dataset.email;
            if (!email) return;

            try {
              const resp = await fetch(`/activities/${encodeURIComponent(name)}/unregister?email=${encodeURIComponent(email)}`, { method: 'POST' });
              const resJson = await resp.json();

              if (resp.ok) {
                // Refresh the activities list to reflect change
                fetchActivities();
                messageDiv.textContent = resJson.message || 'Participant removed';
                messageDiv.className = 'info';
              } else {
                messageDiv.textContent = resJson.detail || 'Failed to remove participant';
                messageDiv.className = 'error';
              }
            } catch (err) {
              console.error('Error unregistering participant:', err);
              messageDiv.textContent = 'Failed to remove participant. Please try again.';
              messageDiv.className = 'error';
            }

            messageDiv.classList.remove('hidden');
            setTimeout(() => messageDiv.classList.add('hidden'), 4000);
          });
        });

        // Add option to select dropdown
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        activitySelect.appendChild(option);
      });
    } catch (error) {
      activitiesList.innerHTML = "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
    }
  }

  // Handle form submission
  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("email").value;
    const activity = document.getElementById("activity").value;

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(activity)}/signup?email=${encodeURIComponent(email)}`,
        {
          method: "POST",
        }
      );

      const result = await response.json();

      if (response.ok) {
        messageDiv.textContent = result.message;
        messageDiv.className = "success";
        signupForm.reset();
      } else {
        messageDiv.textContent = result.detail || "An error occurred";
        messageDiv.className = "error";
      }

      messageDiv.classList.remove("hidden");

      // Hide message after 5 seconds
      setTimeout(() => {
        messageDiv.classList.add("hidden");
      }, 5000);
    } catch (error) {
      messageDiv.textContent = "Failed to sign up. Please try again.";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      console.error("Error signing up:", error);
    }
  });

  // Initialize app
  fetchActivities();
});
