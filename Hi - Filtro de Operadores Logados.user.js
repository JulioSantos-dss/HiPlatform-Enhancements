// ==UserScript==
// @name         Hi - Filtro de Operadores Logados
// @namespace    http://tampermonkey.net/
// @version      2.1
// @description  Filtro de Operadores com Interface Moderna e Agrupamento por Departamentos
// @author       Julio Santos feat. AI
// @match        https://www5.directtalk.com.br/static/beta/admin/main.html*
// @grant        none
// @downloadURL  https://raw.githubusercontent.com/JulioSantos-dss/HiPlatform-Enhancements/main/Hi%20-%20Filtro%20de%20Operadores%20Logados.user.js
// @updateURL    https://raw.githubusercontent.com/JulioSantos-dss/HiPlatform-Enhancements/main/Hi%20-%20Filtro%20de%20Operadores%20Logados.user.js
// ==/UserScript==

(function() {
    'use strict';
    console.log('[FilterScript] Script execution started.'); // DEBUG

    let toggleButton;
    let externalSearchInput;
    const predefinedFilters = [
        { label: 'SAC/Help', value: 'SAC/Help' },
        { label: 'Refidelização', value: 'Refidelização' },
        { label: 'Cobrança', value: 'Cobrança' },
        { label: 'Canais Externos', value: 'Casos Críticos' },
        { label: 'Retenção', value: 'Retenção' },
        { label: 'Agendamento', value: 'Agendamento' },
        { label: 'Comercial', value: 'Comercial' },
        { label: 'COPE', value: 'COPE' },
        { label: 'N3', value: 'N3' },
        { label: 'Loja', value: 'Loja' },
        { label: 'Outros', value: 'Outros' }
    ];

    function createSearchAndToggleButton() {
        console.log('[FilterScript] createSearchAndToggleButton called.'); // DEBUG

        const existingWrapper = document.querySelector('div[data-userscript-filter="search-toggle-wrapper"]');
        if (existingWrapper) {
            existingWrapper.remove();
        }

        const searchToggleWrapper = document.createElement('div');
        searchToggleWrapper.style.display = 'inline-flex';
        searchToggleWrapper.style.alignItems = 'center';
        searchToggleWrapper.style.marginLeft = '10px';
        searchToggleWrapper.style.position = 'relative';
        searchToggleWrapper.style.zIndex = '1001';
        searchToggleWrapper.setAttribute('data-userscript-filter', 'search-toggle-wrapper');

        let toggleButton = document.createElement('button');
        toggleButton.textContent = 'Filtrar Departamentos...';
        toggleButton.style.padding = '10px 15px';
        toggleButton.style.backgroundColor = '#007bff';
        toggleButton.style.color = '#fff';
        toggleButton.style.border = 'none';
        toggleButton.style.borderRadius = '5px 0 0 5px';
        toggleButton.style.cursor = 'pointer';
        toggleButton.style.fontFamily = 'Arial, sans-serif';
        toggleButton.style.fontSize = '14px';
        toggleButton.style.boxShadow = '0 2px 5px rgba(0,0,0,0.2)';
        toggleButton.style.fontWeight = 'normal';
        toggleButton.style.height = '38px';
        toggleButton.style.flexShrink = '0';

        toggleButton.addEventListener('mouseover', () => { toggleButton.style.backgroundColor = '#0056b3'; });
        toggleButton.addEventListener('mouseout', () => { toggleButton.style.backgroundColor = '#007bff'; });
        toggleButton.addEventListener('click', function() {
            let panel = document.getElementById('filterPanel');
            if (!panel) return;

            if (panel.style.display === 'none' || panel.style.display === '') {
                panel.style.display = 'block';
                document.body.classList.add('filter-open');
                updateCheckboxCounts();
            } else {
                panel.style.display = 'none';
                document.body.classList.remove('filter-open');
            }
        });

        const inputWrapper = document.createElement('div');
        inputWrapper.style.position = 'relative';
        inputWrapper.style.display = 'flex';
        inputWrapper.style.alignItems = 'center';

        externalSearchInput = document.createElement('input');
        externalSearchInput.type = 'text';
        externalSearchInput.id = 'externalOperatorSearch';
        externalSearchInput.placeholder = 'Buscar...';
        externalSearchInput.style.padding = '10px 30px 10px 10px';
        externalSearchInput.style.border = '1px solid #ccc';
        externalSearchInput.style.borderRadius = '0 5px 5px 0';
        externalSearchInput.style.marginLeft = '-1px';
        externalSearchInput.style.fontFamily = 'Arial, sans-serif';
        externalSearchInput.style.fontSize = '14px';
        externalSearchInput.style.height = '38px';
        externalSearchInput.style.boxSizing = 'border-box';
        externalSearchInput.style.width = '200px';

        const clearButton = document.createElement('span');
        clearButton.innerHTML = '&times;';
        clearButton.style.position = 'absolute';
        clearButton.style.right = '10px';
        clearButton.style.top = '50%';
        clearButton.style.transform = 'translateY(-50%)';
        clearButton.style.cursor = 'pointer';
        clearButton.style.color = '#888';
        clearButton.style.fontSize = '20px';
        clearButton.style.fontWeight = 'bold';
        clearButton.style.display = 'none';

        const toggleClearButton = () => {
            if (externalSearchInput.value) {
                clearButton.style.display = 'block';
            } else {
                clearButton.style.display = 'none';
            }
        };

        clearButton.addEventListener('click', () => {
            externalSearchInput.value = '';
            localStorage.removeItem('operatorFilter');
            applyFilter('');
            toggleClearButton();
            externalSearchInput.focus();
        });

        externalSearchInput.addEventListener('focus', () => {
            externalSearchInput.style.borderColor = '#007bff';
            externalSearchInput.style.boxShadow = '0 0 0 0.2rem rgba(0,123,255,.25)';
        });
        externalSearchInput.addEventListener('blur', () => {
            externalSearchInput.style.borderColor = '#ccc';
            externalSearchInput.style.boxShadow = 'none';
        });

        externalSearchInput.value = localStorage.getItem('operatorFilter') || '';
        toggleClearButton();

        externalSearchInput.addEventListener('input', function() {
            let filterValue = externalSearchInput.value.toLowerCase();
            localStorage.setItem('operatorFilter', filterValue);
            applyFilter(filterValue);
            toggleClearButton();
        });

        inputWrapper.appendChild(externalSearchInput);
        inputWrapper.appendChild(clearButton);

        searchToggleWrapper.appendChild(toggleButton);
        searchToggleWrapper.appendChild(inputWrapper);

        let header = [...document.querySelectorAll('h3')].find(h => h.textContent.includes("Operadores"));
        if (header) {
            header.appendChild(searchToggleWrapper);
        }
    }

    function createFilterPanel() {
        console.log('[FilterScript] createFilterPanel called.'); // DEBUG
        let panel = document.getElementById('filterPanel');
        if (panel) {
            panel.remove();
        }

        panel = document.createElement('div');
        panel.id = 'filterPanel';
        const panelStyles = {
            position: 'fixed', left: '0', top: '20px', width: '240px', backgroundColor: '#ffffff',
            padding: '20px', zIndex: '1000', border: '1px solid #eee', borderRadius: '8px',
            boxShadow: '0 4px 15px rgba(0,0,0,0.1)', display: 'none', fontFamily: 'Arial, sans-serif',
            fontSize: '14px', transition: 'all 0.3s ease', backdropFilter: 'blur(8px)',
            backgroundColor: 'rgba(255,255,255,0.98)'
        };
        Object.assign(panel.style, panelStyles);

        let closeButton = document.createElement('button');
        closeButton.textContent = '✕';
        Object.assign(closeButton.style, {
            position: 'absolute', right: '10px', top: '10px', background: 'none', border: 'none',
            fontSize: '16px', cursor: 'pointer', color: '#666', transition: 'color 0.3s ease'
        });
        closeButton.addEventListener('mouseover', () => closeButton.style.color = '#000');
        closeButton.addEventListener('mouseout', () => closeButton.style.color = '#666');
        closeButton.addEventListener('click', function() {
            panel.style.display = 'none';
            document.body.classList.remove('filter-open');
        });

        let title = document.createElement('h3');
        title.textContent = 'Filtrar Categorias';
        Object.assign(title.style, { margin: '0 0 15px', color: '#333', fontSize: '16px', fontWeight: '600' });

        panel.appendChild(closeButton);
        panel.appendChild(title);

        predefinedFilters.forEach(filter => {
            let checkboxContainer = document.createElement('div');
            Object.assign(checkboxContainer.style, { padding: '1px 0', borderBottom: '1px solid #f0f0f0', margin: '5px 0' });
            let checkbox = document.createElement('input');
            checkbox.type = 'checkbox'; checkbox.id = filter.label; checkbox.value = filter.value; checkbox.style.cursor = 'pointer';
            let labelElement = document.createElement('label');
            labelElement.htmlFor = filter.label; labelElement.textContent = filter.label;
            Object.assign(labelElement.style, { marginLeft: '8px', userSelect: 'none', color: '#444', fontSize: '14px', cursor: 'pointer' });
            let countSpan = document.createElement('span');
            Object.assign(countSpan.style, { marginLeft: '5px', fontSize: '12px', color: '#888' });
            checkboxContainer.appendChild(checkbox); checkboxContainer.appendChild(labelElement); checkboxContainer.appendChild(countSpan);
            checkbox.addEventListener('change', function() {
                saveCheckboxStates();
                if (externalSearchInput) applyFilter(externalSearchInput.value); else applyFilter('');
            });
            panel.appendChild(checkboxContainer);
        });

        let restoreButton = document.createElement('button');
        restoreButton.textContent = 'Restaurar Filtros';
        Object.assign(restoreButton.style, {
            marginTop: '15px', padding: '8px 12px', backgroundColor: '#dc3545', color: '#fff',
            border: 'none', borderRadius: '4px', cursor: 'pointer', transition: 'all 0.3s ease', width: '100%'
        });
        restoreButton.addEventListener('mouseover', () => { restoreButton.style.backgroundColor = '#c82333'; });
        restoreButton.addEventListener('mouseout', () => { restoreButton.style.backgroundColor = '#dc3545'; });
        restoreButton.addEventListener('click', restoreOriginalState);
        panel.appendChild(restoreButton);
        document.body.appendChild(panel);

        loadCheckboxStates();
        if (externalSearchInput) applyFilter(externalSearchInput.value); else applyFilter('');
        updateCheckboxCounts();
    }

    function saveCheckboxStates() {
        const states = {};
        const checkboxes = document.querySelectorAll('#filterPanel input[type="checkbox"]');
        checkboxes.forEach(checkbox => {
            states[checkbox.id] = checkbox.checked;
        });
        localStorage.setItem('checkboxStates', JSON.stringify(states));
    }

    function loadCheckboxStates() {
        const savedStates = localStorage.getItem('checkboxStates');
        if (savedStates) {
            const states = JSON.parse(savedStates);
            for (const id in states) {
                const checkbox = document.getElementById(id);
                if (checkbox) {
                    checkbox.checked = states[id];
                }
            }
        }
    }

    function restoreOriginalState() {
        if (externalSearchInput) {
            externalSearchInput.value = '';
        }
        localStorage.removeItem('operatorFilter');
        localStorage.removeItem('checkboxStates');
        const checkboxes = document.querySelectorAll('#filterPanel input[type="checkbox"]');
        checkboxes.forEach(checkbox => { checkbox.checked = false; });
        applyFilter('');
        updateCheckboxCounts();
    }

    function applyFilter(searchValue) {
        // Encontra estritamente a tabela original e previne selecionar as nossas tabelas clonadas
        let originalTable = document.querySelector('table.dt-chart-table:not(.custom-cloned-table)');
        if (!originalTable) return;

        let tableRows = originalTable.querySelectorAll('tbody tr');
        if (tableRows.length === 0) return;

        let selectedFilters = [...document.querySelectorAll('#filterPanel input[type="checkbox"]:checked')]
            .map(checkbox => checkbox.value);
        searchValue = (searchValue || "").toLowerCase();

        let customContainer = document.getElementById('custom-filters-container');

        if (!customContainer) {
            customContainer = document.createElement('div');
            customContainer.id = 'custom-filters-container';
            originalTable.parentNode.insertBefore(customContainer, originalTable.nextSibling);

            // Delegação de Eventos Mágica
            customContainer.addEventListener('click', (e) => {
                if (e.target.closest('th')) {
                    const clickedTh = e.target.closest('th');
                    const cThs = Array.from(clickedTh.closest('thead').querySelectorAll('th'));
                    const thIndex = cThs.indexOf(clickedTh);
                    const oThs = originalTable.querySelectorAll('thead th');
                    if (oThs[thIndex]) oThs[thIndex].click();
                    return;
                }

                const cRow = e.target.closest('tr');
                if (!cRow) return;
                const idx = cRow.getAttribute('data-original-index');
                if (idx === null) return;

                const originalRows = originalTable.querySelectorAll('tbody tr');
                const oRow = originalRows[idx];
                if (!oRow) return;

                if (e.target.closest('a')) {
                    const cLinks = Array.from(cRow.querySelectorAll('a'));
                    const clickedLink = e.target.closest('a');
                    const linkIndex = cLinks.indexOf(clickedLink);
                    const oLinks = oRow.querySelectorAll('a');
                    if (oLinks[linkIndex]) oLinks[linkIndex].click();
                } else if (e.target.closest('button') || e.target.closest('.dt-chart-table-icon')) {
                    const cBtns = Array.from(cRow.querySelectorAll('button'));
                    const clickedBtn = e.target.closest('button');
                    const btnIndex = cBtns.indexOf(clickedBtn);
                    const oBtns = oRow.querySelectorAll('button');
                    if (oBtns[btnIndex]) oBtns[btnIndex].click();
                }
            });
        }

        let isMultiMode = selectedFilters.length > 1;

        if (isMultiMode) {
            originalTable.style.display = 'none';
            customContainer.style.display = 'block';

            let groups = {};
            selectedFilters.forEach(f => groups[f] = []);

            tableRows.forEach((row, index) => {
                let operatorNameCell = row.querySelector('td a');
                if (!operatorNameCell) return;
                let operatorName = operatorNameCell.textContent.toLowerCase();

                let matchesSearch = searchValue === '' || operatorName.includes(searchValue);
                if (!matchesSearch) return;

                let isOtherSelected = selectedFilters.includes('Outros');
                let matchedFilter = null;

                for (let f of selectedFilters) {
                    if (f !== 'Outros' && operatorName.includes(f.toLowerCase())) {
                        matchedFilter = f;
                        break;
                    }
                }

                if (!matchedFilter && isOtherSelected) {
                    let matchesAnyPredefined = predefinedFilters.slice(0, -1).some(def => operatorName.includes(def.value.toLowerCase()));
                    if (!matchesAnyPredefined) {
                        matchedFilter = 'Outros';
                    }
                }

                if (matchedFilter) {
                    groups[matchedFilter].push({ row, index });
                }
            });

            selectedFilters.forEach(filterName => {
                let groupId = 'group-' + filterName.replace(/\W/g, '');
                let groupDiv = document.getElementById(groupId);

                if (!groupDiv) {
                    groupDiv = document.createElement('div');
                    groupDiv.id = groupId;
                    groupDiv.style.marginBottom = '30px';

                    let header = document.createElement('h4');
                    header.textContent = 'Departamento: ' + filterName;
                    Object.assign(header.style, {
                        backgroundColor: '#f8f9fa', padding: '12px 15px', borderLeft: '5px solid #007bff',
                        marginTop: '20px', fontWeight: 'bold', borderRadius: '4px', color: '#333', fontSize: '16px'
                    });

                    let tableClone = originalTable.cloneNode(false);
                    tableClone.removeAttribute('id');
                    tableClone.classList.add('custom-cloned-table'); // AQUI ESTÁ A CORREÇÃO DE DUPLICAÇÃO
                    tableClone.style.display = '';

                    let theadOriginal = originalTable.querySelector('thead');
                    if (theadOriginal) tableClone.appendChild(theadOriginal.cloneNode(true));

                    let tbody = document.createElement('tbody');
                    tableClone.appendChild(tbody);

                    groupDiv.appendChild(header);
                    groupDiv.appendChild(tableClone);
                    customContainer.appendChild(groupDiv);
                }

                let tbody = groupDiv.querySelector('tbody');
                let validIndices = new Set();

                groups[filterName].forEach(item => {
                    validIndices.add(item.index.toString());
                    let existingRow = tbody.querySelector(`tr[data-original-index="${item.index}"]`);

                    if (existingRow) {
                        for (let i = 1; i < item.row.cells.length; i++) {
                            if(existingRow.cells[i]) {
                                existingRow.cells[i].innerHTML = item.row.cells[i].innerHTML;
                                existingRow.cells[i].className = item.row.cells[i].className;
                            }
                        }
                        tbody.appendChild(existingRow);
                    } else {
                        let newRow = item.row.cloneNode(true);
                        newRow.setAttribute('data-original-index', item.index);
                        newRow.style.display = '';
                        tbody.appendChild(newRow);
                    }
                });

                Array.from(tbody.querySelectorAll('tr')).forEach(tr => {
                    if (!validIndices.has(tr.getAttribute('data-original-index'))) tr.remove();
                });
            });

            Array.from(customContainer.children).forEach(child => {
                let activeIds = selectedFilters.map(f => 'group-' + f.replace(/\W/g, ''));
                if (!activeIds.includes(child.id)) child.remove();
            });

        } else {
            originalTable.style.display = '';
            customContainer.style.display = 'none';

            let selectedFiltersLower = selectedFilters.map(f => f.toLowerCase());

            tableRows.forEach(function(row) {
                let operatorNameCell = row.querySelector('td a');
                if (!operatorNameCell) return;
                let operatorName = operatorNameCell.textContent.toLowerCase();

                let matchesSearch = searchValue === '' || operatorName.includes(searchValue);
                let matchesCategories = selectedFiltersLower.length === 0 || selectedFiltersLower.some(filter => operatorName.includes(filter));
                let isOtherCategorySelected = selectedFiltersLower.includes('outros');
                let matchesOutros = false;

                if (isOtherCategorySelected) {
                    matchesOutros = !predefinedFilters.slice(0, -1).some(filterDef => operatorName.includes(filterDef.value.toLowerCase()));
                }

                let categoryConditionMet = false;
                if (selectedFiltersLower.length === 0) {
                    categoryConditionMet = true;
                } else {
                    if (isOtherCategorySelected && matchesOutros) {
                        categoryConditionMet = true;
                    }
                    if (selectedFiltersLower.some(sf => sf !== 'outros' && operatorName.includes(sf))) {
                        categoryConditionMet = true;
                    }
                }
                row.style.display = (matchesSearch && categoryConditionMet) ? '' : 'none';
            });
        }

        updateCheckboxCounts();
    }

    function updateCheckboxCounts() {
        let originalTable = document.querySelector('table.dt-chart-table:not(.custom-cloned-table)');
        if (!originalTable) return;

        let tableRows = originalTable.querySelectorAll('tbody tr');

        predefinedFilters.forEach(filter => {
            let count = 0;
            tableRows.forEach(row => {
                let operatorNameCell = row.querySelector('td a');
                if (!operatorNameCell) return;
                let operatorName = operatorNameCell.textContent.toLowerCase();
                if (filter.value === 'Outros') {
                    if (!predefinedFilters.slice(0, -1).some(otherFilter => operatorName.includes(otherFilter.value.toLowerCase()))) {
                        count++;
                    }
                } else {
                    if (operatorName.includes(filter.value.toLowerCase())) {
                        count++;
                    }
                }
            });
            const checkbox = document.querySelector(`#filterPanel input[type="checkbox"][value="${filter.value}"]`);
            if (checkbox && checkbox.nextSibling && checkbox.nextSibling.nextSibling) {
                checkbox.nextSibling.nextSibling.textContent = ` (${count})`;
            }
        });
    }

    const applyFilterInterval = setInterval(() => {
        if (isCorrectPage() && externalSearchInput) {
            applyFilter(externalSearchInput.value);
        }
    }, 5000);

    function isCorrectPage() {
        return window.location.hash.includes('#!/sitatual');
    }

    let uiInitialized = false;
    let observer;

    function initializeUI() {
        if (!isCorrectPage()) {
            return;
        }

        if (uiInitialized) {
            const searchToggleWrapper = document.querySelector('div[data-userscript-filter="search-toggle-wrapper"]');
            const panel = document.getElementById('filterPanel');
            if (!searchToggleWrapper || !panel) {
                uiInitialized = false;
            } else {
                return;
            }
        }

        // Garante que só selecionamos a tabela original para montar as UI e o MutationObserver
        let table = document.querySelector('table.dt-chart-table:not(.custom-cloned-table)');

        if (table) {
            createSearchAndToggleButton();
            createFilterPanel();
            if (typeof observeTable === "function") observeTable();
            uiInitialized = true;
        } else {
            setTimeout(initializeUI, 1000);
        }
    }

    function observeTable() {
        let originalTable = document.querySelector('table.dt-chart-table:not(.custom-cloned-table)');
        if (originalTable) {
            let tableBody = originalTable.querySelector('tbody');
            if (tableBody) {
                if (observer) observer.disconnect();
                observer = new MutationObserver(function(mutations) {
                    if (externalSearchInput) {
                        applyFilter(externalSearchInput.value);
                    } else {
                        applyFilter('');
                    }
                });
                observer.observe(tableBody, { childList: true, subtree: true });
            }
        } else {
            setTimeout(observeTable, 1000);
        }
    }

    window.addEventListener('hashchange', function() {
        const panel = document.getElementById('filterPanel');
        const searchToggleWrapper = document.querySelector('div[data-userscript-filter="search-toggle-wrapper"]');

        if (!isCorrectPage()) {
            document.body.classList.remove('filter-open');
            if (searchToggleWrapper) {
                searchToggleWrapper.style.display = 'none';
            }
            if (panel) {
                panel.style.display = 'none';
            }
            if (observer && typeof observer.disconnect === 'function') {
                observer.disconnect();
            }
        } else {
            if (!searchToggleWrapper || searchToggleWrapper.style.display === 'none' || !panel) {
                 uiInitialized = false;
                 initializeUI();
            } else if (searchToggleWrapper && searchToggleWrapper.style.display === 'none') {
                searchToggleWrapper.style.display = 'inline-flex';
            }
            if (observer && !observer.takeRecords().length) {
                 observeTable();
            }
        }
    });

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeUI);
    } else {
        setTimeout(initializeUI, 200);
    }

    const style = document.createElement('style');
    style.textContent = `
        body.filter-open {  margin-left: 150px;  }
        #filterPanel input[type="checkbox"] { cursor: pointer; transform: scale(1.2); transition: all 0.2s ease; margin-right: 5px; }
        #filterPanel label { cursor: pointer; }
        div[data-userscript-filter="search-toggle-wrapper"] { vertical-align: middle; }
    `;
    document.head.appendChild(style);

})();
