async function handleLogin() {
  const passwordInput = document.getElementById("password-input").value;
  const loginSection = document.getElementById("login-section");
  const dashboardSection = document.getElementById("dashboard-section");
  const errorText = document.getElementById("login-error");

  try {
    const response = await fetch("/api/v1/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ password: passwordInput }),
    });

    const data = await response.json();

    if (response.ok) {
      localStorage.setItem("dropzone_jwt", data.token);

      loginSection.classList.add("hidden");
      dashboardSection.classList.remove("hidden");
      errorText.classList.add("hidden");

      console.log("Logged in successfully!");
      fetchFiles();
    } else {
      errorText.classList.remove("hidden");
    }
  } catch (error) {
    console.error("Network error:", error);
  }
}

// 1. Fetch the files from your API
async function fetchFiles() {
  // Get the JWT from the browser's memory
  const token = localStorage.getItem("dropzone_jwt");
  if (!token) return;

  // Call your GET /api/v1/files route
  const response = await fetch("/api/v1/files", {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (response.ok) {
    const files = await response.json();
    renderTable(files); // Pass the JSON to the UI renderer
  } else if (response.status === 401) {
    logout(); // Token expired! Kick them out.
  }
}

// 2. Build the HTML rows dynamically
function renderTable(files) {
  const tbody = document.getElementById("files-table-body");
  tbody.innerHTML = ""; // Clear old data

  if (files.length === 0) {
    tbody.innerHTML =
      '<tr><td colspan="4" class="p-3 text-center text-gray-500">No active files.</td></tr>';
    return;
  }

  files.forEach((file) => {
    // If expires_at is null, say "Indefinite", otherwise format the date
    const expiresText = file.expires_at
      ? new Date(file.expires_at).toLocaleString()
      : "Indefinite";

    // Build the row string
    const row = `
                    <tr class="border-b border-gray-700 hover:bg-gray-750">
                        <td class="p-3 text-blue-300">
                            <a href="/api/v1/files/${file.id}" target="_blank" class="hover:underline">${file.original_filename}</a>
                        </td>
                        <td class="p-3 text-gray-300">${expiresText}</td>
                        <td class="p-3 text-gray-400">${file.download_count}</td>
                        <td class="p-3 text-right">
                            <button onclick="deleteFile('${file.id}')" class="text-red-400 hover:text-red-300 font-bold transition">Delete</button>
                        </td>
                    </tr>
                `;
    tbody.innerHTML += row; // Inject the row into the table
  });
}

async function handleUpload(event) {
  event.preventDefault(); // Stop the browser from refreshing the page

  const fileInput = document.getElementById("file-input").files[0];
  const hoursInput = document.getElementById("hours-input").value;
  const token = localStorage.getItem("dropzone_jwt");

  // Build the multipart/form-data payload
  const formData = new FormData();
  formData.append("file", fileInput);
  if (hoursInput) {
    formData.append("expires_in_hours", hoursInput);
  }

  const response = await fetch("/api/v1/files", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: formData, // DO NOT set Content-Type header manually here!
  });

  if (response.ok) {
    document.getElementById("upload-form").reset(); // Clear the form
    fetchFiles(); // Refresh the table instantly!
  } else {
    const errorData = await response.json();
    alert("Upload failed: " + JSON.stringify(errorData));
  }
}

// 3. Call your DELETE route
async function deleteFile(fileId) {
  if (!confirm("Are you sure you want to delete this file?")) return;

  const token = localStorage.getItem("dropzone_jwt");
  const response = await fetch(`/api/v1/files/${fileId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });

  if (response.ok) {
    fetchFiles(); // Refresh the table
  } else {
    const errorData = await response.json();
    alert("Failed to delete file: " + JSON.stringify(errorData));
  }
}

// 4. Logout (Destroy the stateless token!)
function logout() {
  localStorage.removeItem("dropzone_jwt");
  window.location.reload(); // Refresh the page to show login screen
}
window.onload = () => {
  const token = localStorage.getItem("dropzone_jwt");
  if (token) {
    // Hide login, show dashboard
    document.getElementById("login-section").classList.add("hidden");
    document.getElementById("dashboard-section").classList.remove("hidden");
    fetchFiles(); // Load the table
  }
};
