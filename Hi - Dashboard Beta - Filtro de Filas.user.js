// ==UserScript==
// @name         Hi - Dashboard Beta - Filtro de Filas
// @namespace    http://tampermonkey.net/
// @version      1.7
// @description  Adds multiple custom macro buttons to auto-select DirectTalk departments.
// @author       You
// @match        *://*.directtalk.com.br/*
// @match        *://*.hiplatform.com/*
// @allFrames    true
// @icon         https://www.google.com/s2/favicons?sz=64&domain=directtalk.com.br
// @grant        none
// @downloadURL  https://raw.githubusercontent.com/JulioSantos-dss/HiPlatform-Enhancements/main/Hi%20-%20Dashboard%20Beta%20-%20Filtro%20de%20Filas.user.js
// @updateURL    https://raw.githubusercontent.com/JulioSantos-dss/HiPlatform-Enhancements/main/Hi%20-%20Dashboard%20Beta%20-%20Filtro%20de%20Filas.user.js
// ==/UserScript==

(function() {
    'use strict';

    console.log(`[Tampermonkey] Script running in: ${window.location.hostname}`);

    // Global flag to prevent running two macros at the same time
    let isProcessing = false;

    // Configuration for all the buttons you want to add.
    // 'label' is what the button says. 'terms' are the words it looks for (without accents).
    const buttonsConfig = [
        { label: '⚡ Selecionar Help', terms: ['HELP'] },
        { label: '⚡ Selecionar SAC', terms: ['SAC', 'API'] },
        { label: '⚡ Selecionar SAC / Help', terms: ['SAC', 'HELP', 'API'] },
        { label: '⚡ Selecionar Refidelização', terms: ['REFIDELIZACAO'] },
        { label: '⚡ Selecionar Cobrança', terms: ['COBRANCA'] },
        { label: '⚡ Selecionar Casos Críticos', terms: ['CASOS CRITICOS'] },
        { label: '⚡ Selecionar Retenção', terms: ['RETENCAO'] },
        { label: '⚡ Selecionar Agendamento', terms: ['AGENDAMENTO'] },
        { label: '⚡ Selecionar Vendas', terms: ['VENDAS'] }, // Note: If your HTML says "Vendas", change 'COMERCIAL' to 'VENDAS' here.
        { label: '⚡ Selecionar COPE', terms: ['COPE'] },
        { label: '⚡ Selecionar N3', terms: ['N3'] },
        { label: '⚡ Selecionar Loja', terms: ['LOJA'] }
    ];

    document.addEventListener('mousedown', checkForDropdown, true);
    document.addEventListener('focusin', checkForDropdown, true);

    const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

    // Helper function to remove accents/cedillas so "Retenção" and "Retencao" are treated the same
    const removeAccents = (str) => {
        return str.normalize('NFD').replace(/[\u0300-\u036f]/g, "");
    };

    function checkForDropdown() {
        setTimeout(() => {
            const listBox = document.querySelector('.MuiAutocomplete-listbox');

            // Check if our first button is already there to avoid duplicates
            if (listBox && !listBox.querySelector('[data-custom="macro-btn"]')) {
                addMacroButtons(listBox);
            }
        }, 100);
    }

    function addMacroButtons(listBox) {
        // We reverse the array before looping so that when we insert them at the top,
        // they end up in the exact order you requested.
        const reversedConfig = [...buttonsConfig].reverse();

        reversedConfig.forEach(config => {
            const btn = document.createElement('li');

            btn.tabIndex = -1;
            btn.className = 'MuiAutocomplete-option';
            btn.setAttribute('data-custom', 'macro-btn');
            btn.textContent = config.label;

            // Styling
            btn.style.fontWeight = 'bold';
            btn.style.color = '#1976d2';
            btn.style.backgroundColor = '#f4f9ff';
            btn.style.borderBottom = '1px solid #e0e0e0';
            btn.style.paddingTop = '4px';
            btn.style.paddingBottom = '4px';

            btn.addEventListener('mousedown', async (e) => {
                e.preventDefault();
                e.stopPropagation();

                // Block clicks if another button is already doing work
                if (isProcessing) return;
                isProcessing = true;

                const originalText = btn.textContent;
                btn.textContent = '⏳ Processando...';
                btn.style.opacity = '0.5';

                let foundUnselected = true;
                let safetyCounter = 0;

                while (foundUnselected && safetyCounter < 150) {
                    foundUnselected = false;
                    safetyCounter++;

                    const currentOptions = document.querySelectorAll('.MuiAutocomplete-listbox li.MuiAutocomplete-option');

                    for (const option of currentOptions) {
                        // Skip our own injected buttons
                        if (option.hasAttribute('data-custom')) continue;

                        // Get the text, make it uppercase, and strip accents
                        const rawText = option.textContent || '';
                        const normalizedText = removeAccents(rawText).toUpperCase();
                        const isSelected = option.getAttribute('aria-selected') === 'true';

                        // Check if the option matches ANY of the terms configured for this button
                        const isMatch = config.terms.some(term => normalizedText.includes(term));

                        if (isMatch && !isSelected) {
                            option.click();
                            foundUnselected = true;

                            await delay(10); // Wait for React to rebuild
                            break; // Exit the FOR loop to refresh the DOM elements
                        }
                    }
                }

                btn.textContent = originalText;
                btn.style.opacity = '1';
                isProcessing = false;
                console.log(`[Tampermonkey] Finished macro: ${config.label}`);
            });

            // Insert at the top of the list
            listBox.insertBefore(btn, listBox.firstChild);
        });
    }
})();
