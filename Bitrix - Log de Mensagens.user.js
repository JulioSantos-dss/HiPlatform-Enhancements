// ==UserScript==
// @name         Bitrix - Log de Mensagens
// @namespace    http://tampermonkey.net/
// @version      4.7
// @description  Captura Notificações, UI editável, CSV. Indicador visual na caixa de texto, Ghost fixo e Espião no right-click.
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

    // =======================================================================
    // --- 0. INTERCEPTAÇÃO DE REDE E ESTADO FANTASMA ---
    // =======================================================================

    window.bitrixGhostMode = false;
    window.ghostedChats = new Map(); // Armazena os contadores que devem persistir INDEFINIDAMENTE
    window.lastRightClickedDialogId = null; // Armazena a ID do último chat acessado com o botão direito

    function setGhostMode(state) {
        window.bitrixGhostMode = state;

        // Adiciona ou remove uma classe no body para o CSS cuidar do visual da textarea
        if (state) {
            document.body.classList.add('bitrix-ghost-active');
            console.log("👻 Modo Fantasma ATIVADO (Bloqueando visualizações e pintando chatbox)");
        } else {
            document.body.classList.remove('bitrix-ghost-active');
            console.log("👻 Modo Fantasma DESATIVADO");
        }
    }

    // Função auxiliar para criar uma resposta falsa e evitar que a UI do Bitrix trave
    function fakeSuccessResponse(xhr) {
        Object.defineProperty(xhr, 'readyState', { get: () => 4, configurable: true });
        Object.defineProperty(xhr, 'status', { get: () => 200, configurable: true });
        Object.defineProperty(xhr, 'responseText', { get: () => '{"status":"success","data":{}}', configurable: true });
        Object.defineProperty(xhr, 'response', { get: () => '{"status":"success","data":{}}', configurable: true });

        if (typeof xhr.onreadystatechange === 'function') {
            setTimeout(() => xhr.onreadystatechange(), 10);
        }
        if (typeof xhr.onload === 'function') {
            setTimeout(() => xhr.onload(), 10);
        }
    }

    // 1. Interceptar XMLHttpRequest (Usado pelo core antigo do Bitrix)
    const originalXhrOpen = XMLHttpRequest.prototype.open;
    const originalXhrSend = XMLHttpRequest.prototype.send;

    XMLHttpRequest.prototype.open = function(method, url) {
        this._interceptUrl = url;
        this._shouldBlock = false;

        if (window.bitrixGhostMode && typeof url === 'string') {
            // Verifica o payload específico que recebemos
            if (url.includes('im.v2.Chat.Message.read') || url.includes('im.chat.read') || url.includes('im.dialog.read')) {
                this._shouldBlock = true;
                console.log("🛡️ [XHR] Visualização Bloqueada (URL):", url);
            }
        }
        return originalXhrOpen.apply(this, arguments);
    };

    XMLHttpRequest.prototype.send = function(body) {
        if (this._shouldBlock) {
            fakeSuccessResponse(this);
            return;
        }

        if (window.bitrixGhostMode && typeof body === 'string') {
            if (body.includes('im.v2.Chat.Message.read') || body.includes('im.chat.read') || body.includes('im.dialog.read')) {
                console.log("🛡️ [XHR] Visualização Bloqueada (BODY):", body);
                fakeSuccessResponse(this);
                return;
            }
        }
        return originalXhrSend.apply(this, arguments);
    };

    // 2. Interceptar Fetch (Usado pelo Vue.js / novo core do Bitrix)
    const originalFetch = window.fetch;
    window.fetch = async function(...args) {
        if (window.bitrixGhostMode) {
            let url = args[0];
            let options = args[1];
            let shouldBlock = false;

            if (typeof url === 'string' && (url.includes('im.v2.Chat.Message.read') || url.includes('im.chat.read') || url.includes('im.dialog.read'))) {
                shouldBlock = true;
            }

            if (options && typeof options.body === 'string' && (options.body.includes('im.v2.Chat.Message.read') || options.body.includes('im.chat.read'))) {
                shouldBlock = true;
            }

            if (shouldBlock) {
                console.log("🛡️ [Fetch] Visualização Bloqueada:", url || "Body Content");
                return new Response(JSON.stringify({status: "success", data: {}}), {
                    status: 200,
                    headers: { 'Content-Type': 'application/json' }
                });
            }
        }
        return originalFetch.apply(this, args);
    };


    // =======================================================================
    // --- ESTILO CSS (Hover, Animação e Cores do Chatbox Fantasma) ---
    // =======================================================================

    const style = document.createElement('style');
    style.innerHTML = `
        /* Fantasma na lista de chats */
        .bitrix-ghost-btn {
            opacity: 0;
            transition: opacity 0.2s ease-in-out;
            pointer-events: none;
        }
        [data-id]:hover .bitrix-ghost-btn {
            opacity: 1 !important;
            pointer-events: auto !important;
        }

        /* --- VISUAL DO CHATBOX NO MODO FANTASMA --- */
        body.bitrix-ghost-active .bx-im-textarea__content {
            border: 2px dashed #9b59b6 !important;
            background-color: #fdf5ff !important;
            border-radius: 8px !important;
            transition: all 0.3s ease;
        }
        body.bitrix-ghost-active .bx-im-textarea__element {
            background-color: transparent !important;
            color: #4a235a !important;
        }
        body.bitrix-ghost-active .bx-im-textarea__icon-container .ui-icon-set {
            --ui-icon-set__icon-color: #9b59b6 !important;
        }
    `;
    document.head.appendChild(style);

    // --- CONFIGURAÇÃO DE SELETORES (COMPATIBILIDADE) ---
    const SELECTORS = {
        COUNTERS: [
            '.bx-im-list-recent-item__counters_wrap',
            '.bx-im-recent-item-counter-wrap',
            '[data-role="counter"]',
            '.bx-im-counter',
            '.bx-im-roster-item-counter-wrap'
        ]
    };

    // --- Configuration ---
    const LOG_BTN_ID = 'bitrix-logger-custom-btn';
    const SPY_MESSAGE_LIMIT = 25;

    // Storage Keys
    const STORAGE_KEY_UI_LOGS = 'bitrix_notification_logs_ui';
    const STORAGE_KEY_CSV_HIST = 'bitrix_notification_logs_csv';
    const STORAGE_KEY_MODAL_POS_X = 'bitrix_modal_pos_x';
    const STORAGE_KEY_MODAL_POS_Y = 'bitrix_modal_pos_y';

    // Limits
    const MAX_CSV_ENTRIES = 1000;

    // --- 1. INTERCEPTAÇÃO DE MÍDIA (WebSockets) ---
    const imageBuffer = {};

    function initBitrixHook() {
        if (typeof BX !== 'undefined') {
            console.log("✅ Bitrix Logger: Hook de Mídia Ativado (Imagens e Adesivos)");

            BX.addCustomEvent("onPullEvent-im", function(command, params) {
                if (command === 'message' || command === 'messageChat') {

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

                    if (params.stickers && params.stickers.length > 0 && params.message && params.users) {
                        const sticker = params.stickers[0];
                        const senderId = params.message.senderId;
                        const user = params.users[senderId];

                        if (sticker && sticker.uri && user && user.name) {
                            const safeName = user.name.trim().toUpperCase();
                            const stickerUrl = sticker.uri;
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

    // --- 2. Data Management ---

    let uiLog = [];
    let csvHistory = [];

    try {
        const storedUi = localStorage.getItem(STORAGE_KEY_UI_LOGS);
        const storedCsv = localStorage.getItem(STORAGE_KEY_CSV_HIST);
        if (storedUi) uiLog = JSON.parse(storedUi);
        if (storedCsv) csvHistory = JSON.parse(storedCsv);
    } catch (e) {
        console.error("Bitrix Logger: Error loading logs", e);
    }

    function saveAllLogs() {
        localStorage.setItem(STORAGE_KEY_UI_LOGS, JSON.stringify(uiLog));
        localStorage.setItem(STORAGE_KEY_CSV_HIST, JSON.stringify(csvHistory));
    }

    // --- 3. UI Creation ---

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

    // Janela Espiã
    const spyModal = document.createElement('div');
    spyModal.id = 'bitrix-spy-modal';
    spyModal.style.cssText = 'display:none; position:fixed; width:450px; max-height:600px; background:white; border:1px solid #ccc; z-index:100001; border-radius:6px; box-shadow:0 5px 20px rgba(0,0,0,0.3); overflow-y:auto; padding:10px; font-family:OpenSans, Arial; font-size:14px; color:#333; text-align:left;';
    document.body.appendChild(spyModal);

    document.addEventListener('click', (e) => {
        if (spyModal.style.display !== 'none' && !spyModal.contains(e.target)) {
            // Fechar se não clicar dentro do modal (olho foi removido, então target pode ser qualquer coisa fora)
            if (!e.target.closest('.bitrix-spy-menu-btn')) {
                spyModal.style.display = 'none';
            }
        }
    });

    // Modal Principal de Logs
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

    const contentDiv = document.createElement('div');
    contentDiv.style.flex = '1';
    contentDiv.style.overflowY = 'auto';
    contentDiv.style.overflowX = 'hidden';
    contentDiv.style.padding = '10px';
    modal.appendChild(contentDiv);

    // --- 4. Positioning Logic ---
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

    // --- 5. Event Listeners ---

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

    clearBtn.addEventListener('click', () => {
        if(confirm("Limpar a visualização atual?\n(O histórico do CSV será mantido)")) {
            uiLog = [];
            saveAllLogs();
            updateModalContent();
        }
    });

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
        uiLog.splice(index, 1);
        saveAllLogs();
        updateModalContent();
    }

    function exportToCsv() {
        if (csvHistory.length === 0) {
            alert("Histórico CSV vazio!");
            return;
        }
        let csvContent = "Time,Name,Message\n";
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

    // --- 6. Dynamic Buttons (Header Topo) ---

    function tryInjectButton() {
        // Injeta Botão LOGS APENAS (Botão toggle do ghost removido do chat header)
        if (!document.getElementById(LOG_BTN_ID)) {
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
    }

    // --- ESPIÃO: Busca Mensagens ---
    function fetchSpyMessages(dialogId, x, y) {
        if (!dialogId) return;

        spyModal.innerHTML = '<div style="text-align:center; padding:20px; color:#666;">Carregando...</div>';
        spyModal.style.display = 'block';

        const estimatedHeight = 600;
        let finalY = y;

        if (y + estimatedHeight > window.innerHeight) {
            finalY = window.innerHeight - estimatedHeight - 20;
            if (finalY < 10) finalY = 10;
        }

        spyModal.style.left = x + 'px';
        spyModal.style.top = finalY + 'px';

        BX.rest.callMethod('im.dialog.messages.get', {
            'DIALOG_ID': dialogId,
            'LIMIT': SPY_MESSAGE_LIMIT
        }, function(result) {
            if (result.error()) {
                spyModal.innerHTML = '<div style="color:red; padding:10px;">Erro: ' + result.error() + '</div>';
            } else {
                const data = result.data();
                const messages = data.messages;
                const users = data.users || [];

                const rawFiles = data.files || {};
                const files = {};
                Object.values(rawFiles).forEach(f => {
                    if (f && f.id) {
                        files[f.id] = f;
                    }
                });

                const userMap = {};
                users.forEach(u => {
                    userMap[u.id] = {
                        name: u.name,
                        avatar: u.avatar || 'https://cdn-icons-png.flaticon.com/512/149/149071.png'
                    };
                });

                if (messages.length === 0) {
                    spyModal.innerHTML = '<div style="padding:10px;">Vazio.</div>';
                    return;
                }

                let html = `
                    <div style="position:sticky; top:-10px; background:white; z-index:100; margin:-10px -10px 10px -10px; padding:10px 10px 5px 10px; display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid #eee;">
                        <span style="font-weight:bold; color:#007bff; font-size:12px;">Últimas ${SPY_MESSAGE_LIMIT} Mensagens</span>
                        <span id="spy-close-btn" style="cursor:pointer; font-weight:bold; color:#555; font-size:24px; line-height:1;">&times;</span>
                    </div>
                `;

                messages.forEach(msg => {
                    const user = userMap[msg.author_id] || { name: "ID: " + msg.author_id, avatar: 'https://cdn-icons-png.flaticon.com/512/149/149071.png' };
                    const authorName = user.name;
                    const avatarUrl = user.avatar;
                    const date = new Date(msg.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});

                    let contentHtml = msg.text ? msg.text.replace(/\n/g, '<br>') : '';

                    if (msg.params && msg.params.FILE_ID) {
                        const fileIds = Array.isArray(msg.params.FILE_ID) ? msg.params.FILE_ID : [msg.params.FILE_ID];
                        fileIds.forEach(fId => {
                            if (files[fId]) {
                                const file = files[fId];
                                if (file.type === 'image' || (file.name && file.name.match(/\.(jpg|jpeg|png|gif|webp)$/i))) {
                                    const imgUrl = file.urlShow || file.urlDownload;
                                    contentHtml += `<div style="margin-top:5px;"><a href="${file.urlDownload}" target="_blank"><img src="${imgUrl}" style="max-width:100%; max-height:150px; border-radius:4px; border:1px solid #eee;"></a></div>`;
                                } else {
                                    contentHtml += `<div style="margin-top:5px; font-size:11px;">📎 <a href="${file.urlDownload}" target="_blank">${file.name}</a></div>`;
                                }
                            } else {
                                console.warn(`Bitrix Logger: Arquivo ID ${fId} não encontrado.`);
                                contentHtml += `<div style="margin-top:5px; font-size:11px; color:#d9534f;">⚠️ Arquivo ID: ${fId} (Metadados indisponíveis)</div>`;
                            }
                        });
                    }

                    if (msg.params && msg.params.STICKER_ID) {
                        contentHtml += '<div style="margin-top:5px; color:#666; font-style:italic; background:#f0f0f0; padding:2px 5px; border-radius:3px; display:inline-block;">[Adesivo]</div>';
                    }

                    if (msg.params && msg.params.ATTACH) {
                        contentHtml += '<div style="margin-top:5px; color:#666; font-style:italic;">[Anexo/Card]</div>';
                    }

                    if (!contentHtml && msg.text === '') {
                        contentHtml = '<i style="color:#999; cursor:help;" title="Abra o console (F12) para ver detalhes">[Conteúdo não suportado - Ver Console]</i>';
                    }

                    html += `
                        <div style="margin-bottom:10px; border-bottom:1px solid #f0f0f0; padding-bottom:10px; display:flex; align-items:flex-start;">
                            <div style="margin-right:10px; flex-shrink:0;">
                                <img src="${avatarUrl}" style="width:40px; height:40px; border-radius:50%; object-fit:cover; border:1px solid #eee;">
                            </div>
                            <div style="flex-grow:1;">
                                <div style="font-size:12px; color:#888; display:flex; justify-content:space-between; margin-bottom:2px;">
                                    <span style="font-weight:bold; color:#555; font-size:13px;">${authorName}</span>
                                    <span>${date}</span>
                                </div>
                                <div style="color:#222; font-size:14px; line-height:1.4;">${contentHtml}</div>
                            </div>
                        </div>
                    `;
                });

                spyModal.innerHTML = html;

                const btnClose = spyModal.querySelector('#spy-close-btn');
                if(btnClose) {
                    btnClose.addEventListener('click', function(e) {
                        e.stopPropagation();
                        spyModal.style.display = 'none';
                    });
                }
            }
        });
    }

    // --- ESPIÃO: Injetor de Botões (Com Fake Counter e Listener de Clique Nativo) ---
    function injectSpyButtons() {
        // 1. LIMPEZA: Remove botões fantasmas de conversas que foram LIDAS (e não estão forçadas pelo Ghost Mode)
        const existingGhosts = document.querySelectorAll('.bitrix-ghost-btn');
        existingGhosts.forEach(ghost => {
            const parentRow = ghost.closest('[data-id], .bx-im-list-recent-item_wrap, [data-role="recent_item"]');
            if (parentRow) {
                const dialogId = parentRow.getAttribute('data-id');
                let counterText = '0';

                for (let sel of SELECTORS.COUNTERS) {
                    const el = parentRow.querySelector(sel);
                    if (el) {
                        counterText = el.innerText;
                        break;
                    }
                }

                if (parseInt(counterText || '0') === 0 && !window.ghostedChats.has(dialogId)) {
                    ghost.remove();
                }
            } else {
                ghost.remove();
            }
        });

        // 2. INJEÇÃO E LISTENERS: Seleciona todas as linhas
        const rows = document.querySelectorAll('[data-id]');

        rows.forEach(row => {
            const dialogId = row.getAttribute('data-id');
            if (!dialogId) return;

            // --- DETECÇÃO DE CLIQUE NORMAL PARA DESATIVAR FANTASMA ---
            if (!row.dataset.ghostListenerAdded) {
                row.dataset.ghostListenerAdded = 'true';
                row.addEventListener('click', (e) => {
                    if (e.target.closest('.bitrix-ghost-btn')) {
                        return;
                    }
                    if (row.dataset.ignoreNextClick === 'true') {
                        row.dataset.ignoreNextClick = 'false';
                        return;
                    }
                    if (window.bitrixGhostMode) {
                        setGhostMode(false);
                    }
                    if (window.ghostedChats.has(dialogId)) {
                        window.ghostedChats.delete(dialogId);
                        const fake = row.querySelector('.bitrix-fake-counter');
                        if (fake) fake.remove();
                    }
                }, true);
            }

            // --- NOVO: Listener de Clique Direito (Context Menu) ---
            if (!row.dataset.spyContextListenerAdded) {
                row.dataset.spyContextListenerAdded = 'true';
                row.addEventListener('contextmenu', (e) => {
                    window.lastRightClickedDialogId = dialogId;

                    let checkAttempts = 0;
                    const checkInterval = setInterval(() => {
                        const menuContainer = document.querySelector('#im-recent-context-menu .ui-popup-menu-items');

                        // FIX: Garante que o Bitrix já populou os itens dele antes de injetarmos,
                        // e injeta no FINAL para não alterar o índice de itens do Vue/React nativo
                        if (menuContainer && menuContainer.children.length > 0) {
                            if (!menuContainer.querySelector('.bitrix-spy-menu-btn')) {
                                const spyMenuItem = document.createElement('div');
                                spyMenuItem.className = 'ui-popup-menu-item bitrix-spy-menu-btn';
                                spyMenuItem.innerHTML = `
                                    <button class="ui-popup-menu-item-action" title="Visualizar últimas mensagens sem registrar leitura">
                                        <div class="ui-popup-menu-item-header">
                                            <div class="ui-popup-menu-item-title">
                                                <div class="ui-popup-menu-item-title-text" style="color: #007bff; font-weight: bold;">👁️ Espiar Chat</div>
                                            </div>
                                        </div>
                                        <div class="ui-popup-menu-item-buttons"></div>
                                    </button>
                                `;

                                spyMenuItem.addEventListener('click', (eBtn) => {
                                    eBtn.preventDefault();
                                    eBtn.stopPropagation();

                                    const menu = document.getElementById('im-recent-context-menu');
                                    if (menu) menu.style.display = 'none';

                                    fetchSpyMessages(window.lastRightClickedDialogId, eBtn.clientX + 15, Math.max(10, eBtn.clientY - 100));
                                });

                                // FIX: Alterado de insertBefore para appendChild (coloca no final)
                                menuContainer.appendChild(spyMenuItem);
                            }
                            clearInterval(checkInterval);
                        }
                        checkAttempts++;
                        if(checkAttempts > 10) clearInterval(checkInterval);
                    }, 50);
                });
            }
            // ---------------------------------------------------------

            let counterWrap = null;
            let hasMessages = false;
            let currentCount = 0;

            for (let sel of SELECTORS.COUNTERS) {
                counterWrap = row.querySelector(sel);
                if (counterWrap && parseInt(counterWrap.innerText || '0') > 0) {
                    hasMessages = true;
                    currentCount = parseInt(counterWrap.innerText);
                    break;
                }
            }

            if (!hasMessages && window.ghostedChats.has(dialogId)) {
                hasMessages = true;
                currentCount = window.ghostedChats.get(dialogId);

                let fakeCounter = row.querySelector('.bitrix-fake-counter');
                if (!fakeCounter) {
                    fakeCounter = document.createElement('div');
                    fakeCounter.className = 'bitrix-fake-counter';
                    fakeCounter.style.cssText = `
                        position: absolute;
                        right: 15px;
                        top: 50%;
                        transform: translateY(-50%);
                        background: #ff5752;
                        color: white;
                        border-radius: 10px;
                        padding: 0 6px;
                        font-size: 12px;
                        font-weight: bold;
                        height: 20px;
                        line-height: 20px;
                        z-index: 90;
                        pointer-events: none;
                        text-align: center;
                        min-width: 20px;
                        box-sizing: border-box;
                    `;
                    if (getComputedStyle(row).position === 'static') {
                        row.style.position = 'relative';
                    }
                    row.appendChild(fakeCounter);
                }

                fakeCounter.innerText = currentCount;
                fakeCounter.title = 'Ainda não lido (Modo Fantasma)';

            } else if (hasMessages) {
                const fake = row.querySelector('.bitrix-fake-counter');
                if (fake) fake.remove();
            }

            if (hasMessages && !row.querySelector('.bitrix-ghost-btn')) {
                const ghostBtn = document.createElement('div');
                ghostBtn.className = 'bitrix-ghost-btn';
                ghostBtn.innerHTML = '👀';
                ghostBtn.title = 'Abrir no Bitrix (Sem registrar leitura)';
                ghostBtn.style.cssText = `
                    position: absolute;
                    right: 45px;
                    top: 50%;
                    transform: translateY(-50%);
                    z-index: 99999;
                    cursor: pointer;
                    font-size: 16px;
                    background: white;
                    border-radius: 50%;
                    width: 22px;
                    height: 22px;
                    text-align: center;
                    line-height: 22px;
                    box-shadow: 0 2px 5px rgba(0,0,0,0.3);
                `;

                ghostBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();

                    setGhostMode(true);
                    window.ghostedChats.set(dialogId, currentCount > 0 ? currentCount : (window.ghostedChats.get(dialogId) || 1));
                    row.dataset.ignoreNextClick = 'true';
                    row.click();
                });

                if (getComputedStyle(row).position === 'static') {
                    row.style.position = 'relative';
                }

                row.appendChild(ghostBtn);
            }
        });
    }

    // --- Modificador de Placeholder ---
    setInterval(() => {
        const textarea = document.querySelector('.bx-im-textarea__element');
        if (textarea) {
            if (window.bitrixGhostMode) {
                if (!textarea.dataset.origPlaceholder) {
                    textarea.dataset.origPlaceholder = textarea.placeholder || "";
                }
                textarea.placeholder = "👻 MODO FANTASMA: A leitura não será registrada...";
            } else {
                if (textarea.dataset.origPlaceholder !== undefined) {
                    textarea.placeholder = textarea.dataset.origPlaceholder;
                    delete textarea.dataset.origPlaceholder;
                }
            }
        }
    }, 1000);

    // --- 7. Notification Capture ---

    function processNode(node) {
        if (node.classList && node.classList.contains('ui-notification-manager-browser-balloon')) {
            const nameEl = node.querySelector('.ui-notification-manager-browser-title span.ui-notification-manager-browser-title') ||
                         node.querySelector('.ui-notification-manager-browser-title');
            const msgEl = node.querySelector('.ui-notification-manager-browser-text');
            const imgEl = node.querySelector('.ui-notification-manager-browser-icon');

            if (nameEl && msgEl) {
                const titleText = nameEl.innerText.trim();
                let msgText = msgEl.innerText.trim();
                const timestamp = new Date().toLocaleString();
                let avatarSrc = 'https://cdn-icons-png.flaticon.com/512/149/149071.png';
                if (imgEl && imgEl.src) avatarSrc = imgEl.src;

                const lowerMsg = msgText.toLowerCase();
                const hasMediaTag = lowerMsg.includes('imagem') || lowerMsg.includes('adesivo');

                if (hasMediaTag) {
                    let senderName = titleText;
                    if (msgText.includes(':')) {
                        const parts = msgText.split(':');
                        if (parts.length > 1 && parts[0].length < 50) {
                            senderName = parts[0].trim();
                        }
                    }
                    const safeName = senderName.toUpperCase();
                    if (imageBuffer[safeName]) {
                        const realUrl = imageBuffer[safeName];
                        let caption = msgText
                            .replace(new RegExp(`^${senderName}:`, 'i'), '')
                            .replace(/\[?(imagem|adesivo)\]?/gi, '')
                            .trim();

                        msgText = `${caption ? `<div style="margin-bottom: 5px; color: #333;">${caption}</div>` : ''} <a href="${realUrl}" target="_blank" title="Open Image"><img src="${realUrl}" style="max-width: 100%; max-height: 250px; border-radius: 6px; border: 1px solid #ccc; display:block; background-color: #f5f5f5;"></a>`;
                    }
                }

                const last = csvHistory[csvHistory.length - 1];
                const isDuplicate = last && last.name === titleText && last.message === msgText;

                if (!isDuplicate) {
                    const entry = { name: titleText, message: msgText, img: avatarSrc, time: timestamp };
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

    // --- 8. Observer ---

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

    observer.observe(document.body, { childList: true, subtree: true });

    setTimeout(tryInjectButton, 1000);
    setInterval(injectSpyButtons, 2000);

})();
