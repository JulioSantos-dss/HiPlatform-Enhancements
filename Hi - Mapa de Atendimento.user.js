// ==UserScript==
// @name         Hi - Mapa de Atendimento
// @namespace    http://tampermonkey.net/
// @version      0.7
// @description  Displays department attendance chart with dynamic filtering; clicking a chart bar opens the corresponding "Janelas habilitadas" popup.
// @match        https://www5.directtalk.com.br/static/beta/admin/main.html*
// @grant        GM_addStyle
// @require      https://cdnjs.cloudflare.com/ajax/libs/Chart.js/3.7.0/chart.min.js
// @require      https://cdn.jsdelivr.net/npm/chartjs-plugin-datalabels@2.0.0
// ==/UserScript==

/* global Chart, ChartDataLabels */

(function() {
    'use strict';

    if (typeof Chart === 'undefined' || typeof ChartDataLabels === 'undefined') {
        console.error('Mapa de Atendimento Error: Chart.js or Datalabels plugin failed to load.');
        return;
    }
    Chart.register(ChartDataLabels);

    // --- Configuration ---
    const DEPARTMENT_PANEL_SELECTOR = '.dt-panel-card';
    const DEPARTMENT_NAME_SELECTOR = 'h3';
    const LEGEND_TEXT_SELECTOR = '.dt-chart-legend-text';
    const LEGEND_VALUE_SELECTOR = '.label';
    const AGENT_POPUP_LINK_SELECTOR = '.dt-style-link[ng-click*="openPopUp"]';
    const REFRESH_INTERVAL_MS = 0;
    const WAIT_FOR_PANELS_TIMEOUT = 15000;
    const INITIAL_LOAD_CHECK_INTERVAL = 500;
    const PANEL_CONTAINER_SELECTOR = 'div[ng-view]';

    // --- MODIFICATION START: List of ALL possible department keywords for filtering ---
    // These will be used to generate checkboxes.
    // Ensure these keywords accurately reflect parts of the department names on the page.
    const ALL_AVAILABLE_DEPARTMENT_KEYWORDS = [
        'SAC',
        'HELP',
        'FALHA API',
        'AGENDAMENTO',
        'CASOS CRÍTICOS',
        'CHURN SAFRA',
        'COBRANÇA',
        'COPE',
        'ESCRITÓRIO',
        'N3',
        'REFIDELIZAÇÃO',
        'RETENCAO', // or RETENÇÃO
        'VENDAS',
        'LOJA',
        //'MESSENGER',
        //'DISTRIBUIÇÃO',
        //'LIBERAÇÃO',
        //'WHATSAPP AGENDAMENTO',
        //'WHATSAPP CHURN SAFRA',
        //'WHATSAPP COBRANÇA',
        //'WHATSAPP ESCRITÓRIO',
        //'WHATSAPP HELP',
        //'WHATSAPP LOJA',
        //'WHATSAPP RETENÇÃO',
        //'WHATSAPP SAC',
        //'WHATSAPP VENDAS',
        //'CONNECTA',
        //'GOODU',
        //'ADMINISTRATIVO',
        //'FINANCEIRO',
        //'TREINAMENTO'
        // Add any other distinct keywords you might want to filter by
    ]; // Sort alphabetically for the UI
    // --- MODIFICATION END ---

    // --- State Variables ---
    let currentChart = null;
    let refreshIntervalId = null;
    let dashboardVisible = false;

    // --- Main Initialization ---
    function initializeScript() {
        console.log("Mapa de Atendimento: Initializing...");
        initializeGraphUI(); // This will now also create filter UI
        startAnalyzing();

        if (REFRESH_INTERVAL_MS > 0) {
            refreshIntervalId = setInterval(() => {
                if (dashboardVisible) {
                    analyzeAttendance();
                }
            }, REFRESH_INTERVAL_MS);
        }
    }

    // --- UI Creation ---
    function initializeGraphUI() {
        const targetButton = document.getElementById('dtDropdownFilter');
        if (!targetButton || !targetButton.parentNode) {
            console.warn("Mapa de Atendimento: Target button #dtDropdownFilter not found. UI will not be created.");
            return;
        }

        const toggleButton = document.createElement('button');
        toggleButton.textContent = 'Mapa de Atendimento';
        toggleButton.style.cssText = `
            padding: 6px 12px; margin-left: 10px; background: #007bff; color: white; border: none; border-radius: 4px;
            cursor: pointer; z-index: 10000; font-size: 14px; display: inline-block; vertical-align: top;
            line-height: 1.42857143; box-shadow: 0 1px 3px rgba(0,0,0,0.2);`;
        toggleButton.id = 'mapa-atendimento-toggle';
        toggleButton.classList.add('btn');
        targetButton.parentNode.insertBefore(toggleButton, targetButton.nextSibling);

        const dashboard = document.createElement('div');
        dashboard.id = 'mapa-atendimento-dashboard';
        dashboard.style.cssText = `
            position: fixed; top: 50px; right: 10px; background: white; padding: 15px;
            border: 1px solid #ccc; border-radius: 5px; z-index: 9999;
            width: 850px; max-width: 95vw; max-height: 90vh; /* Increased width for filters */
            box-shadow: 0 4px 8px rgba(0,0,0,0.2); overflow: auto; display: none;
            font-family: Arial, sans-serif;`;

            const closeButton = document.createElement('button');
            closeButton.innerHTML = '×'; // HTML entity for 'X'
            closeButton.setAttribute('aria-label', 'Close Mapa de Atendimento');
            closeButton.style.cssText = `
                position: absolute;
                top: 10px;
                left: 10px;
                background: transparent;
                border: none;
                font-size: 25px; /* Make X larger */
                font-weight: bold;
                color: #777;
                cursor: pointer;
                padding: 0 5px;
                line-height: 1;
            `;
            closeButton.onmouseover = function() { this.style.color = '#333'; };
            closeButton.onmouseout = function() { this.style.color = '#777'; };

            closeButton.addEventListener('click', () => {
                dashboard.style.display = 'none';
                dashboardVisible = false;
                console.log("Mapa de Atendimento: Dashboard closed via X button.");
            });
            dashboard.appendChild(closeButton); // Add to dashboard

        toggleButton.addEventListener('click', () => {
            const willBeVisible = dashboard.style.display === 'none';
            dashboard.style.display = willBeVisible ? 'block' : 'none';
            dashboardVisible = willBeVisible;
            if (willBeVisible) {
                analyzeAttendance(); // Analyze when opened
            } else {
                 console.log("Mapa de Atendimento: Dashboard closed via toggle button.");
            }
        });

        const title = document.createElement('h3');
        title.textContent = 'Mapa de Atendimento';
        title.style.cssText = 'margin: 0 0 15px 0; text-align: center; color: #333; padding-right: 20px;'; // Added padding-right for close button space
        dashboard.appendChild(title);

        // --- MODIFICATION START: Create Filter Container ---
        const filterContainer = document.createElement('div');
        filterContainer.id = 'mapa-atendimento-filter-container';
        filterContainer.style.cssText = `
            margin-bottom: 15px;
            padding: 10px;
            border: 1px solid #e0e0e0; /* Lighter border */
            border-radius: 4px;
            background-color: #f9f9f9; /* Slight background tint */
            /* For columns: */
            column-count: 5; /* Adjust number of columns as needed */
            column-gap: 20px;
            max-height: 200px; /* Adjust if needed with columns */
            overflow-y: auto;
`;
        const filterTitle = document.createElement('h4');
        filterTitle.textContent = 'Filtrar Departamentos:';
        filterTitle.style.cssText = `
            width: 100%;
            margin: 0 0 10px 0; /* More space below title */
            font-size: 15px; /* Slightly larger */
            font-weight: bold;
            color: #333;
            column-span: all; /* Make title span all columns */
        `;
        filterContainer.appendChild(filterTitle);

        ALL_AVAILABLE_DEPARTMENT_KEYWORDS.forEach(keyword => {
            const checkboxId = `filter-dept-${keyword.replace(/[^a-zA-Z0-9]/g, '-')}`; // Sanitize ID
            const label = document.createElement('label');
            label.htmlFor = checkboxId;
            label.style.cssText = `
                display: block; /* Each filter on its own line within a column */
                margin-bottom: 5px; /* Space between filter items */
                font-size: 13px;
                cursor: pointer;
                line-height: 1.4;
                /* Optional: to prevent text breaking weirdly in columns */
                -webkit-column-break-inside: avoid;
                        page-break-inside: avoid;
                            break-inside: avoid;
            `;

            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.id = checkboxId;
            checkbox.value = keyword;
            checkbox.checked = true; // Default to all selected
            checkbox.style.marginRight = '5px';
            checkbox.addEventListener('change', analyzeAttendance); // Re-analyze on change

            label.appendChild(checkbox);
            label.appendChild(document.createTextNode(keyword));
            filterContainer.appendChild(label);
        });
        dashboard.appendChild(filterContainer);

        // Add "Select All" / "Deselect All" buttons
        const selectAllButton = document.createElement('button');
        selectAllButton.textContent = 'Selecionar Todos';
        selectAllButton.style.cssText = `
            padding: 5px 10px;
            font-size: 12px;
            margin-right: 8px;
            background-color: #007bff;
            color: white;
            border: none;
            border-radius: 3px;
            cursor: pointer;
        `;
        selectAllButton.onmouseover = function() { this.style.backgroundColor = '#0056b3'; };
        selectAllButton.onmouseout = function() { this.style.backgroundColor = '#007bff'; };
        selectAllButton.onclick = () => {
            filterContainer.querySelectorAll('input[type="checkbox"]').forEach(cb => cb.checked = true);
            analyzeAttendance();
        };


        const deselectAllButton = document.createElement('button');
        deselectAllButton.textContent = 'Limpar Seleção';
        deselectAllButton.style.cssText = `
            padding: 5px 10px;
            font-size: 12px;
            background-color: #007bff;
            color: white;
            border: none;
            border-radius: 3px;
            cursor: pointer;
        `;
        deselectAllButton.onmouseover = function() { this.style.backgroundColor = '#0056b3'; };
        deselectAllButton.onmouseout = function() { this.style.backgroundColor = '#007bff'; };
        deselectAllButton.onclick = () => {
            filterContainer.querySelectorAll('input[type="checkbox"]').forEach(cb => cb.checked = false);
            analyzeAttendance();
        };
        const buttonContainer = document.createElement('div');
        buttonContainer.style.cssText = `
            margin-bottom: 10px;
            text-align: left;
            column-span: all; /* Make buttons span all columns */
        `;
        buttonContainer.appendChild(selectAllButton);
        buttonContainer.appendChild(deselectAllButton);
        // Insert before the filter checkboxes, but after the filter title
        filterContainer.insertBefore(buttonContainer, filterTitle.nextSibling);

        // --- MODIFICATION END ---


        const copyButton = document.createElement('button');
        copyButton.textContent = 'Copiar Gráfico';
        copyButton.style.cssText = `
            margin: 0 0 15px 0; padding: 6px 12px; background: #28a745; color: white;
            border: none; border-radius: 4px; cursor: pointer; display: block; margin-left: auto; margin-right: auto;`;
        copyButton.addEventListener('click', () => { /* ... copy logic ... */
            const canvas = document.getElementById('attendanceChart');
            const totalDisplay = document.getElementById('mapa-atendimento-total');
            if (!canvas || !totalDisplay || !currentChart) { alert("Gráfico ainda não carregado."); return; }
            const tempCanvas = document.createElement('canvas');
            const scale = 1.5; const titleHeight = 40 * scale; const totalHeight = 40 * scale;
            tempCanvas.width = Math.max(canvas.width * scale, 600 * scale);
            tempCanvas.height = (canvas.height * scale) + titleHeight + totalHeight;
            const tempCtx = tempCanvas.getContext('2d');
            tempCtx.fillStyle = 'white'; tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
            tempCtx.font = `bold ${20 * scale}px Arial`; tempCtx.fillStyle = 'black'; tempCtx.textAlign = 'center';
            tempCtx.fillText('Mapa de Atendimento', tempCanvas.width / 2, titleHeight * 0.6);
            const chartDrawWidth = tempCanvas.width; const chartDrawHeight = canvas.height * scale;
            tempCtx.drawImage(canvas, 0, titleHeight, chartDrawWidth, chartDrawHeight);
            tempCtx.font = `bold ${18 * scale}px Arial`; tempCtx.fillStyle = 'black'; tempCtx.textAlign = 'center';
            tempCtx.fillText(totalDisplay.textContent, tempCanvas.width / 2, tempCanvas.height - (totalHeight * 0.4));
            tempCanvas.toBlob((blob) => {
                if (!blob) { alert("Erro ao gerar imagem para cópia."); return; }
                try {
                    const item = new ClipboardItem({ "image/png": blob });
                    navigator.clipboard.write([item]).then(() => {
                        const originalText = copyButton.textContent; copyButton.textContent = 'Copiado!'; copyButton.style.background = '#218838';
                        setTimeout(() => { copyButton.textContent = originalText; copyButton.style.background = '#28a745'; }, 2000);
                    }).catch(err => { console.error('Mapa de Atendimento: Clipboard API error:', err); alert(`Erro ao copiar: ${err.message}`); });
                } catch (err) { console.error('Mapa de Atendimento: Error creating ClipboardItem:', err); alert(`Erro ao preparar cópia: ${err.message}.`); }
            }, 'image/png', 1.0);
        });
        dashboard.appendChild(copyButton);

        const canvas = document.createElement('canvas');
        canvas.id = 'attendanceChart';
        canvas.style.display = 'block';
        dashboard.appendChild(canvas);

        const totalDisplay = document.createElement('div');
        totalDisplay.id = 'mapa-atendimento-total';
        totalDisplay.style.cssText = 'text-align: center; font-weight: bold; margin-top: 15px; font-size: 16px; color: #333;';
        dashboard.appendChild(totalDisplay);

        document.body.appendChild(dashboard);
    }


    // --- MODIFICATION START: Helper to get selected department keywords ---
    function getSelectedDepartmentKeywords() {
        const selectedKeywords = [];
        const filterContainer = document.getElementById('mapa-atendimento-filter-container');
        if (filterContainer) {
            filterContainer.querySelectorAll('input[type="checkbox"]:checked').forEach(checkbox => {
                selectedKeywords.push(checkbox.value.toUpperCase());
            });
        }
        // If no checkboxes are created yet (e.g., initial load before UI fully ready),
        // or if the user deselects all, we might want a default behavior.
        // For now, if nothing is selected, it will show an empty chart.
        // Alternatively, you could default to ALL_AVAILABLE_DEPARTMENT_KEYWORDS if selectedKeywords is empty.
        return selectedKeywords;
    }
    // --- MODIFICATION END ---

    // --- Data Analysis ---
    function analyzeAttendance() {
        console.log("Mapa de Atendimento: Analyzing attendance data...");
        const departments = {};
        let dataFound = false;

        // --- MODIFICATION START: Get currently selected keywords for filtering ---
        const activeTargetKeywords = getSelectedDepartmentKeywords();
        if (activeTargetKeywords.length === 0) {
            console.log("Mapa de Atendimento: No department keywords selected for filtering.");
            updateChartAndTotal({}, 0);
            return;
        }
        console.log(`[DEBUG] Actively filtering for keywords:`, activeTargetKeywords);
        // --- MODIFICATION END ---

        const departmentPanels = document.querySelectorAll(DEPARTMENT_PANEL_SELECTOR);

        if (departmentPanels.length === 0) {
            console.warn("Mapa de Atendimento: No department panels found using selector:", DEPARTMENT_PANEL_SELECTOR);
            updateChartAndTotal({}, 0);
            return;
        }

        departmentPanels.forEach((panel, index) => {
            let deptName = `Panel ${index + 1} (Name not found)`;
            try {
                const deptNameElement = panel.querySelector(DEPARTMENT_NAME_SELECTOR);
                if (!deptNameElement) {
                    // console.warn(`Mapa de Atendimento: Could not find department name in panel ${index + 1}.`);
                    return;
                }
                deptName = deptNameElement.textContent.trim();
                const deptNameUpperFromPage = deptName.toUpperCase();

                // console.log(`[DEBUG] Found on page: '${deptName}' (Original), '${deptNameUpperFromPage}' (Uppercase)`);

                let isTargetDepartment = false;
                for (const targetKeyword of activeTargetKeywords) { // Use activeTargetKeywords
                    if (deptNameUpperFromPage.includes(targetKeyword)) {
                        isTargetDepartment = true;
                        // console.log(`[DEBUG] MATCHED: '${deptNameUpperFromPage}' contains active target keyword '${targetKeyword}'.`);
                        break;
                    }
                }

                if (!isTargetDepartment) {
                    return;
                }

                const attendingElements = panel.querySelectorAll(LEGEND_TEXT_SELECTOR);
                let attendingValue = 0;
                attendingElements.forEach(element => {
                    if (element.textContent.trim().toLowerCase() === 'atendendo') {
                        const valueSpan = element.parentElement.querySelector(LEGEND_VALUE_SELECTOR);
                        if (valueSpan) {
                            attendingValue = parseInt(valueSpan.textContent.trim(), 10) || 0;
                        }
                        return;
                    }
                });

                if (attendingValue > 0) {
                    departments[deptName] = attendingValue;
                    dataFound = true;
                }

                const janelasLink = panel.querySelector(AGENT_POPUP_LINK_SELECTOR);
                if (janelasLink && !janelasLink.hasAttribute('data-department')) {
                    janelasLink.setAttribute('data-department', deptName);
                }

            } catch (error) {
                console.error(`Mapa de Atendimento: Error processing panel for department '${deptName}':`, error);
            }
        });

        if (!dataFound && activeTargetKeywords.length > 0) { // Only log if filters were active
            console.log("Mapa de Atendimento: No data from selected departments (with attending > 0) to display in chart.");
        }

        const sortedEntries = Object.entries(departments).sort(([, a], [, b]) => b - a);
        const sortedDepartments = Object.fromEntries(sortedEntries);
        const totalAttending = Object.values(sortedDepartments).reduce((sum, count) => sum + count, 0);
        updateChartAndTotal(sortedDepartments, totalAttending);
    }

    // --- Chart Update ---
    function updateChartAndTotal(sortedDepartments, totalAttending) {
        const canvas = document.getElementById('attendanceChart');
        const totalDisplay = document.getElementById('mapa-atendimento-total');

        if (!canvas || !totalDisplay) {
            console.error("Mapa de Atendimento: Canvas or Total Display element not found!");
            return;
        }

        totalDisplay.textContent = `Total Atendendo (Filtrado): ${totalAttending}`;

        const numDepartments = Object.keys(sortedDepartments).length;
        console.log(`[DEBUG] updateChartAndTotal: numDepartments (displayed bars) = ${numDepartments}`);

        const baseHeightPadding = 7; // Or your preferred value
        const heightPerBar = 10;      // Or your preferred value
        let dynamicHeight = baseHeightPadding + (numDepartments * heightPerBar);

        // Your new minimum height
        const minChartHeight = 10;
        dynamicHeight = Math.max(dynamicHeight, minChartHeight);

        console.log(`[DEBUG] updateChartAndTotal: Calculated canvas.style.height = ${dynamicHeight}px`);

        if (currentChart) {
            currentChart.destroy();
            currentChart = null; // Explicitly nullify
        }

        if (numDepartments === 0) {
            canvas.style.height = `${minChartHeight}px`; // Set to min height even when hidden
            canvas.style.display = 'none';
            const activeFilters = getSelectedDepartmentKeywords();
            if (activeFilters.length > 0) {
                 console.log("Mapa de Atendimento: No data from selected departments to display in chart.");
            } else {
                 console.log("Mapa de Atendimento: No department filters selected.");
            }
            return;
        } else {
             // --- MODIFICATION: Ensure canvas is visible BEFORE setting height and drawing ---
             canvas.style.display = 'block'; // Make sure it's visible first
             canvas.style.height = `${dynamicHeight}px`; // Then set its height
             // --- END MODIFICATION ---
        }

        const ctx = canvas.getContext('2d');
        currentChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: Object.keys(sortedDepartments),
                datasets: [{
                    label: 'Atendendo', // Your example used 'Queue', adjust if needed
                    data: Object.values(sortedDepartments),
                    backgroundColor: Object.values(sortedDepartments).map(value => getBarColor(value)),
                    // borderColor: Object.values(sortedDepartments).map(value => getBarColor(value).replace('0.7', '1')), // From your example
                    // borderWidth: 2, // From your example
                    borderRadius: 5,
                    //borderWidth: 2, // Current script setting
                    barThickness: 15, // Matches your example and current script
                    //barPercentage: 0.8,
                    //categoryPercentage: 0.8,
                }]
            },
            options: {
                    responsive: false,
                    maintainAspectRatio: true,
                    indexAxis: 'y',
                    elements: {
                      bar: {
                        //borderWidth: 50,
                        //barThickness: 7
                      }
                    },
                    scales: {
                        x: {
                            beginAtZero: true,
                            max: 30,
                            ticks: {
                                stepSize: 10,
                                font: {
                                    size: 1
                                }
                            }
                        },
                    },
                    responsive: true,
                    plugins: {
                      legend: {
                        display: false
                      },
                      datalabels: {
                        anchor: 'end',
                        align: 'right',
                        offset: 4,
                        color: '#000',
                        font: {
                            weight: 'bold',
                            size: 12
                        },
                        formatter: (value) => `${value}`
                    },
                      title: {
                        display: false,
                        text: 'Chart.js Horizontal Bar Chart'
                      }
                },
                onClick: (event, elements, chart) => { // Keep the existing onClick logic
                    if (elements.length > 0) {
                        const elementIndex = elements[0].index;
                        const clickedDepartmentLabel = chart.data.labels[elementIndex];
                        const departmentName = clickedDepartmentLabel.trim();
                        const linkSelector = `.dt-style-link[data-department="${departmentName}"]`;
                        const targetLinkElement = document.querySelector(linkSelector);
                        if (targetLinkElement) {
                            targetLinkElement.click();
                        } else {
                            console.warn(`Mapa de Atendimento: Could not find link for "${departmentName}"`);
                            alert(`Não foi possível encontrar o link "Janelas habilitadas" para ${departmentName} na página.`);
                        }
                    }
                },
            },
        });
    }

    // --- Color Logic --- (remains the same)
    function getBarColor(value) {
        const lowThreshold = 3; const highThreshold = 10; const maxExpected = 20;
        let r, g, b;
        if (value <= lowThreshold) { r = 144; g = 238; b = 144; }
        else if (value <= highThreshold) {
             const factor = (value - lowThreshold) / (highThreshold - lowThreshold);
             r = Math.floor(144 + factor * (255 - 144));
             g = Math.floor(238 + factor * (255 - 238));
             b = Math.floor(144 - factor * 144);
        } else {
            const factor = Math.min(1, (value - highThreshold) / (maxExpected - highThreshold));
            r = 255; g = Math.floor(255 - factor * (255 - 69)); b = 0;
        }
        return `rgba(${r}, ${g}, ${b}, 0.75)`;
    }

    // --- Initial Loading Logic --- (remains mostly the same)
    function startAnalyzing() {
         let timeWaited = 0;
         const checkInterval = setInterval(() => {
             const panels = document.querySelectorAll(DEPARTMENT_PANEL_SELECTOR);
             const panelContainer = document.querySelector(PANEL_CONTAINER_SELECTOR);
             if (panelContainer && panels.length > 0) {
                 clearInterval(checkInterval);
                 analyzeAttendance(); // Initial analysis with default (all selected) filters
             } else {
                 timeWaited += INITIAL_LOAD_CHECK_INTERVAL;
                 if (timeWaited >= WAIT_FOR_PANELS_TIMEOUT) {
                     clearInterval(checkInterval);
                     console.error(`Mapa de Atendimento: Timed out waiting for panels or container.`);
                     updateChartAndTotal({}, 0);
                 }
             }
         }, INITIAL_LOAD_CHECK_INTERVAL);
    }

    function waitForChartAndDOM() {
        if (typeof Chart !== 'undefined' && typeof ChartDataLabels !== 'undefined') {
            let timeWaited = 0;
            const checkInterval = setInterval(() => {
                 const container = document.querySelector(PANEL_CONTAINER_SELECTOR);
                 if (container) {
                     clearInterval(checkInterval);
                     initializeScript();
                 } else {
                     timeWaited += INITIAL_LOAD_CHECK_INTERVAL;
                     if (timeWaited >= WAIT_FOR_PANELS_TIMEOUT) {
                         clearInterval(checkInterval);
                         console.error(`Mapa de Atendimento: Timed out waiting for container.`);
                     }
                 }
             }, INITIAL_LOAD_CHECK_INTERVAL);
        } else {
            setTimeout(waitForChartAndDOM, 100);
        }
    }

    function handleLoadOrHashChange() {
         setTimeout(() => {
             waitForChartAndDOM();
         }, 500);
    }

    if (document.readyState === "complete" || document.readyState === "interactive") {
        handleLoadOrHashChange();
    } else {
        window.addEventListener('load', handleLoadOrHashChange, { once: true });
    }
    window.addEventListener('hashchange', handleLoadOrHashChange);

})();