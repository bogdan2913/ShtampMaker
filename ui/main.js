// ─── Утилиты ────────────────────────────────────────────────────────────────

function openModal(id)  { document.getElementById(id).classList.add('visible'); }
function closeModal(id) { document.getElementById(id).classList.remove('visible'); }

// ─── Категории ──────────────────────────────────────────────────────────────

const categoryList     = document.getElementById('category-list');
const trashItem        = document.getElementById('trash-item');
const favoritesList    = document.getElementById('favorites-list');
const favoritesSection = document.getElementById('favorites-section');
const contextMenu      = document.getElementById('context-menu');
const favorites        = new Set(); // хранит имена избранных штампов
let contextTarget      = null;      // карточка над которой открыто меню

function getActiveCategory() {
    const active = categoryList.querySelector('li.active');
    return active ? active.dataset.category : null;
}

function setActiveCategory(li) {
    categoryList.querySelectorAll('li').forEach(i => i.classList.remove('active'));
    li.classList.add('active');
}

function addCategoryItem(name) {
    const li = document.createElement('li');
    li.dataset.category = name;
    li.textContent = name;
    li.addEventListener('click', () => {
        trashItem.classList.remove('active');
        setActiveCategory(li);
        setTrashView(false);
    });
    categoryList.appendChild(li);
    setActiveCategory(li);
}

categoryList.querySelectorAll('li').forEach(li => {
    li.addEventListener('click', () => {
        trashItem.classList.remove('active');
        setActiveCategory(li);
        setTrashView(false);
    });
});

trashItem.addEventListener('click', () => {
    categoryList.querySelectorAll('li').forEach(i => i.classList.remove('active'));
    trashItem.classList.add('active');
    setTrashView(true);
});

// Добавить категорию
document.getElementById('btn-add-category').addEventListener('click', () => {
    document.getElementById('input-category-name').value = '';
    openModal('modal-add-category');
    setTimeout(() => document.getElementById('input-category-name').focus(), 50);
});

document.getElementById('btn-category-confirm').addEventListener('click', () => {
    const name = document.getElementById('input-category-name').value.trim();
    if (!name) return;
    addCategoryItem(name);
    closeModal('modal-add-category');
});

document.getElementById('btn-category-cancel').addEventListener('click', () => {
    closeModal('modal-add-category');
});

document.getElementById('input-category-name').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') document.getElementById('btn-category-confirm').click();
    if (e.key === 'Escape') closeModal('modal-add-category');
});

// Удалить категорию
document.getElementById('btn-remove-category').addEventListener('click', () => {
    const name = getActiveCategory();
    if (!name) return;
    document.getElementById('delete-category-name').textContent = name;
    openModal('modal-delete-category');
});

document.getElementById('btn-delete-category-confirm').addEventListener('click', () => {
    const active = categoryList.querySelector('li.active');
    if (!active) return;
    const prev = active.previousElementSibling || active.nextElementSibling;
    active.remove();
    if (prev) setActiveCategory(prev);
    closeModal('modal-delete-category');
});

document.getElementById('btn-delete-category-cancel').addEventListener('click', () => {
    closeModal('modal-delete-category');
});

// ─── Штампы ─────────────────────────────────────────────────────────────────

const grid        = document.getElementById('stamps-grid');
const deleteBtn   = document.getElementById('btn-delete-stamp');
const restoreBtn  = document.getElementById('btn-restore-stamp');
const foreverBtn  = document.getElementById('btn-delete-forever');
const toolbarNormal = document.getElementById('toolbar-normal');
const toolbarTrash  = document.getElementById('toolbar-trash');
let lastSelected = null;
let isTrashView = false;
const trashStore = []; // { name, imageSrc }

function getCards() {
    return Array.from(grid.querySelectorAll('.stamp-card'));
}

function updateDeleteBtn() {
    const hasSelection = grid.querySelectorAll('.stamp-card.active').length > 0;
    if (isTrashView) {
        restoreBtn.disabled = !hasSelection;
        foreverBtn.disabled = !hasSelection;
    } else {
        deleteBtn.disabled = !hasSelection;
    }
}

function setTrashView(isTrash) {
    isTrashView = isTrash;
    toolbarNormal.style.display = isTrash ? 'none' : 'flex';
    toolbarTrash.style.display  = isTrash ? 'flex' : 'none';
    clearSelection();
    grid.innerHTML = '';
    if (isTrash) {
        trashStore.forEach(item => createCard(item.name, item.imageSrc));
    } else {
        ['Иванов И.И.', 'Петров П.П.', 'Сидоров С.С.', 'Кузнецов К.К.',
         'Новиков Н.Н.', 'Морозов М.М.', 'Волков В.В.', 'Алексеев А.А.'].forEach(name => createCard(name));
    }
}

function clearSelection() {
    getCards().forEach(c => c.classList.remove('active'));
    lastSelected = null;
    updateDeleteBtn();
}

function createCard(name, imageSrc) {
    const card = document.createElement('div');
    card.className = 'stamp-card';
    card.innerHTML = `
        <div class="stamp-preview">${imageSrc ? `<img src="${imageSrc}" style="width:100%;height:100%;object-fit:contain;border-radius:6px">` : ''}</div>
        <span class="stamp-name">${name}</span>
    `;

    card.addEventListener('click', (e) => {
        if (wasDragging) return;
        const cards = getCards();
        if (e.shiftKey && lastSelected) {
            const a = cards.indexOf(lastSelected);
            const b = cards.indexOf(card);
            const [from, to] = a < b ? [a, b] : [b, a];
            if (!e.ctrlKey && !e.metaKey) clearSelection();
            cards.slice(from, to + 1).forEach(c => c.classList.add('active'));
            lastSelected = card;
        } else if (e.ctrlKey || e.metaKey) {
            card.classList.toggle('active');
            lastSelected = card;
        } else {
            clearSelection();
            card.classList.add('active');
            lastSelected = card;
        }
        updateDeleteBtn();
    });

    grid.appendChild(card);
    return card;
}

// Начальная загрузка
['Иванов И.И.', 'Петров П.П.', 'Сидоров С.С.', 'Кузнецов К.К.',
 'Новиков Н.Н.', 'Морозов М.М.', 'Волков В.В.', 'Алексеев А.А.'].forEach(name => createCard(name));

// Клик в пустое место (не на карточку, не на тулбар)
document.querySelector('.container').addEventListener('click', (e) => {
    if (!e.target.closest('.stamp-card') && !e.target.closest('.toolbar') && !wasDragging) clearSelection();
});

// Горячие клавиши
document.addEventListener('keydown', (e) => {
    const modals = ['modal-delete', 'modal-add-category', 'modal-delete-category', 'modal-add-stamp', 'modal-delete-forever'];
    const anyOpen = modals.some(id => document.getElementById(id).classList.contains('visible'));

    if (e.key === 'Escape') {
        if (anyOpen) {
            clearInterval(deleteInterval);
            clearInterval(foreverInterval);
            modals.forEach(closeModal);
        } else {
            clearSelection();
        }
        return;
    }

    // Enter — подтвердить активную модалку
    if (e.key === 'Enter' && anyOpen) {
        if (document.getElementById('modal-delete').classList.contains('visible')) confirmDelete();
        if (document.getElementById('modal-delete-forever').classList.contains('visible')) confirmForever();
        if (document.getElementById('modal-delete-category').classList.contains('visible')) document.getElementById('btn-delete-category-confirm').click();
        return;
    }

    if (anyOpen) return;

    // Ctrl/Cmd+A — выделить все
    if ((e.ctrlKey || e.metaKey) && e.key === 'a') {
        e.preventDefault();
        getCards().forEach(c => c.classList.add('active'));
        updateDeleteBtn();
        return;
    }

    // Delete или Backspace — удалить выделенные
    if (e.key === 'Delete' || e.key === 'Backspace') {
        if (isTrashView && !foreverBtn.disabled) foreverBtn.click();
        else if (!isTrashView && !deleteBtn.disabled) deleteBtn.click();
        return;
    }
});

// ─── Удаление штампов ───────────────────────────────────────────────────────

let deleteInterval = null;

deleteBtn.addEventListener('click', () => {
    openModal('modal-delete');
    let count = 15;
    document.getElementById('delete-countdown').textContent = count;
    deleteInterval = setInterval(() => {
        count--;
        document.getElementById('delete-countdown').textContent = count;
        if (count <= 0) confirmDelete();
    }, 1000);
});

function confirmDelete() {
    clearInterval(deleteInterval);
    grid.querySelectorAll('.stamp-card.active').forEach(c => {
        trashStore.push({ name: c.querySelector('.stamp-name').textContent, imageSrc: null });
        c.remove();
    });
    lastSelected = null;
    updateDeleteBtn();
    closeModal('modal-delete');
}

// Восстановить из корзины
restoreBtn.addEventListener('click', () => {
    grid.querySelectorAll('.stamp-card.active').forEach(c => {
        const name = c.querySelector('.stamp-name').textContent;
        const idx = trashStore.findIndex(i => i.name === name);
        if (idx !== -1) trashStore.splice(idx, 1);
        c.remove();
    });
    lastSelected = null;
    updateDeleteBtn();
});

// Удалить навсегда
let foreverInterval = null;

foreverBtn.addEventListener('click', () => {
    openModal('modal-delete-forever');
    let count = 15;
    document.getElementById('forever-countdown').textContent = count;
    foreverInterval = setInterval(() => {
        count--;
        document.getElementById('forever-countdown').textContent = count;
        if (count <= 0) confirmForever();
    }, 1000);
});

function confirmForever() {
    clearInterval(foreverInterval);
    grid.querySelectorAll('.stamp-card.active').forEach(c => {
        const name = c.querySelector('.stamp-name').textContent;
        const idx = trashStore.findIndex(i => i.name === name);
        if (idx !== -1) trashStore.splice(idx, 1);
        c.remove();
    });
    lastSelected = null;
    updateDeleteBtn();
    closeModal('modal-delete-forever');
}

document.getElementById('btn-forever-confirm').addEventListener('click', confirmForever);
document.getElementById('btn-forever-cancel').addEventListener('click', () => {
    clearInterval(foreverInterval);
    closeModal('modal-delete-forever');
});

document.getElementById('btn-delete-confirm').addEventListener('click', confirmDelete);

document.getElementById('btn-delete-cancel').addEventListener('click', () => {
    clearInterval(deleteInterval);
    closeModal('modal-delete');
});

// ─── Добавление штампа ──────────────────────────────────────────────────────

const fileInput   = document.getElementById('file-input');
const cropImage   = document.getElementById('crop-image');
const cropArea    = document.getElementById('crop-area');
const cropSel     = document.getElementById('crop-selection');
const stampDetails = document.getElementById('stamp-details');
const confirmStampBtn = document.getElementById('btn-stamp-confirm');

let cropStart = null;
let cropRect  = null;

document.getElementById('btn-add-stamp').addEventListener('click', () => {
    cropImage.style.display = 'none';
    cropSel.style.display   = 'none';
    stampDetails.style.display = 'none';
    confirmStampBtn.disabled   = true;
    cropRect = null;
    openModal('modal-add-stamp');
});

document.getElementById('btn-pick-file').addEventListener('click', () => fileInput.click());

fileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    cropImage.src = url;
    cropImage.style.display = 'block';
    document.querySelector('.crop-placeholder').style.display = 'none';
    cropSel.style.display = 'none';
    cropRect = null;
    fileInput.value = '';
});

// Кроп мышкой
cropArea.addEventListener('mousedown', (e) => {
    if (!cropImage.src || cropImage.style.display === 'none') return;
    e.preventDefault();
    const r = cropArea.getBoundingClientRect();
    cropStart = { x: e.clientX - r.left, y: e.clientY - r.top };
    cropSel.style.display = 'block';
});

document.addEventListener('mousemove', (e) => {
    if (!cropStart) return;
    const r = cropArea.getBoundingClientRect();
    const x = Math.max(0, Math.min(e.clientX - r.left, r.width));
    const y = Math.max(0, Math.min(e.clientY - r.top, r.height));
    const left   = Math.min(x, cropStart.x);
    const top    = Math.min(y, cropStart.y);
    const width  = Math.abs(x - cropStart.x);
    const height = Math.abs(y - cropStart.y);
    cropSel.style.left   = left + 'px';
    cropSel.style.top    = top  + 'px';
    cropSel.style.width  = width  + 'px';
    cropSel.style.height = height + 'px';
    cropRect = { left, top, width, height };
});

document.addEventListener('mouseup', (e) => {
    if (!cropStart) return;
    cropStart = null;
    if (cropRect && cropRect.width > 5 && cropRect.height > 5) {
        stampDetails.style.display = 'flex';
        confirmStampBtn.disabled = false;
    }
});

document.getElementById('btn-stamp-confirm').addEventListener('click', () => {
    const name = document.getElementById('input-stamp-name').value.trim() || 'Без названия';
    createCard(name, null);
    closeModal('modal-add-stamp');
});

document.getElementById('btn-stamp-cancel').addEventListener('click', () => {
    closeModal('modal-add-stamp');
    cropStart = null;
});

// ─── Rubber band selection ───────────────────────────────────────────────────

const selectionBox = document.getElementById('selection-box');
let isDragging  = false;
let wasDragging = false;
let startX, startY;

document.querySelector('.container').addEventListener('mousedown', (e) => {
    if (e.target.closest('.toolbar')) return;
    e.preventDefault();
    isDragging = true;
    wasDragging = false;
    startX = e.clientX;
    startY = e.clientY;
    selectionBox.style.left   = startX + 'px';
    selectionBox.style.top    = startY + 'px';
    selectionBox.style.width  = '0';
    selectionBox.style.height = '0';
    selectionBox.style.display = 'block';
    if (!e.ctrlKey && !e.metaKey) clearSelection();
});

document.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    wasDragging = true;
    const x = Math.min(e.clientX, startX);
    const y = Math.min(e.clientY, startY);
    const w = Math.abs(e.clientX - startX);
    const h = Math.abs(e.clientY - startY);
    selectionBox.style.left   = x + 'px';
    selectionBox.style.top    = y + 'px';
    selectionBox.style.width  = w + 'px';
    selectionBox.style.height = h + 'px';

    const boxRect = { left: x, top: y, right: x + w, bottom: y + h };
    getCards().forEach(card => {
        const cr = card.getBoundingClientRect();
        const intersects = !(boxRect.right < cr.left || boxRect.left > cr.right ||
                              boxRect.bottom < cr.top || boxRect.top > cr.bottom);
        card.classList.toggle('active', intersects);
    });
    updateDeleteBtn();
});

document.addEventListener('mouseup', () => {
    if (!isDragging) return;
    isDragging = false;
    selectionBox.style.display = 'none';
    setTimeout(() => { wasDragging = false; }, 0);
});

// ─── Избранное ──────────────────────────────────────────────────────────────

function updateFavoritesList() {
    favoritesList.innerHTML = '';
    if (favorites.size === 0) {
        favoritesSection.style.display = 'none';
        return;
    }
    favoritesSection.style.display = 'flex';
    favorites.forEach(name => {
        const li = document.createElement('li');
        li.textContent = name;
        li.addEventListener('click', () => {
            categoryList.querySelectorAll('li').forEach(i => i.classList.remove('active'));
            trashItem.classList.remove('active');
            favoritesList.querySelectorAll('li').forEach(i => i.classList.remove('active'));
            li.classList.add('active');
        });
        favoritesList.appendChild(li);
    });
}

function toggleFavorite(name) {
    if (favorites.has(name)) {
        favorites.delete(name);
    } else {
        favorites.add(name);
    }
    updateFavoritesList();
}

// ─── Контекстное меню ────────────────────────────────────────────────────────

function showContextMenu(e, card) {
    contextTarget = card;
    const name = card.querySelector('.stamp-name').textContent;
    document.getElementById('ctx-favorite').textContent =
        favorites.has(name) ? 'Убрать из избранного' : 'Добавить в избранное';
    contextMenu.style.left = e.clientX + 'px';
    contextMenu.style.top  = e.clientY + 'px';
    contextMenu.classList.add('visible');
}

function hideContextMenu() {
    contextMenu.classList.remove('visible');
    contextTarget = null;
}

document.getElementById('ctx-favorite').addEventListener('click', () => {
    if (!contextTarget) return;
    toggleFavorite(contextTarget.querySelector('.stamp-name').textContent);
    hideContextMenu();
});

document.getElementById('ctx-delete').addEventListener('click', () => {
    if (!contextTarget) return;
    clearSelection();
    contextTarget.classList.add('active');
    updateDeleteBtn();
    hideContextMenu();
    deleteBtn.click();
});

document.addEventListener('click', (e) => {
    if (!e.target.closest('#context-menu')) hideContextMenu();
});

document.addEventListener('contextmenu', (e) => {
    const card = e.target.closest('.stamp-card');
    if (card) {
        e.preventDefault();
        showContextMenu(e, card);
    } else {
        hideContextMenu();
    }
});

// ─── Кнопки окна ────────────────────────────────────────────────────────────

document.querySelector('.btn-close').addEventListener('click', () => {
    if (window.pywebview) window.pywebview.api.close_window();
    else window.close();
});

document.querySelector('.btn-minimize').addEventListener('click', () => {
    if (window.pywebview) window.pywebview.api.minimize_window();
});

document.querySelector('.btn-maximize').addEventListener('click', () => {
    if (window.pywebview) window.pywebview.api.toggle_maximize();
});
