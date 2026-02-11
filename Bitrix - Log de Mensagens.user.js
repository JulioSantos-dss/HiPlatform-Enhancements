// ==UserScript==
// @name         Bitrix - Log de Mensagens
// @namespace    http://tampermonkey.net/
// @version      4.0
// @description  Captura Notificações, UI editável, CSV mantém histórico. Janela espiã maior com avatares.
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

    // --- ESTILO CSS (Hover e Animação) ---
    // Adicionamos o CSS dinamicamente. Usamos [data-id] como gatilho do hover
    // pois é o atributo mais estável que usamos para identificar a linha.
    const style = document.createElement('style');
    style.innerHTML = `
        .bitrix-spy-eye {
            opacity: 0; /* Invisível por padrão */
            transition: opacity 0.2s ease-in-out;
            pointer-events: none; /* Não bloqueia cliques quando invisível */
        }
        /* Quando passar o mouse na linha do chat (que possui o atributo data-id), mostra o olho */
        [data-id]:hover .bitrix-spy-eye {
            opacity: 1 !important;
            pointer-events: auto !important;
        }
    `;
    document.head.appendChild(style);

    // --- CONFIGURAÇÃO DE SELETORES (COMPATIBILIDADE) ---
    // Usamos isso apenas para encontrar o CONTADOR, já que a linha buscamos por [data-id]
    const SELECTORS = {
        COUNTERS: [
            '.bx-im-list-recent-item__counters_wrap', // Padrão antigo
            '.bx-im-recent-item-counter-wrap',      // Padrão novo
            '[data-role="counter"]',                // Padrão genérico Vue
            '.bx-im-counter',
            '.bx-im-roster-item-counter-wrap'       // Variação possível
        ]
    };

    // --- Configuration ---
    const LOG_BTN_ID = 'bitrix-logger-custom-btn';
    const SPY_MESSAGE_LIMIT = 25; // <--- ALTERE AQUI O NÚMERO DE MENSAGENS (ex: 20, 50)

    // Storage Keys
    const STORAGE_KEY_UI_LOGS = 'bitrix_notification_logs_ui';
    const STORAGE_KEY_CSV_HIST = 'bitrix_notification_logs_csv';
    const STORAGE_KEY_MODAL_POS_X = 'bitrix_modal_pos_x';
    const STORAGE_KEY_MODAL_POS_Y = 'bitrix_modal_pos_y';

    // Limits
    const MAX_CSV_ENTRIES = 1000;

    // --- 0. INTERCEPTAÇÃO DE DADOS ---
    const imageBuffer = {};

    function initBitrixHook() {
        if (typeof BX !== 'undefined') {
            console.log("✅ Bitrix Logger: Hook de Mídia Ativado (Imagens e Adesivos)");

            BX.addCustomEvent("onPullEvent-im", function(command, params) {
                if (command === 'message' || command === 'messageChat') {

                    // CENÁRIO A: Arquivos normais
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

                    // CENÁRIO B: Adesivos
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

    // --- 1. Data Management ---

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

    // --- 2. UI Creation ---

    // Context Menu
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

    // --- ESPIÃO: Janela Flutuante ---
    const spyModal = document.createElement('div');
    spyModal.id = 'bitrix-spy-modal';
    // Increased Width to 450px and Max-Height to 600px
    spyModal.style.cssText = 'display:none; position:fixed; width:450px; max-height:600px; background:white; border:1px solid #ccc; z-index:100001; border-radius:6px; box-shadow:0 5px 20px rgba(0,0,0,0.3); overflow-y:auto; padding:10px; font-family:OpenSans, Arial; font-size:14px; color:#333; text-align:left;';
    document.body.appendChild(spyModal);

    document.addEventListener('click', (e) => {
        if (spyModal.style.display !== 'none' && !spyModal.contains(e.target) && !e.target.classList.contains('bitrix-spy-eye')) {
            spyModal.style.display = 'none';
        }
    });

    // Modal Principal
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

    // Botões
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

    // --- ESPIÃO: Busca Mensagens ---
    function fetchSpyMessages(dialogId, x, y) {
        if (!dialogId) return;

        spyModal.innerHTML = '<div style="text-align:center; padding:20px; color:#666;">Carregando...</div>';
        spyModal.style.display = 'block';

        // --- CORREÇÃO DE POSIÇÃO (Smart Positioning) ---
        // Se a janela for ficar cortada embaixo, sobe ela
        const estimatedHeight = 600; // Updated max-height defined in CSS
        let finalY = y;

        if (y + estimatedHeight > window.innerHeight) {
             // Alinha com a parte de baixo da tela com uma margem de 20px
             finalY = window.innerHeight - estimatedHeight - 20;
             // Garante que não suba demais (teto)
             if (finalY < 10) finalY = 10;
        }

        spyModal.style.left = x + 'px';
        spyModal.style.top = finalY + 'px';
        // ------------------------------------------------

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
                // CORREÇÃO: Converter lista numérica para Objeto Map
                const rawFiles = data.files || {};
                const files = {};
                // Varre o objeto/array original e remapeia usando o ID real do arquivo como chave
                Object.values(rawFiles).forEach(f => {
                    if (f && f.id) {
                        files[f.id] = f;
                    }
                });

                // Map of Users (ID -> {name, avatar})
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

                    // 1. Tenta recuperar Arquivos (Imagens Normais)
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
                                // Se ainda não achou, mostra warning no console (não deve mais acontecer com o fix acima)
                                console.warn(`Bitrix Logger: Arquivo ID ${fId} não encontrado.`);
                                contentHtml += `<div style="margin-top:5px; font-size:11px; color:#d9534f;">⚠️ Arquivo ID: ${fId} (Metadados indisponíveis)</div>`;
                            }
                        });
                    }

                    // 2. Tenta recuperar Adesivos (Stickers) - NOVO
                    if (msg.params && msg.params.STICKER_ID) {
                        // O Bitrix às vezes não manda a URL do adesivo aqui, mas indica que é um adesivo
                        contentHtml += '<div style="margin-top:5px; color:#666; font-style:italic; background:#f0f0f0; padding:2px 5px; border-radius:3px; display:inline-block;">[Adesivo]</div>';
                    }

                    // 3. Tenta recuperar Anexos Ricos (Rich Attachments) - NOVO
                    if (msg.params && msg.params.ATTACH) {
                         contentHtml += '<div style="margin-top:5px; color:#666; font-style:italic;">[Anexo/Card]</div>';
                    }

                    // 4. Debug Fallback (Se continuar vazio, avisa para olhar o console)
                    if (!contentHtml && msg.text === '') {
                        console.log("🔍 BITRIX DEBUG (Msg sem conteúdo):", msg);
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

                // Adiciona o evento de click no botão de fechar recém-criado
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

    // --- ESPIÃO: Injetor de Botões (Versão Restaurada & Híbrida) ---
    function injectSpyButtons() {
        // 1. LIMPEZA: Remove olhos de conversas que foram LIDAS
        const existingEyes = document.querySelectorAll('.bitrix-spy-eye');
        existingEyes.forEach(eye => {
            const parentRow = eye.closest('[data-id], .bx-im-list-recent-item_wrap, [data-role="recent_item"]');
            if (parentRow) {
                // Tenta achar contador com múltiplos seletores
                let counterText = '0';
                for (let sel of SELECTORS.COUNTERS) {
                    const el = parentRow.querySelector(sel);
                    if (el) {
                        counterText = el.innerText;
                        break;
                    }
                }
                // Se o contador for 0 ou não existir, remove o olho
                if (parseInt(counterText || '0') === 0) {
                    eye.remove();
                }
            } else {
                eye.remove(); // Remove órfãos
            }
        });

        // 2. INJEÇÃO: Seleciona todas as linhas que tenham um ID
        // Essa abordagem é mais robusta que classes específicas
        const rows = document.querySelectorAll('[data-id]');

        rows.forEach(row => {
            const dialogId = row.getAttribute('data-id');
            // IDs de chat do Bitrix geralmente são "chatXX" ou números
            if (!dialogId) return;

            // Busca contador usando nossa lista de seletores conhecidos
            let counterWrap = null;
            let hasMessages = false;

            for (let sel of SELECTORS.COUNTERS) {
                counterWrap = row.querySelector(sel);
                if (counterWrap && parseInt(counterWrap.innerText || '0') > 0) {
                    hasMessages = true;
                    break;
                }
            }

            // Só injeta se tiver mensagens e NÃO tiver olho
            if (hasMessages && !row.querySelector('.bitrix-spy-eye')) {

                const eyeBtn = document.createElement('div');
                eyeBtn.className = 'bitrix-spy-eye';
                eyeBtn.innerHTML = '👁️';
                eyeBtn.title = 'Espiar (ID: ' + dialogId + ')';

                // ESTILO FLUTUANTE (Restaurado do original funcional)
                eyeBtn.style.cssText = `
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
                // NOTA: Removemos opacity: 0 e transition, agora ele é sempre visível

                eyeBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    const rect = eyeBtn.getBoundingClientRect();
                    fetchSpyMessages(dialogId, rect.right + 15, rect.top);
                });

                // Garante que a linha tenha posição relativa para o olho ficar no lugar certo
                if (getComputedStyle(row).position === 'static') {
                    row.style.position = 'relative';
                }

                row.appendChild(eyeBtn);
            }
        });
    }

    // --- 6. Notification Capture ---

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

    observer.observe(document.body, { childList: true, subtree: true });

    setTimeout(tryInjectButton, 1000);
    setInterval(injectSpyButtons, 2000);

})();
