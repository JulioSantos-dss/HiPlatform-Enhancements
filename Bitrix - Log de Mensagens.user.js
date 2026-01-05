// ==UserScript==
// @name         Bitrix - Log de Mensagens
// @namespace    http://tampermonkey.net/
// @version      1.6
// @description  Captura Notificações :)
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
    const STORAGE_KEY = 'bitrix_notification_logs'; // Key for Local Storage

    // --- 1. Data Management ---

    let messageLog = [];

    // Load from Local Storage on startup
    try {
        const storedData = localStorage.getItem(STORAGE_KEY);
        if (storedData) {
            messageLog = JSON.parse(storedData);
        }
    } catch (e) {
        console.error("Bitrix Logger: Error loading logs", e);
    }

    // Helper to save current state
    function saveLogs() {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(messageLog));
    }

    // --- 2. UI Creation ---

    // Modal Container
    const modal = document.createElement('div');
    modal.style.display = 'none';
    modal.style.position = 'fixed';
    modal.style.bottom = '100px';
    modal.style.right = '20px';
    modal.style.width = '350px';
    modal.style.height = '450px';
    modal.style.backgroundColor = 'white';
    modal.style.border = '1px solid #ccc';
    modal.style.zIndex = '99999';
    modal.style.borderRadius = '8px';
    modal.style.boxShadow = '0 4px 15px rgba(0,0,0,0.2)';
    modal.style.flexDirection = 'column';
    document.body.appendChild(modal);

    // --- Modal Header ---
    const header = document.createElement('div');
    header.style.padding = '10px';
    header.style.borderBottom = '1px solid #eee';
    header.style.backgroundColor = '#f9f9f9';
    header.style.borderTopLeftRadius = '8px';
    header.style.borderTopRightRadius = '8px';
    header.style.display = 'flex';
    header.style.justifyContent = 'space-between';
    header.style.alignItems = 'center';
    modal.appendChild(header);

    // Close "X" Button
    const closeBtn = document.createElement('span');
    closeBtn.innerHTML = '&times;';
    closeBtn.style.fontSize = '24px';
    closeBtn.style.fontWeight = 'bold';
    closeBtn.style.color = '#555';
    closeBtn.style.cursor = 'pointer';
    closeBtn.style.lineHeight = '20px';
    closeBtn.style.marginRight = '10px';
    closeBtn.title = 'Close Window';
    header.appendChild(closeBtn);

    // Title
    const title = document.createElement('span');
    title.innerText = 'Log';
    title.style.fontWeight = 'bold';
    title.style.flexGrow = '1';
    header.appendChild(title);

    // Button Container for Right Side
    const actionsDiv = document.createElement('div');
    actionsDiv.style.display = 'flex';
    actionsDiv.style.gap = '5px';
    header.appendChild(actionsDiv);

    // Clear Logs Button (Trash Icon)
    const clearBtn = document.createElement('button');
    clearBtn.innerHTML = '🗑️';
    clearBtn.title = 'Limpar todos os Logs';
    clearBtn.style.fontSize = '14px';
    clearBtn.style.padding = '5px 8px';
    clearBtn.style.backgroundColor = '#dc3545'; // Red
    clearBtn.style.color = 'white';
    clearBtn.style.border = 'none';
    clearBtn.style.borderRadius = '3px';
    clearBtn.style.cursor = 'pointer';
    actionsDiv.appendChild(clearBtn);

    // Export CSV Button
    const exportBtn = document.createElement('button');
    exportBtn.innerText = 'CSV';
    exportBtn.title = 'Exportar para CSV';
    exportBtn.style.fontSize = '12px';
    exportBtn.style.padding = '5px 10px';
    exportBtn.style.backgroundColor = '#28a745'; // Green
    exportBtn.style.color = 'white';
    exportBtn.style.border = 'none';
    exportBtn.style.borderRadius = '3px';
    exportBtn.style.cursor = 'pointer';
    actionsDiv.appendChild(exportBtn);

    // --- Modal Content ---
    const contentDiv = document.createElement('div');
    contentDiv.style.flex = '1';
    contentDiv.style.overflowY = 'auto';
    contentDiv.style.overflowX = 'hidden';
    contentDiv.style.padding = '10px';
    modal.appendChild(contentDiv);


    // --- 3. Event Listeners ---

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

    // Clear Logs Logic
    clearBtn.addEventListener('click', () => {
        if(confirm("Tem certeza que deseja limpar todos os Logs")) {
            messageLog = []; // Clear array
            saveLogs(); // Save empty array to storage
            updateModalContent(); // Update UI
        }
    });

    function updateModalContent() {
        contentDiv.innerHTML = '';
        if (messageLog.length === 0) {
            contentDiv.innerHTML = '<p style="color:#666; text-align:center; margin-top:20px;">Sem mensagens até o momento.</p>';
            return;
        }

        // Show logs (Newest first)
        [...messageLog].reverse().forEach(log => {
            const entry = document.createElement('div');
            entry.style.display = 'flex';
            entry.style.alignItems = 'flex-start';
            entry.style.marginBottom = '15px';
            entry.style.paddingBottom = '10px';
            entry.style.borderBottom = '1px solid #eee';

            entry.innerHTML = `
                <div style="margin-right: 10px; flex-shrink: 0;">
                    <img src="${log.img}" style="width: 40px; height: 40px; border-radius: 50%; object-fit: cover; border: 1px solid #ddd;">
                </div>
                <div style="flex: 1; min-width: 0;">
                    <div style="font-weight: bold; font-size: 13px; margin-bottom: 2px;">${log.name}</div>
                    <div style="font-size: 12px; color: #333; margin-bottom: 4px; word-wrap: break-word;">${log.message}</div>
                    <div style="font-size: 10px; color: #999;">${log.time}</div>
                </div>
            `;
            contentDiv.appendChild(entry);
        });
    }

    function exportToCsv() {
        if (messageLog.length === 0) {
            alert("No logs to export!");
            return;
        }
        let csvContent = "Time,Name,Message\n";
        messageLog.forEach(row => {
            const safeMessage = row.message.replace(/"/g, '""');
            const safeName = row.name.replace(/"/g, '""');
            csvContent += `"${row.time}","${safeName}","${safeMessage}"\n`;
        });
        const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", "bitrix_logs.csv");
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    // --- 4. Dynamic Button Injection ---

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

            container.insertBefore(btn, targetIcon);
        }
    }

    // --- 5. Logic to Capture Notifications ---

    function processNode(node) {
        if (node.classList && node.classList.contains('ui-notification-manager-browser-balloon')) {
            const nameEl = node.querySelector('.ui-notification-manager-browser-title span.ui-notification-manager-browser-title') ||
                           node.querySelector('.ui-notification-manager-browser-title');
            const msgEl = node.querySelector('.ui-notification-manager-browser-text');
            const imgEl = node.querySelector('.ui-notification-manager-browser-icon');

            if (nameEl && msgEl) {
                const nameText = nameEl.innerText.trim();
                const msgText = msgEl.innerText.trim();
                const timestamp = new Date().toLocaleString(); // Changed to full Date+Time string for persistence context

                let imgSrc = 'https://cdn-icons-png.flaticon.com/512/149/149071.png';
                if (imgEl && imgEl.src) imgSrc = imgEl.src;

                // Duplicate Check: Check against the very last log entry
                const lastLog = messageLog[messageLog.length - 1];
                const isDuplicate = lastLog && lastLog.name === nameText && lastLog.message === msgText;

                if (!isDuplicate) {
                    messageLog.push({ name: nameText, message: msgText, img: imgSrc, time: timestamp });
                    saveLogs(); // <--- SAVE to Local Storage immediately

                    if (modal.style.display !== 'none') updateModalContent();
                }
            }
        }
    }

    // --- 6. Observer ---

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
