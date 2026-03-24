// Auto-Login Check
window.onload = () => {
  const token = localStorage.getItem("dropzone_jwt");
  if (token) {
    document.getElementById("login-section").classList.add("hidden");
    document.getElementById("dashboard-section").classList.remove("hidden");
    fetchFiles();
  }
};

async function handleLogin() {
  const password = document.getElementById("password-input").value;
  const response = await fetch("/api/v1/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password: password }),
  });

  if (response.ok) {
    const data = await response.json();
    localStorage.setItem("dropzone_jwt", data.token);
    document.getElementById("login-section").classList.add("hidden");
    document.getElementById("dashboard-section").classList.remove("hidden");
    document.getElementById("login-error").classList.add("hidden");
    fetchFiles();
  } else {
    document.getElementById("login-error").classList.remove("hidden");
  }
}

function logout() {
  localStorage.removeItem("dropzone_jwt");
  window.location.reload();
}

async function fetchFiles() {
  const token = localStorage.getItem("dropzone_jwt");
  const response = await fetch("/api/v1/files", {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (response.ok) {
    const files = await response.json();
    renderTable(files);
  } else if (response.status === 401) {
    logout();
  }
}

function renderTable(files) {
  const tbody = document.getElementById("files-table-body");
  tbody.innerHTML = "";

  if (files.length === 0) {
    tbody.innerHTML =
      '<tr><td colspan="3" class="p-3 text-center text-gray-500">No active files.</td></tr>';
    return;
  }

  files.forEach((file) => {
    let expiresText = '<span class="text-green-400">Indefinite</span>';
    if (file.expires_at) {
      const d = new Date(file.expires_at);
      expiresText = d.toLocaleString("en-GB", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      });
    }

    const descText = file.description
      ? file.description
      : '<em class="text-gray-600">No description</em>';

    const row = `
            <tr class="border-b border-gray-700 hover:bg-gray-750">
                <td class="p-3">
                    <a href="/api/v1/files/${file.id}" target="_blank" class="text-blue-300 hover:underline font-bold">${file.original_filename}</a>
                    <div class="text-sm text-gray-400 mt-1">${descText}</div>
                </td>
                <td class="p-3 text-gray-300">${expiresText}</td>
                <td class="p-3 text-right space-x-3">
                    <button onclick="editFile('${file.id}')" class="text-yellow-400 hover:text-yellow-300 font-bold transition">Edit</button>
                    <button onclick="deleteFile('${file.id}')" class="text-red-400 hover:text-red-300 font-bold transition">Delete</button>
                </td>
            </tr>
        `;
    tbody.innerHTML += row;
  });
}

async function handleUpload(event) {
  event.preventDefault();
  const fileInput = document.getElementById("file-input").files[0];
  const descInput = document.getElementById("desc-input").value;
  const expiresInput = document.getElementById("expires-input").value;
  const token = localStorage.getItem("dropzone_jwt");

  const formData = new FormData();
  formData.append("file", fileInput);
  if (descInput) formData.append("description", descInput);

  // JS converts the calendar date to a UTC ISO string for Python
  if (expiresInput)
    formData.append("expires_at", new Date(expiresInput).toISOString());

  const response = await fetch("/api/v1/files", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  });

  if (response.ok) {
    document.getElementById("upload-form").reset();
    fetchFiles();
  } else {
    const err = await response.json();
    alert("Upload failed: " + JSON.stringify(err));
  }
}

async function deleteFile(fileId) {
  if (!confirm("Are you sure you want to delete this file?")) return;
  const token = localStorage.getItem("dropzone_jwt");
  const response = await fetch(`/api/v1/files/${fileId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });

  if (response.ok) fetchFiles();
  else alert("Failed to delete file.");
}

// Simple JS popup to handle the Edit PATCH route
async function editFile(fileId) {
  // 1. Ask for new description (Optional)
  const newDesc = prompt(
    "Enter new description (Leave blank to keep current):",
  );
  if (newDesc === null) return; // User clicked 'Cancel'

  // 2. Ask for new expiration date (Optional)
  const newExpires = prompt(
    "Enter new expiration date (Format: YYYY-MM-DD HH:MM). Leave blank to keep current, or type '0' to make indefinite:",
  );
  if (newExpires === null) return; // User clicked 'Cancel'

  // 3. Build the JSON payload dynamically
  const payload = {};

  // Only add description if they typed something new
  if (newDesc.trim() !== "") {
    payload.description = newDesc;
  }

  // Handle the Expiration Date logic
  if (newExpires.trim() !== "") {
    if (newExpires.trim() === "0") {
      payload.expires_at = null; // Tell Python to remove the expiration
    } else {
      // Convert their typed string into a proper ISO UTC string for Python
      try {
        const localDate = new Date(newExpires);
        if (isNaN(localDate.getTime())) throw new Error("Invalid date");
        payload.expires_at = localDate.toISOString();
      } catch (e) {
        alert("Invalid date format. Please use YYYY-MM-DD HH:MM");
        return;
      }
    }
  }

  // 4. If they didn't change anything, don't bother the server
  if (Object.keys(payload).length === 0) {
    return;
  }

  // 5. Send the PATCH request to Python
  const token = localStorage.getItem("dropzone_jwt");
  try {
    const response = await fetch(`/api/v1/files/${fileId}`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (response.ok) {
      fetchFiles(); // Refresh the table to show the new data!
    } else {
      const err = await response.json();
      alert("Edit failed: " + JSON.stringify(err));
    }
  } catch (error) {
    console.error("Network error during edit:", error);
  }
}
