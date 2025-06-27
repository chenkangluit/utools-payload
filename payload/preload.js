// Payload数据存储键名
const PAYLOAD_STORAGE_KEY = 'payload-manager-data';
const CATEGORY_STORAGE_KEY = 'payload-categories';
const PAYLOAD_DATA_URL = 'payloads.json'; // 外部JSON文件路径

// DOM元素
let payloadList, searchInput, categoryList, notification, notificationText, addButton, modal, modalTitle;
let modalClose, modalCancel, modalSave, payloadNameInput, payloadCategoryInput, payloadContentInput;
let payloadTagsInput, tagPreview, manageCategoriesBtn, categoryModal, categoryModalClose;
let editableCategoryList, newCategoryNameInput, addCategoryBtn;

// 当前状态
let currentCategory = 'all';
let currentSearch = '';
let payloads = [];
let categories = [];
let editingPayloadId = null;

// 初始分类 - 确保至少包含"全部"分类
const DEFAULT_CATEGORIES = [
    {id: 'all', name: '全部', icon: 'fa-star'},
    {id: 'sql', name: 'SQL注入', icon: 'fa-database'},
    {id: 'xss', name: 'XSS测试', icon: 'fa-code'},
    {id: 'rce', name: '命令执行', icon: 'fa-terminal'},
    {id: 'ssti', name: '模板注入', icon: 'fa-file-code'},
    {id: 'xxe', name: 'XXE注入', icon: 'fa-file-contract'},
    {id: 'getshell', name: 'GetShell', icon: 'fa-dragon'},
    {id: 'webshell', name: 'WebShell', icon: 'fa-code'}
];

// 初始化
document.addEventListener('DOMContentLoaded', async () => {
    // 获取DOM元素
    getDOMElements();

    // 确保UI有初始状态
    showLoadingState();

    // 加载数据
    await loadCategories();
    await loadPayloads();

    // 渲染UI
    renderCategories();
    renderCategoryOptions();
    setupEventListeners();

    // 初始化完成，隐藏加载状态
    filterPayloads();
});

// 安全获取DOM元素
function getDOMElements() {
    payloadList = document.getElementById('payload-list');
    searchInput = document.getElementById('search-input');
    categoryList = document.getElementById('category-list');
    notification = document.getElementById('notification');
    notificationText = document.getElementById('notification-text');
    addButton = document.getElementById('add-payload');
    modal = document.getElementById('payload-modal');
    modalTitle = document.getElementById('modal-title');
    modalClose = document.querySelector('.modal-close');
    modalCancel = document.getElementById('modal-cancel');
    modalSave = document.getElementById('modal-save');
    payloadNameInput = document.getElementById('payload-name');
    payloadCategoryInput = document.getElementById('payload-category');
    payloadContentInput = document.getElementById('payload-content');
    payloadTagsInput = document.getElementById('payload-tags');
    tagPreview = document.getElementById('tag-preview');
    manageCategoriesBtn = document.getElementById('manage-categories');
    categoryModal = document.getElementById('category-modal');
    categoryModalClose = document.getElementById('category-modal-close');
    editableCategoryList = document.getElementById('editable-category-list');
    newCategoryNameInput = document.getElementById('new-category-name');
    addCategoryBtn = document.getElementById('add-category-btn');
}

// 安全渲染加载状态
function showLoadingState() {
    if (!payloadList) return;

    payloadList.innerHTML = `
        <div class="loading">
            <div class="loading-spinner"></div>
            <p>正在加载Payload数据...</p>
        </div>
    `;
}

// 加载分类
function loadCategories() {
    return new Promise((resolve) => {
        try {
            const savedCategories = localStorage.getItem(CATEGORY_STORAGE_KEY);
            if (savedCategories) {
                try {
                    categories = JSON.parse(savedCategories);

                    // 确保"全部"分类始终存在且正确
                    const allCategory = DEFAULT_CATEGORIES.find(c => c.id === 'all');
                    if (!categories.some(c => c.id === 'all')) {
                        categories.unshift(allCategory);
                    } else {
                        // 更新"全部"分类为默认值，确保一致性
                        const index = categories.findIndex(c => c.id === 'all');
                        categories[index] = allCategory;
                    }

                    // 确保其他默认分类存在
                    DEFAULT_CATEGORIES.slice(1).forEach(defaultCat => {
                        if (!categories.some(c => c.id === defaultCat.id)) {
                            categories.push(defaultCat);
                        }
                    });
                } catch (e) {
                    console.error('解析分类数据失败，使用默认分类:', e);
                    categories = [...DEFAULT_CATEGORIES];
                }
            } else {
                categories = [...DEFAULT_CATEGORIES];
            }

            // 保存分类以确保一致性
            saveCategories();
        } catch (error) {
            console.error('加载分类失败，使用默认分类:', error);
            categories = [...DEFAULT_CATEGORIES];
            saveCategories();
        }
        resolve();
    });
}

// 渲染分类
function renderCategories() {
    if (!categoryList) return;

    categoryList.innerHTML = '';

    // 确保分类按特定顺序显示：全部 -> 默认分类 -> 其他分类
    const orderedCategories = [
        ...categories.filter(c => c.id === 'all'),
        ...categories.filter(c => DEFAULT_CATEGORIES.slice(1).some(dc => dc.id === c.id)),
        ...categories.filter(c => !DEFAULT_CATEGORIES.some(dc => dc.id === c.id) && c.id !== 'all')
    ];

    orderedCategories.forEach(category => {
        const categoryElement = document.createElement('li');
        categoryElement.className = `category-item ${category.id === currentCategory ? 'active' : ''}`;
        categoryElement.dataset.id = category.id;

        categoryElement.innerHTML = `
            <i class="fas ${category.icon}"></i> ${category.name}
            ${category.id !== 'all' ? '<span class="category-item-count" id="count-'+category.id+'"></span>' : ''}
        `;

        categoryList.appendChild(categoryElement);
    });

    // 更新分类计数
    updateCategoryCounts();
}

// 保存分类
function saveCategories() {
    localStorage.setItem(CATEGORY_STORAGE_KEY, JSON.stringify(categories));
}

// 更新分类计数
function updateCategoryCounts() {
    categories.forEach(category => {
        if (category.id === 'all') return;

        const countElement = document.getElementById(`count-${category.id}`);
        if (countElement) {
            const count = payloads.filter(p => p.category === category.id).length;
            countElement.textContent = count;
        }
    });
}

// 渲染分类选项（用于下拉菜单）
function renderCategoryOptions() {
    if (!payloadCategoryInput) return;

    payloadCategoryInput.innerHTML = '';

    // 添加所有预设分类选项
    categories
        .filter(category => category.id !== 'all')
        .forEach(category => {
            const option = document.createElement('option');
            option.value = category.id;
            option.textContent = category.name;
            payloadCategoryInput.appendChild(option);
        });
}

// 加载Payload数据
async function loadPayloads() {
    try {
        // 显示加载状态
        showLoadingState();

        // 尝试从外部JSON文件加载
        const response = await fetch(PAYLOAD_DATA_URL);
        if (!response.ok) {
            throw new Error(`HTTP错误! 状态: ${response.status}`);
        }

        const externalPayloads = await response.json();

        // 尝试从本地存储加载自定义数据
        const savedPayloads = localStorage.getItem(PAYLOAD_STORAGE_KEY);
        let customPayloads = [];

        if (savedPayloads) {
            try {
                customPayloads = JSON.parse(savedPayloads);
            } catch (e) {
                console.error('解析本地Payload数据失败:', e);
            }
        }

        // 合并外部数据和自定义数据
        payloads = [...externalPayloads, ...customPayloads];
    } catch (error) {
        console.error('加载外部数据失败:', error);
        showNotification('加载外部数据失败，使用本地存储数据');

        // 尝试从本地存储加载自定义数据
        const savedPayloads = localStorage.getItem(PAYLOAD_STORAGE_KEY);
        if (savedPayloads) {
            try {
                const customPayloads = JSON.parse(savedPayloads);
                payloads = [...payloads, ...customPayloads];
            } catch (e) {
                console.error('解析本地存储数据失败:', e);
            }
        }
    }
}

// 保存Payload数据（仅保存自定义部分）
function savePayloads() {
    // 只保存自定义payload（ID大于1000000的）
    const customPayloads = payloads.filter(payload => payload.id > 1000000);
    localStorage.setItem(PAYLOAD_STORAGE_KEY, JSON.stringify(customPayloads));
    updateCategoryCounts();
}

// 渲染Payload列表
function renderPayloads(payloadsToRender) {
    if (!payloadList) return;

    if (payloadsToRender.length === 0) {
        payloadList.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-inbox"></i>
                <h3>没有找到匹配的Payload</h3>
                <p>尝试其他搜索词或添加新的Payload</p>
            </div>
        `;
        return;
    }

    payloadList.innerHTML = '';

    payloadsToRender.forEach(payload => {
        const payloadElement = document.createElement('div');
        payloadElement.className = 'payload-item';
        payloadElement.dataset.id = payload.id;

        // 获取分类信息 - 如果找不到分类则显示"全部"
        let category = categories.find(c => c.id === payload.category);
        if (!category) {
            category = {name: "全部", icon: 'fa-star'};
        }

        // 检查是否是预置Payload
        const isExternalPayload = payload.id <= 1000000 && !payload.isCustom;

        payloadElement.innerHTML = `
            <div class="payload-header">
                <div class="payload-name">${payload.name}</div>
                <div class="payload-category">
                    <i class="fas ${category.icon}"></i> ${category.name}
                    ${isExternalPayload ? '<span class="external-badge">预置</span>' : ''}
                </div>
            </div>
            <div class="payload-content">${escapeHtml(payload.content)}</div>
            <div class="payload-tags">
                ${payload.tags ? payload.tags.map(tag => `<span class="tag">${tag}</span>`).join('') : ''}
            </div>
            <div class="payload-actions">
                <div class="action-btn edit-btn" title="编辑">
                    <i class="fas fa-edit"></i>
                </div>
                <div class="action-btn delete-btn" title="删除">
                    <i class="fas fa-trash"></i>
                </div>
            </div>
        `;

        payloadList.appendChild(payloadElement);
    });
}

// 转义HTML
function escapeHtml(unsafe) {
    return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

// 过滤Payloads
function filterPayloads() {
    let filtered = [...payloads];

    // 按分类过滤
    if (currentCategory !== 'all') {
        filtered = filtered.filter(p => p.category === currentCategory);
    }

    // 按搜索词过滤
    if (currentSearch) {
        const keywords = currentSearch.toLowerCase().split(' ').filter(k => k.trim() !== '');

        filtered = filtered.filter(payload => {
            const searchString = (
                payload.name.toLowerCase() +
                payload.content.toLowerCase() +
                (payload.tags ? payload.tags.join(' ').toLowerCase() : '')
            );

            return keywords.every(keyword => searchString.includes(keyword));
        });
    }

    renderPayloads(filtered);
}

// 显示通知
function showNotification(message) {
    if (!notification || !notificationText) return;

    notificationText.textContent = message;
    notification.classList.add('show');

    setTimeout(() => {
        if (notification) notification.classList.remove('show');
    }, 2000);
}

// 复制到剪贴板
function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
        showNotification('Payload已复制到剪贴板');
    }).catch(err => {
        showNotification('复制失败: ' + err);
    });
}

// 打开添加/编辑模态框
function openPayloadModal(payload = null) {
    if (!modal || !modalTitle) return;

    if (payload) {
        modalTitle.textContent = '编辑Payload';
        payloadNameInput.value = payload.name;
        payloadCategoryInput.value = payload.category || categories[1].id;
        payloadContentInput.value = payload.content;
        payloadTagsInput.value = payload.tags ? payload.tags.join(', ') : '';
        editingPayloadId = payload.id;

        // 更新标签预览
        updateTagPreview(payload.tags || []);
    } else {
        modalTitle.textContent = '添加新Payload';
        payloadNameInput.value = '';
        payloadCategoryInput.value = categories.length > 1 ? categories[1].id : 'sql';
        payloadContentInput.value = '';
        payloadTagsInput.value = '';
        editingPayloadId = null;

        // 清空标签预览
        tagPreview.innerHTML = '';
    }

    modal.classList.add('show');
}

// 关闭模态框
function closePayloadModal() {
    if (modal) modal.classList.remove('show');
}

// 保存Payload
function savePayload() {
    if (!payloadNameInput || !payloadContentInput) return;

    const name = payloadNameInput.value.trim();
    const category = payloadCategoryInput.value;
    const content = payloadContentInput.value.trim();
    const tags = payloadTagsInput.value.split(',').map(tag => tag.trim()).filter(tag => tag !== '');

    if (!name || !content) {
        showNotification('名称和内容不能为空');
        return;
    }

    if (editingPayloadId) {
        // 编辑现有Payload
        const index = payloads.findIndex(p => p.id === editingPayloadId);
        if (index !== -1) {
            payloads[index] = {
                ...payloads[index],
                name,
                category,
                content,
                tags
            };

            showNotification('Payload更新成功');
        }
    } else {
        // 添加新Payload
        const newPayload = {
            id: Date.now(), // 使用时间戳作为ID（大于1000000表示自定义）
            name,
            category,
            content,
            tags
        };

        payloads.push(newPayload);
        showNotification('Payload添加成功');
    }

    savePayloads();
    filterPayloads();
    closePayloadModal();
}

// 删除Payload
function deletePayload(id) {
    if (confirm('确定要删除这个Payload吗？')) {
        payloads = payloads.filter(p => p.id !== id);
        savePayloads();
        filterPayloads();
        showNotification('Payload已删除');
    }
}

// 更新标签预览
function updateTagPreview(tags) {
    if (!tagPreview) return;

    tagPreview.innerHTML = '';

    tags.forEach(tag => {
        const tagElement = document.createElement('span');
        tagElement.className = 'tag';
        tagElement.textContent = tag;
        tagPreview.appendChild(tagElement);
    });
}

// 打开分类管理模态框
function openCategoryModal() {
    if (!categoryModal) return;

    renderEditableCategories();
    categoryModal.classList.add('show');
}

// 关闭分类管理模态框
function closeCategoryModal() {
    if (categoryModal) categoryModal.classList.remove('show');
}

// 渲染可编辑分类列表
function renderEditableCategories() {
    if (!editableCategoryList) return;

    editableCategoryList.innerHTML = '';

    // 确保包含所有分类（除了 'all'）
    categories
        .filter(category => category.id !== 'all')
        .forEach(category => {
            const categoryElement = document.createElement('li');
            categoryElement.className = 'editable-category-item';
            categoryElement.dataset.id = category.id;

            categoryElement.innerHTML = `
                <div class="category-info">
                    <i class="fas ${category.icon}"></i>
                    <input type="text" class="category-name-input" value="${category.name}" data-id="${category.id}">
                </div>
                <div class="category-actions">
                    <button class="btn btn-danger delete-category-btn" data-id="${category.id}">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            `;

            editableCategoryList.appendChild(categoryElement);
        });
}

// 添加新分类
function addNewCategory() {
    if (!newCategoryNameInput) return;

    const name = newCategoryNameInput.value.trim();
    const icon = 'fa-folder'; // 使用默认图标

    if (!name) {
        showNotification('分类名称不能为空');
        return;
    }

    // 检查是否已存在同名分类
    if (categories.some(c => c.name === name)) {
        showNotification('分类名称已存在');
        return;
    }

    const newCategory = {
        id: `cat_${Date.now()}`, // 生成唯一ID
        name,
        icon
    };

    categories.push(newCategory);
    saveCategories();

    // 确保UI正确更新
    renderCategories();
    renderCategoryOptions();
    renderEditableCategories();

    newCategoryNameInput.value = '';
    showNotification('分类添加成功');
}

// 删除分类
function deleteCategory(categoryId) {
    // 检查分类中是否有Payload
    const payloadsInCategory = payloads.filter(p => p.category === categoryId);

    if (payloadsInCategory.length > 0) {
        if (!confirm(`该分类中有 ${payloadsInCategory.length} 个Payload，删除分类后这些Payload将归类到"全部"分类中。确定删除？`)) {
            return;
        }

        // 将分类中的Payload的category设置为null（将显示在"全部"中）
        payloads.forEach(p => {
            if (p.category === categoryId) {
                p.category = null;
            }
        });

        savePayloads();
    }

    // 删除分类
    categories = categories.filter(c => c.id !== categoryId);
    saveCategories();
    renderCategories();
    renderCategoryOptions();
    renderEditableCategories();

    showNotification('分类已删除');
}

// 更新分类名称
function updateCategoryName(categoryId, newName) {
    if (!newName.trim()) {
        showNotification('分类名称不能为空');
        return;
    }

    const category = categories.find(c => c.id === categoryId);
    if (category) {
        category.name = newName.trim();
        saveCategories();
        renderCategories();
        renderCategoryOptions();
        showNotification('分类名称已更新');
    }
}

// 添加事件监听
function setupEventListeners() {
    // 分类切换
    if (categoryList) {
        categoryList.addEventListener('click', (e) => {
            const categoryItem = e.target.closest('.category-item');
            if (!categoryItem) return;

            currentCategory = categoryItem.dataset.id;

            // 更新活动状态
            document.querySelectorAll('.category-item').forEach(item => {
                item.classList.remove('active');
            });
            categoryItem.classList.add('active');

            filterPayloads();
        });
    }

    // 搜索
    if (searchInput) {
        searchInput.addEventListener('input', () => {
            currentSearch = searchInput.value.toLowerCase();
            filterPayloads();
        });
    }

    // Payload点击事件
    if (payloadList) {
        payloadList.addEventListener('click', (e) => {
            const payloadItem = e.target.closest('.payload-item');
            if (!payloadItem) return;

            const payloadId = parseInt(payloadItem.dataset.id);
            const payload = payloads.find(p => p.id === payloadId);

            if (!payload) return;

            // 复制Payload
            if (!e.target.closest('.action-btn')) {
                copyToClipboard(payload.content);
            }
        });
    }

    // 添加Payload按钮
    if (addButton) {
        addButton.addEventListener('click', () => {
            openPayloadModal();
        });
    }

    // 编辑和删除按钮事件
    if (payloadList) {
        payloadList.addEventListener('click', (e) => {
            const payloadItem = e.target.closest('.payload-item');
            if (!payloadItem) return;

            const payloadId = parseInt(payloadItem.dataset.id);
            const payload = payloads.find(p => p.id === payloadId);

            if (e.target.closest('.edit-btn')) {
                // 编辑Payload
                openPayloadModal(payload);
            } else if (e.target.closest('.delete-btn')) {
                // 删除Payload
                deletePayload(payloadId);
            }
        });
    }

    // Payload模态框事件
    if (modalClose) modalClose.addEventListener('click', closePayloadModal);
    if (modalCancel) modalCancel.addEventListener('click', closePayloadModal);
    if (modalSave) modalSave.addEventListener('click', savePayload);

    // 点击模态框外部关闭
    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                closePayloadModal();
            }
        });
    }

    // 标签输入事件
    if (payloadTagsInput) {
        payloadTagsInput.addEventListener('input', () => {
            const tags = payloadTagsInput.value.split(',').map(tag => tag.trim()).filter(tag => tag !== '');
            updateTagPreview(tags);
        });
    }

    // 按ESC关闭模态框
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closePayloadModal();
            closeCategoryModal();
        }
    });

    // 分类管理按钮
    if (manageCategoriesBtn) {
        manageCategoriesBtn.addEventListener('click', openCategoryModal);
    }

    // 分类管理模态框事件
    if (categoryModalClose) {
        categoryModalClose.addEventListener('click', closeCategoryModal);
    }

    if (categoryModal) {
        categoryModal.addEventListener('click', (e) => {
            if (e.target === categoryModal) {
                closeCategoryModal();
            }
        });
    }

    // 添加分类按钮
    if (addCategoryBtn) {
        addCategoryBtn.addEventListener('click', addNewCategory);
    }

    // 分类名称编辑事件
    if (editableCategoryList) {
        editableCategoryList.addEventListener('change', (e) => {
            if (e.target.classList.contains('category-name-input')) {
                const categoryId = e.target.dataset.id;
                const newName = e.target.value;
                updateCategoryName(categoryId, newName);
            }
        });
    }

    // 删除分类按钮事件
    if (editableCategoryList) {
        editableCategoryList.addEventListener('click', (e) => {
            if (e.target.closest('.delete-category-btn')) {
                const categoryId = e.target.closest('.delete-category-btn').dataset.id;
                deleteCategory(categoryId);
            }
        });
    }
}