// Check if token is present and login
window.onload = () => {
  const token = localStorage.getItem("dropzone_jwt");
  if (token) {
    document.getElementById("login-section").classList.add("hidden");
    document.getElementById("dashboard-section").classList.remove("hidden");
    fetchFiles();
  }
};

// Func to login admin
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

// Func to logout duh
function logout() {
  localStorage.removeItem("dropzone_jwt");
  window.location.reload();
}

// Func to get files from API
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

// FUNC to render files table
function renderTable(files) {
  const tbody = document.getElementById("files-table-body");
  tbody.innerHTML = "";

  if (files.length === 0) {
    tbody.innerHTML =
      '<tr><td colspan="2" class="p-3 text-center text-gray-500">No active files.</td></tr>';
    return;
  }

  files.forEach((file) => {
    const descText = file.description
      ? file.description
      : '<em class="text-gray-600">No description</em>';

    const row = `
            <tr class="border-b border-gray-700 hover:bg-gray-750">
                <td class="p-3">
                    <a href="/api/v1/files/${file.id}" target="_blank" class="text-blue-300 hover:underline font-bold">${file.original_filename}</a>
                    <div class="text-sm text-gray-400 mt-1">${descText}</div>
                </td>
                <td class="p-3 text-right space-x-3">
                    <button onclick="editFile('${file.id}')" class="text-yellow-400 hover:text-yellow-300 font-bold transition">Edit</button>
                    <button onclick="copyLink('${file.id}')" class="text-green-400 hover:text-green-300 font-bold transition">Copy Link</button>
                    <button onclick="deleteFile('${file.id}')" class="text-red-400 hover:text-red-300 font-bold transition">Delete</button>
                </td>
            </tr>
        `;
    tbody.innerHTML += row;
  });
}

// FUNC to edit file
async function editFile(fileId) {
  const newDesc = prompt(
    "Enter new description (Leave blank to keep current):",
  );
  if (newDesc === null) return;

  const payload = {};

  if (newDesc.trim() !== "") {
    payload.description = newDesc;
  }

  if (Object.keys(payload).length === 0) {
    return;
  }

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
      fetchFiles();
    } else {
      const err = await response.json();
      alert("Edit failed: " + JSON.stringify(err));
    }
  } catch (error) {
    console.error("Network error during edit:", error);
  }
}

// FUNC to upload file
async function handleUpload(event) {
  event.preventDefault();
  const fileInput = document.getElementById("file-input").files[0];
  const descInput = document.getElementById("desc-input").value;
  const token = localStorage.getItem("dropzone_jwt");

  const formData = new FormData();
  formData.append("file", fileInput);
  if (descInput) formData.append("description", descInput);

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

// FUNC to delete file
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

// FUNC to copy link for download
async function copyLink(fileId) {
  const link = `${window.location.origin}/api/v1/files/${fileId}`;
  try {
    await navigator.clipboard.writeText(link);
    alert("Public download link copied to clipboard!");
  } catch (err) {
    alert("Failed to copy link. Your browser might block clipboard access.");
  }
}
