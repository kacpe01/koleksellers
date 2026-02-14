import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import { getDatabase, ref, onValue, push, set, remove } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-database.js";

async function sha256(message) {
    const msgBuffer = new TextEncoder().encode(message);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

window.sha256 = sha256;

function initializeInteractiveBackground() {
    const canvas = document.getElementById('interactive-background');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    let particlesArray;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    let mouse = {
        x: null,
        y: null,
        radius: (canvas.height / 100) * (canvas.width / 100)
    };

    window.addEventListener('mousemove', (event) => {
        mouse.x = event.x;
        mouse.y = event.y;
    });
    
    window.addEventListener('mouseout', () => {
        mouse.x = undefined;
        mouse.y = undefined;
    });

    class Particle {
        constructor(x, y, directionX, directionY) {
            this.x = x;
            this.y = y;
            this.directionX = directionX;
            this.directionY = directionY;
        }

        update() {
            if (this.x > canvas.width || this.x < 0) this.directionX = -this.directionX;
            if (this.y > canvas.height || this.y < 0) this.directionY = -this.directionY;

            let dx = mouse.x - this.x;
            let dy = mouse.y - this.y;
            let distance = Math.sqrt(dx * dx + dy * dy);
            if (distance < mouse.radius && distance > 0) {
                let forceDirectionX = dx / distance;
                let forceDirectionY = dy / distance;
                let maxDistance = mouse.radius;
                let force = (maxDistance - distance) / maxDistance;
                let directionX = forceDirectionX * force * 1.5;
                let directionY = forceDirectionY * force * 1.5;
                this.x -= directionX;
                this.y -= directionY;
            }

            this.x += this.directionX;
            this.y += this.directionY;
        }
    }

    function init() {
        particlesArray = [];
        let numberOfParticles = (canvas.height * canvas.width) / 9000;
        for (let i = 0; i < numberOfParticles; i++) {
            let x = Math.random() * canvas.width;
            let y = Math.random() * canvas.height;
            let directionX = (Math.random() * 0.4) - 0.2;
            let directionY = (Math.random() * 0.4) - 0.2;
            particlesArray.push(new Particle(x, y, directionX, directionY));
        }
    }

    function connect() {
        const maxDistanceSquared = (canvas.width / 7) * (canvas.height / 7);
        for (let a = 0; a < particlesArray.length; a++) {
            for (let b = a; b < particlesArray.length; b++) {
                let distanceSquared = ((particlesArray[a].x - particlesArray[b].x) ** 2)
                                    + ((particlesArray[a].y - particlesArray[b].y) ** 2);
                
                if (distanceSquared < maxDistanceSquared) {
                    const opacityValue = 1 - (distanceSquared / maxDistanceSquared);
                    if (opacityValue > 0) {
                        ctx.strokeStyle = `rgba(150, 150, 150, ${opacityValue * 0.2})`;
                        ctx.lineWidth = 1;
                        ctx.beginPath();
                        ctx.moveTo(particlesArray[a].x, particlesArray[a].y);
                        ctx.lineTo(particlesArray[b].x, particlesArray[b].y);
                        ctx.stroke();
                    }
                }
            }
        }
    }

    function animate() {
        requestAnimationFrame(animate);
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        for (let i = 0; i < particlesArray.length; i++) {
            particlesArray[i].update();
        }
        connect();
    }

    window.addEventListener('resize', () => {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        mouse.radius = (canvas.height / 100) * (canvas.width / 100);
        init();
    });

    init();
    animate();
}


document.addEventListener('DOMContentLoaded', () => {

    const firebaseConfig = {
      apiKey: "AIzaSyAg9GTk414n9rsx7WAiO3hDhyJjR18-Ctc",
      authDomain: "kolekspreadsheet.firebaseapp.com",
      databaseURL: "https://kolekspreadsheet-default-rtdb.europe-west1.firebasedatabase.app",
      projectId: "kolekspreadsheet",
      storageBucket: "kolekspreadsheet.appspot.com",
      messagingSenderId: "46075782181",
      appId: "1:46075782181:web:50203aabfe824393f0cbcc",
      measurementId: "G-8S0VSF8ZV9"
    };

    try {
        const app = initializeApp(firebaseConfig);
        const db = getDatabase(app);
        console.log("Firebase połączony pomyślnie!");

        initializeInteractiveBackground();

        const ADMIN_USER = "k1ol3ekr4e0p2s";
        const ADMIN_PASS_HASH = "db229651f62067c18457444b93e01805395719e15a96c25b878aca397a7a6ca0";
        
        const CATEGORIES = ["Koszulki", "Bluzy", "Spodnie", "Spodenki", "Buty", "Kurtki", "Longsleeve", "Akcesoria", "Elektronika", "Czapki", "Swetry", "Lego"];
        const TAGS = { 
            isBest: "Best Batch", 
            isBudget: "Budget Batch", 
            isYupoo: "Yupoo", 
            isRandom: "Random Batch" 
        };

        let isAdmin = false, allItems = {};
        let isFirstLoad = true;
        
        const PLN_TO_CNY_RATE = 1.80;
        const THREE_HOURS_IN_MS = 3 * 60 * 60 * 1000;
        
        const mainHeader = document.getElementById('main-header');
        const discordButton = document.getElementById('discord-button'),
              logoutButton = document.getElementById("logout-button");
        const itemsContainer = document.getElementById("items-container");
        const loginModal = document.getElementById("login-modal"), 
              addItemModal = document.getElementById("add-item-modal"), 
              editItemModal = document.getElementById("edit-item-modal"),
              itemDetailModal = document.getElementById('item-detail-modal');

        const detailCloseBtn = document.getElementById('detail-close-btn'),
              detailImage = document.getElementById('detail-image'),
              detailName = document.getElementById('detail-name'),
              detailDesc = document.getElementById('detail-desc'),
              detailTagsCategories = document.getElementById('detail-tags-categories'),
              detailPrice = document.getElementById('detail-price'),
              detailBuyLink = document.getElementById('detail-buy-link');
        function hasPurchaseLink(url) {
            return Boolean(url && url.trim());
        }

        function renderItems(itemsToRender) {
          itemsContainer.innerHTML = "";
          let itemIndex = 0;
          if (isAdmin) {
              const addItemCard = document.createElement('div');
              addItemCard.className = 'add-item-card';
              addItemCard.id = 'add-item-card-btn';
              addItemCard.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>`;
              addItemCard.style.setProperty('--delay', `${itemIndex * 50}ms`);
              itemsContainer.appendChild(addItemCard);
              itemIndex++;
          }
          for (const key in itemsToRender) {
            const item = itemsToRender[key];
            const card = document.createElement("div");
            card.className = "item-card";
            card.dataset.key = key; 
            card.style.setProperty('--delay', `${itemIndex * 50}ms`);
            itemIndex++;
            const priceCNY = item.price ? (item.price * PLN_TO_CNY_RATE).toFixed(2) : '0.00';
            let tagsHTML = '';
            if (item.tags) {
                for (const tagKey in item.tags) {
                    if (item.tags[tagKey] && TAGS[tagKey]) {
                        tagsHTML += `<div class="item-batch-tag">${TAGS[tagKey]}</div>`;
                    }
                }
            }
            let newBadgeHTML = '';
            if (item.createdAt) {
                const itemDate = new Date(item.createdAt);
                const now = new Date();
                if (now - itemDate < THREE_HOURS_IN_MS) {
                    newBadgeHTML = '<div class="item-new-badge">New</div>';
                }
            }
            const adminButtons = isAdmin ? `
                <div class="admin-buttons-container">
                    <button class="admin-button admin-delete-button" data-key="${key}" title="Usuń"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0V6z"/><path fill-rule="evenodd" d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1v1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4H4.118zM2.5 3V2h11v1h-11z"/></svg></button>
                    <button class="admin-button admin-edit-button" data-key="${key}" title="Edytuj"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path d="M15.502 1.94a.5.5 0 0 1 0 .706L14.459 3.69l-2-2L13.502.646a.5.5 0 0 1 .707 0l1.293 1.293zm-1.75 2.456-2-2L4.939 9.21a.5.5 0 0 0-.121.196l-.805 2.414a.25.25 0 0 0 .316.316l2.414-.805a.5.5 0 0 0 .196-.12l6.813-6.814z"/><path fill-rule="evenodd" d="M1 13.5A1.5 1.5 0 0 0 2.5 15h11a1.5 1.5 0 0 0 1.5-1.5v-6a.5.5 0 0 0-1 0v6a.5.5 0 0 1-.5.5h-11a.5.5 0 0 1-.5-.5v-11a.5.5 0 0 1 .5-.5H9a.5.5 0 0 0 0-1H2.5A1.5 1.5 0 0 0 1 2.5v11z"/></svg></button>
                </div>
            ` : '';

            const isPurchaseLinkAvailable = hasPurchaseLink(item.purchaseLink);
            const buyButtonDisabled = !isPurchaseLinkAvailable ? 'disabled' : '';
            
            card.innerHTML = `
                <div class="item-image-wrapper">
                    ${adminButtons}
                    <img src="${item.image || 'https://via.placeholder.com/300'}" alt="${item.name}" loading="lazy">
                </div>
                <div class="item-info">
                    <div class="item-header">
                        <div class="item-title-wrapper">
                           <h3 class="item-title">${item.name || 'Brak nazwy'}</h3>
                           ${newBadgeHTML}
                        </div>
                        ${item.category ? `<div class="item-category-tag">${item.category.toUpperCase()}</div>` : ''}
                    </div>
                    <div class="item-tags-container">${tagsHTML}</div>
                    <div class="item-price-container"><div class="item-price">${item.price ? `${item.price.toFixed(2)} PLN` : ''}</div><div class="item-price-converted">= ${priceCNY} CNY</div></div>
                    <button type="button" class="item-buy-button" ${buyButtonDisabled}>Kup</button>
                </div>
            `;
            itemsContainer.appendChild(card);
          }
        }
        
        const showModal = (modal) => { modal.style.display = "flex"; setTimeout(() => modal.classList.add('show'), 10); };
        
        const hideModal = (modal, callback) => {
            modal.classList.remove('show');
            const handleTransitionEnd = () => {
                modal.style.display = "none";
                modal.removeEventListener('transitionend', handleTransitionEnd);
                if (callback) callback();
            };
            modal.addEventListener('transitionend', handleTransitionEnd);
        };
        
        function openDetailModal(itemKey) {
            const item = allItems[itemKey];
            if (!item) return;

            detailImage.src = item.image || 'https://via.placeholder.com/480x360';
            detailImage.alt = item.name || 'Zdjęcie produktu';
            detailName.textContent = item.name || 'Brak nazwy';
            detailDesc.textContent = item.description || 'Brak opisu dla tego produktu.';
            
            let tagsAndCatsHTML = '';
            if (item.category) {
                tagsAndCatsHTML += `<div class="item-category-tag">${item.category.toUpperCase()}</div>`;
            }
            if (item.tags) {
                for (const tagKey in item.tags) {
                    if (item.tags[tagKey] && TAGS[tagKey]) {
                        tagsAndCatsHTML += `<div class="item-batch-tag">${TAGS[tagKey]}</div>`;
                    }
                }
            }
            detailTagsCategories.innerHTML = tagsAndCatsHTML;
            
            detailPrice.innerHTML = item.price ? `<b>${item.price.toFixed(2)} PLN</b>` : '<b>Brak ceny</b>';
            
            if (hasPurchaseLink(item.purchaseLink)) {
                detailBuyLink.href = item.purchaseLink;
                detailBuyLink.classList.remove('disabled');
            } else {
                detailBuyLink.href = '#';
                detailBuyLink.classList.add('disabled');
            }
            
            showModal(itemDetailModal);
        }

        const updateUIForAdmin = () => { discordButton.style.display = "none"; logoutButton.style.display = "inline-flex"; displayFilteredItems(); };
        const updateUIForGuest = () => { discordButton.style.display = "inline-flex"; logoutButton.style.display = "none"; displayFilteredItems(); };
        
        function setupFilterUI() {
            const categoryOptionsHTML = CATEGORIES.map(cat => `<option value="${cat}">${cat}</option>`).join('');
            ['add-item-category', 'edit-item-category'].forEach(id => document.getElementById(id).innerHTML = categoryOptionsHTML);
            const addTagCheckboxesHTML = Object.keys(TAGS).map(key => `<label><input type="checkbox" id="add-tag-${key}"> ${TAGS[key]}</label>`).join('');
            document.getElementById('add-item-tags').innerHTML = addTagCheckboxesHTML;
            const editTagCheckboxesHTML = Object.keys(TAGS).map(key => `<label><input type="checkbox" id="edit-tag-${key}"> ${TAGS[key]}</label>`).join('');
            document.getElementById('edit-item-tags').innerHTML = editTagCheckboxesHTML;
        }
        
        function displayFilteredItems() {
            renderItems(allItems);
        }

        logoutButton.onclick = () => { isAdmin = false; updateUIForGuest(); };
        
        document.getElementById('login-submit').onclick = async () => { 
            const username = document.getElementById("login-username").value.trim();
            const passwordHash = await sha256(document.getElementById("login-password").value.trim());
            if (username === ADMIN_USER && passwordHash === ADMIN_PASS_HASH) {
                isAdmin = true; 
                hideModal(loginModal, updateUIForAdmin);
            } else { 
                alert("Niepoprawny login lub hasło"); 
            } 
        };

        function openAddModal() { addItemModal.querySelectorAll('input, select, textarea').forEach(el => { el.type === 'checkbox' ? el.checked = false : el.value = ''; }); showModal(addItemModal); }
        document.getElementById('add-item-cancel').onclick = () => hideModal(addItemModal);
        document.getElementById('add-item-submit').onclick = async () => {
          const name = document.getElementById('add-item-name').value.trim(), price = document.getElementById('add-item-price').value.trim(); if (!name || !price) { alert("Nazwa i cena są wymagane."); return; }
          const tags = {};
          for (const key in TAGS) { if (document.getElementById(`add-tag-${key}`).checked) { tags[key] = true; } }
          const newItemData = { name, price: Number(price), createdAt: new Date().toISOString(), description: document.getElementById('add-item-desc').value.trim(), purchaseLink: document.getElementById('add-item-link').value.trim(), image: document.getElementById('add-item-image').value.trim(), category: document.getElementById('add-item-category').value, tags };
          const loader = document.getElementById('add-item-loader'); loader.style.display = 'flex';
          try { await set(push(ref(db, 'items')), newItemData); hideModal(addItemModal); } catch (e) { console.error("Błąd:", e); alert("Wystąpił błąd."); } finally { loader.style.display = 'none'; }
        };

        function openEditModal(key) {
            const item = allItems[key]; if (!item) return;
            editItemModal.dataset.editingKey = key;
            document.getElementById('edit-item-name').value = item.name || ''; 
            document.getElementById('edit-item-desc').value = item.description || ''; 
            document.getElementById('edit-item-price').value = item.price || ''; 
            document.getElementById('edit-item-link').value = item.purchaseLink || ''; 
            document.getElementById('edit-item-image').value = item.image || ''; 
            document.getElementById('edit-item-category').value = item.category || CATEGORIES[0];
            for (const tagKey in TAGS) { 
                const checkbox = document.getElementById(`edit-tag-${tagKey}`);
                if (checkbox) {
                    checkbox.checked = item.tags?.[tagKey] || false; 
                }
            }
            showModal(editItemModal);
        }
        document.getElementById('edit-item-cancel').onclick = () => hideModal(editItemModal);
        document.getElementById('edit-item-submit').onclick = async () => {
            const key = editItemModal.dataset.editingKey; if (!key) return;
            const name = document.getElementById('edit-item-name').value.trim(), price = document.getElementById('edit-item-price').value.trim(); if (!name || !price) { alert("Nazwa i cena są wymagane."); return; }
            const tags = {};
            for (const tagKey in TAGS) { 
                if (document.getElementById(`edit-tag-${tagKey}`).checked) { 
                    tags[tagKey] = true; 
                }
            }
            const updatedData = { ...allItems[key], name, price: Number(price), description: document.getElementById('edit-item-desc').value.trim(), purchaseLink: document.getElementById('edit-item-link').value.trim(), image: document.getElementById('edit-item-image').value.trim(), category: document.getElementById('edit-item-category').value, tags };
            const loader = document.getElementById('edit-item-loader'); loader.style.display = 'flex';
            try { await set(ref(db, `items/${key}`), updatedData); hideModal(editItemModal); } catch (e) { console.error("Błąd:", e); alert("Wystąpił błąd."); } finally { loader.style.display = 'none'; }
        };
        
        itemsContainer.addEventListener('click', (e) => {
            const target = e.target;
            
            const cardElement = target.closest('.item-card');
            if (cardElement && !target.closest('.admin-buttons-container')) {
                 const itemKey = cardElement.dataset.key;
                 if(itemKey) openDetailModal(itemKey);
                 return;
            }

            const addButton = target.closest('#add-item-card-btn');
            if (addButton) {
                openAddModal();
                return;
            }
            
            if (isAdmin) {
                const deleteButton = target.closest('.admin-delete-button');
                if (deleteButton) {
                    const key = deleteButton.dataset.key;
                    if (confirm('Czy na pewno chcesz usunąć ten przedmiot?')) {
                        remove(ref(db, `items/${key}`)).catch(err => {
                            alert("Błąd podczas usuwania.");
                            console.error(err);
                        });
                    }
                    return;
                }

                const editButton = target.closest('.admin-edit-button');
                if (editButton) {
                    openEditModal(editButton.dataset.key);
                    return;
                }
            }
        });

        [loginModal, addItemModal, editItemModal, itemDetailModal].forEach(modal => { 
            modal.addEventListener('click', (e) => { 
                if (e.target === modal) hideModal(modal); 
            });
        });

        detailCloseBtn.addEventListener('click', () => hideModal(itemDetailModal));
        window.addEventListener('scroll', () => { mainHeader.classList.toggle('scrolled', window.scrollY > 20); });

        const secretCode = atob('a2tvb2xsa2s=');
        let recentKeystrokes = '', correctEntries = 0, sequenceTimeout;
        window.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                [loginModal, addItemModal, editItemModal, itemDetailModal].forEach(m => {
                    if (m.classList.contains('show')) hideModal(m);
                });
            }
            if (isAdmin || document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA') return;
            recentKeystrokes = (recentKeystrokes + e.key.toLowerCase()).slice(-secretCode.length);
            clearTimeout(sequenceTimeout);
            sequenceTimeout = setTimeout(() => recentKeystrokes = '', 2000);
            if (recentKeystrokes === secretCode) {
                correctEntries++;
                recentKeystrokes = ''; 
                if (correctEntries >= 3) {
                    correctEntries = 0;
                    clearTimeout(sequenceTimeout);
                    showModal(loginModal);
                }
            }
        });

        onValue(ref(db, "items"), (snapshot) => {
            const data = snapshot.val() || {};
            allItems = Object.fromEntries(Object.entries(data).sort(([,a],[,b]) => new Date(b.createdAt) - new Date(a.createdAt)));
            
            if (isFirstLoad) {
                setupFilterUI();
                updateUIForGuest();
                displayFilteredItems();
                document.body.classList.remove('loading');
                isFirstLoad = false;
            } else {
                displayFilteredItems();
            }
        });

    } catch (error) {
        console.error("Błąd krytyczny:", error);
        alert("Wystąpił krytyczny błąd podczas inicjalizacji strony. Sprawdź konsolę (F12) po więcej informacji.");
        document.body.classList.remove('loading');
    }
});
