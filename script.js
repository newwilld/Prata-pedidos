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
let listenersInitialized = false;

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
                createdAt: Date.now()
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
    }
}

window.handleProductChange = function() {
    const product = document.getElementById('productSelect').value;
    const qContainer = document.getElementById('quantityContainer');
    if (product) {
        qContainer.classList.remove('hidden');
        document.getElementById('quantitySelect').value = "";
        document.getElementById('customQuantityContainer').classList.add('hidden');
        document.getElementById('customQuantityInput').removeAttribute('required');
    }
};

window.handleQuantityChange = function() {
    const q = document.getElementById('quantitySelect').value;
    const cContainer = document.getElementById('customQuantityContainer');
    const cInput = document.getElementById('customQuantityInput');
    if (q === 'Outra') {
        cContainer.classList.remove('hidden');
        cInput.setAttribute('required', 'true');
        cInput.focus();
    } else {
        cContainer.classList.add('hidden');
        cInput.removeAttribute('required');
    }
};

window.submitOrder = async function(e) {
    e.preventDefault();
    if (!currentUserData) return;

    const product = document.getElementById('productSelect').value;
    let quantity = document.getElementById('quantitySelect').value;
    
    if(quantity === 'Outra') {
        quantity = document.getElementById('customQuantityInput').value + ' unidades';
    } else {
        quantity = quantity + ' unidades';
    }

    const btn = e.target.querySelector('button[type="submit"]');
    const originalText = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Enviando...';
    btn.disabled = true;

    const newOrder = {
        userId: currentUserData.uid,
        clientName: currentUserData.name,
        clientEmail: currentUserData.email,
        clientPhone: currentUserData.phone || '',
        clientCompany: currentUserData.company || '',
        product: product,
        quantity: quantity,
        priority: "Média",
        status: "novo",
        createdAt: Date.now()
    };

    try {
        const ordersListRef = ref(db, 'orders');
        const newOrderRef = push(ordersListRef);
        await set(newOrderRef, newOrder);
        
        showToast('Pedido enviado com sucesso!', 'success');
        document.getElementById('orderForm').reset();
        document.getElementById('quantityContainer').classList.add('hidden');
        document.getElementById('customQuantityContainer').classList.add('hidden');
    } catch (error) {
        console.error(error);
        showToast('Erro ao enviar pedido.', 'error');
    } finally {
        btn.innerHTML = originalText;
        btn.disabled = false;
    }
};

function initClientListeners() {
    const ordersRef = ref(db, 'orders');
    onValue(ordersRef, (snapshot) => {
        const data = snapshot.val();
        const myOrders = [];
        if (data) {
            Object.keys(data).forEach(key => {
                if (data[key].userId === currentUserData.uid) {
                    myOrders.push({ id: key, ...data[key] });
                }
            });
        }
        renderClientOrders(myOrders.sort((a,b) => b.createdAt - a.createdAt));
    }, (error) => {
        console.error("Erro ao carregar pedidos:", error);
        document.getElementById('clientOrdersList').innerHTML = '<div class="col-span-full text-center py-10 text-red-500">Erro ao carregar pedidos. Verifique as regras do banco de dados.</div>';
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
        'finalizado': 'from-cyan-600 to-blue-600' 
    };
    const statusText = { 'novo': 'Pendente', 'producao': 'Em Produção', 'finalizado': 'Finalizado' };

    list.innerHTML = orders.map(order => {
        return `
        <div class="bg-gradient-to-br ${statusColors[order.status]} p-6 rounded-3xl shadow-xl flex flex-col gap-4 relative overflow-hidden">
            <div class="flex justify-between items-start">
                <div>
                    <span class="text-xs font-semibold text-white/70 uppercase tracking-wider">${window.formatDateTime(order.createdAt).split(' às')[0]}</span>
                    <h4 class="font-bold text-white text-lg leading-tight mt-1">${order.product}</h4>
                </div>
                <span class="text-xs px-3 py-1.5 rounded-full font-bold bg-white/20 text-white">
                    ${statusText[order.status]}
                </span>
            </div>
            <div class="text-sm text-white/90 flex items-center gap-2">
                <i class="fas fa-cubes text-white/60"></i> ${order.quantity}
            </div>
        </div>`;
    }).join('');
}

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
    const cols = { novo: [], producao: [], finalizado: [] };
    
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

    document.getElementById('countNovos').innerText = cols.novo.length;
    document.getElementById('countProducao').innerText = cols.producao.length;
    document.getElementById('countFinalizado').innerText = cols.finalizado.length;

    ['novo', 'producao', 'finalizado'].forEach(status => {
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
        'finalizado': 'from-cyan-600 to-blue-700'
    };
    
    const prioColors = {
        'Baixa': 'bg-green-500/20 text-green-200',
        'Média': 'bg-amber-500/20 text-amber-200',
        'Alta': 'bg-red-500/20 text-red-200'
    };
    
    return `
    <div id="order-${order.id}" class="draggable-card bg-gradient-to-br ${statusGradients[order.status]} p-5 rounded-2xl border border-white/20 shadow-xl hover:shadow-2xl transition-all relative overflow-hidden group" 
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
        
        <h4 class="font-bold text-white text-lg leading-tight mb-2">${order.product}</h4>
        <div class="text-sm text-white/80 mb-4 flex items-center gap-2">
            <i class="fas fa-cubes text-white/60"></i> ${order.quantity}
        </div>
        
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

    document.getElementById('editOrderId').value = orderId;
    document.getElementById('editClientUid').value = order.userId || '';
    document.getElementById('editClientName').value = order.clientName || '';
    document.getElementById('editClientPhone').value = order.clientPhone || '';
    document.getElementById('editClientEmail').value = order.clientEmail || '';
    document.getElementById('editClientCompany').value = order.clientCompany || '';
    document.getElementById('editProduct').value = order.product;
    document.getElementById('editQuantity').value = order.quantity;
    document.getElementById('editStatus').value = order.status;
    document.getElementById('editPriority').value = order.priority || 'Média';
    
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
            'finalizado': 'bg-cyan-100 text-cyan-700' 
        };
        const statusText = { 'novo': 'Pendente', 'producao': 'Em Produção', 'finalizado': 'Finalizado' };
        
        return `
        <div class="bg-white border border-gray-200 rounded-xl p-4 flex items-center justify-between shadow-sm">
            <div class="flex-1">
                <p class="text-sm font-semibold text-gray-900">${order.product} - ${order.quantity}</p>
                <p class="text-xs text-gray-500 mt-1">
                    <i class="fas fa-calendar-alt mr-1"></i>${window.formatDateTime(order.createdAt)}
                </p>
            </div>
            <span class="text-xs px-3 py-1.5 rounded-full font-bold ${statusColors[order.status]} ml-3">
                ${statusText[order.status]}
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

    try {
        const orderRef = ref(db, `orders/${orderId}`);
        const originalOrder = globalOrders[orderId];
        
        await update(orderRef, {
            status: newStatus,
            priority: newPriority,
            clientName: newClientName,
            clientPhone: newClientPhone,
            clientEmail: newClientEmail,
            clientCompany: newClientCompany,
            product: newProduct,
            quantity: newQuantity
        });
        
        if (clientUid) {
            const userRef = ref(db, `users/${clientUid}`);
            await update(userRef, {
                name: newClientName,
                phone: newClientPhone,
                email: newClientEmail,
                company: newClientCompany
            });
        }
        
        const adminName = currentUserData.name;
        
        if (originalOrder) {
            if (originalOrder.quantity !== newQuantity) {
                await createNotification(`Pedido editado por @${adminName}: Quantidade alterada de ${originalOrder.quantity} para ${newQuantity}`);
            }
            if (originalOrder.product !== newProduct) {
                await createNotification(`Pedido editado por @${adminName}: Produto alterado de ${originalOrder.product} para ${newProduct}`);
            }
            if (originalOrder.status !== newStatus) {
                const statusText = { 'novo': 'Pendente', 'producao': 'Em Produção', 'finalizado': 'Finalizado' };
                await createNotification(`Status do pedido alterado por @${adminName}: ${statusText[originalOrder.status]} → ${statusText[newStatus]}`);
            }
        }
        
        if (originalOrder && originalOrder.clientEmail !== newClientEmail) {
            await createNotification(`E-mail do cliente ${newClientName} foi alterado por @${adminName}: ${originalOrder.clientEmail} → ${newClientEmail}`);
        }
        
        showToast('Pedido e dados do cliente atualizados!', 'success');
        closeEditModal();
    } catch(err) {
        showToast('Erro ao salvar.', 'error');
    }
};

window.deleteClient = async function() {
    const clientUid = document.getElementById('editClientUid').value;
    const clientName = document.getElementById('editClientName').value;
    const currentOrderId = document.getElementById('editOrderId').value;
    
    const displayNome = (clientName && clientName !== 'undefined') ? clientName : 'Sem Nome / Undefined';

    if (!confirm(`Tem certeza que deseja excluir o cliente ${displayNome}? Esta ação não pode ser desfeita.`)) {
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
        
        for (const orderId of ordersToDelete) {
            await remove(ref(db, `orders/${orderId}`));
        }
        
        if (clientUid && clientUid !== 'undefined') {
            await remove(ref(db, `users/${clientUid}`));
        } else if (clientUid === 'undefined') {
            await remove(ref(db, `users/undefined`));
        }
        
        if (clientName && clientName !== 'undefined') {
            const notificationKeys = Object.keys(globalNotifications);
            for (const notifKey of notificationKeys) {
                const notif = globalNotifications[notifKey];
                if (notif.message && notif.message.includes(clientName)) {
                    await remove(ref(db, `notifications/${notifKey}`));
                }
            }
        }
        
        await createNotification(`Cliente ${displayNome} foi excluído por @${currentUserData.name}`);
        
        showToast(`Cliente e pedidos removidos do sistema com sucesso!`, 'success');
        closeEditModal();
        
        setTimeout(() => {
            renderKanban();
            if(!document.getElementById('adminClientsView').classList.contains('hidden')){
                renderClientsList();
            }
        }, 500);
        
    } catch(err) {
        console.error("Erro ao excluir cliente:", err);
        showToast('Erro ao excluir cliente. Verifique o console para mais detalhes.', 'error');
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
            lastOrderDate: null
        };
    });

    Object.values(globalOrders).forEach(order => {
        const uid = order.userId;
        if (!uid) return;
        
        if (!clientStats[uid]) {
            clientStats[uid] = { 
                uid: uid,
                name: order.clientName || 'Cliente sem nome',
                email: order.clientEmail || 'N/A',
                phone: order.clientPhone || '',
                company: order.clientCompany || '',
                totalOrders: 0, 
                lastOrderDate: null 
            };
        }
        
        clientStats[uid].totalOrders += 1;
        
        if(!clientStats[uid].lastOrderDate || order.createdAt > clientStats[uid].lastOrderDate) {
            clientStats[uid].lastOrderDate = order.createdAt;
        }
    });

    const clientArray = Object.values(clientStats)
        .filter(client => {
            if ((!client.name || client.name === 'undefined' || client.name.trim() === '') && client.totalOrders === 0) {
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
        const displayEmail = client.email && client.email !== 'undefined' ? client.email : 'N/A';
        
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
        </tr>
    `}).join('');
}

window.openClientModal = function(clientUid) {
    const clientOrders = Object.values(globalOrders)
        .filter(order => order.userId === clientUid)
        .sort((a, b) => b.createdAt - a.createdAt);
    
    if (clientOrders.length > 0) {
        openEditModal(clientOrders[0].id);
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
            document.getElementById('editStatus').value = 'novo';
            document.getElementById('editPriority').value = 'Média';
            
            loadClientOrderHistory(clientUid);
            document.getElementById('adminEditModal').classList.remove('hidden');
        }
    }
};
