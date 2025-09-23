// ==UserScript==
// @name         Hi - Finalizador de CNC
// @namespace    http://tampermonkey.net/
// @version      2.1
// @description  Automates response, classification, and finalization. Includes a check for active chats and an editable message via a settings modal with a restore option.
// @author       Julio Santos feat. AI & Gemini
// @match        https://app.hiplatform.com/agent/chat/attendance/*
// @grant        GM_setValue
// @grant        GM_getValue
// ==/UserScript==

(function() {
    'use strict';

    // --- State Flags ---
    let isSequenceRunning = false;
    let hasInjectedCss = false;

    // --- Configuration ---
    const GM_MESSAGE_KEY = 'cncAutomatorMessage';
    const DEFAULT_MESSAGE = "Identificamos uma instabilidade em nosso link principal que pode causar lentidão e falta de conexão. Orientamos aguardar, pois nossos técnicos estão trabalhando para estabilizar a conexão. Por gentileza, não desligue ou aperte qualquer botão dos seus apareladores (modem ou roteador). A Previsão de até 4 horas para normalização da conexão. Desculpe-nos pelo transtorno.";
    // The active message is now a variable that can be changed.
    let connectionIssueMessage = DEFAULT_MESSAGE;


    // ** CRITICAL: Set the EXACT text (case-sensitive, including accents) for each level **
    const TOP_LEVEL_PARENT_LABEL_TEXT = 'HELP';
    const INTERMEDIATE_PARENT_LABEL_TEXT = 'RECLAMAÇÃO';
    const TARGET_CLASSIFICATION_LABEL_TEXT = 'CNC';

    // Selectors for UI elements
    const CHAT_TEXT_AREA_SELECTOR = '[data-id="chat-textarea-undefined"]'; // Used for the pre-run check
    const CLASSIFICATION_BUTTON_SELECTOR = 'span[aria-label="Classificar atendimento"] button';
    const OPEN_FINALIZE_BUTTON_SELECTOR = 'span[aria-label="Finalizar atendimento"] button';
    const SAVE_CLASSIFICATION_RADIO_SELECTOR = 'input[name="classify"][value="now"]';
    const FINAL_CONFIRM_BUTTON_SELECTOR = 'button[data-id="confirm-modal"]';

    const AUTO_MODE_INTERVAL = 5000; // 5 seconds
    const WAIT_TIMEOUT = 10000; // 10 seconds
    const EXPAND_DELAY = 500; // Milliseconds delay after clicking to expand
    // --- End Configuration ---

    /**
     * Loads the saved message from storage, or uses the default if none is found.
     * Uses a promise-based approach for Tampermonkey's async GM_getValue.
     */
    async function loadMessageFromStorage() {
        try {
            // GM_getValue can be async, so we await it.
            const savedMessage = await GM_getValue(GM_MESSAGE_KEY, DEFAULT_MESSAGE);
            connectionIssueMessage = savedMessage || DEFAULT_MESSAGE;
            console.log('Message loaded from storage.');
        } catch (e) {
            console.error('Error loading message from storage, using default.', e);
            connectionIssueMessage = DEFAULT_MESSAGE;
        }
    }

    /**
     * Waits for an element matching a CSS selector. Includes visibility check.
     */
    function waitForElement(selector, timeout = WAIT_TIMEOUT) {
        // ... existing waitForElement function ...
        console.log(`Waiting for element (CSS): ${selector}`);
        return new Promise((resolve, reject) => {
            const intervalTime = 100; let elapsedTime = 0;
            const interval = setInterval(() => {
                const element = document.querySelector(selector);
                const isVisible = element && element.offsetParent !== null;
                if (isVisible) {
                    clearInterval(interval);
                    console.log(`Element found (CSS): ${selector}`);
                    resolve(element);
                } else {
                    elapsedTime += intervalTime;
                    if (elapsedTime >= timeout) {
                        clearInterval(interval);
                        console.error(`Element (CSS) "${selector}" not found or not visible after ${timeout}ms`);
                        reject(new Error(`Element (CSS) "${selector}" not found or not visible after ${timeout}ms`));
                    }
                }
            }, intervalTime);
        });
    }

   /**
    * Waits for an element matching an XPath expression. Includes visibility check.
    */
   function waitForElementXPath(xpath, timeout = WAIT_TIMEOUT) {
        // ... existing waitForElementXPath function ...
        console.log(`Waiting for element (XPath): ${xpath}`);
        return new Promise((resolve, reject) => {
            const intervalTime = 100; let elapsedTime = 0;
            const interval = setInterval(() => {
                const result = document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
                const element = result.singleNodeValue;
                const isVisible = element && element.offsetParent !== null;
                if (isVisible) {
                    clearInterval(interval);
                    console.log(`Element found (XPath): ${xpath}`);
                    resolve(element);
                } else {
                    elapsedTime += intervalTime;
                    if (elapsedTime >= timeout) {
                        clearInterval(interval);
                        console.error(`Element (XPath) "${xpath}" not found or not visible after ${timeout}ms`);
                        reject(new Error(`Element (XPath) "${xpath}" not found or not visible after ${timeout}ms`));
                    }
                }
            }, intervalTime);
        });
    }

    // ... existing helper functions (waitForFinalCheckboxByLabel, waitForParentLabelByText) ...
    function waitForFinalCheckboxByLabel(labelText, timeout = WAIT_TIMEOUT) {
        const escapedLabelText = labelText.replace(/'/g, "\\'");
        console.log(`Attempting to find FINAL checkbox for label: "${escapedLabelText}"`);
        const xpath = `//input[@type='checkbox'][@id=//label[contains(@class, 'css-1b7s69x')][normalize-space(.)='${escapedLabelText}']/@for]`;
        return waitForElementXPath(xpath, timeout);
    }
    function waitForParentLabelByText(labelText, timeout = WAIT_TIMEOUT) {
        const escapedLabelText = labelText.replace(/'/g, "\\'");
        console.log(`Attempting to find PARENT label containing span with text: "${escapedLabelText}"`);
        const xpath = `//span[contains(@class, 'css-40a0xc')][normalize-space(.)='${escapedLabelText}']/ancestor::label[1]`;
        return waitForElementXPath(xpath, timeout);
    }

    // --- Core Automation Functions ---

    /**
     * Sends the currently configured message.
     */
    async function sendMessage() {
        console.log('Attempting to send message (using Enter key)...');
        try {
            const inputFieldContainer = await waitForElement(CHAT_TEXT_AREA_SELECTOR);
            const editableDiv = inputFieldContainer.querySelector('div[contenteditable="true"]');
            if (!editableDiv) throw new Error('Editable input div not found.');
            editableDiv.focus();
            editableDiv.textContent = connectionIssueMessage; // Use the variable message
            editableDiv.dispatchEvent(new InputEvent('input', { bubbles: true, cancelable: true }));
            await new Promise(resolve => setTimeout(resolve, 100));
            const enterKeyEvent = new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', keyCode: 13, which: 13, bubbles: true, cancelable: true });
            editableDiv.dispatchEvent(enterKeyEvent);
            console.log('Message text set and Enter key simulated.');
            await new Promise(resolve => setTimeout(resolve, 200));
        } catch (error) {
            console.error('Error sending message:', error);
            throw error;
        }
    }

    // ... existing automation functions (openClassificationWindow, classifyContact, openFinalizeWindow, handleFinalizeConfirmation) ...
    async function openClassificationWindow() {
        console.log('Attempting to open classification window and expand parents...');
        try {
            const classifyButton = await waitForElement(CLASSIFICATION_BUTTON_SELECTOR);
            classifyButton.click();
            console.log('Classification button clicked.');
            await new Promise(resolve => setTimeout(resolve, 300));
            console.log(`Looking for top-level parent: "${TOP_LEVEL_PARENT_LABEL_TEXT}"`);
            const topLevelParentLabel = await waitForParentLabelByText(TOP_LEVEL_PARENT_LABEL_TEXT);
            topLevelParentLabel.click();
            console.log(`Clicked top-level parent label "${TOP_LEVEL_PARENT_LABEL_TEXT}" to expand.`);
            await new Promise(resolve => setTimeout(resolve, EXPAND_DELAY));
            console.log(`Looking for intermediate parent: "${INTERMEDIATE_PARENT_LABEL_TEXT}"`);
            const intermediateParentLabel = await waitForParentLabelByText(INTERMEDIATE_PARENT_LABEL_TEXT);
            intermediateParentLabel.click();
            console.log(`Clicked intermediate parent label "${INTERMEDIATE_PARENT_LABEL_TEXT}" to expand.`);
            await new Promise(resolve => setTimeout(resolve, EXPAND_DELAY));
            await waitForFinalCheckboxByLabel(TARGET_CLASSIFICATION_LABEL_TEXT);
            console.log(`Target classification label "${TARGET_CLASSIFICATION_LABEL_TEXT}" found after expanding parents.`);
        } catch (error) {
            console.error('Error opening classification window or expanding parents:', error);
            console.error(`Verify labels are correct: Top: "${TOP_LEVEL_PARENT_LABEL_TEXT}", Intermediate: "${INTERMEDIATE_PARENT_LABEL_TEXT}", Target: "${TARGET_CLASSIFICATION_LABEL_TEXT}"`);
            throw error;
        }
    }
    async function classifyContact() {
        console.log(`Attempting to classify contact with label: "${TARGET_CLASSIFICATION_LABEL_TEXT}"`);
        try {
            const checkbox = await waitForFinalCheckboxByLabel(TARGET_CLASSIFICATION_LABEL_TEXT);
            if (!checkbox.checked) {
                const label = document.querySelector(`label[for='${checkbox.id}']`);
                if (label) { label.click(); console.log(`Clicked label for classification: "${TARGET_CLASSIFICATION_LABEL_TEXT}"`); }
                else { checkbox.click(); console.log(`Clicked checkbox directly for classification: "${TARGET_CLASSIFICATION_LABEL_TEXT}"`); }
            } else { console.log(`Classification checkbox for "${TARGET_CLASSIFICATION_LABEL_TEXT}" already checked.`); }
            await new Promise(resolve => setTimeout(resolve, 100));
        } catch (error) { console.error('Error classifying contact:', error); throw error; }
    }
    async function openFinalizeWindow() {
        console.log('Attempting to open finalize window...');
        try {
            const finalizeButton = await waitForElement(OPEN_FINALIZE_BUTTON_SELECTOR);
            finalizeButton.click();
            console.log('Open finalize button clicked.');
            await waitForElement(FINAL_CONFIRM_BUTTON_SELECTOR);
            console.log('Finalize modal likely opened.');
        } catch (error) { console.error('Error clicking open finalize button:', error); throw error; }
    }
    async function handleFinalizeConfirmation() {
        console.log('Handling finalize confirmation...');
        try {
            try {
                 const saveClassificationRadio = await waitForElement(SAVE_CLASSIFICATION_RADIO_SELECTOR, 2000);
                 if (saveClassificationRadio && !saveClassificationRadio.checked) {
                     const radioLabel = saveClassificationRadio.closest('label');
                     if (radioLabel) { radioLabel.click(); console.log('Clicked label for "Save classification now" radio button.'); }
                     else { saveClassificationRadio.click(); console.log('Clicked "Save classification now" radio button directly.'); }
                     await new Promise(resolve => setTimeout(resolve, 50));
                 } else { console.log('"Save classification now" radio already checked or not found.'); }
            } catch (radioError) { console.log('"Save classification now" radio button not found or needed, skipping.'); }
            const confirmButton = await waitForElement(FINAL_CONFIRM_BUTTON_SELECTOR);
            confirmButton.click();
            console.log('Finalize confirmation button clicked.');
        } catch (error) { console.error('Error handling finalize confirmation:', error); throw error; }
    }

    /**
     * Runs the full automation sequence.
     */
    async function runFullAutomationSequence() {
        if (!document.querySelector(CHAT_TEXT_AREA_SELECTOR)) {
            console.log('Auto-Mode: No active chat detected. Skipping run.');
            return;
        }
        if (isSequenceRunning) {
            console.log('Auto-Mode: Sequence already in progress. Skipping run.');
            return;
        }
        isSequenceRunning = true;
        console.log('--- Starting Automation Sequence ---');
        try {
            await sendMessage(); // No need to pass the message here anymore
            await openClassificationWindow();
            await classifyContact();
            await openFinalizeWindow();
            await handleFinalizeConfirmation();
            console.log('--- Automation Sequence Completed Successfully ---');
        } catch (error) {
            console.error('--- Automation Sequence Failed ---', error);
        } finally {
            isSequenceRunning = false;
        }
    }

    // --- Settings Modal Functions ---

    /**
     * Injects CSS for the settings modal into the document head. Runs only once.
     */
    function injectModalCss() {
        if (hasInjectedCss) return;
        const css = `
            #cnc-settings-backdrop { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background-color: rgba(0,0,0,0.5); z-index: 9998; display: none; }
            #cnc-settings-modal { position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); background-color: white; color: #333; border-radius: 8px; box-shadow: 0 5px 15px rgba(0,0,0,0.3); z-index: 9999; width: 90%; max-width: 500px; padding: 20px; display: none; flex-direction: column; gap: 15px; }
            #cnc-settings-modal h2 { margin: 0; font-size: 1.25rem; }
            #cnc-settings-modal textarea { width: 100%; min-height: 150px; border: 1px solid #ccc; border-radius: 4px; padding: 8px; font-family: inherit; font-size: 1rem; resize: vertical; box-sizing: border-box; }
            #cnc-settings-modal .modal-actions { display: flex; justify-content: space-between; gap: 10px; align-items: center; }
            #cnc-settings-modal .modal-actions-right { display: flex; gap: 10px; }
            #cnc-settings-modal button { padding: 8px 16px; border: none; border-radius: 5px; cursor: pointer; font-weight: bold; }
            #cnc-settings-save { background-color: #28a745; color: white; }
            #cnc-settings-cancel { background-color: #6c757d; color: white; }
            #cnc-settings-restore { background-color: #ffc107; color: #212529; }
        `;
        const style = document.createElement('style');
        style.type = 'text/css';
        style.appendChild(document.createTextNode(css));
        document.head.appendChild(style);
        hasInjectedCss = true;
    }

    /**
     * Creates and appends the settings modal to the body. Runs only once.
     */
    function createSettingsModal() {
        if (document.getElementById('cnc-settings-modal')) return;

        injectModalCss();

        const backdrop = document.createElement('div');
        backdrop.id = 'cnc-settings-backdrop';

        const modal = document.createElement('div');
        modal.id = 'cnc-settings-modal';
        modal.innerHTML = `
            <h2>Edit Automated Message</h2>
            <textarea id="cnc-message-textarea"></textarea>
            <div class="modal-actions">
                 <button id="cnc-settings-restore">Restore Default</button>
                 <div class="modal-actions-right">
                    <button id="cnc-settings-cancel">Cancel</button>
                    <button id="cnc-settings-save">Save</button>
                </div>
            </div>
        `;

        document.body.appendChild(backdrop);
        document.body.appendChild(modal);

        // Event Listeners
        document.getElementById('cnc-settings-cancel').addEventListener('click', closeSettingsModal);
        backdrop.addEventListener('click', closeSettingsModal);

        document.getElementById('cnc-settings-restore').addEventListener('click', () => {
            document.getElementById('cnc-message-textarea').value = DEFAULT_MESSAGE;
            console.log('Message textarea restored to default.');
        });

        document.getElementById('cnc-settings-save').addEventListener('click', async () => {
            const newMsg = document.getElementById('cnc-message-textarea').value;
            connectionIssueMessage = newMsg;
            await GM_setValue(GM_MESSAGE_KEY, newMsg);
            console.log('New message saved.');
            closeSettingsModal();
        });
    }

    function openSettingsModal() {
        createSettingsModal(); // Ensure modal exists
        document.getElementById('cnc-message-textarea').value = connectionIssueMessage;
        document.getElementById('cnc-settings-backdrop').style.display = 'block';
        document.getElementById('cnc-settings-modal').style.display = 'flex';
    }

    function closeSettingsModal() {
        document.getElementById('cnc-settings-backdrop').style.display = 'none';
        document.getElementById('cnc-settings-modal').style.display = 'none';
    }


    /**
     * Adds the control buttons ('Auto', 'CNC', and Settings) to the page UI.
     */
    function addControlButtons() {
        const targetElementSelector = 'button[data-id="operation-state"]';
        const targetElement = document.querySelector(targetElementSelector);
        if (!targetElement || document.getElementById('cnc-automator-button-wrapper')) return;

        console.log('Adding control buttons...');
        const buttonWrapper = document.createElement('span');
        buttonWrapper.id = 'cnc-automator-button-wrapper';
        buttonWrapper.style.cssText = `display: inline-flex; align-items: center; margin-right: 10px; gap: 10px;`;

        // --- Settings Button ---
        const settingsButton = document.createElement('button');
        settingsButton.id = 'cnc-settings-button';
        settingsButton.title = 'Edit Automated Message';
        settingsButton.style.cssText = `display: inline-flex; align-items: center; justify-content: center; height: 36px; width: 36px; padding: 0; background-color: #17a2b8; color: white; border: none; border-radius: 5px; cursor: pointer; font-weight: bold;`;
        settingsButton.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" class="bi bi-gear-fill" viewBox="0 0 16 16"><path d="M9.405 1.05c-.413-1.4-2.397-1.4-2.81 0l-.1.34a1.464 1.464 0 0 1-2.105.872l-.31-.17c-1.283-.698-2.686.705-1.987 1.987l.169.311a1.464 1.464 0 0 1-.872 2.105l-.34.1c-1.4.413-1.4 2.397 0 2.81l.34.1a1.464 1.464 0 0 1 .872 2.105l-.17.31c-.698 1.283.705 2.686 1.987 1.987l.311-.169a1.464 1.464 0 0 1 2.105.872l.1.34c.413 1.4 2.397 1.4 2.81 0l.1-.34a1.464 1.464 0 0 1 2.105-.872l.31.17c1.283.698 2.686-.705 1.987-1.987l-.169-.311a1.464 1.464 0 0 1 .872-2.105l.34-.1c1.4-.413 1.4-2.397 0-2.81l-.34-.1a1.464 1.464 0 0 1-.872-2.105l.17-.31c.698-1.283-.705-2.686-1.987-1.987l-.311.169a1.464 1.464 0 0 1-2.105-.872l-.1-.34zM8 10.93a2.929 2.929 0 1 1 0-5.86 2.929 2.929 0 0 1 0 5.858z"/></svg>`;
        settingsButton.addEventListener('click', openSettingsModal);


        const autoButton = document.createElement('button');
        autoButton.id = 'cnc-auto-button'; autoButton.innerHTML = 'Auto OFF';
        autoButton.style.cssText = `display: inline-flex; align-items: center; justify-content: center; height: 36px; padding: 0 16px; background-color: #6c757d; color: white; border: none; border-radius: 5px; cursor: pointer; font-weight: bold; font-size: 14px; transition: background-color 0.2s ease;`;
        autoButton.setAttribute('data-enabled', 'false');

        const cncButton = document.createElement('button');
        cncButton.id = 'cnc-manual-button'; cncButton.innerHTML = 'Run CNC';
        cncButton.style.cssText = `display: inline-flex; align-items: center; justify-content: center; height: 36px; padding: 0 16px; background-color: #dc3545; color: white; border: none; border-radius: 5px; cursor: pointer; font-weight: bold; font-size: 14px; transition: background-color 0.2s ease;`;
        cncButton.disabled = false;

        let autoIntervalId = null;
        autoButton.addEventListener('click', () => {
            const isEnabled = autoButton.getAttribute('data-enabled') === 'true';
            if (isEnabled) {
                clearInterval(autoIntervalId); autoIntervalId = null;
                autoButton.innerHTML = 'Auto OFF'; autoButton.style.backgroundColor = '#6c757d';
                autoButton.setAttribute('data-enabled', 'false'); cncButton.disabled = false;
                console.log('Auto mode disabled.');
            } else {
                autoButton.innerHTML = 'Auto ON'; autoButton.style.backgroundColor = '#28a745';
                autoButton.setAttribute('data-enabled', 'true'); cncButton.disabled = true;
                console.log(`Auto mode enabled. Running check every ${AUTO_MODE_INTERVAL / 1000} seconds.`);
                runFullAutomationSequence();
                autoIntervalId = setInterval(runFullAutomationSequence, AUTO_MODE_INTERVAL);
            }
        });

        cncButton.addEventListener('click', async () => {
            cncButton.disabled = true; cncButton.innerHTML = 'Running...'; autoButton.disabled = true; settingsButton.disabled = true;
            await runFullAutomationSequence();
            if (autoButton.getAttribute('data-enabled') === 'false') {
                cncButton.disabled = false; cncButton.innerHTML = 'Run CNC'; autoButton.disabled = false; settingsButton.disabled = false;
            }
        });

        buttonWrapper.appendChild(settingsButton);
        buttonWrapper.appendChild(autoButton);
        buttonWrapper.appendChild(cncButton);
        targetElement.parentNode.insertBefore(buttonWrapper, targetElement);
        console.log('Control buttons added successfully.');
    }

    // --- Initialization ---
    async function initialize() {
        console.log('CNC Automator Script Initializing (v2.1)...');
        await loadMessageFromStorage(); // Load the message first
        const observer = new MutationObserver(() => {
            addControlButtons();
        });
        observer.observe(document.body, { childList: true, subtree: true });
    }

    initialize();

})();