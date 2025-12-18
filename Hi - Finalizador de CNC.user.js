// ==UserScript==
// @name         Hi - Finalizador de CNC
// @namespace    http://tampermonkey.net/
// @version      2.3
// @description  Automates response, classification, and finalization. Includes a check for active chats and an editable message via a settings modal with a restore option.
// @author       Julio Santos feat. AI & Gemini
// @match        https://app.hiplatform.com/agent/chat/attendance/*
// @grant        GM_setValue
// @grant        GM_getValue
// @downloadURL  https://raw.githubusercontent.com/JulioSantos-dss/HiPlatform-Enhancements/main/Hi%20-%20Finalizador%20de%20CNC.user.js
// @updateURL    https://raw.githubusercontent.com/JulioSantos-dss/HiPlatform-Enhancements/main/Hi%20-%20Finalizador%20de%20CNC.user.js
// ==/UserScript==

(function() {
    'use strict';

    let isSequenceRunning = false;
    let hasInjectedCss = false;

    const GM_MESSAGE_KEY = 'cncAutomatorMessage';
    const DEFAULT_MESSAGE = "Identificamos uma instabilidade em nosso link principal que pode causar lentidão e falta de conexão. Orientamos aguardar, pois nossos técnicos estão trabalhando para estabilizar a conexão. Por gentileza, não desligue ou aperte qualquer botão dos seus aparelhos (modem ou roteador). A Previsão de até 4 horas para normalização da conexão. Desculpe-nos pelo transtorno.";
    let connectionIssueMessage = DEFAULT_MESSAGE;

    const TOP_LEVEL_PARENT_LABEL_TEXT = 'HELP';
    const INTERMEDIATE_PARENT_LABEL_TEXT = 'RECLAMAÇÃO';
    const TARGET_CLASSIFICATION_LABEL_TEXT = 'CNC';

    // --- UPDATED SELECTORS ---
    // We use a wildcard (*) for the data-id and include the contenteditable directly
    const CHAT_INPUT_SELECTOR = 'div[contenteditable="true"]';
    const CHAT_CONTAINER_SELECTOR = '[data-id*="chat-textarea"]';

    const CLASSIFICATION_BUTTON_SELECTOR = 'span[aria-label="Classificar atendimento"] button';
    const OPEN_FINALIZE_BUTTON_SELECTOR = 'span[aria-label="Finalizar atendimento"] button';
    const SAVE_CLASSIFICATION_RADIO_SELECTOR = 'input[name="classify"][value="now"]';
    const FINAL_CONFIRM_BUTTON_SELECTOR = 'button[data-id="confirm-modal"]';

    const AUTO_MODE_INTERVAL = 5000;
    const WAIT_TIMEOUT = 10000;
    const EXPAND_DELAY = 500;

    async function loadMessageFromStorage() {
        try {
            const savedMessage = await GM_getValue(GM_MESSAGE_KEY, DEFAULT_MESSAGE);
            connectionIssueMessage = savedMessage || DEFAULT_MESSAGE;
        } catch (e) {
            connectionIssueMessage = DEFAULT_MESSAGE;
        }
    }

    function waitForElement(selector, timeout = WAIT_TIMEOUT) {
        return new Promise((resolve, reject) => {
            const intervalTime = 100; let elapsedTime = 0;
            const interval = setInterval(() => {
                const element = document.querySelector(selector);
                const isVisible = element && (element.offsetWidth > 0 || element.offsetHeight > 0);
                if (isVisible) {
                    clearInterval(interval);
                    resolve(element);
                } else {
                    elapsedTime += intervalTime;
                    if (elapsedTime >= timeout) {
                        clearInterval(interval);
                        reject(new Error(`Element "${selector}" not found/visible`));
                    }
                }
            }, intervalTime);
        });
    }

    function waitForElementXPath(xpath, timeout = WAIT_TIMEOUT) {
        return new Promise((resolve, reject) => {
            const intervalTime = 100; let elapsedTime = 0;
            const interval = setInterval(() => {
                const result = document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
                const element = result.singleNodeValue;
                const isVisible = element && (element.offsetWidth > 0 || element.offsetHeight > 0);
                if (isVisible) {
                    clearInterval(interval);
                    resolve(element);
                } else {
                    elapsedTime += intervalTime;
                    if (elapsedTime >= timeout) {
                        clearInterval(interval);
                        reject(new Error(`XPath "${xpath}" not found/visible`));
                    }
                }
            }, intervalTime);
        });
    }

    function waitForFinalCheckboxByLabel(labelText, timeout = WAIT_TIMEOUT) {
        const escapedLabelText = labelText.replace(/'/g, "\\'");
        const xpath = `//input[@type='checkbox'][@id=//label[contains(@class, 'css-1b7s69x')][normalize-space(.)='${escapedLabelText}']/@for]`;
        return waitForElementXPath(xpath, timeout);
    }

    function waitForParentLabelByText(labelText, timeout = WAIT_TIMEOUT) {
        const escapedLabelText = labelText.replace(/'/g, "\\'");
        const xpath = `//span[contains(@class, 'css-40a0xc')][normalize-space(.)='${escapedLabelText}']/ancestor::label[1]`;
        return waitForElementXPath(xpath, timeout);
    }

    async function sendMessage() {
        try {
            // Wait for the specific contenteditable div
            const editableDiv = await waitForElement(CHAT_INPUT_SELECTOR);

            editableDiv.focus();
            // Use innerText for better compatibility with React/DraftJS editors
            document.execCommand('insertText', false, connectionIssueMessage);

            await new Promise(resolve => setTimeout(resolve, 200));

            const enterKeyEvent = new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', keyCode: 13, which: 13, bubbles: true });
            editableDiv.dispatchEvent(enterKeyEvent);
            console.log('Message sent.');
        } catch (error) {
            console.error('Error sending message:', error);
            throw error;
        }
    }

    async function openClassificationWindow() {
        try {
            const classifyButton = await waitForElement(CLASSIFICATION_BUTTON_SELECTOR);
            classifyButton.click();
            await new Promise(resolve => setTimeout(resolve, 500));
            const topLevelParentLabel = await waitForParentLabelByText(TOP_LEVEL_PARENT_LABEL_TEXT);
            topLevelParentLabel.click();
            await new Promise(resolve => setTimeout(resolve, EXPAND_DELAY));
            const intermediateParentLabel = await waitForParentLabelByText(INTERMEDIATE_PARENT_LABEL_TEXT);
            intermediateParentLabel.click();
            await new Promise(resolve => setTimeout(resolve, EXPAND_DELAY));
        } catch (error) {
            throw error;
        }
    }

    async function classifyContact() {
        try {
            const checkbox = await waitForFinalCheckboxByLabel(TARGET_CLASSIFICATION_LABEL_TEXT);
            if (!checkbox.checked) {
                const label = document.querySelector(`label[for='${checkbox.id}']`);
                if (label) label.click(); else checkbox.click();
            }
        } catch (error) { throw error; }
    }

    async function openFinalizeWindow() {
        try {
            const finalizeButton = await waitForElement(OPEN_FINALIZE_BUTTON_SELECTOR);
            finalizeButton.click();
            await waitForElement(FINAL_CONFIRM_BUTTON_SELECTOR);
        } catch (error) { throw error; }
    }

    async function handleFinalizeConfirmation() {
        try {
            try {
                 const saveClassificationRadio = await waitForElement(SAVE_CLASSIFICATION_RADIO_SELECTOR, 2000);
                 if (saveClassificationRadio && !saveClassificationRadio.checked) {
                     const radioLabel = saveClassificationRadio.closest('label');
                     if (radioLabel) radioLabel.click(); else saveClassificationRadio.click();
                 }
            } catch (e) {}
            const confirmButton = await waitForElement(FINAL_CONFIRM_BUTTON_SELECTOR);
            confirmButton.click();
        } catch (error) { throw error; }
    }

    async function runFullAutomationSequence() {
        // Improved check for active chat
        const chatInput = document.querySelector(CHAT_INPUT_SELECTOR);
        if (!chatInput) {
            console.log('CNC Automator: Waiting for chat input to be visible...');
            return;
        }

        if (isSequenceRunning) return;

        isSequenceRunning = true;
        console.log('--- Starting Automation ---');
        try {
            await sendMessage();
            await openClassificationWindow();
            await classifyContact();
            await openFinalizeWindow();
            await handleFinalizeConfirmation();
            console.log('--- Success ---');
        } catch (error) {
            console.error('--- Failed ---', error);
        } finally {
            isSequenceRunning = false;
        }
    }

    // --- UI Logic ---
    function injectModalCss() {
        if (hasInjectedCss) return;
        const css = `
            #cnc-settings-backdrop { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background-color: rgba(0,0,0,0.5); z-index: 9998; display: none; }
            #cnc-settings-modal { position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); background-color: white; color: #333; border-radius: 8px; box-shadow: 0 5px 15px rgba(0,0,0,0.3); z-index: 9999; width: 90%; max-width: 500px; padding: 20px; display: none; flex-direction: column; gap: 15px; }
            #cnc-settings-modal h2 { margin: 0; }
            #cnc-settings-modal textarea { width: 100%; min-height: 150px; border: 1px solid #ccc; border-radius: 4px; padding: 8px; box-sizing: border-box; }
            #cnc-settings-modal .modal-actions { display: flex; justify-content: space-between; gap: 10px; }
            #cnc-settings-modal button { padding: 8px 16px; border: none; border-radius: 5px; cursor: pointer; font-weight: bold; }
            #cnc-settings-save { background-color: #28a745; color: white; }
            #cnc-settings-cancel { background-color: #6c757d; color: white; }
            #cnc-settings-restore { background-color: #ffc107; color: #212529; }
        `;
        const style = document.createElement('style');
        style.appendChild(document.createTextNode(css));
        document.head.appendChild(style);
        hasInjectedCss = true;
    }

    function createSettingsModal() {
        if (document.getElementById('cnc-settings-modal')) return;
        injectModalCss();
        const backdrop = document.createElement('div');
        backdrop.id = 'cnc-settings-backdrop';
        const modal = document.createElement('div');
        modal.id = 'cnc-settings-modal';
        modal.innerHTML = `
            <h2>Edit Message</h2>
            <textarea id="cnc-message-textarea"></textarea>
            <div class="modal-actions">
                 <button id="cnc-settings-restore">Mensagem Padrão</button>
                 <div>
                    <button id="cnc-settings-cancel">Cancelar</button>
                    <button id="cnc-settings-save">Salvar</button>
                </div>
            </div>
        `;
        document.body.appendChild(backdrop);
        document.body.appendChild(modal);
        document.getElementById('cnc-settings-cancel').addEventListener('click', closeSettingsModal);
        document.getElementById('cnc-settings-restore').addEventListener('click', () => {
            document.getElementById('cnc-message-textarea').value = DEFAULT_MESSAGE;
        });
        document.getElementById('cnc-settings-save').addEventListener('click', async () => {
            connectionIssueMessage = document.getElementById('cnc-message-textarea').value;
            await GM_setValue(GM_MESSAGE_KEY, connectionIssueMessage);
            closeSettingsModal();
        });
    }

    function openSettingsModal() {
        createSettingsModal();
        document.getElementById('cnc-message-textarea').value = connectionIssueMessage;
        document.getElementById('cnc-settings-backdrop').style.display = 'block';
        document.getElementById('cnc-settings-modal').style.display = 'flex';
    }

    function closeSettingsModal() {
        document.getElementById('cnc-settings-backdrop').style.display = 'none';
        document.getElementById('cnc-settings-modal').style.display = 'none';
    }

    function addControlButtons() {
        const targetElement = document.querySelector('button[data-id="operation-state"]');
        if (!targetElement || document.getElementById('cnc-automator-button-wrapper')) return;

        const buttonWrapper = document.createElement('span');
        buttonWrapper.id = 'cnc-automator-button-wrapper';
        buttonWrapper.style.cssText = `display: inline-flex; align-items: center; margin-right: 10px; gap: 8px;`;

        const settingsBtn = document.createElement('button');
        settingsBtn.innerHTML = '⚙️';
        settingsBtn.style.cssText = `height: 36px; width: 36px; background: #17a2b8; color: white; border: none; border-radius: 5px; cursor: pointer;`;
        settingsBtn.onclick = openSettingsModal;

        const autoBtn = document.createElement('button');
        autoBtn.innerHTML = 'Auto OFF';
        autoBtn.style.cssText = `height: 36px; padding: 0 12px; background: #6c757d; color: white; border: none; border-radius: 5px; cursor: pointer; font-weight: bold;`;

        const manualBtn = document.createElement('button');
        manualBtn.innerHTML = 'CNC';
        manualBtn.style.cssText = `height: 36px; padding: 0 12px; background: #dc3545; color: white; border: none; border-radius: 5px; cursor: pointer; font-weight: bold;`;

        let autoIntervalId = null;
        autoBtn.onclick = () => {
            if (autoIntervalId) {
                clearInterval(autoIntervalId); autoIntervalId = null;
                autoBtn.innerHTML = 'Auto OFF'; autoBtn.style.background = '#6c757d';
            } else {
                autoBtn.innerHTML = 'Auto ON'; autoBtn.style.background = '#28a745';
                runFullAutomationSequence();
                autoIntervalId = setInterval(runFullAutomationSequence, AUTO_MODE_INTERVAL);
            }
        };

        manualBtn.onclick = async () => {
            manualBtn.disabled = true; manualBtn.innerHTML = '...';
            await runFullAutomationSequence();
            manualBtn.disabled = false; manualBtn.innerHTML = 'CNC';
        };

        buttonWrapper.appendChild(settingsBtn);
        buttonWrapper.appendChild(autoBtn);
        buttonWrapper.appendChild(manualBtn);
        targetElement.parentNode.insertBefore(buttonWrapper, targetElement);
    }

    async function initialize() {
        await loadMessageFromStorage();
        const observer = new MutationObserver(() => addControlButtons());
        observer.observe(document.body, { childList: true, subtree: true });
    }

    initialize();
})();
