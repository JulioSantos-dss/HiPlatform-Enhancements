// ==UserScript==
// @name         Hi - Filtro de Operadores Logados
// @namespace    http://tampermonkey.net/
// @version      1.6.3
// @description  Filtro de Operadores com Interface Moderna (Searchbox outside panel)
// @author       Julio Santos feat. AI & You
// @match        https://www5.directtalk.com.br/static/beta/admin/main.html*
// @grant        none
// @downloadURL  https://raw.githubusercontent.com/JulioSantos-dss/HiPlatform-Enhancements/main/Hi%20-%20Filtro%20de%20Operadores%20Logados-1.6.2%20(3).user.js
// @updateURL    https://raw.githubusercontent.com/JulioSantos-dss/HiPlatform-Enhancements/main/Hi%20-%20Filtro%20de%20Operadores%20Logados-1.6.2%20(3).user.js
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

    // Remove existing wrapper if any, to prevent duplicates on re-init
    const existingWrapper = document.querySelector('div[data-userscript-filter="search-toggle-wrapper"]');
    if (existingWrapper) {
        console.log('[FilterScript] Removing existing search/toggle wrapper.');
        existingWrapper.remove();
    }

    const searchToggleWrapper = document.createElement('div');
    searchToggleWrapper.style.display = 'inline-flex';
    searchToggleWrapper.style.alignItems = 'center';
    searchToggleWrapper.style.marginLeft = '10px';
    searchToggleWrapper.style.position = 'relative';
    searchToggleWrapper.style.zIndex = '1001';
    searchToggleWrapper.setAttribute('data-userscript-filter', 'search-toggle-wrapper'); // Mark our element

    let toggleButton = document.createElement('button');
    toggleButton.textContent = 'Filtrar Operadores';
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
    // Prevent the button from shrinking
    toggleButton.style.flexShrink = '0';


    toggleButton.addEventListener('mouseover', () => { toggleButton.style.backgroundColor = '#0056b3'; });
    toggleButton.addEventListener('mouseout', () => { toggleButton.style.backgroundColor = '#007bff'; });
    toggleButton.addEventListener('click', function() {
        let panel = document.getElementById('filterPanel');
        if (!panel) {
            console.warn('[FilterScript] Filter panel not found on toggle click!');
            return;
        }
        if (panel.style.display === 'none' || panel.style.display === '') {
            panel.style.display = 'block';
            document.body.classList.add('filter-open');
            // Assuming updateCheckboxCounts is defined elsewhere
            updateCheckboxCounts();
        } else {
            panel.style.display = 'none';
            document.body.classList.remove('filter-open');
        }
    });

    // Create a wrapper for the input and the clear button
    const inputWrapper = document.createElement('div');
    inputWrapper.style.position = 'relative';
    inputWrapper.style.display = 'flex';
    inputWrapper.style.alignItems = 'center';

    let externalSearchInput = document.createElement('input');
    externalSearchInput.type = 'text';
    externalSearchInput.id = 'externalOperatorSearch';
    externalSearchInput.placeholder = 'Buscar...';
    externalSearchInput.style.padding = '10px 30px 10px 10px'; // Add padding to the right for the 'X'
    externalSearchInput.style.border = '1px solid #ccc';
    externalSearchInput.style.borderRadius = '0 5px 5px 0';
    externalSearchInput.style.marginLeft = '-1px'; // Overlap borders
    externalSearchInput.style.fontFamily = 'Arial, sans-serif';
    externalSearchInput.style.fontSize = '14px';
    externalSearchInput.style.height = '38px';
    externalSearchInput.style.boxSizing = 'border-box';
    externalSearchInput.style.width = '200px';

    // Create the clear button ('X')
    const clearButton = document.createElement('span');
    clearButton.innerHTML = '&times;'; // Use HTML entity for a nice 'X'
    clearButton.style.position = 'absolute';
    clearButton.style.right = '10px';
    clearButton.style.top = '50%';
    clearButton.style.transform = 'translateY(-50%)';
    clearButton.style.cursor = 'pointer';
    clearButton.style.color = '#888';
    clearButton.style.fontSize = '20px';
    clearButton.style.fontWeight = 'bold';
    clearButton.style.display = 'none'; // Initially hidden

    // Function to show/hide the clear button based on input value
    const toggleClearButton = () => {
        if (externalSearchInput.value) {
            clearButton.style.display = 'block';
        } else {
            clearButton.style.display = 'none';
        }
    };

    // Event listener for the clear button
    clearButton.addEventListener('click', () => {
        externalSearchInput.value = '';
        localStorage.removeItem('operatorFilter'); // Use removeItem for clarity
        // Assuming applyFilter is defined elsewhere
        applyFilter('');
        toggleClearButton();
        externalSearchInput.focus(); // Return focus to the input
    });

    externalSearchInput.addEventListener('focus', () => {
        externalSearchInput.style.borderColor = '#007bff';
        externalSearchInput.style.boxShadow = '0 0 0 0.2rem rgba(0,123,255,.25)';
    });
    externalSearchInput.addEventListener('blur', () => {
        externalSearchInput.style.borderColor = '#ccc';
        externalSearchInput.style.boxShadow = 'none';
    });

    // Restore value from localStorage and add input event listener
    externalSearchInput.value = localStorage.getItem('operatorFilter') || '';
    toggleClearButton(); // Check if the button should be visible on load

    externalSearchInput.addEventListener('input', function() {
        let filterValue = externalSearchInput.value.toLowerCase();
        localStorage.setItem('operatorFilter', filterValue);
        // Assuming applyFilter is defined elsewhere
        applyFilter(filterValue);
        toggleClearButton(); // Show/hide 'X' on input
    });

    // Append elements to their wrappers
    inputWrapper.appendChild(externalSearchInput);
    inputWrapper.appendChild(clearButton);

    searchToggleWrapper.appendChild(toggleButton);
    searchToggleWrapper.appendChild(inputWrapper);

    // Find the header and append the entire search/toggle component
    let header = [...document.querySelectorAll('h3')].find(h => h.textContent.includes("Operadores"));
    console.log('[FilterScript] Target header for button/searchbox:', header); // DEBUG
    if (header) {
        header.appendChild(searchToggleWrapper);
        console.log('[FilterScript] Button/searchbox appended to header.'); // DEBUG
    } else {
        console.warn('[FilterScript] Could not find H3 header containing "Operadores". Button/searchbox not appended.'); // DEBUG
    }
}

    function createFilterPanel() {
        console.log('[FilterScript] createFilterPanel called.'); // DEBUG
        let panel = document.getElementById('filterPanel');
        if (panel) {
            console.log('[FilterScript] Removing existing filter panel.');
            panel.remove();
        }

        panel = document.createElement('div');
        panel.id = 'filterPanel';
        // ... (panel styles and content as before) ...
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
        console.log('[FilterScript] Filter panel created and appended to body.'); // DEBUG

        loadCheckboxStates();
        if (externalSearchInput) applyFilter(externalSearchInput.value); else applyFilter('');
        updateCheckboxCounts();
    }

    function saveCheckboxStates() { /* ... as before ... */ }
    function loadCheckboxStates() { /* ... as before ... */ }

    function restoreOriginalState() {
        console.log('[FilterScript] restoreOriginalState called.'); // DEBUG
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
        // console.log('[FilterScript] applyFilter called with searchValue:', searchValue); // DEBUG (can be very noisy)
        let tableRows = document.querySelectorAll('table.dt-chart-table tbody tr');
        if (tableRows.length === 0) {
            // console.warn('[FilterScript] applyFilter: No table rows found with selector "table.dt-chart-table tbody tr"'); // DEBUG
            // return; // Don't return, allow counts to update to 0
        }
        let selectedFilters = [...document.querySelectorAll('#filterPanel input[type="checkbox"]:checked')]
            .map(checkbox => checkbox.value.toLowerCase());
        searchValue = (searchValue || "").toLowerCase();

        tableRows.forEach(function(row) {
            // ... (filtering logic as before) ...
            let operatorNameCell = row.querySelector('td a');
            if (!operatorNameCell) return;
            let operatorName = operatorNameCell.textContent.toLowerCase();
            let matchesSearch = searchValue === '' || operatorName.includes(searchValue);
            let matchesCategories = selectedFilters.length === 0 || selectedFilters.some(filter => operatorName.includes(filter));
            let isOtherCategorySelected = selectedFilters.includes('outros');
            let matchesOutros = false;
            if (isOtherCategorySelected) {
                matchesOutros = !predefinedFilters.slice(0, -1).some(filterDef => operatorName.includes(filterDef.value.toLowerCase()));
            }
            let categoryConditionMet = false;
            if (selectedFilters.length === 0) {
                categoryConditionMet = true;
            } else {
                if (isOtherCategorySelected && matchesOutros) {
                    categoryConditionMet = true;
                }
                // If it matches a specific selected category (and that category is not 'Outros', or if 'Outros' is selected but this isn't an "other" item but matches a specific selected one)
                if (selectedFilters.some(sf => sf !== 'outros' && operatorName.includes(sf))) {
                    categoryConditionMet = true;
                }
            }
            row.style.display = (matchesSearch && categoryConditionMet) ? '' : 'none';
        });
        updateCheckboxCounts();
    }

    function updateCheckboxCounts() {
        // console.log('[FilterScript] updateCheckboxCounts called.'); // DEBUG (can be noisy)
        predefinedFilters.forEach(filter => {
            let count = 0;
            document.querySelectorAll('table.dt-chart-table tbody tr').forEach(row => {
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
        if (isCorrectPage() && externalSearchInput) { // Check if externalSearchInput is initialized
            // console.log('[FilterScript] Interval: Applying filter.'); // DEBUG (very noisy)
            // applyFilter(externalSearchInput.value); // Re-applying filter periodically can be heavy. MutationObserver should handle most.
            // Let's use this interval mainly for count updates if table content changes without DOM mutation (rare)
            updateCheckboxCounts();
        }
    }, 5000); // Increased interval

    function isCorrectPage() {
        const onCorrectPage = window.location.hash.includes('#!/sitatual');
        // console.log('[FilterScript] isCorrectPage check. Hash:', window.location.hash, 'Result:', onCorrectPage); // DEBUG (very noisy, enable if needed)
        return onCorrectPage;
    }

    let uiInitialized = false;
    let observer; // Declare observer in a broader scope

    function initializeUI() {
        console.log(`[FilterScript] initializeUI called. Current hash: ${window.location.hash}, isCorrectPage: ${isCorrectPage()}, uiInitialized: ${uiInitialized}`); // DEBUG

        if (!isCorrectPage()) {
            console.log('[FilterScript] Not on the correct page section. Aborting UI creation for now.');
            return;
        }

        if (uiInitialized) {
            console.log('[FilterScript] UI already marked as initialized. Ensuring elements exist or recreating if necessary.');
            // Check if elements are still there, sometimes SPAs can remove them
            const searchToggleWrapper = document.querySelector('div[data-userscript-filter="search-toggle-wrapper"]');
            const panel = document.getElementById('filterPanel');
            if (!searchToggleWrapper || !panel) {
                console.log('[FilterScript] UI elements missing, forcing re-initialization.');
                uiInitialized = false; // Force re-init
            } else {
                console.log('[FilterScript] UI elements seem to exist. No re-init needed now.');
                return; // Already initialized and elements are present
            }
        }

        let table = document.querySelector('table.dt-chart-table');
        console.log('[FilterScript] Attempting to find table:', table); // DEBUG

        if (table) {
            console.log('[FilterScript] Table found. Creating UI elements.'); // DEBUG
            createFilterPanel();       // Create panel first
            createSearchAndToggleButton(); // Then button/search
            if (typeof observeTable === "function") observeTable(); // Check if defined
            uiInitialized = true;
            console.log('[FilterScript] UI Initialization complete. uiInitialized set to true.'); // DEBUG
        } else {
            console.log('[FilterScript] Table not found. Retrying in 1000ms.'); // DEBUG
            setTimeout(initializeUI, 1000); // Increased timeout slightly
        }
    }

    function observeTable() {
        console.log('[FilterScript] observeTable called.'); // DEBUG
        let tableBody = document.querySelector('table.dt-chart-table tbody');
        if (tableBody) {
            if (observer) observer.disconnect(); // Disconnect previous if any
            observer = new MutationObserver(function(mutations) {
                console.log('[FilterScript] MutationObserver detected changes.'); // DEBUG
                if (externalSearchInput) {
                    applyFilter(externalSearchInput.value);
                } else {
                    applyFilter('');
                }
                updateCheckboxCounts();
            });
            observer.observe(tableBody, { childList: true, subtree: true });
            console.log('[FilterScript] MutationObserver started on table tbody.'); // DEBUG
        } else {
            console.warn('[FilterScript] Table tbody not found for MutationObserver. Retrying observation setup.'); // DEBUG
            setTimeout(observeTable, 1000); // Retry if tbody not found yet
        }
    }

    window.addEventListener('hashchange', function() {
        console.log(`[FilterScript] hashchange detected. New hash: ${window.location.hash}. uiInitialized: ${uiInitialized}`); // DEBUG

        const panel = document.getElementById('filterPanel');
        const searchToggleWrapper = document.querySelector('div[data-userscript-filter="search-toggle-wrapper"]');

        if (!isCorrectPage()) {
            console.log('[FilterScript] Navigated away from target page section.'); // DEBUG
            document.body.classList.remove('filter-open');
            if (searchToggleWrapper) {
                console.log('[FilterScript] Hiding search/toggle wrapper.');
                searchToggleWrapper.style.display = 'none'; // Hide instead of remove
            }
            if (panel) {
                console.log('[FilterScript] Hiding filter panel.');
                panel.style.display = 'none'; // Hide instead of remove
            }
            if (observer && typeof observer.disconnect === 'function') {
                console.log('[FilterScript] Disconnecting MutationObserver due to navigation.');
                observer.disconnect();
            }
            // uiInitialized remains true, but elements are hidden.
            // initializeUI will handle re-showing or re-creating if needed on navigating back.
        } else {
            console.log('[FilterScript] Navigated to target page section.'); // DEBUG
            if (!searchToggleWrapper || searchToggleWrapper.style.display === 'none' || !panel) {
                 console.log('[FilterScript] UI elements not visible or panel missing, attempting to re-initialize/show.');
                 uiInitialized = false; // Force re-check in initializeUI
                 initializeUI();
            } else if (searchToggleWrapper && searchToggleWrapper.style.display === 'none') {
                console.log('[FilterScript] Search/toggle wrapper was hidden, making it visible.');
                searchToggleWrapper.style.display = 'inline-flex';
            } else {
                console.log('[FilterScript] UI seems to be present and visible.');
            }
            // Ensure observer is running if it was disconnected
            if (observer && !observer.takeRecords().length) { // A bit of a hack to check if observing
                 observeTable();
            }
        }
    });

    // Initial call
    // Wait for the DOM to be a bit more settled, especially for SPAs
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeUI);
    } else {
        // DOMContentLoaded has already fired or not applicable (e.g. script injected later)
        // Give a small delay for SPAs to potentially render initial content
        setTimeout(initializeUI, 200);
    }


    const style = document.createElement('style');
    style.textContent = `
        body.filter-open {  margin-left: 150px;  }
        #filterPanel input[type="checkbox"] { cursor: pointer; transform: scale(1.2); transition: all 0.2s ease; margin-right: 5px; }
        #filterPanel label { cursor: pointer; }
        div[data-userscript-filter="search-toggle-wrapper"] { vertical-align: middle; } /* Helps with alignment if header content is weird */
    `;
    document.head.appendChild(style);
    console.log('[FilterScript] Styles appended.'); // DEBUG

})();
