// ==UserScript==
// @name         Hi - Detalhes Primeiro da Fila
// @namespace     http://tampermonkey.net/
// @version      1.3
// @description  Show queue details in a collapsible menu with dynamic updates and first customer info on the dashboard
// @author       Julio Santos feat. AI
// @match        https://www5.directtalk.com.br/static/beta/admin/main.html*
// @grant        GM_xmlhttpRequest
// @downloadURL  https://raw.githubusercontent.com/JulioSantos-dss/HiPlatform-Enhancements/main/Hi%20-%20Detalhes%20Primeiro%20da%20Fila.user.js
// @updateURL    https://raw.githubusercontent.com/JulioSantos-dss/HiPlatform-Enhancements/main/Hi%20-%20Detalhes%20Primeiro%20da%20Fila.user.js
// ==/UserScript==

(function() {
    'use strict';

    function isCorrectPage() {
        return window.location.hash.includes('#!/sitatual');
    }

    function getQueueElement() {
        return document.querySelector('.dt-chart-summary .col-sm-6.text-center');
    }

    function watchQueueChanges() {
        const observer = new MutationObserver((mutations) => {
            mutations.forEach(() => {
                if (!document.querySelector('.queue-wrapper')) {
                    fetchQueueDetails();
                }
            });
        });

        const queueElement = getQueueElement();
        if (queueElement) {
            observer.observe(queueElement.parentElement, {
                childList: true,
                subtree: true,
                characterData: true
            });
        }
    }

    function waitForElement(callback) {
        const element = getQueueElement();
        if (element) {
            callback();
        } else {
            setTimeout(() => waitForElement(callback), 500);
        }
    }

    const style = document.createElement('style');
    style.textContent = `
        .queue-toggle {
            margin-left: 10px;
            padding: 5px 10px;
            background: #0066cc;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            display: inline-block;
        }
        .queue-toggle:hover {
            background: #004999;
        }
        .queue-details-container {
            position: absolute;
            top: 100%;
            left: 0;
            background: white;
            padding: 15px;
            border-radius: 5px;
            box-shadow: 0 2px 5px rgba(0,0,0,0.2);
            z-index: 1000;
            min-width: 300px;
            max-height: 80vh;
            overflow-y: auto;
            display: none;
        }
        .queue-wrapper {
            position: relative;
            display: inline-block;
        }
        .customer-item {
            margin: 10px 0;
            padding: 10px;
            border: 1px solid #eee;
            border-radius: 4px;
            background-color: #f8f9fa;
        }
        .department-info {
            color: #0066cc;
            font-weight: bold;
            margin: 5px 0;
            cursor: pointer;
        }
        .department-info:hover {
            text-decoration: underline;
        }
        .loading-indicator {
            padding: 20px;
            text-align: center;
            color: #666;
        }
        .first-customer-info {
            margin-top: 10px;
            padding: 10px;
            border: 1px solid #eee;
            border-radius: 4px;
        }
    `;
    document.head.appendChild(style);

    function createCollapsibleMenu() {
        const queueElement = getQueueElement();

        if (!queueElement) {
            console.log('Queue element not found');
            return;
        }

        const wrapper = document.createElement('div');
        wrapper.className = 'queue-wrapper';
        wrapper.style.display = 'inline-block';
        wrapper.style.marginLeft = '10px';

        const toggleButton = document.createElement('button');
        toggleButton.className = 'queue-toggle';
        toggleButton.textContent = 'Detalhes ▼';

        const detailsContainer = document.createElement('div');
        detailsContainer.className = 'queue-details-container';

        toggleButton.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            const isVisible = detailsContainer.style.display === 'block';
            detailsContainer.style.display = isVisible ? 'none' : 'block';
            toggleButton.textContent = isVisible ? 'Detalhes ▼' : 'Detalhes ▲';

            if (!isVisible) {
                fetchQueueDetails();
            }
        });

        document.addEventListener('click', (e) => {
            if (!wrapper.contains(e.target)) {
                detailsContainer.style.display = 'none';
                toggleButton.textContent = 'Detalhes ▼';
            }
        });

        wrapper.appendChild(toggleButton);
        wrapper.appendChild(detailsContainer);
        queueElement.appendChild(wrapper);

        return detailsContainer;
    }

    function fetchQueueDetails() {
        let container = document.querySelector('.queue-details-container');
        if (!container) {
            container = createCollapsibleMenu();
        }

        if (!container) {
            console.error('Detalhes Fila: Container element not found.');
            return;
        }

        container.innerHTML = '<div class="loading-indicator">Carregando...</div>';

        GM_xmlhttpRequest({
            method: 'GET',
            url: 'https://www5.directtalk.com.br/admin/interactive/inter_home_userfila.asp?id_departamento=-1&departamento=-1',

            // --- START OF THE FIX ---
            // Force the browser to interpret the response as ISO-8859-1, matching the page's encoding.
            // This is the most critical change.
            overrideMimeType: 'text/html; charset=iso-8859-1',
            // --- END OF THE FIX ---

            onload: function(response) {
                console.log('Detalhes Fila: Request successful. Processing response.');

                const parser = new DOMParser();
                const doc = parser.parseFromString(response.responseText, 'text/html');
                const rows = doc.querySelectorAll('table[cellspacing="1"] tr');

                console.log(`Detalhes Fila: Found ${rows.length} rows in the table.`);

                const firstCustomerInfo = {};
                let isCapturing = false;

                for (const row of rows) {
                    const cells = row.querySelectorAll('td font');
                    if (cells.length !== 2) continue;

                    const label = cells[0].textContent.trim();
                    const value = cells[1].textContent.trim();

                    if (label.includes('Posição na fila') && value === '1') {
                        console.log('Detalhes Fila: Found start of first customer. Starting capture.');
                        isCapturing = true;
                    }

                    if (isCapturing && label.includes('Posição na fila') && value !== '1') {
                        console.log('Detalhes Fila: Found start of second customer. Stopping capture.');
                        break;
                    }

                    if (isCapturing) {
                        const cleanLabel = label.replace(':', '').trim();
                        firstCustomerInfo[cleanLabel] = value;
                    }
                }

                console.log('Detalhes Fila: Final captured data:', firstCustomerInfo);

                if (Object.keys(firstCustomerInfo).length === 0) {
                    console.error('Detalhes Fila: Failed to capture any customer information. The parsing logic might have failed.');
                }

                const departmentValue = firstCustomerInfo['Departamento'] || 'N/A';
                container.innerHTML = `
                    <div class="customer-item">
                        <div class="customer-name" onclick="event.stopPropagation();">Cliente: ${firstCustomerInfo['Nome'] || 'N/A'}</div>
                        <div class="department-info" onclick="navigator.clipboard.writeText('${departmentValue}'); event.stopPropagation();">Departamento: ${departmentValue}</div>
                        <div onclick="event.stopPropagation();">Entrada: ${firstCustomerInfo['Data Entrada'] || 'N/A'}</div>
                        <div onclick="event.stopPropagation();">Telefone: ${firstCustomerInfo['telefone'] || 'N/A'}</div>
                    </div>
                `;

                updateMainDashboard(firstCustomerInfo);
            },
            onerror: function(error) {
                console.error('Detalhes Fila: GM_xmlhttpRequest failed.', error);
            }
        });
    }

    function updateMainDashboard(customerInfo) {
        const dashboard = document.querySelector('.dt-chart-summary');
        if (!dashboard) return;

        // Remove any existing first-customer-info element
        let existingInfoElement = dashboard.querySelector('.first-customer-info');
        if (existingInfoElement) {
            existingInfoElement.remove();
        }

        // Create a new element to display the information
        /* const customerInfoElement = document.createElement('div');
        customerInfoElement.className = 'first-customer-info';
        customerInfoElement.innerHTML = `
            <div>Primeiro da fila: ${customerInfo['Nome'] || 'N/A'}</div>
            <div>Departamento: ${customerInfo['Departamento'] || 'N/A'}</div>
            <div>Entrada: ${customerInfo['Data Entrada'] || 'N/A'}</div>
        `; */

        // Add the new element to the dashboard
        dashboard.appendChild(customerInfoElement);
    }

    function initializeScript() {
        if (!isCorrectPage()) {
            setTimeout(initializeScript, 1000);
            return;
        }

        waitForElement(() => {
            fetchQueueDetails();
            watchQueueChanges();
            setInterval(fetchQueueDetails, 30000);
        });
    }

    window.addEventListener('hashchange', () => {
        if (isCorrectPage()) {
            initializeScript();
        }
    });

    initializeScript();
})();
