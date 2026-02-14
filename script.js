import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getDatabase, ref, onValue, push, remove, set } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

// KONFIGURACJA FIREBASE - PODMIEŃ NA SWOJĄ
const firebaseConfig = {
    apiKey: "TWÓJ_KLUCZ",
    authDomain: "TWOJA_DOMENA",
    databaseURL: "TWÓJ_URL_BAZY",
    projectId: "TWÓJ_ID",
    storageBucket: "TWÓJ_BUCKET",
    messagingSenderId: "ID_MESSAGING",
    appId: "TWÓJ_APP_ID"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

let allItems = {};
let isAdmin = false;

// Elementy DOM
const itemsContainer = document.getElementById('items-container');
const logoutBtn = document.getElementById('logout-button');
const loginModal = document.getElementById('login-modal');
const addItemModal = document.getElementById('add-item-modal');
const itemDetailModal = document.getElementById('item-detail-modal');

// Funkcja wyświetlania kart
function renderGallery() {
    itemsContainer.innerHTML = '';

    // Karta dodawania dla admina
    if (isAdmin) {
        const addCard = document.createElement('div');
        addCard.className = 'add-item-card';
        addCard.innerHTML = '+';
        addCard.onclick = () => {
            document.getElementById('modal-title').innerText = "Dodaj Sellera";
            showModal(addItemModal);
        };
        itemsContainer.appendChild(addCard);
    }

    // Wyświetlanie sellerów
    Object.entries(allItems).reverse().forEach(([key, item]) => {
        const card = document.createElement('div');
        card.className = 'item-card';
        card.innerHTML = `
            <div class="item-image-wrapper">
                <img src="${item.image || 'https://via.placeholder.com/400'}" alt="${item.name}">
            </div>
            <div class="item-info">
                <h3 class="item-title">${item.name}</h3>
                <div class="item-price">${item.price} ¥</div>
                <button class="btn item-buy-button">Szczegóły / Kup</button>
                ${isAdmin ? `<button class="btn" style="background:red; width:100%; margin-top:10px;" onclick="deleteItem('${key}')">Usuń</button>` : ''}
            </div>
        `;
        card.onclick = (e) => {
            if (e.target.tagName !== 'BUTTON') openDetails(item);
        };
        // Obsługa przycisku "Szczegóły"
        card.querySelector('.item-buy-button').onclick = (e) => {
            e.stopPropagation();
            openDetails(item);
        };
        itemsContainer.appendChild(card);
    });
}

// Funkcja otwierania szczegółów
function openDetails(item) {
    document.getElementById('detail-image').src = item.image;
    document.getElementById('detail-name').innerText = item.name;
    document.getElementById('detail-desc').innerText = item.description || 'Brak opisu.';
    document.getElementById('detail-price-val').innerText = item.price;
    document.getElementById('detail-buy-link').href = item.link;
    showModal(itemDetailModal);
}

// Admin: Usuwanie
window.deleteItem = (key) => {
    if (confirm("Na pewno usunąć tego sellera?")) {
        remove(ref(db, `items/${key}`));
    }
};

// Obsługa zapisu nowego sellera
document.getElementById('save-item-btn').onclick = () => {
    const newItem = {
        name: document.getElementById('add-name').value,
        link: document.getElementById('add-link').value,
        image: document.getElementById('add-image').value,
        price: document.getElementById('add-price').value,
        description: document.getElementById('add-desc').value,
        createdAt: new Date().toISOString()
    };

    if (newItem.name && newItem.link) {
        push(ref(db, "items"), newItem);
        hideModal(addItemModal);
        // Czyścimy formularz
        document.querySelectorAll('#add-item-modal input, #add-item-modal textarea').forEach(i => i.value = '');
    } else {
        alert("Podaj przynajmniej nazwę i link!");
    }
};

// Funkcje Modalów
function showModal(m) { m.classList.add('show'); }
function hideModal(m) { m.classList.remove('show'); }
document.getElementById('close-add-modal').onclick = () => hideModal(addItemModal);
document.getElementById('detail-close-x').onclick = () => hideModal(itemDetailModal);

// System Logowania (Sekretny kod: kkoollkk wpisane 3 razy)
let inputSequence = '';
window.addEventListener('keydown', (e) => {
    inputSequence = (inputSequence + e.key).slice(-8);
    if (inputSequence === 'kkoollkk') {
        showModal(loginModal);
        inputSequence = '';
    }
});

document.getElementById('login-confirm-btn').onclick = () => {
    const pass = document.getElementById('admin-password').value;
    if (pass === 'TWOJE_HASLO') { // Ustaw swoje hasło
        isAdmin = true;
        logoutBtn.style.display = 'block';
        hideModal(loginModal);
        renderGallery();
    } else {
        alert("Błędne hasło!");
    }
};

logoutBtn.onclick = () => {
    isAdmin = false;
    logoutBtn.style.display = 'none';
    renderGallery();
};

// Nasłuchiwanie Bazy
onValue(ref(db, "items"), (snapshot) => {
    allItems = snapshot.val() || {};
    renderGallery();
    document.body.classList.remove('loading');
});
