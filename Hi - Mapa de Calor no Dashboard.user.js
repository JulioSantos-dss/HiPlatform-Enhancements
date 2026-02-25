// ==UserScript==
// @name         Hi - Mapa de Calor no Dashboard
// @namespace    http://tampermonkey.net/
// @version      2.0
// @description  Substitui o painel de fila de espera pelo mapa de calor
// @match        https://www5.directtalk.com.br/static/beta/admin/main.html*
// @grant        GM_xmlhttpRequest
// @require      https://cdnjs.cloudflare.com/ajax/libs/Chart.js/3.7.0/chart.min.js
// @require      https://cdn.jsdelivr.net/npm/chartjs-plugin-datalabels@2.0.0
// @downloadURL  https://raw.githubusercontent.com/JulioSantos-dss/HiPlatform-Enhancements/main/Hi%20-%20Mapa%20de%20Calor%20no%20Dashboard.user.js
// @updateURL    https://raw.githubusercontent.com/JulioSantos-dss/HiPlatform-Enhancements/main/Hi%20-%20Mapa%20de%20Calor%20no%20Dashboard.user.js
// ==/UserScript==

/* global Chart, ChartDataLabels, GM_xmlhttpRequest */
Chart.register(ChartDataLabels);

(function() {
    'use strict';

    // CONFIGURATION
    const DATA_SOURCE_URL = 'https://www5.directtalk.com.br/admin/interactive/inter_home_userfila.asp';
    const TARGET_SELECTOR = "#dt-style-content > div.row.animate.ng-scope > div.container.ng-scope > div:nth-child(4) > div:nth-child(4)";
    const REFRESH_INTERVAL = 60000; // Auto refresh every 60 seconds
    const WORDS_TO_REMOVE = ['Cabonnet', 'WhatsApp', 'Whatsapp']; // Palavras que serão omitidas dos nomes das filas

    const FILTER_DEPARTMENTS = [
        'SAC', 'HELP', 'FALHA API', 'AGENDAMENTO', 'CASOS CRÍTICOS',
        'CHURN SAFRA', 'COBRANÇA', 'COPE', 'ESCRITÓRIO', 'N3',
        'REFIDELIZAÇÃO', 'RETENÇÃO', 'VENDAS', 'LOJA'
    ];

    let currentChart = null;
    let widgetContainer = null;
    let chartWrapper = null;
    let canvasElement = null;
    let totalDisplayElement = null;
    let breakdownDisplayElement = null; // NOVO: Elemento para mostrar o total por departamento
    let loadingElement = null;
    let lastUpdateElement = null;
    let isFetching = false;
    let refreshTimer = null; // Added to prevent duplicate intervals on SPA navigation
    let heatMapContainer = null; // Referência para o sincronismo de layout
    let filterPanelElement = null; // NOVO: Painel de filtros
    let lastRawData = {}; // NOVO: Armazena os dados brutos antes do filtro

    function waitForChartJS() {
        if (typeof Chart === 'undefined') {
            setTimeout(waitForChartJS, 100);
            return;
        }
        startObserving();
        checkAndInitialize(); // Check immediately in case it's already there
    }

    // NEW: MutationObserver to handle Single Page Application (SPA) navigation
    function startObserving() {
        const observer = new MutationObserver(() => {
            checkAndInitialize();
        });
        // Watch the entire body for changes (elements added/removed)
        observer.observe(document.body, { childList: true, subtree: true });
    }

    // NEW: Extracted check logic
    function checkAndInitialize() {
        const target = document.querySelector(TARGET_SELECTOR);
        if (target && target.getAttribute('data-heatmap-initialized') !== 'true') {
            initializeWidget(target);
        }
    }

    function getBarColor(value) {
        const red = Math.floor((value / 30) * 255);
        const green = Math.floor(((30 - value) / 30) * 255);
        return `rgba(${red}, ${green}, 0, 0.7)`;
    }

    // Normaliza strings para comparação (remove acentos e deixa maiúsculo)
    function normalizeStr(str) {
        return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase();
    }

    function syncLeftPanelHeight() {
        if (!heatMapContainer) return;
        const leftWrapper = heatMapContainer.previousElementSibling;

        if (leftWrapper && leftWrapper.classList.contains('col-sm-6')) {
            const leftCard = leftWrapper.querySelector('.dt-panel-card');
            if (leftCard) {
                // Aguarda o próximo frame de renderização para obter a altura correta
                requestAnimationFrame(() => {
                    const targetHeight = heatMapContainer.offsetHeight;

                    // Injeta as propriedades Flexbox com !important para sobrescrever o Bootstrap
                    leftCard.style.setProperty('min-height', targetHeight + 'px', 'important');
                    leftCard.style.setProperty('display', 'flex', 'important');
                    leftCard.style.setProperty('align-items', 'center', 'important');
                    leftCard.style.setProperty('flex-wrap', 'wrap', 'important');
                    leftCard.style.setProperty('align-content', 'center', 'important');
                    leftCard.style.setProperty('transition', 'min-height 0.3s ease', 'important');
                });
            }
        }
    }

    // Função para limpar os nomes removendo palavras indesejadas
    function cleanDepartmentName(name) {
        let cleaned = name;
        WORDS_TO_REMOVE.forEach(word => {
            const regex = new RegExp(word, 'gi'); // 'gi' garante que ignore maiúsculas/minúsculas
            cleaned = cleaned.replace(regex, '');
        });

        // Limpeza de hífens solitários e espaços extras que possam sobrar após a remoção
        cleaned = cleaned.replace(/^[-\s]+|[-\s]+$/g, ''); // Remove hífens e espaços do começo e do fim
        cleaned = cleaned.replace(/\s{2,}/g, ' ');         // Transforma múltiplos espaços em apenas um

        // Caso a limpeza remova tudo, retorna o nome original para não deixar em branco
        return cleaned.trim() || name.trim();
    }

    function initializeWidget(targetElement) {
        if (targetElement.getAttribute('data-heatmap-initialized') === 'true') return;
        targetElement.setAttribute('data-heatmap-initialized', 'true');
        heatMapContainer = targetElement;

        targetElement.innerHTML = '';
        targetElement.style.cssText = `
            background: #fff;
            border-radius: 4px;
            box-shadow: 0 1px 3px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.24);
            padding: 15px;
            height: 100%;
            min-height: 400px;
            display: flex;
            flex-direction: column;
            position: relative;
            top: 16px;
        `;

        // --- 1. Header ---
        const header = document.createElement('div');
        header.style.cssText = "display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; border-bottom: 1px solid #eee; padding-bottom: 10px; flex-shrink: 0;";

        const title = document.createElement('h4');
        title.textContent = 'Fila';
        title.style.margin = '0';
        title.style.color = '#333';

        const controls = document.createElement('div');

        // Refresh Button
        const refreshBtn = document.createElement('button');
        refreshBtn.innerHTML = '&#x21bb;'; // Refresh Icon
        refreshBtn.title = "Atualizar agora (Dados Reais)";
        refreshBtn.style.cssText = "background: none; border: 1px solid #ddd; border-radius: 4px; cursor: pointer; padding: 2px 8px; margin-right: 5px;";
        refreshBtn.addEventListener('click', () => { fetchAndAnalyze(true); });

        // Filter Button (Gear Icon)
        const filterBtn = document.createElement('button');
        filterBtn.innerHTML = '&#9881;'; // Ícone de engrenagem
        filterBtn.title = "Filtrar Departamentos";
        filterBtn.style.cssText = "background: none; border: 1px solid #ddd; border-radius: 4px; cursor: pointer; padding: 2px 8px; margin-right: 5px; font-size: 16px;";
        filterBtn.addEventListener('click', () => {
            const isHidden = filterPanelElement.style.display === 'none';
            filterPanelElement.style.display = isHidden ? 'block' : 'none';
            syncLeftPanelHeight();
        });

        // Simulate Button (Flask Icon)
        const simBtn = document.createElement('button');
        simBtn.innerHTML = '&#129514;';
        simBtn.title = "Simular Fila (Teste)";
        simBtn.style.cssText = "background: none; border: 1px solid #ddd; border-radius: 4px; cursor: pointer; padding: 2px 8px; margin-right: 5px; color: #d63384;";
        simBtn.addEventListener('click', simulateQueueData);

        // Copy Button
        const copyBtn = document.createElement('button');
        copyBtn.innerHTML = '&#128203;'; // Clipboard Icon
        copyBtn.title = "Copiar imagem";
        copyBtn.style.cssText = "background: none; border: 1px solid #ddd; border-radius: 4px; cursor: pointer; padding: 2px 8px;";
        copyBtn.addEventListener('click', copyChartToClipboard);

        controls.appendChild(refreshBtn);
        controls.appendChild(filterBtn);
        //controls.appendChild(simBtn);
        controls.appendChild(copyBtn);
        header.appendChild(title);
        header.appendChild(controls);
        targetElement.appendChild(header);

        // --- 1.5. Filter Panel ---
        filterPanelElement = document.createElement('div');
        filterPanelElement.style.cssText = "display: none; background: #f8f9fa; padding: 15px; border: 1px solid #dee2e6; border-radius: 4px; margin-bottom: 15px; flex-shrink: 0;";

        const filterTitle = document.createElement('div');
        filterTitle.innerHTML = "<strong style='color: #333;'>Filtrar Departamentos:</strong>";
        filterTitle.style.marginBottom = "10px";

        const filterButtons = document.createElement('div');
        filterButtons.style.marginBottom = "15px";

        const btnSelectAll = document.createElement('button');
        btnSelectAll.textContent = "Selecionar Todos";
        btnSelectAll.style.cssText = "background: #0d6efd; color: white; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer; margin-right: 10px; font-size: 12px; font-weight: bold;";

        const btnClearAll = document.createElement('button');
        btnClearAll.textContent = "Limpar Seleção";
        btnClearAll.style.cssText = "background: #0d6efd; color: white; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer; font-size: 12px; font-weight: bold;";

        filterButtons.appendChild(btnSelectAll);
        filterButtons.appendChild(btnClearAll);

        const filterGrid = document.createElement('div');
        filterGrid.style.cssText = "display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 10px;";

        let savedFilters = JSON.parse(localStorage.getItem('heatmap_filters')) || FILTER_DEPARTMENTS;

        FILTER_DEPARTMENTS.forEach(dep => {
            const label = document.createElement('label');
            label.style.cssText = "display: flex; align-items: center; cursor: pointer; font-size: 13px; color: #333; font-weight: 500;";

            const chk = document.createElement('input');
            chk.type = 'checkbox';
            chk.value = dep;
            chk.checked = savedFilters.includes(dep);
            chk.style.marginRight = "6px";
            chk.style.cursor = "pointer";
            chk.addEventListener('change', saveFiltersAndApply);

            label.appendChild(chk);
            label.appendChild(document.createTextNode(dep));
            filterGrid.appendChild(label);
        });

        btnSelectAll.addEventListener('click', () => {
            filterGrid.querySelectorAll('input[type="checkbox"]').forEach(c => c.checked = true);
            saveFiltersAndApply();
        });

        btnClearAll.addEventListener('click', () => {
            filterGrid.querySelectorAll('input[type="checkbox"]').forEach(c => c.checked = false);
            saveFiltersAndApply();
        });

        filterPanelElement.appendChild(filterTitle);
        filterPanelElement.appendChild(filterButtons);
        filterPanelElement.appendChild(filterGrid);
        targetElement.appendChild(filterPanelElement);

        // --- 2. Scrollable Container ---
        widgetContainer = document.createElement('div');
        widgetContainer.style.cssText = "flex-grow: 1; overflow-y: auto; overflow-x: hidden; position: relative; min-height: 0;";

        // Loading Msg
        loadingElement = document.createElement('div');
        loadingElement.textContent = "Carregando dados...";
        loadingElement.style.textAlign = "center";
        loadingElement.style.padding = "20px";
        loadingElement.style.color = "#666";

        // Chart Wrapper
        chartWrapper = document.createElement('div');
        chartWrapper.id = "heatmap-chart-wrapper";
        chartWrapper.style.position = "relative";
        chartWrapper.style.width = "100%";
        chartWrapper.style.display = "none";

        canvasElement = document.createElement('canvas');
        canvasElement.style.display = 'block';
        canvasElement.style.width = '100%';

        chartWrapper.appendChild(canvasElement);
        widgetContainer.appendChild(loadingElement);
        widgetContainer.appendChild(chartWrapper);
        targetElement.appendChild(widgetContainer);

        // --- 3. Footer ---
        const footer = document.createElement('div');
        footer.style.cssText = "margin-top: 10px; border-top: 1px solid #eee; padding-top: 10px; text-align: center; flex-shrink: 0;";

        breakdownDisplayElement = document.createElement('div');
        breakdownDisplayElement.style.cssText = "font-size: 13px; color: #444; margin-bottom: 12px; display: flex; flex-wrap: wrap; justify-content: center; gap: 8px; max-height: 80px; overflow-y: auto;";

        totalDisplayElement = document.createElement('div');
        totalDisplayElement.style.fontWeight = 'bold';
        totalDisplayElement.style.fontSize = '16px';

        lastUpdateElement = document.createElement('div');
        lastUpdateElement.style.fontSize = '11px';
        lastUpdateElement.style.color = '#999';

        footer.appendChild(breakdownDisplayElement);
        footer.appendChild(totalDisplayElement);
        footer.appendChild(lastUpdateElement);
        targetElement.appendChild(footer);

        // Clear any existing timer to avoid duplicates when re-initializing
        if (refreshTimer) clearInterval(refreshTimer);
        window.addEventListener('resize', syncLeftPanelHeight);

        fetchAndAnalyze(false);
        refreshTimer = setInterval(() => fetchAndAnalyze(false), REFRESH_INTERVAL);
        setTimeout(syncLeftPanelHeight, 100);
    }

    function saveFiltersAndApply() {
        if (!filterPanelElement) return;
        const checkboxes = filterPanelElement.querySelectorAll('input[type="checkbox"]');
        const activeFilters = Array.from(checkboxes).filter(c => c.checked).map(c => c.value);
        localStorage.setItem('heatmap_filters', JSON.stringify(activeFilters));
        applyFiltersAndUpdateChart();
    }

    function applyFiltersAndUpdateChart() {
        let savedFilters = JSON.parse(localStorage.getItem('heatmap_filters')) || FILTER_DEPARTMENTS;

        let filteredData = {};
        let total = 0;
        let breakdownText = [];

        for (const [deptName, count] of Object.entries(lastRawData)) {
            // Verifica se o departamento se enquadra em algum dos filtros selecionados (ignora acentos)
            const isMatch = savedFilters.some(filter =>
                normalizeStr(deptName).includes(normalizeStr(filter))
            );

            if (isMatch) {
                filteredData[deptName] = count;
                total += count;
                breakdownText.push(`${deptName}: ${count}`);
            }
        }

        const sortedDepartments = Object.fromEntries(
            Object.entries(filteredData).sort(([,a], [,b]) => b - a)
        );

        updateChart(sortedDepartments, total, breakdownText);
    }

    // --- SIMULATION LOGIC ---
    function simulateQueueData() {
        if(loadingElement) {
            loadingElement.style.display = 'block';
            loadingElement.textContent = "Gerando dados de teste...";
        }
        if(chartWrapper) chartWrapper.style.opacity = '0.3';

        setTimeout(() => {
            const totalCustomers = Math.floor(Math.random() * (150 - 20 + 1)) + 20;
            const allDepartments = [...FILTER_DEPARTMENTS]; // Usa os departamentos configurados no filtro

            let departments = {};
            let remainingCustomers = totalCustomers;
            let tempDepts = [...allDepartments];

            while (remainingCustomers > 0 && tempDepts.length > 0) {
                 const idx = Math.floor(Math.random() * tempDepts.length);

                 // Aplica a limpeza de nome também na simulação
                 const rawDept = tempDepts[idx];
                 const dept = cleanDepartmentName(rawDept);

                 const count = Math.floor(Math.random() * Math.min(20, remainingCustomers)) + 1;
                 departments[dept] = count;
                 remainingCustomers -= count;
                 tempDepts.splice(idx, 1);
            }

            lastRawData = departments;
            applyFiltersAndUpdateChart();
            lastUpdateElement.textContent = "Modo: Simulação (Teste)";

        }, 500);
    }

    function fetchAndAnalyze(isManual) {
        if (isFetching) return;
        isFetching = true;

        if (loadingElement) {
            loadingElement.style.display = 'block';
            loadingElement.textContent = isManual ? "Atualizando..." : "Carregando dados...";
            loadingElement.style.color = "#666";
        }
        if (chartWrapper) chartWrapper.style.opacity = '0.3';

        GM_xmlhttpRequest({
            method: 'GET',
            url: DATA_SOURCE_URL + '?t=' + new Date().getTime(),
            overrideMimeType: 'text/html; charset=iso-8859-1',
            onload: function(response) {
                try {
                    const parser = new DOMParser();
                    const doc = parser.parseFromString(response.responseText, 'text/html');
                    analyzeQueue(doc);
                } catch (e) {
                    console.error("Heatmap Parse Error:", e);
                    showError("Erro ao processar HTML");
                }
                isFetching = false;
            },
            onerror: function(err) {
                console.error("Heatmap Request Error:", err);
                showError("Erro de conexão (GM_XHR)");
                isFetching = false;
            }
        });
    }

    function showError(msg) {
        if (loadingElement) {
            loadingElement.textContent = msg;
            loadingElement.style.color = "red";
        }
    }

    function analyzeQueue(sourceDoc) {
        let departments = {};
        const rows = sourceDoc.querySelectorAll('tr');

        rows.forEach(row => {
            const cells = row.getElementsByTagName('td');
            if (cells.length === 2) {
                const labelCell = cells[0].textContent.trim();
                // Loose matching for "Departamento:"
                if (labelCell.indexOf('Departamento') !== -1) {
                    const rawDeptName = cells[1].textContent.trim();
                    const deptName = cleanDepartmentName(rawDeptName); // Aplica a limpeza de nome aqui

                    departments[deptName] = (departments[deptName] || 0) + 1;
                }
            }
        });

        lastRawData = departments;
        applyFiltersAndUpdateChart();
    }

    function updateChart(data, total, breakdownTextArr) {
        if (!canvasElement) return;

        loadingElement.style.display = 'none';
        chartWrapper.style.display = 'block';
        chartWrapper.style.opacity = '1';

        // Atualiza a exibição do Breakdown (SAC: 3, Help: 4...)
        breakdownDisplayElement.innerHTML = '';
        if (breakdownTextArr && breakdownTextArr.length > 0) {
            breakdownTextArr.forEach(text => {
                const badge = document.createElement('span');
                badge.style.cssText = "background: #e9ecef; padding: 4px 10px; border-radius: 12px; font-weight: 600; border: 1px solid #ced4da; white-space: nowrap;";
                badge.textContent = text;
                breakdownDisplayElement.appendChild(badge);
            });
        }

        totalDisplayElement.textContent = `Total na Fila: ${total}`;
        const now = new Date();
        lastUpdateElement.textContent = `Atualizado às: ${now.toLocaleTimeString()}`;

        // Handle Empty Queue
        if (Object.keys(data).length === 0) {
            if (currentChart) currentChart.destroy();
            canvasElement.style.display = 'none';
            loadingElement.style.display = 'block';
            loadingElement.textContent = "Fila Vazia";
            loadingElement.style.color = "#28a745";
            // Ensure wrapper has some height so it doesn't collapse
            chartWrapper.style.height = "50px";
            setTimeout(syncLeftPanelHeight, 50);
            return;
        }

        canvasElement.style.display = 'block';

        // Calculate height: 40px per row + 40px buffer
        const rowHeight = 40;
        const calculatedHeight = 40 + (Object.keys(data).length * rowHeight);

        chartWrapper.style.height = `${calculatedHeight}px`;

        if (currentChart) {
            currentChart.destroy();
        }

        const ctx = canvasElement.getContext('2d');
        currentChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: Object.keys(data),
                datasets: [{
                    label: 'Clientes',
                    data: Object.values(data),
                    backgroundColor: Object.values(data).map(value => getBarColor(value)),
                    borderColor: Object.values(data).map(value => getBarColor(value).replace('0.7', '1')),
                    borderWidth: 1,
                    borderRadius: 4,
                    barThickness: 24
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                indexAxis: 'y',
                animation: false,
                layout: { padding: { right: 40 } },
                scales: {
                    x: {
                        beginAtZero: true,
                        max: 30,
                        grid: { display: true },
                        ticks: { stepSize: 10 }
                    },
                    y: {
                        grid: { display: false },
                        ticks: {
                            font: { size: 12, weight: 'bold' },
                            color: '#333',
                            autoSkip: false
                        }
                    }
                },
                plugins: {
                    legend: { display: false },
                    tooltip: { enabled: false },
                    datalabels: {
                        anchor: 'end',
                        align: 'right',
                        offset: 6,
                        color: '#000',
                        font: { weight: 'bold', size: 13 },
                        formatter: (value) => value
                    }
                }
            }
        });

        // Sincroniza a altura do painel vizinho após o gráfico renderizar
        setTimeout(syncLeftPanelHeight, 50);
    }

    function copyChartToClipboard() {
        if(!currentChart) {
             alert("Nada para copiar.");
             return;
        }

        const tempCanvas = document.createElement('canvas');
        const w = 800;
        const h = chartWrapper.clientHeight + 100;

        tempCanvas.width = w;
        tempCanvas.height = h;

        const ctx = tempCanvas.getContext('2d');
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, w, h);

        ctx.font = 'bold 22px Arial';
        ctx.fillStyle = '#333';
        ctx.textAlign = 'center';
        ctx.fillText("Mapa de Calor - Fila", w/2, 40);

        try {
            ctx.drawImage(canvasElement, 20, 60, w - 40, chartWrapper.clientHeight);
        } catch(e) { }

        ctx.font = 'bold 20px Arial';
        ctx.fillStyle = '#000';
        ctx.fillText(totalDisplayElement.textContent, w/2, h - 30);

        tempCanvas.toBlob((blob) => {
            const item = new ClipboardItem({ "image/png": blob });
            navigator.clipboard.write([item]).then(() => {
                alert("Gráfico copiado!");
            });
        }, 'image/png', 1);
    }

    waitForChartJS();
})();
