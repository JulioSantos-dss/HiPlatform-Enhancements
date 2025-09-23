// ==UserScript==
// @name         Hi - Gestão de Usuário
// @namespace    http://tampermonkey.net/
// @version      3.5
// @description  Reorganiza departamentos
// @author       Julio Santos feat. AI
// @match        https://www5.directtalk.com.br/admin/info/info_oper_editOperSite.asp*
// @grant        GM_addStyle
// @run-at       document-end
// @downloadURL  https://raw.githubusercontent.com/JulioSantos-dss/HiPlatform-Enhancements/main/Hi%20-%20Gest%C3%A3o%20de%20Usu%C3%A1rio.user.js
// @updateURL    https://raw.githubusercontent.com/JulioSantos-dss/HiPlatform-Enhancements/main/Hi%20-%20Gest%C3%A3o%20de%20Usu%C3%A1rio.user.js
// ==/UserScript==

(function() {
    'use strict';

    // --- 1. Define Categories and Keywords ---
    const categoryOrder = [
        'Controle de Acesso',
        'SAC',
        'Help',
        'Retenção',
        'Suporte N3',
        'Casos Críticos',
        'Agendamento',
        'Escritório',
        'Cobrança',
        'Churn Safra',
        'Refidelização',
        'Vendas',
        'COPE',
        'Loja',
        'Cadastro',
        'Bot',
        'Inativo',
        'Outros'
    ];
    const categoryKeywords = {
        'SAC': [
            'Cabonnet - Chat SAC',
            'Cabonnet GoodU - Chat SAC',
            'Cabonnet Adamantina - Chat Whatsapp SAC',
            'Cabonnet Assis - Chat Whatsapp SAC',
            'Cabonnet Bastos - Chat Whatsapp SAC',
            'Cabonnet Caçapava - Chat Whatsapp SAC',
            'Cabonnet Lins - Chat Whatsapp SAC',
            'Cabonnet Ourinhos - Chat Whatsapp SAC',
            'Cabonnet Penápolis - Chat Whatsapp SAC',
            'Cabonnet Pindamonhangaba - Chat Whatsapp SAC',
            'Cabonnet Prudente - Chat Whatsapp SAC',
            'Cabonnet Santa Cruz - Chat WhatsApp SAC',
            'Cabonnet Taubaté - Chat WhatsApp SAC',
            'Cabonnet - Chat Messenger',
            'Chat WhatsApp Falha API',
            'Cabonnet Tupã - Chat Whatsapp SAC'
        ],
        'Help': [
            'Cabonnet - Chat Help',
            'Cabonnet GoodU - Chat Help',
            'Cabonnet Adamantina - Chat Whatsapp Help',
            'Cabonnet Assis - Chat Whatsapp Help',
            'Cabonnet Bastos - Chat Whatsapp Help',
            'Cabonnet Caçapava - Chat Whatsapp Help',
            'Cabonnet Lins - Chat Whatsapp Help',
            'Cabonnet Ourinhos - Chat Whatsapp Help',
            'Cabonnet Penápolis - Chat Whatsapp Help',
            'Cabonnet Pindamonhangaba - Chat Whatsapp Help',
            'Cabonnet Prudente - Chat Whatsapp Help',
            'Cabonnet Santa Cruz - Chat WhatsApp HELP',
            'Cabonnet Taubaté - Chat WhatsApp Help',
            'Cabonnet Tupã - Chat Whatsapp Help'
        ],
        'Vendas': [
            'Cabonnet Taubaté - Chat WhatsApp Vendas',
            'Cabonnet Assis - Chat Whatsapp Vendas',
            'Cabonnet Adamantina - Chat Whatsapp Vendas',
            'Cabonnet Pindamonhangaba - Chat Whatsapp Vendas',
            'Cabonnet Tupã - Chat Whatsapp Vendas',
            'Cabonnet Prudente - Chat Whatsapp Vendas',
            'Cabonnet - Chat Vendas',
            'Cabonnet Penápolis - Chat Whatsapp Vendas',
            'Cabonnet Caçapava - Chat Whatsapp Vendas',
            'Cabonnet Lins - Chat Whatsapp Vendas',
            'Cabonnet Santa Cruz - Chat WhatsApp Vendas',
            'Cabonnet Ourinhos - Chat Whatsapp Vendas',
            'Cabonnet Bastos - Chat Whatsapp Vendas'
        ],
        'Inativo': [
            'GoodU Adamantina',
            'GoodU Florida Paulista',
            'GoodU Inúbia Paulista',
            'GoodU Lucélia',
            'GoodU Osvaldo Cruz',
            'Cabonnet Premium',
            'Tera',
            'Cmnet',
            'CMNet',
            'Lins Fibra',
            'Fibra Fast',
            'Chat SAC',
            'Chat Help',
            'Cabonnet Vale - Chat Whatsapp Churn',
            'Chat Vendas'
        ],
        'Cadastro': ['Cadastro'],
        'Casos Críticos': ['Casos Críticos'],
        'Refidelização': ['Refidelização'],
        'Suporte N3': ['Suporte N3'],
        'Agendamento': ['Agendamento'],
        'Churn Safra': ['Churn Safra'],
        'Cobrança': ['Cobrança', 'Financeiro - Chat Whatsapp'],
        'Escritório': ['Escritório'],
        'Loja': ['Loja'],
        'Retenção': ['Retenção', 'Retencao'],
        'COPE': ['COPE'],
        'Bot': ['Bot'],
        'Controle de Acesso': ['Plataforma DT']
    };

    // --- 2. Add Custom Styles ---
    GM_addStyle(`
        /* --- Main Control Bar --- */
        #organizer-controls {
            padding: 12px 15px;
            background-color: #f7f9fa; /* Lighter, cleaner background */
            border-bottom: 1px solid #dfe1e5; /* Subtle separator */
            box-shadow: 0 1px 3px rgba(0,0,0,0.04); /* Soft shadow for depth */
            width: 100%;
            box-sizing: border-box;
            display: flex;
            align-items: center;
            gap: 12px; /* Modern spacing for controls */
        }

        /* --- Search Input --- */
        #dept-search-input {
            flex-grow: 1;
            padding: 8px 12px;
            border: 1px solid #ccc;
            border-radius: 6px;
            font-size: 14px;
            color: #333;
            transition: border-color 0.2s ease, box-shadow 0.2s ease; /* Smooth focus transition */
        }
        #dept-search-input:focus {
            outline: none;
            border-color: #4a90e2; /* Highlight color on focus */
            box-shadow: 0 0 0 2px rgba(74, 144, 226, 0.2); /* Glow effect */
        }

        /* --- Main Control Buttons (Expand/Collapse) --- */
        .organizer-btn {
            padding: 8px 16px;
            border-radius: 6px;
            border: 1px solid #ccc;
            background-color: #ffffff;
            cursor: pointer;
            font-size: 13px;
            font-weight: 500;
            color: #333;
            white-space: nowrap; /* Prevent text wrapping */
            transition: all 0.2s ease;
        }
        .organizer-btn:hover {
            background-color: #f5f5f5;
            border-color: #bbb;
        }
        .organizer-btn:active {
            background-color: #eee;
            box-shadow: inset 0 1px 2px rgba(0,0,0,0.1);
        }

        /* --- Category Header Rows --- */
        .category-header {
            background-color: #4a90e2 !important; /* A more modern, softer blue */
            color: #FFFFFF;
            font-weight: bold;
            font-size: 14px;
            cursor: pointer;
            user-select: none;
            transition: background-color 0.2s ease;
            border-top: 1px solid rgba(255, 255, 255, 0.2); /* Subtle top border */
        }
        .category-header:hover {
            background-color: #357ABD !important; /* Darker blue for hover */
        }
        .category-header td {
            padding: 10px 15px !important;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }

        /* --- Expand/Collapse Icon --- */
        .toggle-icon {
            font-size: 12px;
            margin-right: 12px;
            display: inline-block;
            width: 16px;
            text-align: center;
            transition: transform 0.2s ease-in-out; /* Smooth rotation animation */
        }
        .toggle-icon.expanded {
            transform: rotate(90deg); /* Rotates the icon when category is open */
        }

        /* --- Header Action Buttons & Selects --- */
        .category-actions {
            display: flex;
            align-items: center;
            gap: 8px; /* Consistent spacing */
        }
        .category-action-btn, .category-action-select {
            padding: 4px 10px;
            font-size: 11px;
            font-weight: 500;
            background-color: rgba(255, 255, 255, 0.9);
            color: #357ABD;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            transition: all 0.2s ease;
        }
        .category-action-btn:hover, .category-action-select:hover {
            background-color: #ffffff;
            color: #2a5f99;
        }
        .category-action-select {
            -webkit-appearance: none;
            -moz-appearance: none;
            appearance: none;
            background-image: url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%23357ABD%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E');
            background-repeat: no-repeat;
            background-position: right 6px top 50%;
            background-size: .65em auto;
            padding-right: 20px; /* Space for custom dropdown arrow */
        }

        /* --- Visual Feedback for Permission Changes --- */
        .permission-select-flash {
            background-color: #FFF3CD !important; /* A bootstrap-like warning yellow */
            transition: background-color 0.5s ease;
        }
    `);

    // --- 3. Main Script Logic ---

    let allDeptData = [];
    let categoryHeaders = {};

    function getDepartmentName(titleRow) {
        const deptNameElement = titleRow.querySelector('.department-row');
        if (!deptNameElement) return '';
        const clone = deptNameElement.cloneNode(true);
        clone.querySelectorAll('input').forEach(input => input.remove());
        return clone.textContent.trim();
    }

    function updateVisibility() {
        const searchTerm = document.getElementById('dept-search-input').value.toLowerCase();

        allDeptData.forEach(dept => {
            const isMatch = dept.name.toLowerCase().includes(searchTerm);
            const categoryHeader = categoryHeaders[dept.category];
            // MODIFIED: Check for .expanded class instead of text content for better animation control
            const isCategoryExpanded = categoryHeader && categoryHeader.querySelector('.toggle-icon').classList.contains('expanded');
            const shouldTitleBeVisible = isMatch && isCategoryExpanded;

            dept.titleRow.style.display = shouldTitleBeVisible ? 'table-row' : 'none';

            const checkbox = dept.titleRow.querySelector('input[type=checkbox]');
            const isChecked = checkbox && checkbox.checked;
            dept.contentRow.style.display = (shouldTitleBeVisible && isChecked) ? 'table-row' : 'none';
        });

        // Update header counts and visibility
        for (const categoryName in categoryHeaders) {
            const header = categoryHeaders[categoryName];
            const deptsInCat = allDeptData.filter(d => d.category === categoryName);
            const totalInCat = deptsInCat.length;
            const checkedInCat = deptsInCat.filter(d => d.titleRow.querySelector('input[type=checkbox]').checked).length;

            const countSpan = header.querySelector('.category-count');
            if (countSpan) {
                countSpan.textContent = `(${checkedInCat} / ${totalInCat})`;
            }

            const visibleDeptsInSearch = deptsInCat.filter(d => d.name.toLowerCase().includes(searchTerm)).length;
            header.style.display = (searchTerm !== '' && visibleDeptsInSearch === 0) ? 'none' : 'table-row';
        }
    }

    // MODIFIED: Toggles a class for CSS-based animation instead of changing text content.
    function toggleCategoryState(headerRow, forceState = null) {
        const icon = headerRow.querySelector('.toggle-icon');
        const isExpanded = icon.classList.contains('expanded');
        const shouldExpand = forceState !== null ? forceState : !isExpanded;

        if (shouldExpand) {
            icon.classList.add('expanded');
        } else {
            icon.classList.remove('expanded');
        }
    }


    function toggleAll(expand) {
        for (const categoryName in categoryHeaders) {
            const header = categoryHeaders[categoryName];
            if (header.style.display !== 'none') {
                toggleCategoryState(header, expand);
            }
        }
        updateVisibility();
    }

    function createControls(container) {
        const controlsRow = document.createElement('tr');
        const controlsCell = document.createElement('td');
        controlsCell.colSpan = 2;
        controlsCell.innerHTML = `
            <div id="organizer-controls">
                <input type="text" id="dept-search-input" placeholder="Procurar Departamento...">
                <button id="expand-all-btn" class="organizer-btn">Expandir Todos</button>
                <button id="collapse-all-btn" class="organizer-btn">Recolher Todos</button>
            </div>
        `;
        container.parentNode.insertBefore(controlsRow, container.nextSibling);
        controlsRow.appendChild(controlsCell);

        document.getElementById('dept-search-input').addEventListener('input', updateVisibility);
        document.getElementById('expand-all-btn').addEventListener('click', () => toggleAll(true));
        document.getElementById('collapse-all-btn').addEventListener('click', () => toggleAll(false));

        return controlsRow;
    }

    function bulkCheckCategory(categoryName, shouldBeChecked) {
        const deptsToModify = allDeptData.filter(dept =>
            dept.category === categoryName && dept.titleRow.style.display !== 'none'
        );

        const overrideScript = document.createElement('script');
        overrideScript.id = 'temp-confirm-override';
        overrideScript.textContent = `
            window.originalConfirm = window.confirm;
            window.confirm = function() { return true; };
        `;

        const restoreScript = document.createElement('script');
        restoreScript.textContent = `
            window.confirm = window.originalConfirm;
            delete window.originalConfirm;
        `;

        try {
            document.head.appendChild(overrideScript);
            deptsToModify.forEach(dept => {
                const checkbox = dept.titleRow.querySelector('input[type=checkbox]');
                if (checkbox && checkbox.checked !== shouldBeChecked) {
                    checkbox.click();
                }
            });
        } finally {
            const scriptToRemove = document.getElementById('temp-confirm-override');
            if (scriptToRemove) {
                scriptToRemove.remove();
            }
            document.head.appendChild(restoreScript);
            setTimeout(() => restoreScript.remove(), 10);
        }
        setTimeout(updateVisibility, 0);
    }

    function bulkSetPermissions(categoryName, channelName, permissionKeyword) {
        if (!permissionKeyword) return;

        const deptsToModify = allDeptData.filter(dept =>
            dept.category === categoryName &&
            dept.titleRow.style.display !== 'none' &&
            dept.titleRow.querySelector('input[type=checkbox]').checked
        );

        deptsToModify.forEach(dept => {
            const permissionSelects = Array.from(dept.contentRow.querySelectorAll('select[name^="permissao_"]'));
            const targetSelect = permissionSelects.find(s => {
                const titleCell = s.closest('tr')?.querySelector('.channel-title');
                return titleCell && titleCell.textContent.trim().startsWith(channelName);
            });

            if (targetSelect) {
                const targetOption = Array.from(targetSelect.options).find(opt =>
                    opt.textContent.trim().toLowerCase().includes(permissionKeyword.toLowerCase())
                );

                if (targetOption && targetSelect.value !== targetOption.value) {
                    targetSelect.value = targetOption.value;

                    // MODIFIED: Use a class for visual feedback for better style management.
                    targetSelect.classList.add('permission-select-flash');
                    setTimeout(() => {
                        targetSelect.classList.remove('permission-select-flash');
                    }, 700); // A bit longer than the CSS transition.

                    targetSelect.dispatchEvent(new Event('input', { bubbles: true }));
                    targetSelect.dispatchEvent(new Event('change', { bubbles: true }));
                }
            }
        });
    }

    function centerUserDataSection() {
        const userDataCell = document.querySelector('td.main-user-information');
        if (!userDataCell) {
            console.error('Tampermonkey: User data cell not found.');
            return;
        }
        const userDataTable = userDataCell.closest('table');
        if (!userDataTable) {
            console.error('Tampermonkey: User data container table not found.');
            return;
        }
        const userDataRow = userDataCell.closest('tr');
        if (!userDataRow) {
            console.error('Tampermonkey: User data row (<tr>) not found.');
            return;
        }
        const separatorDivs = document.querySelectorAll('div.new-separator');
        userDataTable.style.maxWidth = '1200px';
        userDataTable.style.margin = '0 auto';
        userDataRow.style.maxWidth = '700px';
        userDataRow.style.margin = '20px auto';
        userDataRow.style.width = '100%';
        separatorDivs.forEach(div => {
            div.style.textAlign = 'center';
        });
    }

    function organizeDepartments() {
        const permissionsTitleRow = document.querySelector('tr > td.permission-title')?.closest('tr');
        if (!permissionsTitleRow) {
            console.error('Tampermonkey: Permissions section not found.');
            return;
        }

        const mainTableBody = permissionsTitleRow.closest('tbody');
        const allRows = Array.from(mainTableBody.children);
        const startIndex = allRows.indexOf(permissionsTitleRow) + 1;
        const endRow = mainTableBody.querySelector('input.new-button')?.closest('tr');
        const endIndex = endRow ? allRows.indexOf(endRow) : allRows.length;
        const departmentRows = allRows.slice(startIndex, endIndex);
        if (departmentRows.length === 0) return;

        const controlsRow = createControls(permissionsTitleRow);

        const categorizedDepts = {};
        categoryOrder.forEach(cat => (categorizedDepts[cat] = []));
        for (let i = 0; i < departmentRows.length; i += 2) {
            const titleRow = departmentRows[i];
            const contentRow = departmentRows[i + 1];
            if (!titleRow || !contentRow) continue;
            const deptName = getDepartmentName(titleRow);
            if (!deptName) continue;
            let assignedCategory = 'Outros';
            for (const category in categoryKeywords) {
                if (categoryKeywords[category].some(keyword => deptName.includes(keyword))) {
                    assignedCategory = category;
                    break;
                }
            }
            const deptData = { name: deptName, titleRow, contentRow, category: assignedCategory };
            categorizedDepts[assignedCategory].push(deptData);
            allDeptData.push(deptData);
        }

        mainTableBody.style.display = 'flex';
        mainTableBody.style.flexDirection = 'column';

        permissionsTitleRow.style.order = 0;
        controlsRow.style.order = 1;

        let orderIndex = 2;
        categoryOrder.forEach(categoryName => {
            const departments = categorizedDepts[categoryName];
            if (departments.length === 0) return;

            departments.sort((a, b) => a.name.localeCompare(b.name));

            const headerRow = document.createElement('tr');
            headerRow.className = 'category-header';
            headerRow.dataset.category = categoryName;
            const initialCheckedCount = departments.filter(d => d.titleRow.querySelector('input[type=checkbox]').checked).length;

            headerRow.innerHTML = `
                <td colspan="2">
                    <span class="category-title-group" style="flex-shrink: 0;">
                        <span class="toggle-icon">▶</span>
                        <span class="category-name-text">${categoryName} </span>
                        <span class="category-count">(${initialCheckedCount} / ${departments.length})</span>
                    </span>
                    <span class="category-actions">
                        <button class="category-action-btn" data-action="check">Selecionar Todos</button>
                        <button class="category-action-btn" data-action="uncheck">Deselecionar Todos</button>
                        <select class="category-action-select" data-channel="Geral">
                            <option value="">Definir Geral...</option><option value="Nenhum">Nenhum</option><option value="Operador">Operador</option><option value="Supervisor">Supervisor</option><option value="Administrador">Administrador</option>
                        </select>
                        <select class="category-action-select" data-channel="Chat">
                            <option value="">Definir Chat...</option><option value="Nenhum">Nenhum</option><option value="Operador">Operador</option><option value="Supervisor">Supervisor</option><option value="Administrador">Administrador</option>
                        </select>
                    </span>
                </td>
            `;

            mainTableBody.insertBefore(headerRow, endRow);
            categoryHeaders[categoryName] = headerRow;

            headerRow.style.order = orderIndex++;

            departments.forEach(dept => {
                dept.titleRow.style.order = orderIndex++;
                dept.contentRow.style.order = orderIndex++;
            });

            headerRow.querySelector('.category-title-group').addEventListener('click', () => {
                toggleCategoryState(headerRow);
                updateVisibility();
            });
            headerRow.querySelector('[data-action="check"]').addEventListener('click', (e) => bulkCheckCategory(categoryName, true));
            headerRow.querySelector('[data-action="uncheck"]').addEventListener('click', (e) => bulkCheckCategory(categoryName, false));
            headerRow.querySelectorAll('.category-action-select').forEach(select => {
                select.addEventListener('click', e => e.stopPropagation());
                select.addEventListener('change', (e) => {
                    const channel = e.target.dataset.channel;
                    const permission = e.target.value;
                    if (permission) {
                        bulkSetPermissions(categoryName, channel, permission);
                        e.target.selectedIndex = 0;
                    }
                });
            });
        });

        const attentionRow = document.querySelector('p.text-information')?.closest('tr');
        const allTableRows = Array.from(mainTableBody.querySelectorAll('tr'));
        const infoRow = allTableRows.find(row => row.textContent.includes('campo obrigatório'));

        if (endRow) {
            endRow.style.order = orderIndex++;
            endRow.style.alignSelf = 'center';
            endRow.style.width = 'fit-content';
            endRow.style.margin = '10px 0';
        }
        if (attentionRow) {
            attentionRow.style.order = orderIndex++;
            attentionRow.style.alignSelf = 'center';
            attentionRow.style.width = 'fit-content';
        }
        if (infoRow) {
            infoRow.style.order = orderIndex++;
            infoRow.style.alignSelf = 'center';
            infoRow.style.width = 'fit-content';
        }

        allDeptData.forEach(dept => {
            const checkbox = dept.titleRow.querySelector('input[type=checkbox]');
            if (checkbox) {
                checkbox.addEventListener('click', () => {
                    setTimeout(updateVisibility, 50);
                });
            }
        });

        updateVisibility();
    }

    window.addEventListener('load', () => {
        setTimeout(() => {
            centerUserDataSection();
            organizeDepartments();
        }, 500);
    });

})();
