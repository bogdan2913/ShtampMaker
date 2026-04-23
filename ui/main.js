// ─── Утилиты ────────────────────────────────────────────────────────────────

function openModal(id) { document.getElementById(id).classList.add('visible'); }
function closeModal(id) { document.getElementById(id).classList.remove('visible'); }

function stampDisplayName(filename) {
    return filename.replace(/\.[^.]+$/, '').replace(/_[\d.]+x[\d.]+$/, '');
}

function stampSrc(stamp) {
    const ext = stamp.name.split('.').pop().toLowerCase();
    const mime = (ext === 'jpg' || ext === 'jpeg') ? 'image/jpeg' : 'image/png';
    return `data:${mime};base64,${stamp.image}`;
}

// ─── Категории ──────────────────────────────────────────────────────────────

const categoryList = document.getElementById('category-list');
const trashItem = document.getElementById('trash-item');
const favoritesList = document.getElementById('favorites-list');
const favoritesSection = document.getElementById('favorites-section');
const contextMenu = document.getElementById('context-menu');
const categoryContextMenu = document.getElementById('category-context-menu');
const FAVORITES_KEY = 'stamps_favorites';
let favorites = JSON.parse(localStorage.getItem(FAVORITES_KEY) || '[]');
// Миграция: старый формат — массив строк, новый — массив объектов {category, filename}
if (favorites.length > 0 && typeof favorites[0] === 'string') favorites = [];
let contextTarget = null;
let catContextTarget = null;

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
    li.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        e.stopPropagation();
        hideContextMenu();
        catContextTarget = li;
        categoryContextMenu.style.left = e.clientX + 'px';
        categoryContextMenu.style.top = e.clientY + 'px';
        categoryContextMenu.classList.add('visible');
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
    window.pywebview.api.add_category(name).then(() => {
        addCategoryItem(name);
    });
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
    const name = active.dataset.category;
    const prev = active.previousElementSibling || active.nextElementSibling;
    window.pywebview.api.delete_category(name).then(() => {
        active.remove();
        const before = favorites.length;
        favorites = favorites.filter(f => f.category !== name);
        if (favorites.length !== before) { saveFavorites(); updateFavoritesList(); }
        if (prev) { setActiveCategory(prev); setTrashView(false); }
    });
    closeModal('modal-delete-category');
});

document.getElementById('btn-delete-category-cancel').addEventListener('click', () => {
    closeModal('modal-delete-category');
});

// ─── Штампы ─────────────────────────────────────────────────────────────────

const grid = document.getElementById('stamps-grid');
const deleteBtn = document.getElementById('btn-delete-stamp');
const restoreBtn = document.getElementById('btn-restore-stamp');
const foreverBtn = document.getElementById('btn-delete-forever');
const toolbarNormal = document.getElementById('toolbar-normal');
const toolbarTrash = document.getElementById('toolbar-trash');
let lastSelected = null;
let isTrashView = false;
let trashCategory = null;

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

function setTrashView(isTrash, subCategory = null) {
    isTrashView = isTrash;
    trashCategory = isTrash ? subCategory : null;
    toolbarNormal.style.display = isTrash ? 'none' : 'flex';
    toolbarTrash.style.display = isTrash ? 'flex' : 'none';

    const breadcrumb = document.getElementById('trash-breadcrumb');
    if (isTrash && subCategory) {
        breadcrumb.style.display = 'flex';
        document.getElementById('breadcrumb-category').textContent = subCategory;
    } else {
        breadcrumb.style.display = 'none';
    }

    clearSelection();
    grid.innerHTML = '<div style="grid-column:1/-1;color:#8e8e93;font-size:13px;padding:8px 0">Загрузка…</div>';

    if (!isTrash) {
        const category = getActiveCategory();
        window.pywebview.api.get_stamps(category).then(stamps => {
            grid.innerHTML = '';
            stamps.forEach(stamp => createCard(stampDisplayName(stamp.name), stampSrc(stamp), stamp.name, category));
        });
    } else if (subCategory) {
        window.pywebview.api.get_stamps_from_trash(subCategory).then(stamps => {
            grid.innerHTML = '';
            stamps.forEach(stamp => createCard(stampDisplayName(stamp.name), stampSrc(stamp), stamp.name, subCategory));
        });
    } else {
        window.pywebview.api.get_categories_from_trash().then(categories => {
            grid.innerHTML = '';
            categories.forEach(cat => createCard(cat, null, cat, null, true));
        });
    }
}

function clearSelection() {
    getCards().forEach(c => c.classList.remove('active'));
    lastSelected = null;
    updateDeleteBtn();
}

function createCard(displayName, imageSrc, filename, category, isFolder = false) {
    const card = document.createElement('div');
    card.className = 'stamp-card';
    card.dataset.filename = filename || '';
    card.dataset.category = category || '';
    card.dataset.isFolder = isFolder ? 'true' : 'false';
    const preview = isFolder
        ? `<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;font-size:48px">📁</div>`
        : (imageSrc ? `<img src="${imageSrc}" style="width:100%;height:100%;object-fit:contain;border-radius:6px">` : '');
    const starHtml = isFolder ? '' : `<span class="stamp-star${isFavorite(category, filename) ? ' active' : ''}">★</span>`;
    card.innerHTML = `
        ${starHtml}
        <div class="stamp-preview">${preview}</div>
        <span class="stamp-name">${displayName}</span>
    `;
    if (!isFolder) {
        card.querySelector('.stamp-star').addEventListener('click', (e) => {
            e.stopPropagation();
            const star = e.currentTarget;
            const added = toggleFavorite(card.dataset.category, card.dataset.filename);
            if (added === false) {
                star.classList.add('limit');
                setTimeout(() => star.classList.remove('limit'), 400);
                return;
            }
            star.classList.toggle('active');
        });
    }

    if (isFolder) {
        card.addEventListener('dblclick', () => setTrashView(true, filename));
    }

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

// Клик в пустое место (не на карточку, не на тулбар)
document.querySelector('.container').addEventListener('click', (e) => {
    if (!e.target.closest('.stamp-card') && !e.target.closest('.toolbar') && !wasDragging) clearSelection();
});

// Горячие клавиши
document.addEventListener('keydown', (e) => {
    const modals = ['modal-delete', 'modal-add-category', 'modal-delete-category', 'modal-add-stamp', 'modal-delete-forever', 'modal-empty-trash', 'modal-rename-stamp', 'modal-rename-category'];
    const anyOpen = modals.some(id => document.getElementById(id).classList.contains('visible'));

    if (e.key === 'Escape') {
        if (anyOpen) {
            clearInterval(deleteInterval);
            clearInterval(foreverInterval);
            modals.forEach(closeModal);
            contextTarget = null;
            catContextTarget = null;
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
    let favChanged = false;
    grid.querySelectorAll('.stamp-card.active').forEach(c => {
        const filename = c.dataset.filename;
        const category = c.dataset.category;
        const fidx = favorites.findIndex(f => f.category === category && f.filename === filename);
        if (fidx >= 0) { favorites.splice(fidx, 1); favChanged = true; }
        window.pywebview.api.delete_stamp(category, filename);
        c.remove();
    });
    if (favChanged) { saveFavorites(); updateFavoritesList(); }
    lastSelected = null;
    updateDeleteBtn();
    closeModal('modal-delete');
}

// Восстановить из корзины
restoreBtn.addEventListener('click', () => {
    grid.querySelectorAll('.stamp-card.active').forEach(c => {
        const filename = c.dataset.filename;
        const category = c.dataset.category;
        if (c.dataset.isFolder === 'true') {
            window.pywebview.api.restore_category(filename);
        } else {
            window.pywebview.api.restore_stamp(category, filename);
        }
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
        const filename = c.dataset.filename;
        const category = c.dataset.category;
        if (c.dataset.isFolder === 'true') {
            window.pywebview.api.delete_category_from_trash(filename);
        } else {
            window.pywebview.api.delete_stamp_from_trash(category, filename);
        }
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

document.getElementById('breadcrumb-back').addEventListener('click', () => {
    setTrashView(true, null);
});

document.getElementById('btn-empty-trash').addEventListener('click', () => {
    openModal('modal-empty-trash');
});

document.getElementById('btn-empty-trash-confirm').addEventListener('click', () => {
    window.pywebview.api.empty_trash().then(() => {
        grid.innerHTML = '';
        updateDeleteBtn();
    });
    closeModal('modal-empty-trash');
});

document.getElementById('btn-empty-trash-cancel').addEventListener('click', () => {
    closeModal('modal-empty-trash');
});

document.getElementById('btn-delete-confirm').addEventListener('click', confirmDelete);

document.getElementById('btn-delete-cancel').addEventListener('click', () => {
    clearInterval(deleteInterval);
    closeModal('modal-delete');
});

// ─── Добавление штампа ──────────────────────────────────────────────────────

const fileInput       = document.getElementById('file-input');
const cropImage       = document.getElementById('crop-image');
const cropArea        = document.getElementById('crop-area');
const cropFrame       = document.getElementById('crop-frame');
const stampDetails    = document.getElementById('stamp-details');
const confirmStampBtn = document.getElementById('btn-stamp-confirm');

let cropRect   = { x: 0, y: 0, w: 0, h: 0 };
let dragState  = null;
let rotAngle   = 0;
let rotDragStart = null; // { startAngle, initRot }

const MIN_SIZE = 20;

function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

function applyCropRect() {
    cropFrame.style.left   = cropRect.x + 'px';
    cropFrame.style.top    = cropRect.y + 'px';
    cropFrame.style.width  = cropRect.w + 'px';
    cropFrame.style.height = cropRect.h + 'px';
}

function initCropFrame() {
    const aW = cropArea.offsetWidth;
    const aH = cropArea.offsetHeight;
    const pad = 24;
    cropRect = { x: pad, y: pad, w: aW - pad * 2, h: aH - pad * 2 };
    applyCropRect();
    cropFrame.style.display = 'block';
    stampDetails.style.display = 'flex';
    confirmStampBtn.disabled = false;
}

document.getElementById('btn-add-stamp').addEventListener('click', () => {
    cropImage.style.display = 'none';
    cropImage.style.transform = '';
    cropFrame.style.display = 'none';
    stampDetails.style.display = 'none';
    confirmStampBtn.disabled = true;
    rotAngle = 0;
    openModal('modal-add-stamp');
});

document.getElementById('btn-pick-file').addEventListener('click', () => fileInput.click());

fileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    cropImage.src = URL.createObjectURL(file);
    cropImage.style.display = 'block';
    document.querySelector('.crop-placeholder').style.display = 'none';
    fileInput.value = '';
    rotAngle = 0;
    cropImage.style.transform = '';
    cropImage.onload = () => initCropFrame();
});

// Mousedown — определяем что тащим
cropFrame.addEventListener('mousedown', (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.target.id === 'crop-rotate-handle') {
        const areaRect = cropArea.getBoundingClientRect();
        const cx = areaRect.left + cropRect.x + cropRect.w / 2;
        const cy = areaRect.top  + cropRect.y + cropRect.h / 2;
        rotDragStart = {
            startAngle: Math.atan2(e.clientY - cy, e.clientX - cx),
            initRot: rotAngle
        };
        return;
    }
    const handle = e.target.dataset.h;
    dragState = {
        type: handle || 'move',
        startX: e.clientX,
        startY: e.clientY,
        orig: { ...cropRect }
    };
});

document.addEventListener('mousemove', (e) => {
    if (rotDragStart) {
        const areaRect = cropArea.getBoundingClientRect();
        const cx = areaRect.left + cropRect.x + cropRect.w / 2;
        const cy = areaRect.top  + cropRect.y + cropRect.h / 2;
        const angle = Math.atan2(e.clientY - cy, e.clientX - cx);
        rotAngle = rotDragStart.initRot + (angle - rotDragStart.startAngle) * 180 / Math.PI;
        cropImage.style.transform = `rotate(${rotAngle}deg)`;
        return;
    }
    if (!dragState) return;
    const aW = cropArea.offsetWidth;
    const aH = cropArea.offsetHeight;
    const dx = e.clientX - dragState.startX;
    const dy = e.clientY - dragState.startY;
    const o  = dragState.orig;
    let { x, y, w, h } = o;

    if (dragState.type === 'move') {
        x = clamp(o.x + dx, 0, aW - w);
        y = clamp(o.y + dy, 0, aH - h);
    } else {
        const t = dragState.type;
        if (t.includes('r')) { w = clamp(o.w + dx, MIN_SIZE, aW - o.x); }
        if (t.includes('l')) { const nw = clamp(o.w - dx, MIN_SIZE, o.x + o.w); x = o.x + o.w - nw; w = nw; }
        if (t.includes('b')) { h = clamp(o.h + dy, MIN_SIZE, aH - o.y); }
        if (t.includes('t')) { const nh = clamp(o.h - dy, MIN_SIZE, o.y + o.h); y = o.y + o.h - nh; h = nh; }
    }

    cropRect = { x, y, w, h };
    applyCropRect();
});

document.addEventListener('mouseup', () => {
    dragState = null;
    rotDragStart = null;
});

document.getElementById('btn-stamp-confirm').addEventListener('click', () => {
    const name     = document.getElementById('input-stamp-name').value.trim() || 'Без названия';
    const width    = document.getElementById('input-stamp-w').value;
    const height   = document.getElementById('input-stamp-h').value;
    const category = getActiveCategory();

    const imgRect  = cropImage.getBoundingClientRect();
    const areaRect = cropArea.getBoundingClientRect();
    const imgW = cropImage.offsetWidth;
    const imgH = cropImage.offsetHeight;
    const imgCX = (imgRect.left + imgRect.right) / 2 - areaRect.left;
    const imgCY = (imgRect.top  + imgRect.bottom) / 2 - areaRect.top;

    const aW = cropArea.offsetWidth;
    const aH = cropArea.offsetHeight;
    const scaleX = cropImage.naturalWidth  / imgW;
    const scaleY = cropImage.naturalHeight / imgH;

    const tempCanvas = document.createElement('canvas');
    tempCanvas.width  = aW;
    tempCanvas.height = aH;
    const tempCtx = tempCanvas.getContext('2d');
    tempCtx.save();
    tempCtx.translate(imgCX, imgCY);
    tempCtx.rotate(rotAngle * Math.PI / 180);
    tempCtx.drawImage(cropImage, -imgW / 2, -imgH / 2, imgW, imgH);
    tempCtx.restore();

    const finalCanvas = document.createElement('canvas');
    finalCanvas.width  = cropRect.w * scaleX;
    finalCanvas.height = cropRect.h * scaleY;
    finalCanvas.getContext('2d').drawImage(
        tempCanvas,
        cropRect.x, cropRect.y, cropRect.w, cropRect.h,
        0, 0, finalCanvas.width, finalCanvas.height
    );
    const imageData = finalCanvas.toDataURL('image/png').replace(/^data:image\/png;base64,/, '');
    window.pywebview.api.add_stamp(category, name, width, height, imageData).then(() => setTrashView(false));
    closeModal('modal-add-stamp');
});

document.getElementById('btn-stamp-cancel').addEventListener('click', () => {
    closeModal('modal-add-stamp');
    dragState = null;
});

// ─── Rubber band selection ───────────────────────────────────────────────────

const selectionBox = document.getElementById('selection-box');
let isDragging = false;
let wasDragging = false;
let startX, startY;

document.querySelector('.container').addEventListener('mousedown', (e) => {
    if (e.target.closest('.toolbar')) return;
    e.preventDefault();
    isDragging = true;
    wasDragging = false;
    startX = e.clientX;
    startY = e.clientY;
    selectionBox.style.left = startX + 'px';
    selectionBox.style.top = startY + 'px';
    selectionBox.style.width = '0';
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
    selectionBox.style.left = x + 'px';
    selectionBox.style.top = y + 'px';
    selectionBox.style.width = w + 'px';
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

function isFavorite(category, filename) {
    return favorites.some(f => f.category === category && f.filename === filename);
}

function saveFavorites() {
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
}

function toggleFavorite(category, filename) {
    const idx = favorites.findIndex(f => f.category === category && f.filename === filename);
    if (idx >= 0) {
        favorites.splice(idx, 1);
        saveFavorites();
        updateFavoritesList();
        return true;
    }
    if (favorites.length >= 15) return false;
    favorites.push({ category, filename });
    saveFavorites();
    updateFavoritesList();
    return true;
}

function updateFavoritesList() {
    favoritesList.innerHTML = '';
    const validFavs = favorites.filter(fav =>
        [...categoryList.querySelectorAll('li')].some(l => l.dataset.category === fav.category)
    );
    const label = favoritesSection.querySelector('.sidebar-label');
    if (validFavs.length === 0) {
        favoritesSection.style.display = 'none';
        label.textContent = 'Избранное';
        return;
    }
    favoritesSection.style.display = 'flex';
    label.textContent = `Избранное (${favorites.length}/15)`;
    validFavs.forEach(fav => {
        const li = document.createElement('li');
        li.textContent = stampDisplayName(fav.filename);
        li.addEventListener('click', () => {
            const catLi = [...categoryList.querySelectorAll('li')].find(l => l.dataset.category === fav.category);
            if (!catLi) return;
            trashItem.classList.remove('active');
            setActiveCategory(catLi);
            setTrashView(false);
        });
        favoritesList.appendChild(li);
    });
}

// ─── Контекстное меню ────────────────────────────────────────────────────────

function showContextMenu(e, card) {
    contextTarget = card;
    contextMenu.style.left = e.clientX + 'px';
    contextMenu.style.top = e.clientY + 'px';
    contextMenu.classList.add('visible');
}

function hideContextMenu() {
    contextMenu.classList.remove('visible');
    contextTarget = null;
}

function hideCategoryContextMenu() {
    categoryContextMenu.classList.remove('visible');
    catContextTarget = null;
}

document.getElementById('ctx-rename').addEventListener('click', () => {
    if (!contextTarget) return;
    document.getElementById('input-rename-stamp').value =
        contextTarget.querySelector('.stamp-name').textContent;
    contextMenu.classList.remove('visible'); // скрываем меню, но contextTarget не трогаем
    openModal('modal-rename-stamp');
    setTimeout(() => document.getElementById('input-rename-stamp').focus(), 50);
});

document.getElementById('ctx-delete').addEventListener('click', () => {
    if (!contextTarget) return;
    clearSelection();
    contextTarget.classList.add('active');
    updateDeleteBtn();
    hideContextMenu();
    deleteBtn.click();
});

// ─── Переименование штампа ──────────────────────────────────────────────────

document.getElementById('btn-rename-stamp-confirm').addEventListener('click', () => {
    const newName = document.getElementById('input-rename-stamp').value.trim();
    if (!newName || !contextTarget) return;
    const card = contextTarget;
    const oldFilename = card.dataset.filename;
    const category = card.dataset.category;
    window.pywebview.api.rename_stamp(category, oldFilename, newName)
        .then(newFilename => {
            card.dataset.filename = newFilename;
            card.querySelector('.stamp-name').textContent = newName;
            const fidx = favorites.findIndex(f => f.category === category && f.filename === oldFilename);
            if (fidx >= 0) { favorites[fidx].filename = newFilename; saveFavorites(); updateFavoritesList(); }
        });
    contextTarget = null;
    closeModal('modal-rename-stamp');
});

document.getElementById('btn-rename-stamp-cancel').addEventListener('click', () => {
    contextTarget = null;
    closeModal('modal-rename-stamp');
});

document.getElementById('input-rename-stamp').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') document.getElementById('btn-rename-stamp-confirm').click();
    if (e.key === 'Escape') { contextTarget = null; closeModal('modal-rename-stamp'); }
});

// ─── Контекстное меню категории ─────────────────────────────────────────────

document.getElementById('cat-ctx-rename').addEventListener('click', () => {
    if (!catContextTarget) return;
    document.getElementById('input-rename-category').value = catContextTarget.dataset.category;
    categoryContextMenu.classList.remove('visible'); // скрываем меню, catContextTarget не трогаем
    openModal('modal-rename-category');
    setTimeout(() => document.getElementById('input-rename-category').focus(), 50);
});

document.getElementById('cat-ctx-delete').addEventListener('click', () => {
    if (!catContextTarget) return;
    setActiveCategory(catContextTarget);
    trashItem.classList.remove('active');
    document.getElementById('delete-category-name').textContent = catContextTarget.dataset.category;
    hideCategoryContextMenu();
    openModal('modal-delete-category');
});

// ─── Переименование категории ────────────────────────────────────────────────

document.getElementById('btn-rename-category-confirm').addEventListener('click', () => {
    const newName = document.getElementById('input-rename-category').value.trim();
    if (!newName || !catContextTarget) return;
    const li = catContextTarget;
    const oldName = li.dataset.category;
    const wasActive = li.classList.contains('active');
    window.pywebview.api.rename_category(oldName, newName).then(() => {
        li.dataset.category = newName;
        li.textContent = newName;
        if (favorites.some(f => f.category === oldName)) {
            favorites.forEach(f => { if (f.category === oldName) f.category = newName; });
            saveFavorites();
            updateFavoritesList();
        }
        if (wasActive) setTrashView(false);
    });
    catContextTarget = null;
    closeModal('modal-rename-category');
});

document.getElementById('btn-rename-category-cancel').addEventListener('click', () => {
    catContextTarget = null;
    closeModal('modal-rename-category');
});

document.getElementById('input-rename-category').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') document.getElementById('btn-rename-category-confirm').click();
    if (e.key === 'Escape') { catContextTarget = null; closeModal('modal-rename-category'); }
});

document.addEventListener('click', (e) => {
    if (!e.target.closest('#context-menu')) hideContextMenu();
    if (!e.target.closest('#category-context-menu')) hideCategoryContextMenu();
});

document.addEventListener('contextmenu', (e) => {
    const card = e.target.closest('.stamp-card');
    if (card) {
        e.preventDefault();
        hideCategoryContextMenu();
        showContextMenu(e, card);
    } else {
        hideContextMenu();
    }
});


window.addEventListener('pywebviewready', function() {
    window.pywebview.api.get_categories().then(categories => {
        categoryList.innerHTML = '';
        categories.forEach(name => addCategoryItem(name));
        if (categories.length > 0) setTrashView(false);
        updateFavoritesList();
    });
});
