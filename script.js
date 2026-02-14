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
        
        const AGENTS = {
            mulebuy:   { 
                name: 'Mulebuy',   
                logo: 'https://raw.githubusercontent.com/kacpe01/assets/refs/heads/main/mulebuy.png',   
                platforms: {
                    weidian: (id) => `https://mulebuy.com/product?id=${id}&platform=WEIDIAN`,
                    taobao: (id) => `https://mulebuy.com/product?id=${id}&platform=TAOBAO&ref=200000185`,
                    '1688': (id) => `https://mulebuy.com/product?id=${id}&platform=ALI_1688&ref=`
                }
            },
            kakobuy:   { 
                name: 'Kakobuy',   
                logo: 'https://raw.githubusercontent.com/kacpe01/assets/refs/heads/main/1200x1200bb.png',   
                platforms: {
                    weidian: (url) => `https://kakobuy.com/item/details?url=${encodeURIComponent(url)}`,
                    taobao: (url) => `https://www.kakobuy.com/item/details?url=${encodeURIComponent(url)}&affcode=doppelfit`,
                    '1688': (url) => `https://www.kakobuy.com/item/details?url=${encodeURIComponent(url)}&affcode=`
                }
            },
            cnfans: { 
                name: 'CNFans',    
                logo: 'https://raw.githubusercontent.com/kacpe01/assets/refs/heads/main/0x0.png',    
                platforms: {
                    weidian: (id) => `https://cnfans.com/product?id=${id}&platform=WEIDIAN`,
                    taobao: (id) => `https://cnfans.com/product/?shop_type=taobao&id=${id}&ref=53385`,
                    '1688': (id) => `https://cnfans.com/product?id=${id}&platform=ALI_1688&ref=`
                }
            },
            acbuy: { 
                name: 'ACBuy',     
                logo: 'https://raw.githubusercontent.com/kacpe01/assets/refs/heads/main/3333acbuy.png',     
                platforms: {
                    weidian: (id) => `https://www.acbuy.com/product?id=${id}&source=WD`,
                    taobao: (id) => `https://www.acbuy.com/product/?id=${id}&source=TB&u=repmafia`,
                    '1688': (id) => `https://www.acbuy.com/product/?id=${id}&source=AL&u=`
                }
            },
            lovegobuy: { 
                name: 'Lovegobuy', 
                logo: 'https://raw.githubusercontent.com/kacpe01/assets/refs/heads/main/communityIcon_7puh8sbad05e1.png', 
                platforms: {
                    weidian: (id) => `https://lovegobuy.com/product?id=${id}&shop_type=weidian`,
                    taobao: (id) => `https://lovegobuy.com/product?id=${id}&shop_type=taobao`,
                    '1688': (id) => `https://lovegobuy.com/product?id=${id}&shop_type=ali_1688`
                }
            },
            hoobuy: { 
                name: 'Hoobuy',    
                logo: 'https://raw.githubusercontent.com/kacpe01/assets/refs/heads/main/images.png',    
                platforms: {
                    weidian: (id) => `https://hoobuy.com/product/2/${id}`,
                    taobao: (id) => `https://hoobuy.com/product/1/${id}`,
                    '1688': (id) => `https://hoobuy.com/product/0/${id}`
                }
            }
        };

        let isAdmin = false, allItems = {}, activeTag = 'all', activeCategory = 'all', searchTerm = '', activeSort = 'default';
        let isFirstLoad = true;
        let activePrice = { min: null, max: null };
        let priceFilterTimeout;
        let currentAgentKey;
        
        const PLN_TO_CNY_RATE = 1.80;
        const THREE_HOURS_IN_MS = 3 * 60 * 60 * 1000;
        
        const mainHeader = document.getElementById('main-header');
        const discordButton = document.getElementById('discord-button'),
              logoutButton = document.getElementById("logout-button");
        const itemsContainer = document.getElementById("items-container"),
              searchInput = document.getElementById("search-input");
        const filterBtn = document.getElementById('filter-btn'), 
              filterDropdown = document.getElementById('filter-dropdown');
        const loginModal = document.getElementById("login-modal"), 
              addItemModal = document.getElementById("add-item-modal"), 
              editItemModal = document.getElementById("edit-item-modal"),
              itemDetailModal = document.getElementById('item-detail-modal');
        
        const agentButton = document.getElementById('agent-button'),
              agentLogo = document.getElementById('agent-logo'),
              agentName = document.getElementById('agent-name'),
              agentDropdown = document.getElementById('agent-dropdown');

        const filterOverlay = document.getElementById('filter-overlay'),
              filterPanel = document.getElementById('filter-panel'),
              mobileFiltersContainer = document.getElementById('mobile-filters-container'),
              filterPanelCloseBtn = document.getElementById('filter-panel-close-btn'),
              filterPanelApplyBtn = document.getElementById('filter-panel-apply-btn');
        
        const clearFiltersBtn = document.getElementById('clear-filters-btn');

        const detailCloseBtn = document.getElementById('detail-close-btn'),
              detailImage = document.getElementById('detail-image'),
              detailName = document.getElementById('detail-name'),
              detailDesc = document.getElementById('detail-desc'),
              detailTagsCategories = document.getElementById('detail-tags-categories'),
              detailPrice = document.getElementById('detail-price'),
              detailBuyLink = document.getElementById('detail-buy-link');
        
        function getLinkInfo(url) {
            if (!url) return null;
            let platform = null;
            if (url.includes('weidian.com')) platform = 'weidian';
            else if (url.includes('taobao.com')) platform = 'taobao';
            else if (url.includes('1688.com')) platform = '1688';
            
            const idMatch = url.match(/\d{10,}/g);
            const id = idMatch ? idMatch[idMatch.length - 1] : null;

            if (platform && id) {
                return { platform, id };
            }
            return null;
        }

        function convertPurchaseLink(originalUrl) {
            const info = getLinkInfo(originalUrl);
            const agent = AGENTS[currentAgentKey];

            if (info && agent) {
                const formatFunction = agent.platforms[info.platform];
                if (formatFunction) {
                    return currentAgentKey === 'kakobuy' ? formatFunction(originalUrl) : formatFunction(info.id);
                }
            }
            return '#';
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

            const isPurchaseLinkAvailable = !!getLinkInfo(item.purchaseLink);
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
            
            const convertedLink = convertPurchaseLink(item.purchaseLink);
            if (convertedLink !== '#') {
                detailBuyLink.href = convertedLink;
                detailBuyLink.classList.remove('disabled');
            } else {
                detailBuyLink.href = '#';
                detailBuyLink.classList.add('disabled');
            }
            
            showModal(itemDetailModal);
        }

        function openFilterPanel() {
            filterOverlay.classList.add('is-open');
            filterPanel.classList.add('is-open');
        }
        function closeFilterPanel() {
            filterOverlay.classList.remove('is-open');
            filterPanel.classList.remove('is-open');
        }

        function updateAgentButtonUI(agentKey) {
            const agent = AGENTS[agentKey];
            if (agent) {
                agentLogo.src = agent.logo;
                agentName.textContent = agent.name;
            }
        }
        
        function populateAgentDropdown() {
            agentDropdown.innerHTML = '';
            for (const key in AGENTS) {
                const agent = AGENTS[key];
                const optionButton = document.createElement('button');
                optionButton.className = 'agent-option';
                optionButton.dataset.agentKey = key;
                optionButton.innerHTML = `
                    <img src="${agent.logo}" alt="${agent.name} logo" class="agent-logo">
                    <span>${agent.name}</span>
                `;
                agentDropdown.appendChild(optionButton);
            }
        }

        const updateUIForAdmin = () => { discordButton.style.display = "none"; logoutButton.style.display = "inline-flex"; displayFilteredItems(); };
        const updateUIForGuest = () => { discordButton.style.display = "inline-flex"; logoutButton.style.display = "none"; displayFilteredItems(); };
        
        function setupFilterUI() {
            const tagButtonsHTML = `<div class="buttons-wrapper">${[`<button data-filter="all" class="${'all' === activeTag ? 'active' : ''}">Wszystkie</button>`].concat(Object.keys(TAGS).map(key => `<button data-filter="${key}" class="${key === activeTag ? 'active' : ''}">${TAGS[key]}</button>`)).join('')}</div>`;
            const categoryButtonsHTML = `<div class="buttons-wrapper">${[`<button data-category="all" class="${'all' === activeCategory ? 'active' : ''}">Wszystkie</button>`].concat(CATEGORIES.map(cat => `<button data-category="${cat}" class="${cat === activeCategory ? 'active' : ''}">${cat}</button>`)).join('')}</div>`;
            const sortButtonsHTML = `<div class="buttons-wrapper">${`<button data-sort="default" class="${'default' === activeSort ? 'active' : ''}">Domyślnie</button><button data-sort="price_asc" class="${'price_asc' === activeSort ? 'active' : ''}">Cena: Rosnąco</button><button data-sort="price_desc" class="${'price_desc' === activeSort ? 'active' : ''}">Cena: Malejąco</button>`}</div>`;
            
            const priceInputsHTML = `
                <div class="price-input-group">
                    <input type="number" id="min-price-input" class="price-input" placeholder="Od">
                    <input type="number" id="max-price-input" class="price-input" placeholder="Do">
                </div>
            `;

            document.getElementById('desktop-tag-filters').innerHTML = `<h4><svg fill="currentColor" viewBox="0 0 20 20"><path d="M5.5 7a.5.5 0 000 1h9a.5.5 0 000-1h-9zM4 10.5a.5.5 0 01.5-.5h9a.5.5 0 010 1h-9a.5.5 0 01-.5-.5zM4.5 13a.5.5 0 000 1h9a.5.5 0 000-1h-9z"></path><path fill-rule="evenodd" d="M2 4a2 2 0 012-2h12a2 2 0 012 2v12a2 2 0 01-2 2H4a2 2 0 01-2-2V4zm2-1a1 1 0 00-1 1v12a1 1 0 001 1h12a1 1 0 001-1V4a1 1 0 00-1-1H4z"></path></svg>Tagi</h4>${tagButtonsHTML}`;
            document.getElementById('desktop-category-filters').innerHTML = `<h4><svg fill="currentColor" viewBox="0 0 20 20"><path d="M3 3.5A1.5 1.5 0 014.5 2h11A1.5 1.5 0 0117 3.5v11a1.5 1.5 0 01-1.5 1.5h-11A1.5 1.5 0 013 14.5v-11zM4.5 3A.5.5 0 004 3.5v11a.5.5 0 00.5.5h11a.5.5 0 00.5-.5v-11a.5.5 0 00-.5-.5h-11z"></path><path d="M5 6.5A1.5 1.5 0 016.5 5h2A1.5 1.5 0 0110 6.5v2A1.5 1.5 0 018.5 10h-2A1.5 1.5 0 015 8.5v-2zM11.5 5A1.5 1.5 0 0113 6.5v2a1.5 1.5 0 01-1.5 1.5h-2A1.5 1.5 0 018 8.5V7A.5.5 0 018.5 6.5h2V6A.5.5 0 0111.5 5zM5 13.5A1.5 1.5 0 016.5 12h2A1.5 1.5 0 0110 13.5v-2A1.5 1.5 0 018.5 10h-2A1.5 1.5 0 015 11.5v2zM11.5 12A1.5 1.5 0 0113 13.5v-2a1.5 1.5 0 01-1.5-1.5h-2A1.5 1.5 0 018 11.5V13a.5.5 0 01.5.5h2v.5a.5.5 0 011.5-1z"></path></svg>Kategorie</h4>${categoryButtonsHTML}`;
            document.getElementById('desktop-price-sort-filters').innerHTML = `<h4><svg fill="currentColor" viewBox="0 0 20 20"><path d="M10 4a.75.75 0 01.75.75v10.5a.75.75 0 01-1.5 0V4.75A.75.75 0 0110 4zM6.25 6A.75.75 0 017 6.75v6.5a.75.75 0 01-1.5 0V6.75A.75.75 0 016.25 6zM3.75 8A.75.75 0 014.5 8.75v2.5a.75.75 0 01-1.5 0V8.75A.75.75 0 013.75 8zM13.75 6A.75.75 0 0114.5 6.75v6.5a.75.75 0 01-1.5 0V6.75A.75.75 0 0113.75 6zM16.25 8A.75.75 0 0117 8.75v2.5a.75.75 0 01-1.5 0V8.75A.75.75 0 0116.25 8z"></path></svg>Cena</h4>${priceInputsHTML}<h4 style="margin-top: 24px;"><svg fill="currentColor" viewBox="0 0 20 20"><path d="M10.47 4.22a.75.75 0 00-1.06-.02l-3.5 3.25a.75.75 0 001.04 1.08L10 5.81l2.51 2.72a.75.75 0 001.08-1.04l-3-3.25zM9.53 15.78a.75.75 0 001.06.02l3.5-3.25a.75.75 0 00-1.04-1.08L10 14.19l-2.51-2.72a.75.75 0 00-1.08 1.04l3 3.25z"></path></svg>Sortuj wg</h4>${sortButtonsHTML}`;
            
            mobileFiltersContainer.innerHTML = `
                <div class="filter-section"><h4>Tagi</h4><div class="filter-section-buttons">${tagButtonsHTML.replace(/<div class="buttons-wrapper">|<\/div>/g, '')}</div></div>
                <div class="filter-section"><h4>Kategorie</h4><div class="filter-section-buttons">${categoryButtonsHTML.replace(/<div class="buttons-wrapper">|<\/div>/g, '')}</div></div>
                <div class="filter-section"><h4>Sortuj wg</h4><div class="filter-section-buttons">${sortButtonsHTML.replace(/<div class="buttons-wrapper">|<\/div>/g, '')}</div></div>
            `;
            
            const categoryOptionsHTML = CATEGORIES.map(cat => `<option value="${cat}">${cat}</option>`).join('');
            ['add-item-category', 'edit-item-category'].forEach(id => document.getElementById(id).innerHTML = categoryOptionsHTML);
            const addTagCheckboxesHTML = Object.keys(TAGS).map(key => `<label><input type="checkbox" id="add-tag-${key}"> ${TAGS[key]}</label>`).join('');
            document.getElementById('add-item-tags').innerHTML = addTagCheckboxesHTML;
            const editTagCheckboxesHTML = Object.keys(TAGS).map(key => `<label><input type="checkbox" id="edit-tag-${key}"> ${TAGS[key]}</label>`).join('');
            document.getElementById('edit-item-tags').innerHTML = editTagCheckboxesHTML;

            const minPriceInput = document.getElementById('min-price-input');
            const maxPriceInput = document.getElementById('max-price-input');

            const handlePriceInput = () => {
                clearTimeout(priceFilterTimeout);
                priceFilterTimeout = setTimeout(() => {
                    activePrice.min = minPriceInput.value === '' ? null : Number(minPriceInput.value);
                    activePrice.max = maxPriceInput.value === '' ? null : Number(maxPriceInput.value);
                    displayFilteredItems();
                }, 500);
            };

            minPriceInput.addEventListener('input', handlePriceInput);
            maxPriceInput.addEventListener('input', handlePriceInput);
        }
        
        function displayFilteredItems() {
            let filtered = Object.entries(allItems);
            if (activeCategory !== 'all') filtered = filtered.filter(([, i]) => i.category === activeCategory);
            if (activeTag !== 'all') filtered = filtered.filter(([, i]) => i.tags && i.tags[activeTag]);
            if (searchTerm) filtered = filtered.filter(([, i]) => i.name && i.name.toLowerCase().includes(searchTerm));
            
            if (activePrice.min !== null) {
                filtered = filtered.filter(([, item]) => (item.price || 0) >= activePrice.min);
            }
            if (activePrice.max !== null) {
                filtered = filtered.filter(([, item]) => (item.price || 0) <= activePrice.max);
            }

            if (activeSort === 'price_asc') filtered.sort(([, a], [, b]) => (a.price || 0) - (b.price || 0));
            else if (activeSort === 'price_desc') filtered.sort(([, a], [, b]) => (b.price || 0) - (a.price || 0));
            
            renderItems(Object.fromEntries(filtered));
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

        clearFiltersBtn.addEventListener('click', () => {
            activeTag = 'all';
            activeCategory = 'all';
            activeSort = 'default';
            activePrice = { min: null, max: null };

            document.getElementById('min-price-input').value = '';
            document.getElementById('max-price-input').value = '';
            
            document.querySelectorAll(`[data-filter], [data-category], [data-sort]`).forEach(b => b.classList.remove('active'));
            document.querySelectorAll(`[data-filter="all"], [data-category="all"], [data-sort="default"]`).forEach(b => b.classList.add('active'));
            
            displayFilteredItems();
        });

        [loginModal, addItemModal, editItemModal, itemDetailModal].forEach(modal => { 
            modal.addEventListener('click', (e) => { 
                if (e.target === modal) hideModal(modal); 
            });
        });

        detailCloseBtn.addEventListener('click', () => hideModal(itemDetailModal));
        searchInput.addEventListener('input', (e) => { searchTerm = e.target.value.trim().toLowerCase(); displayFilteredItems(); });
        
        agentButton.addEventListener('click', (e) => {
            e.stopPropagation();
            agentDropdown.classList.toggle('show');
        });

        agentDropdown.addEventListener('click', (e) => {
            const target = e.target.closest('.agent-option');
            if (target && target.dataset.agentKey) {
                currentAgentKey = target.dataset.agentKey;
                localStorage.setItem('selectedAgent', currentAgentKey);
                updateAgentButtonUI(currentAgentKey);
                agentDropdown.classList.remove('show');
            }
        });

        filterBtn.addEventListener('click', () => {
            if (window.innerWidth <= 768) {
                openFilterPanel();
            } else {
                filterDropdown.classList.toggle('show');
            }
        });

        filterPanelCloseBtn.addEventListener('click', closeFilterPanel);
        filterPanelApplyBtn.addEventListener('click', closeFilterPanel);
        filterOverlay.addEventListener('click', closeFilterPanel);
        
        function handleFilterClick(e) {
            const button = e.target.closest('button');
            if (!button || (!button.dataset.filter && !button.dataset.category && !button.dataset.sort)) return;
            
            if (button.dataset.filter) {
                activeTag = button.dataset.filter;
                document.querySelectorAll(`[data-filter]`).forEach(b => b.classList.remove('active'));
                document.querySelectorAll(`[data-filter="${activeTag}"]`).forEach(b => b.classList.add('active'));
            } else if (button.dataset.category) {
                activeCategory = button.dataset.category;
                document.querySelectorAll(`[data-category]`).forEach(b => b.classList.remove('active'));
                document.querySelectorAll(`[data-category="${activeCategory}"]`).forEach(b => b.classList.add('active'));
            } else if (button.dataset.sort) {
                activeSort = button.dataset.sort;
                document.querySelectorAll(`[data-sort]`).forEach(b => b.classList.remove('active'));
                document.querySelectorAll(`[data-sort="${activeSort}"]`).forEach(b => b.classList.add('active'));
            }
            displayFilteredItems();
        }

        filterDropdown.addEventListener('click', handleFilterClick);
        mobileFiltersContainer.addEventListener('click', handleFilterClick);
        
        document.addEventListener('click', (e) => { 
            if (!filterBtn.contains(e.target) && !filterDropdown.contains(e.target)) {
                filterDropdown.classList.remove('show');
            }
             if (!agentButton.contains(e.target)) {
                agentDropdown.classList.remove('show');
            }
        });
        window.addEventListener('scroll', () => { mainHeader.classList.toggle('scrolled', window.scrollY > 20); });

        const secretCode = atob('a2tvb2xsa2s=');
        let recentKeystrokes = '', correctEntries = 0, sequenceTimeout;
        window.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                if (filterPanel.classList.contains('is-open')) closeFilterPanel();
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
                currentAgentKey = localStorage.getItem('selectedAgent') || 'mulebuy';
                updateAgentButtonUI(currentAgentKey);
                populateAgentDropdown();
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
