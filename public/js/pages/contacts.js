import { getContacts, createContact, deleteContact } from '../firestore-contacts.js';

const contactListDiv = document.getElementById("contactList");
const contactForm = document.getElementById("contact-form");
const formError = document.getElementById("formError");
const submitBtn = document.getElementById("submitBtn");

function showError(msg) {
  formError.textContent = msg;
  formError.classList.remove("hidden");
}

function clearError() {
  formError.textContent = "";
  formError.classList.add("hidden");
}

async function renderContacts() {
  contactListDiv.innerHTML = '<p class="text-gray-500">Loading contacts…</p>';

  try {
    const contacts = await getContacts();

    contactListDiv.textContent = "";

    if (contacts.length === 0) {
      const p = document.createElement("p");
      p.className = "text-gray-500";
      p.textContent = "No contacts yet.";
      contactListDiv.appendChild(p);
      return;
    }

    contacts.forEach(c => {
      const row = document.createElement("div");
      row.className = "p-3 border rounded flex justify-between items-center";

      // Info built with DOM methods — no innerHTML, no XSS risk
      const info = document.createElement("div");

      const nameLine = document.createElement("p");
      const nameStrong = document.createElement("strong");
      nameStrong.textContent = c.name;
      nameLine.appendChild(nameStrong);
      nameLine.appendChild(document.createTextNode(` (${c.email})`));

      const phoneLine = document.createElement("p");
      phoneLine.textContent = `📞 ${c.phone}`;

      const propLine = document.createElement("p");
      propLine.textContent = `🏠 ${c.property}`;

      info.appendChild(nameLine);
      info.appendChild(phoneLine);
      info.appendChild(propLine);

      // Delete uses Firestore document ID, not an array index
      const delBtn = document.createElement("button");
      delBtn.className = "bg-red-500 text-white px-3 py-1 rounded";
      delBtn.textContent = "Delete";
      delBtn.addEventListener("click", async () => {
        try {
          await deleteContact(c.id);
          await renderContacts();
        } catch (err) {
          console.error("Error deleting contact:", err);
          alert("Failed to delete contact. Please try again.");
        }
      });

      row.appendChild(info);
      row.appendChild(delBtn);
      contactListDiv.appendChild(row);
    });
  } catch (err) {
    console.error("Error loading contacts:", err);
    contactListDiv.innerHTML = '<p class="text-red-500">Failed to load contacts. Check your connection and try refreshing.</p>';
  }
}

contactForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  clearError();

  const name = document.getElementById("contactName").value.trim();
  const email = document.getElementById("contactEmail").value.trim();
  const phone = document.getElementById("contactPhone").value.trim();
  const property = document.getElementById("contactProperty").value.trim();

  if (!name) { showError("Full Name is required."); return; }
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    showError("A valid email address is required."); return;
  }
  if (!phone) { showError("Phone number is required."); return; }
  if (!property) { showError("Property Address is required."); return; }

  submitBtn.disabled = true;
  submitBtn.textContent = "Saving…";

  try {
    await createContact({ name, email, phone, property });
    contactForm.reset();
    await renderContacts();
  } catch (err) {
    console.error("Error saving contact:", err);
    showError("Failed to save contact. Check your connection and try again.");
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = "Add Contact";
  }
});

renderContacts();
