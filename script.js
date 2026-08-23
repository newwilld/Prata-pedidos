// Importações do Firebase
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, onAuthStateChanged, signOut, setPersistence, browserLocalPersistence } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getDatabase, ref, set, push, onValue, update, get, remove } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-database.js";

// Configuração do Firebase
const firebaseConfig = {
    apiKey: "AIzaSyCAZJIWT5FPTshkArRs8v2U9hXAmtnlG-Q",
    authDomain: "myname22.firebaseapp.com",
    databaseURL: "https://myname22-default-rtdb.firebaseio.com",
    projectId: "myname22",
    storageBucket: "myname22.firebasestorage.app",
    messagingSenderId: "346543194739",
    appId: "1:346543194739:web:bcb8fa36574ca5de552006"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);

// Configura persistência
setPersistence(auth, browserLocalPersistence)
    .catch((error) => {
        console.warn("Erro ao configurar persistência:", error);
    });

// E-mail master
const MASTER_ADMIN_EMAIL = "lojavirtualprata@gmail.com";

// Variáveis de Estado
let isLoginMode = true;
let currentUserData = null;
let globalOrders = {}; 
let globalUsers = {};
let globalNotifications = {};
let globalClientOrders = {}; // Cache dos pedidos do cliente logado
let currentCart = []; // Carrinho de compras atual
let editingOrderId = null; // ID de um pedido existente sendo editado no form principal
let listenersInitialized = false;
let isViewingFromClientList = false; // Flag para identificar origem do modal admin
let selectedSizes = {}; // Para armazenar os tamanhos selecionados com checkboxes
let currentClientItemsConfig = { allowedItems: [], excludedItems: [] }; // Configuração de itens do cliente atual

// Dados dos produtos em cascata (Categoria > Modelo > Tamanho/Especificação)
const productCatalog = {
    'Caixa de pizza': {
        'Oitavada': [
            { name: '20cm brotinho (parda)', price: 1.60 },
            { name: '20cm brotinho (branca)', price: 1.70 },
            { name: '25cm pequena (parda)', price: 2.00 },
            { name: '25cm pequena (branca)', price: 2.10 },
            { name: '25cm pequena (fotográfica)', price: 2.80 },
            { name: '30cm média (parda)', price: 2.30 },
            { name: '30cm média (branca)', price: 2.40 },
            { name: '30cm média (fotográfica)', price: 3.00 },
            { name: '35cm grande (parda)', price: 2.65 },
            { name: '35cm grande (branca)', price: 2.85 },
            { name: '35cm grande (fotográfica)', price: 3.35 },
            { name: '40cm família (parda)', price: 3.10 },
            { name: '40cm família (branca)', price: 3.30 },
            { name: '40cm família (fotográfica)', price: 3.70 },
            { name: '45cm gigante (parda)', price: 4.40 },
            { name: '45cm gigante (branca)', price: 4.60 }
        ],
        'Quadrada': [
            { name: '20x20x5cm (Broto)', price: 2.10 },
            { name: '25x25x5,5cm (Pequena)', price: 2.40 },
            { name: '30x30x4,0cm (média)', price: 2.50 },
            { name: '30x30x5,5cm (média)', price: 2.85 },
            { name: '35x35x4,0cm (grande)', price: 2.85 },
            { name: '35x35x5,5cm (grande)', price: 3.18 },
            { name: '40x40x4,0cm (família)', price: 3.32 },
            { name: '40x40x4,5cm (família)', price: 3.52 },
            { name: '40x40x5,5cm (família)', price: 4.38 },
            { name: '40x40x7cm (família)', price: 4.70 },
            { name: '45x45x5cm (Gigante)', price: 5.25 }
        ],
        'Sextavada/Americana': [
            { name: '20cm brotinho (parda)', price: 1.88 },
            { name: '20cm brotinho (branca)', price: 1.98 },
            { name: '25cm pequena (parda)', price: 2.00 },
            { name: '25cm pequena (branca)', price: 2.10 },
            { name: '30cm média (parda)', price: 2.20 },
            { name: '30cm média (branca)', price: 2.40 },
            { name: '35cm grande (parda)', price: 2.65 },
            { name: '35cm grande (branca)', price: 2.85 },
            { name: '40cm família (parda)', price: 3.10 },
            { name: '40cm família (branca)', price: 3.30 }
        ]
    },
    'Caixa de torta': {
        'Caixas para Tortas e Bolo - Branca': [
            { name: 'Caixa de torta medindo 22 x 22 x 9,5cm (Cx de torta 22cm)', price: 3.00 },
            { name: 'Caixa de torta medindo 29 x 18 x 10cm (Cx de torta retangular)', price: 3.20 },
            { name: 'Caixa de torta medindo 20 x 20 x 13cm (Cx PP baixa 20cm)', price: 3.45 },
            { name: 'Caixa de torta medindo 20 x 20 x 17cm (Cx PP alta 20cm)', price: 3.65 },
            { name: 'Caixa de torta medindo 25 x 25 x 15cm (Cx pequena 25cm)', price: 3.60 },
            { name: 'Caixa de torta medindo 30 x 30 x 12cm (Cx média 30cm baixa)', price: 3.75 },
            { name: 'Caixa de torta medindo 30 x 30 x 16cm (Cx média 30cm alta)', price: 4.55 },
            { name: 'Caixa de torta medindo 35 x 35 x 12cm (Cx grande 35cm baixa)', price: 4.60 },
            { name: 'Caixa de torta medindo 35 x 35 x 15cm (Cx grande 35cm alta)', price: 4.80 },
            { name: 'Caixa de torta medindo 40 x 40 x 12,5cm (Cx GG 40cm)', price: 5.10 },
            { name: 'Caixa de torta retangular medindo 40 x 30 x 15cm (Cx Retangular)', price: 6.50 },
            { name: 'Caixa de torta retangular medindo 54 x 41,5 x 12cm (Cx Retangular)', price: 6.98 }
        ]
    },
    'Caixa correio': {
        'Caixas Retangulares': [
            { name: 'Caixa retangular medindo 21 x 14 x 5cm alt', price: 1.80 },
            { name: 'Caixa retangular medindo 28 x 21 x 5cm alt', price: 2.00 },
            { name: 'Caixa retangular P (filé/lasanha) medindo 22,5 x 18,5 x 5cm alt', price: 2.18 },
            { name: 'Caixa retangular M (filé/lasanha) medindo 27 x 19 x 5cm alt', price: 2.30 },
            { name: 'Caixa retangular G (filé/lasanha) medindo 29,5 x 23,5 x 5cm alt', price: 2.42 }
        ],
        'Caixas Tipo Correio/Ecommerce': [
            { name: 'Caixa tipo correio medindo 15 x 10 x 5cm alt', price: 2.40 },
            { name: 'Caixa tipo correio medindo 12,5 x 12,5 x 6,5cm alt', price: 2.85 },
            { name: 'Caixa tipo correio medindo 17,5 x 17,5 x 9cm alt', price: 3.20 },
            { name: 'Caixa tipo correio medindo 17,5 x 16,0 x 5,5cm alt', price: 1.80 },
            { name: 'Caixa tipo correio medindo 21 x 14,5 x 7cm alt', price: 3.20 },
            { name: 'Caixa tipo correio medindo 22,5 x 15 x 6cm alt', price: 3.00 },
            { name: 'Caixa tipo correio medindo 28,5 x 15,5 x 5,7cm alt', price: 3.25 },
            { name: 'Caixa tipo correio medindo 30 x 20 x 11 cm alt', price: 4.50 },
            { name: 'Caixa tipo correio medindo 33 x 18,5 x 9 cm alt', price: 4.60 },
            { name: 'Caixa tipo correio medindo 33 x 20,0 x 6 cm alt', price: 4.00 },
            { name: 'Caixa tipo correio medindo 16 x 12 x 4cm alt (PAC Mini)', price: 2.00 },
            { name: 'Caixa tipo correio medindo 24 x 17 x 4cm alt (PAC Mini)', price: 2.50 },
            { name: 'Caixa tipo correio medindo 16 x 11 x 4cm alt (PAC Mini)', price: 1.75 },
            { name: 'Caixa tipo correio medindo 23 x 15 x 4cm alt (PAC Mini)', price: 1.85 }
        ],
        'Caixas Tipo Maleta - Parda': [
            { name: 'Caixa tipo maleta medindo 16 x 10,5 x 22,5cm alt (20 picolés)', price: 1.70 },
            { name: 'Caixa tipo maleta medindo 16,0 x 10,5 x 11,5cm alt (10 picolés)', price: 1.40 },
            { name: 'Caixa tipo maleta medindo 21,0 x 16,0 x 11,5cm alt', price: 2.50 },
            { name: 'Caixa tipo maleta medindo 27,5 x 17,5 x 11,0cm alt', price: 2.70 },
            { name: 'Caixa tipo maleta medindo 32,0 x 24,0 x 16,0 cm alt', price: 3.20 }
        ]
    }
};



// Função para obter todos os itens do catálogo
function getAllCatalogItems() {
    const allItems = [];
    Object.keys(productCatalog).forEach(category => {
        Object.keys(productCatalog[category]).forEach(model => {
            productCatalog[category][model].forEach(size => {
                allItems.push({
                    category: category,
                    model: model,
                    name: size.name,
                    price: size.price,
                    fullName: `${category} > ${model} > ${size.name}`
                });
            });
        });
    });
    return allItems;
}

// Função para verificar se um item está permitido para o cliente
function isItemAllowed(itemName) {
    if (!currentUserData || currentUserData.role === 'admin') return true;
    
    const config = currentClientItemsConfig;
    if (!config || !config.allowedItems || config.allowedItems.length === 0) return true;
    
    if (config.allowedItems.includes('todos')) return true;
    
    // Verifica se o item está na lista de permitidos
    return config.allowedItems.some(allowed => {
        if (allowed === 'Caixa de pizza' && itemName.includes('Caixa de pizza')) return true;
        if (allowed === 'Caixa de torta' && itemName.includes('Caixa de torta')) return true;
        if (allowed === 'Caixa correio' && itemName.includes('Caixa correio')) return true;
        return itemName.includes(allowed);
    });
}

// Funções de UI Auxiliares
window.showToast = function(message, type = 'info') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `<div class="flex items-center gap-3"><i class="fas ${type === 'success' ? 'fa-check-circle' : type === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle'} text-xl"></i> ${message}</div>`;
    container.appendChild(toast);
    
    setTimeout(() => {
        toast.classList.add('toast-fade-out');
        setTimeout(() => toast.remove(), 500);
    }, 4000);
};

window.formatDateTime = function(timestamp) {
    const date = new Date(timestamp);
    return date.toLocaleDateString('pt-BR') + ' às ' + date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
};

window.toggleAuthMode = function() {
    isLoginMode = !isLoginMode;
    document.getElementById('nameField').classList.toggle('hidden', isLoginMode);
    document.getElementById('phoneField').classList.toggle('hidden', isLoginMode);
    document.getElementById('companyField').classList.toggle('hidden', isLoginMode);
    document.getElementById('authSubtitle').innerText = isLoginMode ? 'Faça login para continuar' : 'Crie sua conta para solicitar embalagens';
    document.getElementById('authSubmitBtn').innerText = isLoginMode ? 'Entrar' : 'Cadastrar';
    document.getElementById('authToggleText').innerText = isLoginMode ? 'Não tem uma conta?' : 'Já possui uma conta?';
    document.getElementById('authToggleBtn').innerText = isLoginMode ? 'Criar agora' : 'Fazer Login';
};

window.handleAuth = async function(e) {
    e.preventDefault();
    const email = document.getElementById('authEmail').value.trim();
    const password = document.getElementById('authPassword').value;
    const btn = document.getElementById('authSubmitBtn');
    const originalText = btn.innerText;

    btn.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i> Processando...';
    btn.disabled = true;

    try {
        if (isLoginMode) {
            await signInWithEmailAndPassword(auth, email, password);
        } else {
            const name = document.getElementById('authName').value.trim();
            const phone = document.getElementById('authPhone').value.trim();
            const company = document.getElementById('authCompany').value.trim();
            
            if (!name) throw new Error("O nome é obrigatório para cadastro.");
            if (!phone) throw new Error("O telefone é obrigatório para cadastro.");
            
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;
            
            const role = (email.toLowerCase() === MASTER_ADMIN_EMAIL.toLowerCase()) ? 'admin' : 'client';
            
            await set(ref(db, 'users/' + user.uid), {
                name: name,
                email: email,
                phone: phone,
                company: company || '',
                role: role,
                createdAt: Date.now(),
                itemsConfig: {
                    allowedItems: ['todos'],
                    excludedItems: []
                }
            });
            
            currentUserData = {
                uid: user.uid,
                name: name,
                email: email,
                phone: phone,
                company: company || '',
                role: role
            };
            
            setupUIForUser();
            showToast('Conta criada com sucesso!', 'success');
            return;
        }
        showToast(isLoginMode ? 'Login realizado com sucesso!' : 'Conta criada com sucesso!', 'success');
    } catch (error) {
        console.error(error);
        let msg = 'Ocorreu um erro.';
        if(error.code === 'auth/invalid-credential') msg = 'E-mail ou senha incorretos.';
        else if(error.code === 'auth/email-already-in-use') msg = 'Este e-mail já está cadastrado.';
        else if(error.message) msg = error.message;
        showToast(msg, 'error');
        btn.innerHTML = originalText;
        btn.disabled = false;
    }
};

window.logout = function() {
    signOut(auth).then(() => {
        showToast('Desconectado com sucesso', 'info');
        resetUI();
    });
};

onAuthStateChanged(auth, async (user) => {
    if (user) {
        if (currentUserData && currentUserData.uid === user.uid) {
            setupUIForUser();
            return;
        }
        
        const userRef = ref(db, 'users/' + user.uid);
        get(userRef).then((snapshot) => {
            if (snapshot.exists()) {
                currentUserData = snapshot.val();
                currentUserData.uid = user.uid;
                
                if(currentUserData.email.toLowerCase() === MASTER_ADMIN_EMAIL.toLowerCase()) {
                    currentUserData.role = 'admin';
                }
                
                // Carrega configuração de itens do cliente
                if (currentUserData.role === 'client') {
                    loadClientItemsConfig(user.uid);
                }
                
                setupUIForUser();
            } else {
                const isMaster = user.email.toLowerCase() === MASTER_ADMIN_EMAIL.toLowerCase();
                currentUserData = {
                    uid: user.uid,
                    email: user.email,
                    name: isMaster ? 'Administrador' : 'Cliente',
                    phone: '',
                    company: '',
                    role: isMaster ? 'admin' : 'client'
                };
                setupUIForUser();
            }
        }).catch(err => {
            showToast('Erro ao carregar perfil. Verifique as regras do Realtime Database.', 'error');
        });
    } else {
        currentUserData = null;
        resetUI();
    }
});

// Função para carregar configuração de itens do cliente
function loadClientItemsConfig(userId) {
    const configRef = ref(db, `users/${userId}/itemsConfig`);
    get(configRef).then((snapshot) => {
        if (snapshot.exists()) {
            currentClientItemsConfig = snapshot.val();
        } else {
            currentClientItemsConfig = { allowedItems: ['todos'], excludedItems: [] };
        }
    }).catch(err => {
        console.error("Erro ao carregar configuração de itens:", err);
        currentClientItemsConfig = { allowedItems: ['todos'], excludedItems: [] };
    });
}

function resetUI() {
    document.getElementById('authScreen').classList.remove('hidden');
    document.getElementById('clientScreen').classList.add('hidden');
    document.getElementById('adminScreen').classList.add('hidden');
    document.getElementById('userMenu').classList.add('hidden');
    document.getElementById('authForm').reset();
    if(!isLoginMode) toggleAuthMode();
    document.getElementById('authSubmitBtn').innerText = 'Entrar';
    document.getElementById('authSubmitBtn').disabled = false;
    listenersInitialized = false;
}

function setupUIForUser() {
    document.getElementById('authScreen').classList.add('hidden');
    document.getElementById('userMenu').classList.remove('hidden');
    document.getElementById('userMenu').classList.add('flex');
    
    document.getElementById('userNameDisplay').innerText = currentUserData.name;
    const badge = document.getElementById('userRoleBadge');
    
    if (currentUserData.role === 'admin') {
        badge.innerText = 'Admin Master';
        badge.className = 'text-xs px-3 py-1 rounded-full font-bold bg-gradient-to-r from-amber-500 to-orange-500 text-white';
        document.getElementById('adminScreen').classList.remove('hidden');
        document.getElementById('adminScreen').classList.add('flex');
        document.getElementById('clientScreen').classList.add('hidden');
        document.getElementById('clientScreen').classList.remove('flex');
        
        // Restaura todas as opções para admin
        restoreAllProductTypeOptions();
        
        if (!listenersInitialized) {
            initAdminListeners();
            listenersInitialized = true;
        }
    } else {
        badge.innerText = 'Cliente';
        badge.className = 'text-xs px-3 py-1 rounded-full font-medium bg-white/20 text-white';
        document.getElementById('clientScreen').classList.remove('hidden');
        document.getElementById('clientScreen').classList.add('flex');
        document.getElementById('adminScreen').classList.add('hidden');
        document.getElementById('adminScreen').classList.remove('flex');
        
        if (!listenersInitialized) {
            initClientListeners();
            listenersInitialized = true;
        }
        
        // APLICA FILTRO DE ITENS PERMITIDOS
        filterProductTypeOptions();
    }
}

// Função para restaurar todas as opções de produto (para admin)
function restoreAllProductTypeOptions() {
    const productTypeSelect = document.getElementById('productTypeSelect');
    if (!productTypeSelect) return;
    
    // Limpa o select
    productTypeSelect.innerHTML = '';
    
    // Adiciona placeholder
    const placeholder = document.createElement('option');
    placeholder.value = '';
    placeholder.disabled = true;
    placeholder.selected = true;
    placeholder.textContent = 'Selecione o tipo de produto...';
    placeholder.className = 'text-gray-900';
    productTypeSelect.appendChild(placeholder);
    
    // Adiciona todas as categorias
    Object.keys(productCatalog).forEach(category => {
        const option = document.createElement('option');
        option.value = category;
        option.textContent = category;
        option.className = 'text-gray-900';
        productTypeSelect.appendChild(option);
    });
}

// Lógica de Formulário em Cascata
window.handleProductTypeChange = function() {
    const productType = document.getElementById('productTypeSelect').value;
    const modelContainer = document.getElementById('modelContainer');
    const sizeContainer = document.getElementById('sizeContainer');
    const sizeCheckboxContainer = document.getElementById('sizeCheckboxContainer');
    
    const modelSelect = document.getElementById('modelSelect');
    
    modelSelect.innerHTML = '<option value="" disabled selected class="text-gray-900">Selecione o modelo...</option>';
    sizeCheckboxContainer.innerHTML = '';
    selectedSizes = {};
    
    modelContainer.classList.add('hidden');
    sizeContainer.classList.add('hidden');
    document.getElementById('totalDisplayContainer').classList.add('hidden');
    
    if (productType && productCatalog[productType]) {
        const models = Object.keys(productCatalog[productType]);
        models.forEach(model => {
            // Verifica se algum item deste modelo está permitido
            const hasAllowedItem = productCatalog[productType][model].some(size => {
                if (!currentUserData || currentUserData.role === 'admin') return true;
                return isItemAllowed(`${productType} > ${model} > ${size.name}`);
            });
            
            if (hasAllowedItem) {
                const option = document.createElement('option');
                option.value = model;
                option.textContent = model;
                option.className = 'text-gray-900';
                modelSelect.appendChild(option);
            }
        });
        modelContainer.classList.remove('hidden');
    }
};

window.handleModelChange = function() {
    const productType = document.getElementById('productTypeSelect').value;
    const model = document.getElementById('modelSelect').value;
    const sizeContainer = document.getElementById('sizeContainer');
    const sizeCheckboxContainer = document.getElementById('sizeCheckboxContainer');
    
    sizeCheckboxContainer.innerHTML = '';
    selectedSizes = {};
    document.getElementById('totalDisplayContainer').classList.add('hidden');
    
    if (productType && model && productCatalog[productType][model]) {
        const sizes = productCatalog[productType][model];
        
        // Filtra tamanhos permitidos para clientes
        const allowedSizes = sizes.filter(size => {
            if (!currentUserData || currentUserData.role === 'admin') return true;
            return isItemAllowed(`${productType} > ${model} > ${size.name}`);
        });
        
        if (allowedSizes.length === 0) {
            showToast('Nenhum item disponível para este modelo.', 'error');
            return;
        }
        
        // Cria os checkboxes para cada tamanho permitido
        allowedSizes.forEach((size, index) => {
            const div = document.createElement('div');
            div.className = 'size-checkbox-item';
            div.id = `size-item-${index}`;
            
            div.innerHTML = `
                <input type="checkbox" id="size-check-${index}" class="size-checkbox" onchange="handleSizeCheckboxChange(${index})">
                <label for="size-check-${index}" class="size-checkbox-label">${size.name} - R$ ${size.price.toFixed(2)}</label>
                <select id="size-quantity-${index}" class="size-quantity-input" disabled onchange="updateTotalDisplayCheckbox()">
                    <option value="500">500 unidades</option>
                    <option value="1000">1.000 unidades</option>
                    <option value="2000">2.000 unidades</option>
                    <option value="3000">3.000 unidades</option>
                    <option value="4000">4.000 unidades</option>
                    <option value="5000">5.000 unidades</option>
                    <option value="Outra">Outra quantidade</option>
                </select>
                <input type="number" id="size-custom-quantity-${index}" class="size-quantity-input hidden" min="1" placeholder="Qtd" style="width: 100px;" oninput="updateTotalDisplayCheckbox()">
            `;
            
            sizeCheckboxContainer.appendChild(div);
            
            // Armazena os dados do tamanho
            selectedSizes[index] = {
                name: size.name,
                price: size.price,
                checked: false,
                quantity: 0
            };
        });
        
        sizeContainer.classList.remove('hidden');
    }
};
// Função para filtrar as opções do select de tipo de produto para clientes
function filterProductTypeOptions() {
    if (!currentUserData || currentUserData.role === 'admin') return;
    
    const productTypeSelect = document.getElementById('productTypeSelect');
    if (!productTypeSelect) return;
    
    const options = productTypeSelect.options;
    
    // Começa do índice 1 para pular o placeholder
    for (let i = options.length - 1; i >= 1; i--) {
        const optionValue = options[i].value;
        
        if (optionValue && !isItemAllowed(optionValue)) {
            // Remove completamente a opção do select
            productTypeSelect.remove(i);
        }
    }
    
    // Se não houver opções disponíveis, mostra mensagem
    if (productTypeSelect.options.length <= 1) {
        const noOptions = document.createElement('option');
        noOptions.value = '';
        noOptions.disabled = true;
        noOptions.selected = true;
        noOptions.textContent = 'Nenhum produto disponível para você';
        noOptions.className = 'text-gray-900';
        productTypeSelect.appendChild(noOptions);
    }
}

// Função para verificar se um item está permitido para o cliente
function isItemAllowed(itemName) {
    if (!currentUserData || currentUserData.role === 'admin') return true;
    
    const config = currentClientItemsConfig;
    if (!config || !config.allowedItems || config.allowedItems.length === 0) return true;
    
    if (config.allowedItems.includes('todos')) return true;
    
    // Verifica se o item está na lista de permitidos
    return config.allowedItems.some(allowed => {
        if (allowed === 'Caixa de pizza' && itemName.includes('Caixa de pizza')) return true;
        if (allowed === 'Caixa de torta' && itemName.includes('Caixa de torta')) return true;
        if (allowed === 'Caixa correio' && itemName.includes('Caixa correio')) return true;
        return itemName.includes(allowed);
    });
}

window.handleSizeCheckboxChange = function(index) {
    const checkbox = document.getElementById(`size-check-${index}`);
    const quantitySelect = document.getElementById(`size-quantity-${index}`);
    const customQuantity = document.getElementById(`size-custom-quantity-${index}`);
    const itemDiv = document.getElementById(`size-item-${index}`);
    
    if (checkbox.checked) {
        quantitySelect.disabled = false;
        itemDiv.classList.add('checked');
        selectedSizes[index].checked = true;
        
        // Se a quantidade não foi definida, define como 1000 por padrão
        if (!selectedSizes[index].quantity) {
            quantitySelect.value = '1000';
            selectedSizes[index].quantity = 1000;
        }
    } else {
        quantitySelect.disabled = true;
        customQuantity.classList.add('hidden');
        itemDiv.classList.remove('checked');
        selectedSizes[index].checked = false;
        selectedSizes[index].quantity = 0;
    }
    
    updateTotalDisplayCheckbox();
};

window.updateTotalDisplayCheckbox = function() {
    const sizeCheckboxContainer = document.getElementById('sizeCheckboxContainer');
    const checkboxes = sizeCheckboxContainer.querySelectorAll('.size-checkbox');
    let totalValue = 0;
    let hasSelection = false;
    
    checkboxes.forEach((checkbox, index) => {
        if (checkbox.checked) {
            const quantitySelect = document.getElementById(`size-quantity-${index}`);
            const customQuantity = document.getElementById(`size-custom-quantity-${index}`);
            
            let quantity = 0;
            
            if (quantitySelect.value === 'Outra') {
                customQuantity.classList.remove('hidden');
                quantity = parseInt(customQuantity.value) || 0;
            } else {
                customQuantity.classList.add('hidden');
                quantity = parseInt(quantitySelect.value) || 0;
            }
            
            if (quantity > 0) {
                selectedSizes[index].quantity = quantity;
                totalValue += selectedSizes[index].price * quantity;
                hasSelection = true;
            }
        }
    });
    
    const totalDisplayContainer = document.getElementById('totalDisplayContainer');
    const totalDisplayValue = document.getElementById('totalDisplayValue');
    const unitPriceDisplay = document.getElementById('unitPriceDisplay');
    
    if (hasSelection && totalValue > 0) {
        totalDisplayContainer.classList.remove('hidden');
        totalDisplayValue.textContent = `R$ ${totalValue.toFixed(2)}`;
        unitPriceDisplay.textContent = 'Valor total dos itens selecionados';
    } else {
        totalDisplayContainer.classList.add('hidden');
    }
};

// Função para obter os tamanhos selecionados
function getSelectedSizes() {
    const selectedItems = [];
    
    Object.keys(selectedSizes).forEach(index => {
        if (selectedSizes[index].checked && selectedSizes[index].quantity > 0) {
            selectedItems.push({
                name: selectedSizes[index].name,
                price: selectedSizes[index].price,
                quantity: selectedSizes[index].quantity
            });
        }
    });
    
    return selectedItems;
}

// -----------------------------------------------------------------------------
// SISTEMA DE CARRINHO E MÚLTIPLOS ITENS NO PEDIDO DO CLIENTE
// -----------------------------------------------------------------------------
window.adicionarAoCarrinho = function() {
    const productType = document.getElementById('productTypeSelect').value;
    const model = document.getElementById('modelSelect').value;
    
    if (!productType || !model) {
        showToast('Selecione um produto e modelo antes de adicionar.', 'error');
        return;
    }
    
    const selectedSizeItems = getSelectedSizes();
    
    if (selectedSizeItems.length === 0) {
        showToast('Marque pelo menos um tamanho com quantidade.', 'error');
        return;
    }
    
    const obs = document.getElementById('orderObs').value.trim();
    let totalEstimated = 0;
    
    // Adiciona cada tamanho selecionado como um item no carrinho
    selectedSizeItems.forEach(sizeItem => {
        const itemTotal = sizeItem.price * sizeItem.quantity;
        totalEstimated += itemTotal;
        
        currentCart.push({
            productType,
            model,
            product: sizeItem.name,
            productFullDescription: `${sizeItem.name} - R$ ${sizeItem.price.toFixed(2)}`,
            quantity: sizeItem.quantity + ' unidades',
            quantityNumber: sizeItem.quantity,
            unitPrice: sizeItem.price,
            totalEstimated: itemTotal,
            obs: obs
        });
    });
    
    renderCart();
    
    // Resetar campos
    document.getElementById('sizeCheckboxContainer').innerHTML = '';
    selectedSizes = {};
    document.getElementById('modelSelect').selectedIndex = 0;
    document.getElementById('orderObs').value = '';
    document.getElementById('sizeContainer').classList.add('hidden');
    document.getElementById('totalDisplayContainer').classList.add('hidden');
    
    showToast(`${selectedSizeItems.length} item(ns) adicionado(s) ao pedido.`, 'success');
};

function renderCart() {
    const container = document.getElementById('cartContainer');
    const list = document.getElementById('cartItemsList');
    const subtotalEl = document.getElementById('cartSubtotal');
    
    if (currentCart.length === 0) {
        container.classList.add('hidden');
        return;
    }
    
    container.classList.remove('hidden');
    let subtotal = 0;
    
    list.innerHTML = currentCart.map((item, index) => {
        subtotal += item.totalEstimated;
        return `
            <li class="flex justify-between items-center border-b border-white/10 pb-2 mb-2 last:border-0 last:pb-0 last:mb-0">
                <div>
                    <p class="font-medium text-white">${item.product}</p>
                    <p class="text-xs text-white/60">${item.quantity} | R$ ${item.totalEstimated.toFixed(2)}</p>
                </div>
                <button type="button" onclick="removerDoCarrinho(${index})" class="text-red-400 hover:text-red-300 p-2">
                    <i class="fas fa-trash"></i>
                </button>
            </li>
        `;
    }).join('');
    
    subtotalEl.textContent = `R$ ${subtotal.toFixed(2)}`;
}

window.removerDoCarrinho = function(index) {
    currentCart.splice(index, 1);
    renderCart();
};

window.submitOrder = async function(e) {
    e.preventDefault();
    if (!currentUserData) return;
    
    // Se o cliente preencheu algo e clicou em Enviar direto, captura o item para o carrinho antes.
    const selectedSizeItems = getSelectedSizes();
    if (selectedSizeItems.length > 0) {
        window.adicionarAoCarrinho();
    }
    
    if (currentCart.length === 0) {
        showToast('Adicione pelo menos um item ao pedido.', 'error');
        return;
    }
    
    const btn = e.target.querySelector('button[type="submit"]');
    const originalText = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processando...';
    btn.disabled = true;
    
    const totalOrderValue = currentCart.reduce((acc, item) => acc + item.totalEstimated, 0);
    
    try {
        if (editingOrderId) {
            // Editando um pedido existente a partir da home
            const orderRef = ref(db, `orders/${editingOrderId}`);
            await update(orderRef, {
                items: currentCart,
                totalEstimated: totalOrderValue,
                product: currentCart.length === 1 ? currentCart[0].product : `${currentCart.length} itens`,
                quantity: currentCart.length === 1 ? currentCart[0].quantity : `Diversas`,
                obs: currentCart.length === 1 ? currentCart[0].obs : ''
            });
            showToast('Pedido atualizado com os novos itens!', 'success');
            
            btn.innerHTML = '<i class="fas fa-paper-plane"></i> Finalizar Pedido Completo';
            editingOrderId = null;
        } else {
            // Criando pedido novo
            const newOrder = {
                userId: currentUserData.uid,
                clientName: currentUserData.name,
                clientEmail: currentUserData.email,
                clientPhone: currentUserData.phone || '',
                clientCompany: currentUserData.company || '',
                items: currentCart, 
                totalEstimated: totalOrderValue,
                priority: "Média",
                status: "novo",
                createdAt: Date.now(),
                product: currentCart.length === 1 ? currentCart[0].product : `${currentCart.length} itens`,
                quantity: currentCart.length === 1 ? currentCart[0].quantity : `Diversas`,
                obs: currentCart.length === 1 ? currentCart[0].obs : ''
            };
            
            const ordersListRef = ref(db, 'orders');
            await push(ordersListRef, newOrder);
            
            showToast('Pedido completo enviado com sucesso!', 'success');
            if (totalOrderValue) {
                showToast(`Valor total: R$ ${totalOrderValue.toFixed(2)}`, 'success');
            }
        }
        
        // Limpar tudo
        document.getElementById('orderForm').reset();
        document.getElementById('modelContainer').classList.add('hidden');
        document.getElementById('sizeContainer').classList.add('hidden');
        document.getElementById('sizeCheckboxContainer').innerHTML = '';
        document.getElementById('totalDisplayContainer').classList.add('hidden');
        
        selectedSizes = {};
        currentCart = [];
        renderCart();
        
    } catch (error) {
        console.error(error);
        showToast('Erro ao processar pedido.', 'error');
    } finally {
        if (!editingOrderId) {
            btn.innerHTML = originalText;
        }
        btn.disabled = false;
    }
};

// Listener para clientes
function initClientListeners() {
    const ordersRef = ref(db, 'orders');
    onValue(ordersRef, (snapshot) => {
        globalClientOrders = {};
        const data = snapshot.val();
        const myOrders = [];
        if (data) {
            Object.keys(data).forEach(key => {
                if (data[key].userId === currentUserData.uid) {
                    const orderObj = { id: key, ...data[key] };
                    myOrders.push(orderObj);
                    globalClientOrders[key] = orderObj;
                }
            });
        }
        renderClientOrders(myOrders.sort((a,b) => b.createdAt - a.createdAt));
    }, (error) => {
        console.error("Erro ao carregar pedidos:", error);
        document.getElementById('clientOrdersList').innerHTML = '<div class="col-span-full text-center py-10 text-red-500">Erro ao carregar pedidos.</div>';
    });
}

function renderClientOrders(orders) {
    const list = document.getElementById('clientOrdersList');
    if (orders.length === 0) {
        list.innerHTML = '<div class="col-span-full text-center py-10 bg-white/10 rounded-3xl border border-white/20 text-white/70"><i class="fas fa-box-open text-4xl mb-4 text-white/30 block"></i>Nenhum pedido realizado ainda.</div>';
        return;
    }
    
    const statusColors = { 
        'novo': 'from-purple-600 to-indigo-600', 
        'producao': 'from-pink-600 to-rose-600', 
        'finalizado': 'from-cyan-600 to-blue-600',
        'entregue': 'from-green-600 to-emerald-600' 
    };
    const statusText = { 
        'novo': 'Pendente', 
        'producao': 'Em Produção', 
        'finalizado': 'Finalizado',
        'entregue': 'Entregue' 
    };
    
    list.innerHTML = orders.map(order => {
        const estimatedValue = order.totalEstimated ? 
            `<div class="text-sm font-bold text-white mt-2">Valor Total: R$ ${order.totalEstimated.toFixed(2)}</div>` : '';
        
        let displayProduct = '';
        let displayQty = '';
        
        if (order.items && order.items.length > 0) {
            displayProduct = order.items.length === 1 ? order.items[0].product : `${order.items.length} itens (Clique p/ ver)`;
            displayQty = order.items.length === 1 ? order.items[0].quantity : `Diversas`;
        } else {
            displayProduct = order.product || 'Produto não especificado';
            displayQty = order.quantity || '';
        }
        
        return `
        <div class="bg-gradient-to-br ${statusColors[order.status] || statusColors['novo']} p-6 rounded-3xl shadow-xl flex flex-col gap-4 relative overflow-hidden cursor-pointer hover:scale-[1.02] transition-transform" onclick="abrirModalCliente('${order.id}')">
            <div class="flex justify-between items-start">
                <div>
                    <span class="text-xs font-semibold text-white/70 uppercase tracking-wider">${window.formatDateTime(order.createdAt).split(' às')[0]}</span>
                    <h4 class="font-bold text-white text-lg leading-tight mt-1">${displayProduct}</h4>
                    ${estimatedValue}
                </div>
                <span class="text-xs px-3 py-1.5 rounded-full font-bold bg-white/20 text-white text-center">
                    ${statusText[order.status] || statusText['novo']}
                </span>
            </div>
            <div class="text-sm text-white/90 flex items-center gap-2">
                <i class="fas fa-cubes text-white/60"></i> ${displayQty}
            </div>
        </div>`;
    }).join('');
}

// -----------------------------------------------------------------------------
// LÓGICA DO MODAL DO CLIENTE (VISUALIZAR, EDITAR, REPETIR)
// -----------------------------------------------------------------------------
window.abrirModalCliente = function(orderId) {
    const order = globalClientOrders[orderId] || globalOrders[orderId];
    if (!order) return;
    
    document.getElementById('clientModalOrderId').value = order.id;
    document.getElementById('clientModalStatus').textContent = (order.status === 'novo' ? 'Pendente' : order.status === 'producao' ? 'Em Produção' : order.status === 'finalizado' ? 'Finalizado' : 'Entregue');
    
    // Exibir mensagens de status de alteração
    const alterationPendingMessage = document.getElementById('alterationPendingMessage');
    const alterationApprovedMessage = document.getElementById('alterationApprovedMessage');
    const alterationSentDate = document.getElementById('alterationSentDate');
    const approvalSentDate = document.getElementById('approvalSentDate');
    const approvalDate = document.getElementById('approvalDate');
    
    // Verifica se há alteração pendente
    if (order.alterationStatus === 'pending') {
        alterationPendingMessage.classList.remove('hidden');
        alterationApprovedMessage.classList.add('hidden');
        if (order.alterationSentAt) {
            alterationSentDate.textContent = window.formatDateTime(order.alterationSentAt);
        }
    } 
    // Verifica se há alteração aprovada
    else if (order.alterationStatus === 'approved') {
        alterationPendingMessage.classList.add('hidden');
        alterationApprovedMessage.classList.remove('hidden');
        if (order.alterationSentAt) {
            approvalSentDate.textContent = window.formatDateTime(order.alterationSentAt);
        }
        if (order.alterationApprovedAt) {
            approvalDate.textContent = window.formatDateTime(order.alterationApprovedAt);
        }
    }
    // Sem alterações
    else {
        alterationPendingMessage.classList.add('hidden');
        alterationApprovedMessage.classList.add('hidden');
    }
    
    // VERIFICA SE O CLIENTE PODE EDITAR O PEDIDO
    const podeEditar = order.status === 'novo';
    
    const btnSalvar = document.querySelector('button[onclick="salvarEdicaoPedidoCliente()"]');
    const btnAdicionar = document.querySelector('button[onclick="prepararAdicaoItemExistente()"]');
    const btnExcluir = document.querySelector('button[onclick="excluirPedidoCliente()"]');
    const btnRepetir = document.querySelector('button[onclick="repetirPedidoCliente()"]');
    
    const warningDiv = document.getElementById('editRestrictionWarning');
    if (warningDiv) {
        if (!podeEditar) {
            warningDiv.classList.remove('hidden');
        } else {
            warningDiv.classList.add('hidden');
        }
    }
    
    const botoesEdicao = [btnSalvar, btnAdicionar, btnExcluir];
    botoesEdicao.forEach(btn => {
        if (btn) {
            btn.disabled = !podeEditar;
            if (!podeEditar) {
                btn.classList.add('opacity-50', 'cursor-not-allowed');
                btn.title = 'Pedido não pode ser editado - status: ' + (order.status === 'producao' ? 'Em Produção' : order.status === 'finalizado' ? 'Finalizado' : 'Entregue');
            } else {
                btn.classList.remove('opacity-50', 'cursor-not-allowed');
                btn.title = '';
            }
        }
    });
    
    if (btnRepetir) {
        btnRepetir.disabled = false;
        btnRepetir.classList.remove('opacity-50', 'cursor-not-allowed');
    }
    
    const qtyInputs = document.querySelectorAll('#clientModalItemsList .item-qty-input');
    qtyInputs.forEach(input => {
        input.disabled = !podeEditar;
        if (!podeEditar) {
            input.classList.add('opacity-50', 'cursor-not-allowed');
        } else {
            input.classList.remove('opacity-50', 'cursor-not-allowed');
        }
    });
    
    const removeButtons = document.querySelectorAll('#clientModalItemsList button[onclick="removerItemModalCliente(this)"]');
    removeButtons.forEach(btn => {
        btn.disabled = !podeEditar;
        if (!podeEditar) {
            btn.classList.add('opacity-50', 'cursor-not-allowed');
        } else {
            btn.classList.remove('opacity-50', 'cursor-not-allowed');
        }
    });
    
    const obsField = document.getElementById('clientModalObs');
    if (obsField) {
        obsField.disabled = !podeEditar;
        if (!podeEditar) {
            obsField.classList.add('opacity-50', 'cursor-not-allowed');
        } else {
            obsField.classList.remove('opacity-50', 'cursor-not-allowed');
        }
    }
    
    const itemsList = document.getElementById('clientModalItemsList');
    
    let items = [];
    if (order.items && Array.isArray(order.items)) {
        items = [...order.items];
    } else {
        items = [{
            product: order.product,
            productFullDescription: order.productFullDescription,
            quantity: order.quantity,
            quantityNumber: parseInt(order.quantity) || 0,
            unitPrice: order.unitPrice || 0,
            totalEstimated: order.totalEstimated || 0,
            obs: order.obs || ''
        }];
    }
    
    itemsList.innerHTML = items.map((item, index) => {
        const qtyNum = item.quantityNumber || parseInt(item.quantity) || 0;
        const disabledAttr = !podeEditar ? 'disabled' : '';
        const disabledClass = !podeEditar ? 'opacity-50 cursor-not-allowed' : '';
        
        return `
        <div class="modal-cart-item flex flex-col sm:flex-row justify-between sm:items-center bg-white/5 p-4 rounded-xl border border-white/10 gap-3" data-unit-price="${item.unitPrice || 0}">
            <div class="flex-1">
                <p class="font-medium text-white text-sm item-product-name">${item.product}</p>
                <p class="text-xs text-white/50 mt-1 item-product-desc hidden">${item.productFullDescription || item.product}</p>
                <input type="hidden" class="item-product-type" value="${item.productType || ''}">
                <input type="hidden" class="item-model" value="${item.model || ''}">
                <input type="hidden" class="item-obs" value="${item.obs || ''}">
            </div>
            <div class="flex items-center gap-3">
                <label class="text-xs text-white/50">Qtd:</label>
                <input type="number" min="1" value="${qtyNum}" oninput="recalcularTotalModalCliente()" class="item-qty-input w-24 bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-400 ${disabledClass}" ${disabledAttr}>
                <button type="button" onclick="removerItemModalCliente(this)" class="text-red-400 hover:text-red-300 bg-red-400/10 p-2 rounded-lg transition ${disabledClass}" ${disabledAttr}><i class="fas fa-trash"></i></button>
            </div>
        </div>`;
    }).join('');
    
    const obsValue = order.generalObs || (order.items ? '' : order.obs) || '';
    if (obsField) {
        obsField.value = obsValue;
        obsField.disabled = !podeEditar;
        if (!podeEditar) {
            obsField.classList.add('opacity-50', 'cursor-not-allowed');
        } else {
            obsField.classList.remove('opacity-50', 'cursor-not-allowed');
        }
    }
    
    recalcularTotalModalCliente();
    document.getElementById('clientOrderModal').classList.remove('hidden');
};

window.closeClientOrderModal = function() {
    document.getElementById('clientOrderModal').classList.add('hidden');
};

window.removerItemModalCliente = function(btn) {
    btn.closest('.modal-cart-item').remove();
    recalcularTotalModalCliente();
};

window.recalcularTotalModalCliente = function() {
    const items = document.querySelectorAll('#clientModalItemsList .modal-cart-item');
    let total = 0;
    items.forEach(el => {
        const unitPrice = parseFloat(el.getAttribute('data-unit-price')) || 0;
        const qty = parseInt(el.querySelector('.item-qty-input').value) || 0;
        total += (unitPrice * qty);
    });
    document.getElementById('clientModalTotalValue').textContent = `R$ ${total.toFixed(2)}`;
};

window.excluirPedidoCliente = async function() {
    const orderId = document.getElementById('clientModalOrderId').value;
    const order = globalClientOrders[orderId] || globalOrders[orderId];
    
    if (!order) {
        showToast('Pedido não encontrado.', 'error');
        return;
    }
    
    if (order.status !== 'novo') {
        showToast('Não é possível excluir este pedido. Apenas pedidos pendentes podem ser excluídos.', 'error');
        return;
    }
    
    if (!confirm('Tem certeza que deseja excluir este pedido? Esta ação não pode ser desfeita.')) {
        return;
    }
    
    try {
        const clientName = currentUserData.name || order.clientName || 'Cliente sem nome';
        const clientEmail = currentUserData.email || order.clientEmail || 'N/A';
        
        let itemsInfo = '';
        if (order.items && order.items.length > 0) {
            itemsInfo = order.items.map(item => 
                `${item.quantityNumber || item.quantity} x ${item.product}`
            ).join(', ');
        } else {
            itemsInfo = order.product || 'Produto não especificado';
        }
        
        const totalValue = order.totalEstimated ? `R$ ${order.totalEstimated.toFixed(2)}` : 'N/A';
        
        await remove(ref(db, `orders/${orderId}`));
        
        await createNotification(
            `Pedido do cliente ${clientName} foi excluído por @${clientName} (${clientEmail})\n` +
            `📦 Pedido: ${itemsInfo}\n` +
            `💰 Valor Total: ${totalValue}\n` +
            `📅 Data: ${window.formatDateTime(Date.now())}`
        );
        
        showToast('Pedido excluído com sucesso!', 'success');
        closeClientOrderModal();
    } catch (error) {
        console.error(error);
        showToast('Erro ao excluir pedido.', 'error');
    }
};

window.salvarEdicaoPedidoCliente = async function() {
    const orderId = document.getElementById('clientModalOrderId').value;
    const order = globalClientOrders[orderId] || globalOrders[orderId];
    
    if (!order || order.status !== 'novo') {
        showToast('Não é possível editar este pedido. Apenas pedidos pendentes podem ser editados.', 'error');
        return;
    }
    
    const itemsEls = document.querySelectorAll('#clientModalItemsList .modal-cart-item');
    
    if (itemsEls.length === 0) {
        showToast('O pedido não pode ficar vazio. Adicione itens ou exclua se não quiser mais.', 'error');
        return;
    }
    
    let newItems = [];
    let newTotal = 0;
    
    itemsEls.forEach(el => {
        const qtyNumber = parseInt(el.querySelector('.item-qty-input').value) || 0;
        const unitPrice = parseFloat(el.getAttribute('data-unit-price')) || 0;
        const product = el.querySelector('.item-product-name').textContent;
        const productFullDesc = el.querySelector('.item-product-desc').textContent;
        const productType = el.querySelector('.item-product-type').value;
        const model = el.querySelector('.item-model').value;
        const obs = el.querySelector('.item-obs').value;
        
        const totalEst = qtyNumber * unitPrice;
        newTotal += totalEst;
        
        newItems.push({
            productType: productType,
            model: model,
            product: product,
            productFullDescription: productFullDesc,
            quantity: qtyNumber + ' unidades',
            quantityNumber: qtyNumber,
            unitPrice: unitPrice,
            totalEstimated: totalEst,
            obs: obs
        });
    });
    
    const generalObs = document.getElementById('clientModalObs').value;
    
    try {
        const orderRef = ref(db, `orders/${orderId}`);
        const originalOrder = globalClientOrders[orderId] || globalOrders[orderId];
        
        const legacyProduct = newItems.length === 1 ? newItems[0].product : `${newItems.length} itens`;
        const legacyQty = newItems.length === 1 ? newItems[0].quantity : 'Diversas';
        const legacyObs = newItems.length === 1 ? newItems[0].obs : '';
        
        // Marca o pedido como "alteração pendente de aprovação"
        await update(orderRef, {
            items: newItems,
            totalEstimated: newTotal,
            generalObs: generalObs,
            product: legacyProduct,
            quantity: legacyQty,
            obs: generalObs || legacyObs,
            alterationStatus: 'pending',
            alterationSentAt: Date.now(),
            alterationApprovedAt: null
        });
        
        // NOTIFICAÇÃO DE EDIÇÃO PELO CLIENTE
        const clientName = currentUserData.name || 'Cliente';
        
        const itemsSummary = newItems.map(i => `${i.quantityNumber}x ${i.product}`).join(', ');
        const totalDisplay = `R$ ${newTotal.toFixed(2)}`;
        
        await createNotification(
            `@${clientName} solicitou alterações no pedido\n` +
            `📦 Novos itens: ${itemsSummary}\n` +
            `💰 Novo total: ${totalDisplay}\n` +
            `⏰ Aguardando aprovação do Admin`
        );
        
        showToast('Alterações enviadas para aprovação!', 'success');
        closeClientOrderModal();
    } catch (error) {
        console.error(error);
        showToast('Erro ao atualizar pedido.', 'error');
    }
};

// Função para aprovar alteração (chamada pelo admin)
window.aprovarAlteracaoPedido = async function(orderId) {
    try {
        const orderRef = ref(db, `orders/${orderId}`);
        await update(orderRef, {
            alterationStatus: 'approved',
            alterationApprovedAt: Date.now()
        });
        
        showToast('Alteração aprovada com sucesso!', 'success');
    } catch (error) {
        console.error(error);
        showToast('Erro ao aprovar alteração.', 'error');
    }
};

window.repetirPedidoCliente = async function() {
    const orderId = document.getElementById('clientModalOrderId').value;
    const originalOrder = globalClientOrders[orderId] || globalOrders[orderId];
    if (!originalOrder) return;
    
    const btn = document.querySelector('button[onclick="repetirPedidoCliente()"]');
    const origBtnHtml = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Copiando...';
    btn.disabled = true;
    
    const clonedOrder = { ...originalOrder };
    delete clonedOrder.id; 
    clonedOrder.status = 'novo';
    clonedOrder.createdAt = Date.now();
    delete clonedOrder.alterationStatus;
    delete clonedOrder.alterationSentAt;
    delete clonedOrder.alterationApprovedAt;
    
    try {
        const ordersListRef = ref(db, 'orders');
        await push(ordersListRef, clonedOrder);
        showToast('Pedido repetido e enviado com sucesso!', 'success');
        closeClientOrderModal();
    } catch (error) {
        console.error(error);
        showToast('Erro ao repetir pedido.', 'error');
    } finally {
        btn.innerHTML = origBtnHtml;
        btn.disabled = false;
    }
};

window.prepararAdicaoItemExistente = function() {
    const orderId = document.getElementById('clientModalOrderId').value;
    const order = globalClientOrders[orderId] || globalOrders[orderId];
    
    if (!order || order.status !== 'novo') {
        showToast('Não é possível editar este pedido. Apenas pedidos pendentes podem ser editados.', 'error');
        return;
    }
    
    editingOrderId = orderId;
    
    if (order.items) {
        currentCart = [...order.items];
    } else {
        currentCart = [{
            productType: order.productType,
            model: order.model,
            product: order.product,
            productFullDescription: order.productFullDescription,
            quantity: order.quantity,
            quantityNumber: parseInt(order.quantity) || 0,
            unitPrice: order.unitPrice,
            totalEstimated: order.totalEstimated,
            obs: order.obs
        }];
    }
    
    closeClientOrderModal();
    renderCart();
    
    document.getElementById('productTypeSelect').focus();
    
    const submitBtn = document.querySelector('button[type="submit"]');
    submitBtn.innerHTML = '<i class="fas fa-save"></i> Atualizar Pedido Existente';
    showToast('Adicione novos itens no formulário e clique em Atualizar Pedido.', 'info');
};

// -----------------------------------------------------------------------------
// RESTANTE DO CÓDIGO ADMIN MASTER (Mantido igual ao original)
// -----------------------------------------------------------------------------
window.switchAdminTab = function(tab) {
    document.getElementById('adminPedidosView').classList.add('hidden');
    document.getElementById('adminClientsView').classList.add('hidden');
    document.getElementById('adminNotificationsView').classList.add('hidden');
    
    document.getElementById('tabPedidos').className = "px-6 py-5 text-sm font-bold border-b-4 border-transparent text-white/70 hover:text-white whitespace-nowrap transition";
    document.getElementById('tabClients').className = "px-6 py-5 text-sm font-bold border-b-4 border-transparent text-white/70 hover:text-white whitespace-nowrap transition";
    document.getElementById('tabNotifications').className = "px-6 py-5 text-sm font-bold border-b-4 border-transparent text-white/70 hover:text-white whitespace-nowrap transition";
    
    if (tab === 'pedidos') {
        document.getElementById('adminPedidosView').classList.remove('hidden');
        document.getElementById('tabPedidos').className = "px-6 py-5 text-sm font-bold border-b-4 border-blue-500 text-white whitespace-nowrap transition";
    } else if (tab === 'clients') {
        document.getElementById('adminClientsView').classList.remove('hidden');
        document.getElementById('tabClients').className = "px-6 py-5 text-sm font-bold border-b-4 border-blue-500 text-white whitespace-nowrap transition";
        renderClientsList();
    } else if (tab === 'notifications') {
        document.getElementById('adminNotificationsView').classList.remove('hidden');
        document.getElementById('tabNotifications').className = "px-6 py-5 text-sm font-bold border-b-4 border-blue-500 text-white whitespace-nowrap transition";
        renderNotifications();
        clearNotificationBadge();
    }
};

function initAdminListeners() {
    const ordersRef = ref(db, 'orders');
    onValue(ordersRef, (snapshot) => {
        globalOrders = {};
        const data = snapshot.val();
        if (data) {
            Object.keys(data).forEach(key => {
                globalOrders[key] = { id: key, ...data[key] };
            });
        }
        renderKanban();
        if(!document.getElementById('adminClientsView').classList.contains('hidden')){
            renderClientsList();
        }
    }, (error) => {
        console.error("Erro ao carregar pedidos:", error);
    });
    
    const usersRef = ref(db, 'users');
    onValue(usersRef, (snapshot) => {
        globalUsers = {};
        const data = snapshot.val();
        if(data) {
            Object.keys(data).forEach(key => {
                if(data[key].role === 'client') {
                    globalUsers[key] = { uid: key, ...data[key] };
                }
            });
        }
        if(!document.getElementById('adminClientsView').classList.contains('hidden')){
            renderClientsList();
        }
    }, (error) => {
        console.error("Erro ao carregar usuários:", error);
    });
    
    const notificationsRef = ref(db, 'notifications');
    onValue(notificationsRef, (snapshot) => {
        globalNotifications = {};
        const data = snapshot.val();
        if(data) {
            Object.keys(data).forEach(key => {
                globalNotifications[key] = { id: key, ...data[key] };
            });
        }
        updateNotificationBadge();
        if(!document.getElementById('adminNotificationsView').classList.contains('hidden')){
            renderNotifications();
        }
    }, (error) => {
        console.error("Erro ao carregar notificações:", error);
    });
}

function renderKanban() {
    const cols = { novo: [], producao: [], finalizado: [], entregue: [] };
    
    Object.values(globalOrders).forEach(order => {
        if(cols[order.status]) {
            cols[order.status].push(order);
        } else {
            cols['novo'].push(order);
        }
    });
    
    cols.novo.sort((a,b) => a.createdAt - b.createdAt);
    cols.producao.sort((a,b) => a.createdAt - b.createdAt);
    cols.finalizado.sort((a,b) => b.createdAt - a.createdAt);
    cols.entregue.sort((a,b) => b.createdAt - a.createdAt);
    
    document.getElementById('countNovos').innerText = cols.novo.length;
    document.getElementById('countProducao').innerText = cols.producao.length;
    document.getElementById('countFinalizado').innerText = cols.finalizado.length;
    document.getElementById('countEntregue').innerText = cols.entregue.length;
    
    ['novo', 'producao', 'finalizado', 'entregue'].forEach(status => {
        const container = document.getElementById(`kanban-${status}`);
        if (cols[status].length === 0) {
            container.innerHTML = `<div class="text-center py-8 text-white/50 font-medium">Nenhum pedido</div>`;
            return;
        }
        container.innerHTML = cols[status].map(order => createKanbanCard(order)).join('');
    });
}

function createKanbanCard(order) {
    const statusGradients = {
        'novo': 'from-purple-600 to-indigo-700',
        'producao': 'from-pink-600 to-rose-700',
        'finalizado': 'from-cyan-600 to-blue-700',
        'entregue': 'from-green-600 to-emerald-700'
    };
    
    const prioColors = {
        'Baixa': 'bg-green-500/20 text-green-200',
        'Média': 'bg-amber-500/20 text-amber-200',
        'Alta': 'bg-red-500/20 text-red-200'
    };
    
    let displayProductHtml = '';
    let displayQty = '';
    
    if (order.items && order.items.length > 0) {
        if (order.items.length === 1) {
            displayProductHtml = `<h4 class="font-bold text-white text-lg leading-tight mb-2">${order.items[0].product}</h4>`;
            displayQty = order.items[0].quantity;
        } else {
            displayProductHtml = `<h4 class="font-bold text-white text-lg leading-tight mb-2">Múltiplos Itens (${order.items.length}):</h4>
                                  <ul class="list-disc pl-4 text-sm font-normal text-white/90 mb-2">
                                     ${order.items.map(i => `<li>${i.quantityNumber}x ${i.product}</li>`).join('')}
                                  </ul>`;
            displayQty = `<span class="italic">Veja detalhes</span>`;
        }
    } else {
        displayProductHtml = `<h4 class="font-bold text-white text-lg leading-tight mb-2">${order.product}</h4>`;
        displayQty = order.quantity;
    }
    
    const estimatedValue = order.totalEstimated ? 
        `<div class="text-sm font-bold text-white mb-2">Valor Total: R$ ${order.totalEstimated.toFixed(2)}</div>` : '';
    
    const finalObs = order.generalObs || order.obs;
    const obsDisplay = finalObs ? 
        `<div class="text-xs text-white/80 mb-2 flex items-start gap-1"><i class="fas fa-comment-dots text-white/60 mt-0.5"></i> ${finalObs}</div>` : '';
    
    const alterationPending = order.alterationStatus === 'pending' ? 
        `<div class="bg-yellow-500/20 text-yellow-200 text-xs px-3 py-2 rounded-lg mb-2 flex items-center gap-2">
            <i class="fas fa-clock"></i> Alteração pendente de aprovação
        </div>` : '';
    
    const alterationApproved = order.alterationStatus === 'approved' ? 
        `<div class="bg-green-500/20 text-green-200 text-xs px-3 py-2 rounded-lg mb-2 flex items-center gap-2">
            <i class="fas fa-check-circle"></i> Alteração aprovada
        </div>` : '';
    
    return `
    <div id="order-${order.id}" class="draggable-card bg-gradient-to-br ${statusGradients[order.status] || statusGradients['novo']} p-5 rounded-2xl border border-white/20 shadow-xl hover:shadow-2xl transition-all relative overflow-hidden group" 
         draggable="true" 
         ondragstart="drag(event)" 
         ondragend="dragEnd(event)"
         ontouchstart="touchStart(event)" 
         ontouchmove="touchMove(event)" 
         ontouchend="touchEnd(event)">
         
        <div class="flex justify-between items-start mb-3">
            <span class="text-xs font-bold px-3 py-1 rounded-full ${prioColors[order.priority] || prioColors['Média']}">
                ${order.priority || 'Média'}
            </span>
            <span class="text-[10px] text-white/70 font-medium uppercase tracking-wider">${window.formatDateTime(order.createdAt).split(' às')[0]}</span>
        </div>
        
        ${alterationPending}
        ${alterationApproved}
        
        ${displayProductHtml}
        
        <div class="text-sm text-white/80 mb-2 flex items-center gap-2">
            <i class="fas fa-cubes text-white/60"></i> ${displayQty}
        </div>
        ${estimatedValue}
        ${obsDisplay}
        
        ${order.alterationStatus === 'pending' ? `
        <div class="mt-2 mb-2">
            <button onclick="aprovarAlteracaoPedido('${order.id}')" class="w-full bg-green-500 text-white text-sm font-bold px-4 py-2 rounded-xl hover:bg-green-600 transition flex items-center justify-center gap-2">
                <i class="fas fa-check"></i> Aceitar Alteração
            </button>
        </div>` : ''}
        
        <div class="pt-4 border-t border-white/20 mt-2">
            <button onclick="openEditModal('${order.id}')" class="flex items-center gap-2 text-sm font-semibold text-white/90 hover:text-white hover:bg-white/10 px-3 py-2 rounded-xl transition w-full text-left">
                <i class="fas fa-user-circle text-white/70 text-xl"></i> 
                <span class="truncate flex-1">${order.clientName}</span>
                <i class="fas fa-edit text-white/50 group-hover:text-white transition"></i>
            </button>
        </div>
    </div>`;
}

// Funções para arrastar no mobile
let touchDragElement = null;
let touchDragTimeout = null;

window.touchStart = function(ev) {
    touchDragElement = ev.currentTarget;
    touchDragTimeout = setTimeout(() => {
        touchDragElement.classList.add('dragging-touch');
    }, 200);
};

window.touchMove = function(ev) {
    ev.preventDefault();
    if (!touchDragElement || !touchDragElement.classList.contains('dragging-touch')) return;
    
    const touch = ev.touches[0];
    const target = document.elementFromPoint(touch.clientX, touch.clientY);
    
    document.querySelectorAll('.kanban-column').forEach(col => col.classList.remove('drag-over'));
    
    if (target) {
        const column = target.closest('.kanban-column');
        if (column) {
            column.classList.add('drag-over');
        }
    }
};

window.touchEnd = function(ev) {
    if (touchDragTimeout) {
        clearTimeout(touchDragTimeout);
        touchDragTimeout = null;
    }
    
    if (!touchDragElement) return;
    
    const touch = ev.changedTouches[0];
    const target = document.elementFromPoint(touch.clientX, touch.clientY);
    
    document.querySelectorAll('.kanban-column').forEach(col => col.classList.remove('drag-over'));
    
    if (target) {
        const column = target.closest('.kanban-column');
        if (column && touchDragElement.classList.contains('dragging-touch')) {
            const cardId = touchDragElement.id.replace('order-', '');
            const targetStatus = column.id.replace('kanban-', '');
            
            if (targetStatus && targetStatus !== '') {
                handleDrop(cardId, targetStatus);
            }
        }
    }
    
    touchDragElement.classList.remove('dragging-touch');
    touchDragElement = null;
};

window.drag = function(ev) {
    ev.dataTransfer.setData("text", ev.target.id);
    setTimeout(() => ev.target.classList.add('dragging'), 0);
};

window.dragEnd = function(ev) {
    ev.target.classList.remove('dragging');
    document.querySelectorAll('.kanban-column').forEach(col => col.classList.remove('drag-over'));
};

window.allowDrop = function(ev) {
    ev.preventDefault();
};

window.dragEnter = function(ev) {
    ev.preventDefault();
    if(ev.currentTarget.classList.contains('kanban-column')) {
        ev.currentTarget.classList.add('drag-over');
    }
};

window.dragLeave = function(ev) {
    if(ev.currentTarget.classList.contains('kanban-column')) {
        ev.currentTarget.classList.remove('drag-over');
    }
};

window.drop = async function(ev, targetStatus) {
    ev.preventDefault();
    const columns = document.querySelectorAll('.kanban-column');
    columns.forEach(col => col.classList.remove('drag-over'));
    
    const cardId = ev.dataTransfer.getData("text");
    if(!cardId) return;
    
    const rawId = cardId.replace('order-', '');
    handleDrop(rawId, targetStatus);
};

async function handleDrop(rawId, targetStatus) {
    const order = globalOrders[rawId];
    
    if(order && order.status !== targetStatus) {
        try {
            const orderRef = ref(db, `orders/${rawId}`);
            await update(orderRef, { status: targetStatus });
            showToast(`Pedido movido para ${targetStatus.toUpperCase()}`, 'success');
        } catch(err) {
            showToast('Erro ao atualizar status', 'error');
        }
    }
}

window.openEditModal = function(orderId) {
    const order = globalOrders[orderId];
    if(!order) return;
    
    isViewingFromClientList = false;
    updateDeleteButtonVisibility();
    
    document.getElementById('editOrderId').value = orderId;
    document.getElementById('editClientUid').value = order.userId || '';
    document.getElementById('editClientName').value = order.clientName || '';
    document.getElementById('editClientPhone').value = order.clientPhone || '';
    document.getElementById('editClientEmail').value = order.clientEmail || '';
    document.getElementById('editClientCompany').value = order.clientCompany || '';
    
    let productString = order.product || '';
    let quantityString = order.quantity || '';
    const prodInput = document.getElementById('editProduct');
    const qtyInput = document.getElementById('editQuantity');
    
    if (order.items && order.items.length > 1) {
        productString = "Múltiplos Itens (Não editável aqui, acesse pelo cliente)";
        quantityString = `${order.items.length} itens`;
        prodInput.readOnly = true;
        prodInput.classList.add('bg-gray-100', 'text-gray-500');
        qtyInput.readOnly = true;
        qtyInput.classList.add('bg-gray-100', 'text-gray-500');
    } else {
        prodInput.readOnly = false;
        prodInput.classList.remove('bg-gray-100', 'text-gray-500');
        qtyInput.readOnly = false;
        qtyInput.classList.remove('bg-gray-100', 'text-gray-500');
        
        if (order.items && order.items.length === 1) {
            productString = order.items[0].product;
            quantityString = order.items[0].quantity;
        }
    }
    
    prodInput.value = productString;
    qtyInput.value = quantityString;
    
    document.getElementById('editObs').value = order.generalObs || order.obs || '';
    document.getElementById('editStatus').value = order.status;
    document.getElementById('editPriority').value = order.priority || 'Média';
    
    const editTotalValue = document.getElementById('editTotalValue');
    if (editTotalValue) {
        if (order.totalEstimated) {
            editTotalValue.textContent = `R$ ${order.totalEstimated.toFixed(2)}`;
        } else {
            editTotalValue.textContent = 'R$ 0,00';
        }
    }
    
    loadClientOrderHistory(order.userId);
    document.getElementById('adminEditModal').classList.remove('hidden');
};

function loadClientOrderHistory(userId) {
    const historyContainer = document.getElementById('clientOrderHistory');
    
    const clientOrders = Object.values(globalOrders)
        .filter(order => order.userId === userId)
        .sort((a, b) => b.createdAt - a.createdAt);
    
    if (clientOrders.length === 0) {
        historyContainer.innerHTML = '<p class="text-sm text-gray-400 text-center py-4">Nenhum pedido encontrado.</p>';
        return;
    }
    
    historyContainer.innerHTML = clientOrders.map(order => {
        const statusColors = { 
            'novo': 'bg-purple-100 text-purple-700', 
            'producao': 'bg-pink-100 text-pink-700', 
            'finalizado': 'bg-cyan-100 text-cyan-700',
            'entregue': 'bg-green-100 text-green-700' 
        };
        const statusText = { 
            'novo': 'Pendente', 
            'producao': 'Em Produção', 
            'finalizado': 'Finalizado',
            'entregue': 'Entregue' 
        };
        
        const estimatedValue = order.totalEstimated ? 
            `<p class="text-sm font-bold text-gray-700 mt-1">Valor Total: R$ ${order.totalEstimated.toFixed(2)}</p>` : '';
        
        const prodName = (order.items && order.items.length > 1) ? `${order.items.length} Itens Vários` : (order.product || 'N/A');
        const finalObs = order.generalObs || order.obs;
        
        return `
        <div class="bg-white border border-gray-200 rounded-xl p-4 flex items-center justify-between shadow-sm">
            <div class="flex-1">
                <p class="text-sm font-semibold text-gray-900">${prodName}</p>
                ${estimatedValue}
                ${finalObs ? `<p class="text-xs text-gray-500 mt-1"><i class="fas fa-comment-dots mr-1"></i>${finalObs}</p>` : ''}
                <p class="text-xs text-gray-500 mt-1">
                    <i class="fas fa-calendar-alt mr-1"></i>${window.formatDateTime(order.createdAt)}
                </p>
            </div>
            <span class="text-xs px-3 py-1.5 rounded-full font-bold ${statusColors[order.status] || statusColors['novo']} ml-3">
                ${statusText[order.status] || statusText['novo']}
            </span>
        </div>`;
    }).join('');
}

window.closeEditModal = function() {
    document.getElementById('adminEditModal').classList.add('hidden');
};

window.saveClientEdit = async function() {
    const orderId = document.getElementById('editOrderId').value;
    const clientUid = document.getElementById('editClientUid').value;
    const newStatus = document.getElementById('editStatus').value;
    const newPriority = document.getElementById('editPriority').value;
    const newClientName = document.getElementById('editClientName').value;
    const newClientPhone = document.getElementById('editClientPhone').value;
    const newClientEmail = document.getElementById('editClientEmail').value;
    const newClientCompany = document.getElementById('editClientCompany').value;
    const newProduct = document.getElementById('editProduct').value;
    const newQuantity = document.getElementById('editQuantity').value;
    const newObs = document.getElementById('editObs').value;
    
    try {
        const orderRef = ref(db, `orders/${orderId}`);
        const originalOrder = globalOrders[orderId];
        
        const updates = {
            status: newStatus,
            priority: newPriority,
            clientName: newClientName,
            clientPhone: newClientPhone,
            clientEmail: newClientEmail,
            clientCompany: newClientCompany,
            generalObs: newObs,
            obs: newObs
        };
        
        if (!document.getElementById('editProduct').readOnly) {
            updates.product = newProduct;
            updates.quantity = newQuantity;
            
            if (originalOrder && originalOrder.items && originalOrder.items.length === 1) {
                updates.items = [...originalOrder.items];
                updates.items[0].product = newProduct;
                updates.items[0].quantity = newQuantity;
                updates.items[0].obs = newObs;
            }
        }
        
        await update(orderRef, updates);
        
        if (clientUid && clientUid !== 'undefined' && clientUid !== '') {
            const userRef = ref(db, `users/${clientUid}`);
            await update(userRef, {
                name: newClientName,
                phone: newClientPhone,
                email: newClientEmail,
                company: newClientCompany
            });
        }
        
        const adminName = currentUserData.name || 'AdminMaster';
        const targetClientName = newClientName || 'Cliente';
        const notifications = [];
        
        if (originalOrder && originalOrder.status !== newStatus) {
            const statusText = { 'novo': 'Pendente', 'producao': 'Em Produção', 'finalizado': 'Finalizado', 'entregue': 'Entregue' };
            notifications.push(`@${adminName} editou o status de @${targetClientName}: ${statusText[originalOrder.status]} → ${statusText[newStatus]}`);
        }
        
        if (originalOrder && originalOrder.clientName !== newClientName) {
            notifications.push(`@${adminName} editou o nome de @${originalOrder.clientName}: ${originalOrder.clientName} → ${newClientName}`);
        }
        
        if (originalOrder && originalOrder.clientPhone !== newClientPhone) {
            const oldPhone = originalOrder.clientPhone || 'N/A';
            const newPhone = newClientPhone || 'N/A';
            notifications.push(`@${adminName} editou o telefone de @${targetClientName}: ${oldPhone} → ${newPhone}`);
        }
        
        if (originalOrder && originalOrder.clientEmail !== newClientEmail) {
            notifications.push(`@${adminName} editou o email de @${targetClientName}: ${originalOrder.clientEmail} → ${newClientEmail}`);
        }
        
        if (originalOrder && originalOrder.clientCompany !== newClientCompany) {
            const oldCompany = originalOrder.clientCompany || 'N/A';
            const newCompany = newClientCompany || 'N/A';
            notifications.push(`@${adminName} editou a empresa de @${targetClientName}: ${oldCompany} → ${newCompany}`);
        }
        
        if (originalOrder && !document.getElementById('editProduct').readOnly && originalOrder.product !== newProduct) {
            notifications.push(`@${adminName} editou o produto de @${targetClientName}: ${originalOrder.product} → ${newProduct}`);
        }
        
        if (originalOrder && !document.getElementById('editQuantity').readOnly && originalOrder.quantity !== newQuantity) {
            notifications.push(`@${adminName} editou a quantidade de @${targetClientName}: ${originalOrder.quantity} → ${newQuantity}`);
        }
        
        if (originalOrder && originalOrder.priority !== newPriority) {
            const oldPriority = originalOrder.priority || 'Média';
            notifications.push(`@${adminName} editou a prioridade de @${targetClientName}: ${oldPriority} → ${newPriority}`);
        }
        
        if (originalOrder && (originalOrder.generalObs || originalOrder.obs) !== newObs) {
            const oldObs = originalOrder.generalObs || originalOrder.obs || 'N/A';
            const newObsDisplay = newObs || 'N/A';
            notifications.push(`@${adminName} editou as observações de @${targetClientName}: ${oldObs} → ${newObsDisplay}`);
        }
        
        for (const notificationMessage of notifications) {
            await createNotification(notificationMessage);
        }
        
        showToast('Pedido e dados do cliente atualizados!', 'success');
        closeEditModal();
    } catch(err) {
        console.error("Erro ao salvar:", err);
        showToast('Erro ao salvar.', 'error');
    }
};

function updateDeleteButtonVisibility() {
    const deleteBtn = document.getElementById('deleteButton');
    if (deleteBtn) {
        if (isViewingFromClientList) {
            deleteBtn.innerHTML = '<i class="fas fa-trash"></i> Excluir Cliente';
            deleteBtn.setAttribute('onclick', 'deleteClient()');
        } else {
            deleteBtn.innerHTML = '<i class="fas fa-trash"></i> Excluir Pedido';
            deleteBtn.setAttribute('onclick', 'deleteOrder()');
        }
    }
}

window.deleteOrder = async function() {
    const orderId = document.getElementById('editOrderId').value;
    
    if (!orderId) {
        showToast('Nenhum pedido selecionado.', 'error');
        return;
    }
    
    if (!confirm('Tem certeza que deseja excluir este pedido? Esta ação não pode ser desfeita.')) {
        return;
    }
    
    try {
        await remove(ref(db, `orders/${orderId}`));
        
        const order = globalOrders[orderId];
        const clientName = order ? order.clientName : 'Cliente';
        
        await createNotification(`Pedido de ${clientName} foi excluído por @${currentUserData.name}`);
        
        showToast('Pedido excluído com sucesso!', 'success');
        closeEditModal();
        
        setTimeout(() => {
            renderKanban();
        }, 500);
        
    } catch(err) {
        console.error("Erro ao excluir pedido:", err);
        showToast('Erro ao excluir pedido.', 'error');
    }
};

window.deleteClient = async function() {
    const clientUid = document.getElementById('editClientUid').value;
    const clientName = document.getElementById('editClientName').value;
    const currentOrderId = document.getElementById('editOrderId').value;
    
    let displayNome = (clientName && clientName !== 'undefined') ? clientName : 'Sem Nome';
    
    if ((!displayNome || displayNome === 'Sem Nome') && currentOrderId && globalOrders[currentOrderId]) {
        displayNome = globalOrders[currentOrderId].clientName || displayNome;
    }
    
    if ((!displayNome || displayNome === 'Sem Nome') && clientUid && globalUsers[clientUid]) {
        displayNome = globalUsers[clientUid].name || displayNome;
    }
    
    if (!confirm(`Tem certeza que deseja excluir o pedido do cliente ${displayNome}? Esta ação não pode ser desfeita.`)) {
        return;
    }
    
    try {
        const ordersToDelete = Object.keys(globalOrders).filter(key => {
            const order = globalOrders[key];
            
            if (clientUid && clientUid !== 'undefined' && order.userId === clientUid) return true;
            if (currentOrderId && key === currentOrderId) return true;
            if ((!clientUid || clientUid === 'undefined') && order.userId === clientUid) return true;
            
            return false;
        });
        
        const adminName = currentUserData.name || 'Administrador';
        const adminEmail = currentUserData.email || 'N/A';
        
        for (const orderId of ordersToDelete) {
            const order = globalOrders[orderId];
            
            let orderClientName = order.clientName;
            if (!orderClientName || orderClientName === 'undefined') {
                if (order.userId && globalUsers[order.userId]) {
                    orderClientName = globalUsers[order.userId].name;
                }
                if (!orderClientName || orderClientName === 'undefined') {
                    orderClientName = 'Cliente sem nome';
                }
            }
            
            let itemsInfo = '';
            if (order.items && order.items.length > 0) {
                itemsInfo = order.items.map(item => 
                    `${item.quantityNumber || item.quantity} x ${item.product}`
                ).join(', ');
            } else {
                itemsInfo = order.product || 'Produto não especificado';
            }
            
            const totalValue = order.totalEstimated ? `R$ ${order.totalEstimated.toFixed(2)}` : 'N/A';
            
            await remove(ref(db, `orders/${orderId}`));
            
            await createNotification(
                `Pedido do cliente ${orderClientName} foi excluído por @${adminName} (${adminEmail})\n` +
                `📦 Pedido: ${itemsInfo}\n` +
                `💰 Valor Total: ${totalValue}\n` +
                `📅 Data: ${window.formatDateTime(Date.now())}`
            );
        }
        
        showToast(`Pedido removido do sistema com sucesso!`, 'success');
        closeEditModal();
        
        setTimeout(() => {
            renderKanban();
            if(!document.getElementById('adminClientsView').classList.contains('hidden')){
                renderClientsList();
            }
        }, 500);
        
    } catch(err) {
        console.error("Erro ao excluir pedido:", err);
        showToast('Erro ao excluir pedido. Verifique o console para mais detalhes.', 'error');
    }
};

async function createNotification(message) {
    try {
        const notificationsRef = ref(db, 'notifications');
        const newNotificationRef = push(notificationsRef);
        await set(newNotificationRef, {
            message: message,
            createdAt: Date.now(),
            read: false,
            createdBy: currentUserData.name
        });
    } catch (err) {
        console.error("Erro ao criar notificação:", err);
    }
}

function renderNotifications() {
    const container = document.getElementById('notificationsList');
    const notifications = Object.values(globalNotifications)
        .sort((a, b) => b.createdAt - a.createdAt);
    
    if (notifications.length === 0) {
        container.innerHTML = '<div class="text-center py-16 text-white/50"><i class="fas fa-bell-slash text-5xl mb-4 block"></i>Nenhuma notificação</div>';
        return;
    }
    
    container.innerHTML = notifications.map(notif => `
        <div class="p-5 hover:bg-white/5 transition flex items-start gap-4">
            <i class="fas fa-info-circle text-yellow-400 text-xl mt-1"></i>
            <div class="flex-1">
                <p class="text-sm text-white">${notif.message}</p>
                <p class="text-xs text-white/50 mt-2">${window.formatDateTime(notif.createdAt)}</p>
            </div>
        </div>
    `).join('');
}

function updateNotificationBadge() {
    const badge = document.getElementById('notificationBadge');
    const unreadCount = Object.values(globalNotifications).filter(n => !n.read).length;
    
    if (unreadCount > 0) {
        badge.classList.remove('hidden');
        badge.innerText = unreadCount;
    } else {
        badge.classList.add('hidden');
    }
}

function clearNotificationBadge() {
    const badge = document.getElementById('notificationBadge');
    badge.classList.add('hidden');
    
    Object.keys(globalNotifications).forEach(async (key) => {
        if (!globalNotifications[key].read) {
            await update(ref(db, `notifications/${key}`), { read: true });
        }
    });
}

function renderClientsList() {
    const tbody = document.getElementById('clientsTableBody');
    const clientStats = {};
    
    Object.values(globalUsers).forEach(user => {
        clientStats[user.uid] = {
            uid: user.uid,
            name: user.name,
            email: user.email,
            phone: user.phone || '',
            company: user.company || '',
            totalOrders: 0,
            lastOrderDate: null,
            itemsConfig: user.itemsConfig || { allowedItems: ['todos'], excludedItems: [] }
        };
    });
    
    Object.values(globalOrders).forEach(order => {
        const uid = order.userId;
        
        if (!uid || uid === 'undefined' || uid === 'null') return;
        
        if (!clientStats[uid]) {
            if (order.clientName && order.clientName !== 'undefined' && order.clientName.trim() !== '') {
                clientStats[uid] = { 
                    uid: uid,
                    name: order.clientName,
                    email: order.clientEmail || 'N/A',
                    phone: order.clientPhone || '',
                    company: order.clientCompany || '',
                    totalOrders: 0, 
                    lastOrderDate: null,
                    itemsConfig: { allowedItems: ['todos'], excludedItems: [] }
                };
            } else {
                return;
            }
        }
        
        clientStats[uid].totalOrders += 1;
        
        if(!clientStats[uid].lastOrderDate || order.createdAt > clientStats[uid].lastOrderDate) {
            clientStats[uid].lastOrderDate = order.createdAt;
        }
    });
    
    const clientArray = Object.values(clientStats)
        .filter(client => {
            if (!client.uid || client.uid === 'undefined' || client.uid === 'null') {
                return false;
            }
            
            if (!client.name || client.name === 'undefined' || client.name === 'null' || client.name.trim() === '') {
                return false;
            }
            
            if ((!client.email || client.email === 'N/A') && client.totalOrders === 0) {
                return false;
            }
            
            return true;
        })
        .sort((a,b) => b.totalOrders - a.totalOrders);
    
    document.getElementById('totalClientsCount').innerText = clientArray.length;
    
    if(clientArray.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="text-center py-12 text-white/50">Nenhum cliente registrado.</td></tr>';
        return;
    }
    
    tbody.innerHTML = clientArray.map(client => {
        const displayName = client.name && client.name !== 'undefined' ? client.name : 'Cliente sem nome';
        const displayEmail = client.email && client.email !== 'undefined' && client.email !== 'N/A' ? client.email : 'N/A';
        const allowedItems = client.itemsConfig && client.itemsConfig.allowedItems ? client.itemsConfig.allowedItems.join(', ') : 'todos';
        
        return `
        <tr class="hover:bg-white/5 transition cursor-pointer" onclick="openClientModal('${client.uid}')">
            <td class="px-6 py-5 font-medium text-white">
                <div class="flex items-center gap-3">
                    <div class="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex justify-center items-center text-white text-sm font-bold uppercase">
                        ${displayName.charAt(0) || '?'}
                    </div>
                    <div>
                        <p class="font-semibold">${displayName}</p>
                        <p class="text-xs text-white/60">${displayEmail}</p>
                    </div>
                </div>
            </td>
            <td class="px-6 py-5 text-white/70">${client.phone || 'N/A'}</td>
            <td class="px-6 py-5 text-white/70">${client.company || 'N/A'}</td>
            <td class="px-6 py-5 text-center">
                <span class="bg-white/10 text-white px-4 py-2 rounded-full text-xs font-bold">${client.totalOrders}</span>
            </td>
            <td class="px-6 py-5 text-right text-white/70 text-sm">
                ${client.lastOrderDate ? window.formatDateTime(client.lastOrderDate).split(' às')[0] : 'Nunca comprou'}
            </td>
            <td class="px-6 py-5 text-white/70">
                <span class="text-xs ${allowedItems === 'todos' ? 'text-green-400' : 'text-yellow-400'}">
                    ${allowedItems}
                </span>
            </td>
        </tr>
    `}).join('');
}

// Função para abrir modal de cliente com configuração de itens
window.openClientModal = function(clientUid) {
    isViewingFromClientList = true;
    updateDeleteButtonVisibility();
    
    // Carrega configuração de itens do cliente
    loadClientItemsConfigForEdit(clientUid);
    
    const clientOrders = Object.values(globalOrders)
        .filter(order => order.userId === clientUid)
        .sort((a, b) => b.createdAt - a.createdAt);
    
    if (clientOrders.length > 0) {
        const orderId = clientOrders[0].id;
        const order = globalOrders[orderId];
        
        document.getElementById('editOrderId').value = orderId;
        document.getElementById('editClientUid').value = clientUid;
        document.getElementById('editClientName').value = order.clientName || '';
        document.getElementById('editClientPhone').value = order.clientPhone || '';
        document.getElementById('editClientEmail').value = order.clientEmail || '';
        document.getElementById('editClientCompany').value = order.clientCompany || '';
        
        let productString = order.product || '';
        let quantityString = order.quantity || '';
        const prodInput = document.getElementById('editProduct');
        const qtyInput = document.getElementById('editQuantity');
        
        if (order.items && order.items.length > 1) {
            productString = "Múltiplos Itens (Não editável aqui, acesse pelo cliente)";
            quantityString = `${order.items.length} itens`;
            prodInput.readOnly = true;
            prodInput.classList.add('bg-gray-100', 'text-gray-500');
            qtyInput.readOnly = true;
            qtyInput.classList.add('bg-gray-100', 'text-gray-500');
        } else {
            prodInput.readOnly = false;
            prodInput.classList.remove('bg-gray-100', 'text-gray-500');
            qtyInput.readOnly = false;
            qtyInput.classList.remove('bg-gray-100', 'text-gray-500');
            
            if (order.items && order.items.length === 1) {
                productString = order.items[0].product;
                quantityString = order.items[0].quantity;
            }
        }
        
        prodInput.value = productString;
        qtyInput.value = quantityString;
        document.getElementById('editObs').value = order.generalObs || order.obs || '';
        document.getElementById('editStatus').value = order.status;
        document.getElementById('editPriority').value = order.priority || 'Média';
        
        const editTotalValue = document.getElementById('editTotalValue');
        if (editTotalValue) {
            if (order.totalEstimated) {
                editTotalValue.textContent = `R$ ${order.totalEstimated.toFixed(2)}`;
            } else {
                editTotalValue.textContent = 'R$ 0,00';
            }
        }
        
        loadClientOrderHistory(clientUid);
        document.getElementById('adminEditModal').classList.remove('hidden');
    } else {
        const clientData = globalUsers[clientUid];
        if (clientData) {
            document.getElementById('editOrderId').value = '';
            document.getElementById('editClientUid').value = clientUid;
            document.getElementById('editClientName').value = clientData.name || '';
            document.getElementById('editClientPhone').value = clientData.phone || '';
            document.getElementById('editClientEmail').value = clientData.email || '';
            document.getElementById('editClientCompany').value = clientData.company || '';
            document.getElementById('editProduct').value = '';
            document.getElementById('editQuantity').value = '';
            document.getElementById('editObs').value = '';
            document.getElementById('editStatus').value = 'novo';
            document.getElementById('editPriority').value = 'Média';
            
            const editTotalValue = document.getElementById('editTotalValue');
            if (editTotalValue) {
                editTotalValue.textContent = 'R$ 0,00';
            }
            
            loadClientOrderHistory(clientUid);
            document.getElementById('adminEditModal').classList.remove('hidden');
        }
    }
};

// Função para carregar configuração de itens no modal de edição
function loadClientItemsConfigForEdit(clientUid) {
    const configRef = ref(db, `users/${clientUid}/itemsConfig`);
    get(configRef).then((snapshot) => {
        let config = { allowedItems: ['todos'], excludedItems: [] };
        if (snapshot.exists()) {
            config = snapshot.val();
        }
        
        // Atualiza os checkboxes no modal
        document.getElementById('itemsAllowedTodos').checked = config.allowedItems.includes('todos');
        document.getElementById('itemsAllowedPizza').checked = config.allowedItems.includes('Caixa de pizza');
        document.getElementById('itemsAllowedTorta').checked = config.allowedItems.includes('Caixa de torta');
        document.getElementById('itemsAllowedCorreio').checked = config.allowedItems.includes('Caixa correio');
        
        updateItemsConfigDisplay(config);
    }).catch(err => {
        console.error("Erro ao carregar configuração de itens:", err);
    });
}

// Função para atualizar display da configuração de itens
function updateItemsConfigDisplay(config) {
    const allowedItemsContainer = document.getElementById('allowedItemsDisplay');
    const excludedItemsContainer = document.getElementById('excludedItemsDisplay');
    
    if (!allowedItemsContainer || !excludedItemsContainer) return;
    
    if (config.allowedItems.includes('todos')) {
        allowedItemsContainer.innerHTML = '<span class="text-green-600 font-bold">Todos os itens permitidos</span>';
        excludedItemsContainer.innerHTML = '<span class="text-gray-500">Nenhum item excluído</span>';
    } else {
        allowedItemsContainer.innerHTML = config.allowedItems.map(item => 
            `<span class="bg-green-100 text-green-800 px-3 py-1 rounded-full text-xs font-bold mr-2 mb-2 inline-block">${item}</span>`
        ).join('') || '<span class="text-gray-500">Nenhum item permitido</span>';
        
        // Calcula itens excluídos (todos menos os permitidos)
        const allCategories = Object.keys(productCatalog);
        const excludedCategories = allCategories.filter(cat => !config.allowedItems.includes(cat));
        
        excludedItemsContainer.innerHTML = excludedCategories.map(item => 
            `<span class="bg-red-100 text-red-800 px-3 py-1 rounded-full text-xs font-bold mr-2 mb-2 inline-block">${item}</span>`
        ).join('') || '<span class="text-gray-500">Nenhum item excluído</span>';
    }
}

// Função para salvar configuração de itens do cliente
window.saveClientItemsConfig = async function() {
    const clientUid = document.getElementById('editClientUid').value;
    
    if (!clientUid || clientUid === 'undefined' || clientUid === '') {
        showToast('Cliente não identificado.', 'error');
        return;
    }
    
    const allowTodos = document.getElementById('itemsAllowedTodos').checked;
    const allowPizza = document.getElementById('itemsAllowedPizza').checked;
    const allowTorta = document.getElementById('itemsAllowedTorta').checked;
    const allowCorreio = document.getElementById('itemsAllowedCorreio').checked;
    
    let allowedItems = [];
    
    if (allowTodos) {
        allowedItems = ['todos'];
    } else {
        if (allowPizza) allowedItems.push('Caixa de pizza');
        if (allowTorta) allowedItems.push('Caixa de torta');
        if (allowCorreio) allowedItems.push('Caixa correio');
    }
    
    if (allowedItems.length === 0 && !allowTodos) {
        showToast('Selecione pelo menos um tipo de item para permitir.', 'error');
        return;
    }
    
    const itemsConfig = {
        allowedItems: allowedItems,
        excludedItems: []
    };
    
    try {
        await update(ref(db, `users/${clientUid}/itemsConfig`), itemsConfig);
        
        // Atualiza também na lista global
        if (globalUsers[clientUid]) {
            globalUsers[clientUid].itemsConfig = itemsConfig;
        }
        
        updateItemsConfigDisplay(itemsConfig);
        showToast('Configuração de itens salva com sucesso!', 'success');
        
        // Recarrega lista de clientes se estiver visível
        if(!document.getElementById('adminClientsView').classList.contains('hidden')){
            renderClientsList();
        }
        
    } catch(err) {
        console.error("Erro ao salvar configuração de itens:", err);
        showToast('Erro ao salvar configuração de itens.', 'error');
    }
};

// Função para marcar todos os itens (menos os permitidos)
window.marcarTodosItensExcluidos = function() {
    const allowTodos = document.getElementById('itemsAllowedTodos');
    const allowPizza = document.getElementById('itemsAllowedPizza');
    const allowTorta = document.getElementById('itemsAllowedTorta');
    const allowCorreio = document.getElementById('itemsAllowedCorreio');
    
    // Se "todos" estiver marcado, desmarca e marca apenas os itens específicos
    if (allowTodos.checked) {
        allowTodos.checked = false;
        allowPizza.checked = true;
        allowTorta.checked = true;
        allowCorreio.checked = true;
    } else {
        // Marca todos os itens
        allowPizza.checked = true;
        allowTorta.checked = true;
        allowCorreio.checked = true;
    }
    
    // Atualiza visualização
    const config = {
        allowedItems: allowPizza.checked ? ['Caixa de pizza', 'Caixa de torta', 'Caixa correio'] : [],
        excludedItems: []
    };
    
    updateItemsConfigDisplay(config);
};

// Função atualizada para exibir todos os itens com checkboxes
window.exibirTodosItens = function() {
    const itemsListContainer = document.getElementById('allItemsList');
    const allItemsCheckboxList = document.getElementById('allItemsCheckboxList');
    
    if (!itemsListContainer || !allItemsCheckboxList) return;
    
    const allItems = getAllCatalogItems();
    
    // Obtém configuração atual
    const allowTodos = document.getElementById('itemsAllowedTodos').checked;
    const allowPizza = document.getElementById('itemsAllowedPizza').checked;
    const allowTorta = document.getElementById('itemsAllowedTorta').checked;
    const allowCorreio = document.getElementById('itemsAllowedCorreio').checked;
    
    allItemsCheckboxList.innerHTML = allItems.map((item, index) => {
        // Verifica se o item está permitido baseado na configuração atual
        let isChecked = false;
        
        if (allowTodos) {
            isChecked = true;
        } else {
            if (allowPizza && item.category === 'Caixa de pizza') isChecked = true;
            if (allowTorta && item.category === 'Caixa de torta') isChecked = true;
            if (allowCorreio && item.category === 'Caixa correio') isChecked = true;
        }
        
        return `
        <div class="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-lg item-searchable" data-item-name="${item.name.toLowerCase()}" data-item-category="${item.category.toLowerCase()}" data-item-model="${item.model.toLowerCase()}">
            <input type="checkbox" id="item-check-${index}" class="w-4 h-4 text-green-600 rounded item-individual-check" ${isChecked ? 'checked' : ''}>
            <label for="item-check-${index}" class="flex-1 cursor-pointer">
                <p class="text-sm font-medium text-gray-900">${item.name}</p>
                <p class="text-xs text-gray-500">${item.category} > ${item.model}</p>
            </label>
            <span class="text-sm font-bold text-gray-700">R$ ${item.price.toFixed(2)}</span>
        </div>`;
    }).join('');
    
    itemsListContainer.classList.remove('hidden');
    
    // Limpa o campo de busca
    const searchInput = document.getElementById('searchItemsInput');
    if (searchInput) searchInput.value = '';
};

// Função para filtrar itens na lista
window.filterItemsList = function() {
    const searchTerm = document.getElementById('searchItemsInput').value.toLowerCase().trim();
    const items = document.querySelectorAll('.item-searchable');
    
    items.forEach(item => {
        const itemName = item.getAttribute('data-item-name') || '';
        const itemCategory = item.getAttribute('data-item-category') || '';
        const itemModel = item.getAttribute('data-item-model') || '';
        
        if (searchTerm === '' || 
            itemName.includes(searchTerm) || 
            itemCategory.includes(searchTerm) || 
            itemModel.includes(searchTerm)) {
            item.style.display = 'flex';
        } else {
            item.style.display = 'none';
        }
    });
};

// Função para salvar itens selecionados individualmente
window.salvarItensSelecionadosIndividualmente = async function() {
    const clientUid = document.getElementById('editClientUid').value;
    
    if (!clientUid || clientUid === 'undefined' || clientUid === '') {
        showToast('Cliente não identificado.', 'error');
        return;
    }
    
    const allItems = getAllCatalogItems();
    const checkedItems = document.querySelectorAll('.item-individual-check:checked');
    
    if (checkedItems.length === 0) {
        showToast('Selecione pelo menos um item.', 'error');
        return;
    }
    
    // Verifica se todos os itens estão marcados
    if (checkedItems.length === allItems.length) {
        // Se todos estão marcados, salva como "todos"
        const itemsConfig = {
            allowedItems: ['todos'],
            excludedItems: []
        };
        
        try {
            await update(ref(db, `users/${clientUid}/itemsConfig`), itemsConfig);
            
            // Atualiza checkboxes principais
            document.getElementById('itemsAllowedTodos').checked = true;
            document.getElementById('itemsAllowedPizza').checked = false;
            document.getElementById('itemsAllowedTorta').checked = false;
            document.getElementById('itemsAllowedCorreio').checked = false;
            
            updateItemsConfigDisplay(itemsConfig);
            showToast('Configuração de itens salva com sucesso!', 'success');
            
            // Recarrega lista de clientes se estiver visível
            if(!document.getElementById('adminClientsView').classList.contains('hidden')){
                renderClientsList();
            }
            
            // Esconde a lista de itens
            document.getElementById('allItemsList').classList.add('hidden');
            
        } catch(err) {
            console.error("Erro ao salvar configuração de itens:", err);
            showToast('Erro ao salvar configuração de itens.', 'error');
        }
        return;
    }
    
    // Coleta categorias únicas dos itens marcados
    const selectedCategories = new Set();
    checkedItems.forEach((checkbox, index) => {
        // Encontra o item correspondente
        const allCheckboxes = document.querySelectorAll('.item-individual-check');
        const checkboxIndex = Array.from(allCheckboxes).indexOf(checkbox);
        
        if (checkboxIndex >= 0 && checkboxIndex < allItems.length) {
            selectedCategories.add(allItems[checkboxIndex].category);
        }
    });
    
    const allowedItems = Array.from(selectedCategories);
    
    if (allowedItems.length === 0) {
        showToast('Erro ao identificar itens selecionados.', 'error');
        return;
    }
    
    const itemsConfig = {
        allowedItems: allowedItems,
        excludedItems: []
    };
    
    try {
        await update(ref(db, `users/${clientUid}/itemsConfig`), itemsConfig);
        
        // Atualiza checkboxes principais
        document.getElementById('itemsAllowedTodos').checked = false;
        document.getElementById('itemsAllowedPizza').checked = allowedItems.includes('Caixa de pizza');
        document.getElementById('itemsAllowedTorta').checked = allowedItems.includes('Caixa de torta');
        document.getElementById('itemsAllowedCorreio').checked = allowedItems.includes('Caixa correio');
        
        updateItemsConfigDisplay(itemsConfig);
        showToast('Configuração de itens salva com sucesso!', 'success');
        
        // Recarrega lista de clientes se estiver visível
        if(!document.getElementById('adminClientsView').classList.contains('hidden')){
            renderClientsList();
        }
        
        // Esconde a lista de itens
        document.getElementById('allItemsList').classList.add('hidden');
        
    } catch(err) {
        console.error("Erro ao salvar configuração de itens:", err);
        showToast('Erro ao salvar configuração de itens.', 'error');
    }
};
