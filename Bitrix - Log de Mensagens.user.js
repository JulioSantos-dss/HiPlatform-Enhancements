// ==UserScript==
// @name         Bitrix - Log de Mensagens
// @namespace    http://tampermonkey.net/
// @version      2.8
// @description  Captura Notificações, UI editável, CSV mantém histórico dos últimos 1000 registros
// @author       Julio Santos feat. AI
// @match        https://*.bitrix24.com*/*
// @match        https://*.bitrix24.com.br*/*
// @match        https://*.bitrix24.net*/*
// @downloadURL  https://raw.githubusercontent.com/JulioSantos-dss/HiPlatform-Enhancements/main/Bitrix%20-%20Log%20de%20Mensagens.user.js
// @updateURL    https://raw.githubusercontent.com/JulioSantos-dss/HiPlatform-Enhancements/main/Bitrix%20-%20Log%20de%20Mensagens.user.js
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    // --- Configuration ---
    const LOG_BTN_ID = 'bitrix-logger-custom-btn';

    // Storage Keys
    const STORAGE_KEY_UI_LOGS = 'bitrix_notification_logs_ui';  // For the visual window
    const STORAGE_KEY_CSV_HIST = 'bitrix_notification_logs_csv'; // For the master history
    const STORAGE_KEY_MODAL_POS_X = 'bitrix_modal_pos_x';
    const STORAGE_KEY_MODAL_POS_Y = 'bitrix_modal_pos_y';

    // Limits
    const MAX_CSV_ENTRIES = 1000;

    // --- 0. INTERCEPTAÇÃO DE DADOS (ATUALIZADO PARA IMAGENS E ADESIVOS) ---
    const imageBuffer = {};

    function initBitrixHook() {
        if (typeof BX !== 'undefined') {
            console.log("✅ Bitrix Logger: Hook de Mídia Ativado (Imagens e Adesivos)");

            BX.addCustomEvent("onPullEvent-im", function(command, params) {
                if (command === 'message' || command === 'messageChat') {

                    // CENÁRIO A: Arquivos normais (Imagens enviadas via upload/colar)
                    if (params.files) {
                        Object.values(params.files).forEach(file => {
                            if ((file.type === 'image' || file.extension === 'png' || file.extension === 'jpg') && file.authorName) {
                                const safeName = file.authorName.trim().toUpperCase();
                                const realUrl = file.urlShow || file.urlDownload;
                                if (realUrl) {
                                    imageBuffer[safeName] = realUrl;
                                    setTimeout(() => { delete imageBuffer[safeName]; }, 10000);
                                }
                            }
                        });
                    }

                    // CENÁRIO B: Adesivos (Stickers)
                    if (params.stickers && params.stickers.length > 0 && params.message && params.users) {
                        const sticker = params.stickers[0]; // Pega o primeiro adesivo
                        const senderId = params.message.senderId;
                        const user = params.users[senderId]; // Busca os dados do usuário pelo ID

                        if (sticker && sticker.uri && user && user.name) {
                            const safeName = user.name.trim().toUpperCase();
                            const stickerUrl = sticker.uri;

                            // Salva no buffer igual fazemos com imagens
                            imageBuffer[safeName] = stickerUrl;
                            setTimeout(() => { delete imageBuffer[safeName]; }, 10000);
                        }
                    }
                }
            });
        } else {
            setTimeout(initBitrixHook, 2000);
        }
    }

    initBitrixHook();

    // --- 1. Data Management ---

    let uiLog = [];       // What the user sees
    let csvHistory = [];  // What the user exports (Master Record)

    // Load logs
    try {
        const storedUi = localStorage.getItem(STORAGE_KEY_UI_LOGS);
        const storedCsv = localStorage.getItem(STORAGE_KEY_CSV_HIST);

        if (storedUi) uiLog = JSON.parse(storedUi);
        if (storedCsv) csvHistory = JSON.parse(storedCsv);

    } catch (e) {
        console.error("Bitrix Logger: Error loading logs", e);
    }

    // Save both logs
    function saveAllLogs() {
        localStorage.setItem(STORAGE_KEY_UI_LOGS, JSON.stringify(uiLog));
        localStorage.setItem(STORAGE_KEY_CSV_HIST, JSON.stringify(csvHistory));
    }

    // --- 2. UI Creation ---

    // Context Menu (Right Click)
    const contextMenu = document.createElement('div');
    contextMenu.style.display = 'none';
    contextMenu.style.position = 'fixed';
    contextMenu.style.zIndex = '100000';
    contextMenu.style.backgroundColor = 'white';
    contextMenu.style.border = '1px solid #ccc';
    contextMenu.style.boxShadow = '2px 2px 5px rgba(0,0,0,0.2)';
    contextMenu.style.borderRadius = '4px';
    contextMenu.style.padding = '5px 0';
    contextMenu.style.minWidth = '150px';
    document.body.appendChild(contextMenu);

    const resetItem = document.createElement('div');
    resetItem.innerText = 'Restaurar Posição';
    resetItem.style.padding = '8px 15px';
    resetItem.style.fontSize = '13px';
    resetItem.style.color = '#333';
    resetItem.style.cursor = 'pointer';
    resetItem.style.fontFamily = 'Arial, sans-serif';
    resetItem.addEventListener('mouseenter', () => { resetItem.style.backgroundColor = '#f0f0f0'; });
    resetItem.addEventListener('mouseleave', () => { resetItem.style.backgroundColor = 'white'; });
    resetItem.addEventListener('click', () => { resetModalPosition(); contextMenu.style.display = 'none'; });
    contextMenu.appendChild(resetItem);

    document.addEventListener('click', () => { contextMenu.style.display = 'none'; });

    // Modal
    const modal = document.createElement('div');
    modal.style.display = 'none';
    modal.style.position = 'fixed';
    modal.style.width = '400px';
    modal.style.height = '450px';
    modal.style.backgroundColor = 'white';
    modal.style.border = '1px solid #ccc';
    modal.style.zIndex = '99999';
    modal.style.borderRadius = '8px';
    modal.style.boxShadow = '0 4px 15px rgba(0,0,0,0.2)';
    modal.style.flexDirection = 'column';
    document.body.appendChild(modal);

    // Header
    const header = document.createElement('div');
    header.style.padding = '10px';
    header.style.borderBottom = '1px solid #eee';
    header.style.backgroundColor = '#f9f9f9';
    header.style.borderTopLeftRadius = '8px';
    header.style.borderTopRightRadius = '8px';
    header.style.display = 'flex';
    header.style.justifyContent = 'space-between';
    header.style.alignItems = 'center';
    header.style.cursor = 'grab';
    header.style.userSelect = 'none';
    modal.appendChild(header);

    const closeBtn = document.createElement('span');
    closeBtn.className = 'bitrix-log-close-btn';
    closeBtn.innerHTML = '&times;';
    closeBtn.style.fontSize = '24px';
    closeBtn.style.fontWeight = 'bold';
    closeBtn.style.color = '#555';
    closeBtn.style.cursor = 'pointer';
    closeBtn.style.lineHeight = '20px';
    closeBtn.style.marginRight = '10px';
    closeBtn.title = 'Fechar Janela';
    header.appendChild(closeBtn);

    const title = document.createElement('span');
    title.innerText = 'Log';
    title.style.fontWeight = 'bold';
    title.style.flexGrow = '1';
    title.style.cursor = 'grab';
    header.appendChild(title);

    const actionsDiv = document.createElement('div');
    actionsDiv.style.display = 'flex';
    actionsDiv.style.gap = '5px';
    actionsDiv.style.cursor = 'default';
    header.appendChild(actionsDiv);

    // Trash Button
    const clearBtn = document.createElement('button');
    clearBtn.innerHTML = '🗑️';
    clearBtn.title = 'Limpar Logs (Visual)';
    clearBtn.style.fontSize = '14px';
    clearBtn.style.padding = '5px 8px';
    clearBtn.style.backgroundColor = '#dc3545';
    clearBtn.style.color = 'white';
    clearBtn.style.border = 'none';
    clearBtn.style.borderRadius = '3px';
    clearBtn.style.cursor = 'pointer';
    actionsDiv.appendChild(clearBtn);

    // SAC Button
    const clearSacBtn = document.createElement('button');
    clearSacBtn.innerText = 'Apagar SAC/HELPs';
    clearSacBtn.title = 'Apagar da visualização';
    clearSacBtn.style.fontSize = '10px';
    clearSacBtn.style.padding = '5px 8px';
    clearSacBtn.style.backgroundColor = '#dc3545';
    clearSacBtn.style.color = 'white';
    clearSacBtn.style.border = 'none';
    clearSacBtn.style.borderRadius = '3px';
    clearSacBtn.style.cursor = 'pointer';
    clearSacBtn.style.fontWeight = 'bold';
    actionsDiv.appendChild(clearSacBtn);

    // Export Button
    const exportBtn = document.createElement('button');
    exportBtn.innerText = 'CSV';
    exportBtn.title = 'Exportar Histórico Completo (1000)';
    exportBtn.style.fontSize = '12px';
    exportBtn.style.padding = '5px 10px';
    exportBtn.style.backgroundColor = '#28a745';
    exportBtn.style.color = 'white';
    exportBtn.style.border = 'none';
    exportBtn.style.borderRadius = '3px';
    exportBtn.style.cursor = 'pointer';
    actionsDiv.appendChild(exportBtn);

    // Content
    const contentDiv = document.createElement('div');
    contentDiv.style.flex = '1';
    contentDiv.style.overflowY = 'auto';
    contentDiv.style.overflowX = 'hidden';
    contentDiv.style.padding = '10px';
    modal.appendChild(contentDiv);


    // --- 3. Positioning Logic ---

    let isDragging = false;
    let offsetX, offsetY;

    function applySavedPosition() {
        const savedX = localStorage.getItem(STORAGE_KEY_MODAL_POS_X);
        const savedY = localStorage.getItem(STORAGE_KEY_MODAL_POS_Y);

        if (savedX !== null && savedY !== null) {
            modal.style.left = `${savedX}px`;
            modal.style.top = `${savedY}px`;
        } else {
            resetModalPosition(false);
        }
    }

    function resetModalPosition(showAlert = true) {
        localStorage.removeItem(STORAGE_KEY_MODAL_POS_X);
        localStorage.removeItem(STORAGE_KEY_MODAL_POS_Y);
        modal.style.top = '';
        modal.style.left = '';
        modal.style.bottom = '100px';
        modal.style.right = '20px';
        if(showAlert) console.log("Posição resetada.");
    }

    applySavedPosition();

    header.addEventListener('mousedown', (e) => {
        if (e.button === 0 && !e.target.closest('button, .bitrix-log-close-btn')) {
            isDragging = true;
            header.style.cursor = 'grabbing';
            title.style.cursor = 'grabbing';

            if (modal.style.right && !modal.style.left) {
                const rect = modal.getBoundingClientRect();
                modal.style.left = `${rect.left}px`;
                modal.style.right = '';
            }
            if (modal.style.bottom && !modal.style.top) {
                const rect = modal.getBoundingClientRect();
                modal.style.top = `${rect.top}px`;
                modal.style.bottom = '';
            }

            offsetX = e.clientX - modal.getBoundingClientRect().left;
            offsetY = e.clientY - modal.getBoundingClientRect().top;
            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', onMouseUp);
            e.preventDefault();
        }
    });

    function onMouseMove(e) {
        if (!isDragging) return;
        let newX = e.clientX - offsetX;
        let newY = e.clientY - offsetY;
        newX = Math.max(0, Math.min(newX, window.innerWidth - modal.offsetWidth));
        newY = Math.max(0, Math.min(newY, window.innerHeight - modal.offsetHeight));
        modal.style.left = `${newX}px`;
        modal.style.top = `${newY}px`;
    }

    function onMouseUp() {
        if (!isDragging) return;
        isDragging = false;
        header.style.cursor = 'grab';
        title.style.cursor = 'grab';
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
        localStorage.setItem(STORAGE_KEY_MODAL_POS_X, modal.style.left.replace('px', ''));
        localStorage.setItem(STORAGE_KEY_MODAL_POS_Y, modal.style.top.replace('px', ''));
    }


    // --- 4. Event Listeners ---

    function toggleModal() {
        if (modal.style.display === 'none') {
            updateModalContent();
            modal.style.display = 'flex';
        } else {
            modal.style.display = 'none';
        }
    }

    closeBtn.addEventListener('click', () => { modal.style.display = 'none'; });
    exportBtn.addEventListener('click', exportToCsv);

    // Clear Visual Logs (Does NOT affect CSV History)
    clearBtn.addEventListener('click', () => {
        if(confirm("Limpar a visualização atual?\n(O histórico do CSV será mantido)")) {
            uiLog = [];
            saveAllLogs();
            updateModalContent();
        }
    });

    // Clear SAC/HELP from Visual (Does NOT affect CSV History)
    clearSacBtn.addEventListener('click', () => {
        const originalCount = uiLog.length;
        uiLog = uiLog.filter(log =>
                             !log.message.toLowerCase().includes('sac/help') &&
                             !log.message.toLowerCase().includes('nome:')
                            );
        if (originalCount !== uiLog.length) {
            saveAllLogs();
            updateModalContent();
        } else {
            alert("Nenhuma mensagem com 'SAC/HELP' encontrada.");
        }
    });

    function updateModalContent() {
        contentDiv.innerHTML = '';
        if (uiLog.length === 0) {
            contentDiv.innerHTML = '<p style="color:#666; text-align:center; margin-top:20px;">Sem mensagens.</p>';
            return;
        }

        const displayLogs = uiLog.map((log, index) => ({...log, originalIndex: index})).reverse();

        displayLogs.forEach(log => {
            const entry = document.createElement('div');
            entry.style.display = 'flex';
            entry.style.alignItems = 'flex-start';
            entry.style.marginBottom = '15px';
            entry.style.paddingBottom = '10px';
            entry.style.borderBottom = '1px solid #eee';
            entry.style.position = 'relative';

            entry.addEventListener('mouseenter', () => {
                deleteItemBtn.style.display = 'block';
                entry.style.backgroundColor = '#fcfcfc';
            });
            entry.addEventListener('mouseleave', () => {
                deleteItemBtn.style.display = 'none';
                entry.style.backgroundColor = 'transparent';
            });

            const deleteItemBtn = document.createElement('div');
            deleteItemBtn.innerHTML = '&times;';
            deleteItemBtn.title = 'Remover da visualização';
            deleteItemBtn.style.display = 'none';
            deleteItemBtn.style.position = 'absolute';
            deleteItemBtn.style.top = '0';
            deleteItemBtn.style.right = '0';
            deleteItemBtn.style.cursor = 'pointer';
            deleteItemBtn.style.color = '#dc3545';
            deleteItemBtn.style.fontWeight = 'bold';
            deleteItemBtn.style.fontSize = '18px';
            deleteItemBtn.style.padding = '0 5px';

            deleteItemBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                deleteSingleMessage(log.originalIndex);
            });

            entry.innerHTML = `
                <div style="margin-right: 10px; flex-shrink: 0;">
                    <img src="${log.img}" style="width: 40px; height: 40px; border-radius: 50%; object-fit: cover; border: 1px solid #ddd;">
                </div>
                <div style="flex: 1; min-width: 0; padding-right: 15px;">
                    <div style="font-weight: bold; font-size: 13px; margin-bottom: 2px;">${log.name}</div>
                    <div style="font-size: 12px; color: #333; margin-bottom: 4px; word-wrap: break-word;">${log.message}</div>
                    <div style="font-size: 10px; color: #999;">${log.time}</div>
                </div>
            `;
            entry.appendChild(deleteItemBtn);
            contentDiv.appendChild(entry);
        });
    }

    function deleteSingleMessage(index) {
        // Removes only from UI log
        uiLog.splice(index, 1);
        saveAllLogs();
        updateModalContent();
    }

    function exportToCsv() {
        // EXPORT FROM CSV HISTORY, NOT UI LOG
        if (csvHistory.length === 0) {
            alert("Histórico CSV vazio!");
            return;
        }
        let csvContent = "Time,Name,Message\n";

        // Export newest first for better readability in Excel, or standard order?
        // Usually CSVs are appended, but let's reverse to show newest on top like the UI
        [...csvHistory].reverse().forEach(row => {
            const safeMessage = row.message.replace(/"/g, '""');
            const safeName = row.name.replace(/"/g, '""');
            csvContent += `"${row.time}","${safeName}","${safeMessage}"\n`;
        });

        const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", "bitrix_master_history.csv");
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    // --- 5. Dynamic Button ---

    function tryInjectButton() {
        if (document.getElementById(LOG_BTN_ID)) return;
        const targetIcon = document.querySelector('.ui-icon-set.--o-apps.bx-im-textarea__icon');

        if (targetIcon && targetIcon.parentNode) {
            const container = targetIcon.parentNode;
            const btn = document.createElement('button');
            btn.id = LOG_BTN_ID;
            btn.innerText = 'Logs';
            btn.style.marginRight = '10px';
            btn.style.padding = '4px 12px';
            btn.style.fontSize = '12px';
            btn.style.fontWeight = 'bold';
            btn.style.color = 'white';
            btn.style.backgroundColor = '#007bff';
            btn.style.border = 'none';
            btn.style.borderRadius = '15px';
            btn.style.cursor = 'pointer';
            btn.style.lineHeight = 'normal';
            btn.style.display = 'flex';
            btn.style.alignItems = 'center';

            btn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                toggleModal();
            });

            btn.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                e.stopPropagation();
                contextMenu.style.left = `${e.clientX}px`;
                contextMenu.style.top = `${e.clientY}px`;
                contextMenu.style.display = 'block';
            });

            container.insertBefore(btn, targetIcon);
        }
    }

    // --- 6. Notification Capture ---

    function processNode(node) {
        if (node.classList && node.classList.contains('ui-notification-manager-browser-balloon')) {
            const nameEl = node.querySelector('.ui-notification-manager-browser-title span.ui-notification-manager-browser-title') ||
                           node.querySelector('.ui-notification-manager-browser-title');
            const msgEl = node.querySelector('.ui-notification-manager-browser-text');
            const imgEl = node.querySelector('.ui-notification-manager-browser-icon');

            if (nameEl && msgEl) {
                const nameText = nameEl.innerText.trim();
                let msgText = msgEl.innerText.trim();
                const timestamp = new Date().toLocaleString();

                let avatarSrc = 'https://cdn-icons-png.flaticon.com/512/149/149071.png';
                if (imgEl && imgEl.src) avatarSrc = imgEl.src;

                // --- UPDATED LOGIC: Mixed Content (Text + Image/Sticker) ---
                const lowerMsg = msgText.toLowerCase();

                // We check if the message *contains* the tag, instead of *being* the tag
                const hasMediaTag = lowerMsg.includes('imagem') || lowerMsg.includes('adesivo');

                if (hasMediaTag) {
                    const safeName = nameText.toUpperCase();

                    // Check if we captured the URL in the buffer
                    if (imageBuffer[safeName]) {
                        const realUrl = imageBuffer[safeName];

                        // 1. Remove the tag "[Imagem]" or "[Adesivo]" from the text to clean it up
                        // Regex explanation: Matches [Imagem], [imagem], Imagem, [Adesivo], etc.
                        let caption = msgText.replace(/\[?(imagem|adesivo)\]?/gi, '').trim();

                        // 2. Build the HTML: Caption (if exists) + Image
                        msgText = `
                            ${caption ? `<div style="margin-bottom: 5px; color: #333;">${caption}</div>` : ''}
                            <a href="${realUrl}" target="_blank" title="Open Image">
                                <img src="${realUrl}" style="max-width: 100%; max-height: 250px; border-radius: 6px; border: 1px solid #ccc; display:block; background-color: #f5f5f5;">
                            </a>
                        `;
                    }
                }
                // -----------------------------------------------------------

                // Duplicate Check
                const last = csvHistory[csvHistory.length - 1];
                const isDuplicate = last && last.name === nameText && last.message === msgText;

                if (!isDuplicate) {
                    const entry = { name: nameText, message: msgText, img: avatarSrc, time: timestamp };

                    uiLog.push(entry);
                    if(uiLog.length > 200) uiLog.shift();

                    csvHistory.push(entry);
                    if(csvHistory.length > 1000) csvHistory.shift();

                    saveAllLogs();
                    if(modal.style.display !== 'none') updateModalContent();
                }
            }
        }
    }

    // --- 7. Observer ---

    const observer = new MutationObserver((mutations) => {
        tryInjectButton();
        mutations.forEach((mutation) => {
            mutation.addedNodes.forEach((node) => {
                if (node.nodeType === 1) {
                    processNode(node);
                    const nestedBalloons = node.querySelectorAll('.ui-notification-manager-browser-balloon');
                    nestedBalloons.forEach(processNode);
                }
            });
        });
    });

    observer.observe(document.body, {
        childList: true,
        subtree: true
    });

    setTimeout(tryInjectButton, 1000);

})();
