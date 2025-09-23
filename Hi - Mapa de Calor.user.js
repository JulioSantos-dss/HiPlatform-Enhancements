// ==UserScript==
// @name         Hi - Mapa de Calor
// @namespace    http://tampermonkey.net/
// @version      0.9
// @description  Analyze and display department queue statistics
// @match        https://www5.directtalk.com.br/admin/interactive/inter_home_userfila.asp*
// @grant        GM_addStyle
// @require      https://cdnjs.cloudflare.com/ajax/libs/Chart.js/3.7.0/chart.min.js
// @require      https://cdn.jsdelivr.net/npm/chartjs-plugin-datalabels@2.0.0
// ==/UserScript==

/* global Chart, ChartDataLabels */
Chart.register(ChartDataLabels);

(function() {
    'use strict';

    function waitForChartJS() {
        if (typeof Chart === 'undefined') {
            setTimeout(waitForChartJS, 100);
            return;
        }
        initializeGraph();
    }

    function getBarColor(value) {
        const red = Math.floor((value / 30) * 255);
        const green = Math.floor(((30 - value) / 30) * 255);
        return `rgba(${red}, ${green}, 0, 0.7)`;
    }

    function initializeGraph() {
        const toggleButton = document.createElement('button');
        toggleButton.textContent = 'Mapa de Calor';
        toggleButton.style.cssText = 'position: fixed; top: 10px; right: 10px; padding: 8px 15px; background: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer; z-index: 10000;';

        const dashboard = document.createElement('div');
        dashboard.style.cssText = `position: fixed; top: 50px; right: 10px; background: white; padding: 10px; border: 1px solid #ccc; border-radius: 5px; z-index: 9999; width: 650px; height: 550; max-height: 80vh; box-shadow: 0 2px 4px rgba(0,0,0,0.2); overflow: auto; display: none;`;

        toggleButton.addEventListener('click', () => {
            dashboard.style.display = dashboard.style.display === 'none' ? 'block' : 'none';
            if (dashboard.style.display === 'block' && !dataAnalyzed) { // Analyze only if not analyzed before
                analyzeQueue();
                dataAnalyzed = true; // Set the flag to true after analyzing
            }
        });

        document.body.appendChild(toggleButton);

        const title = document.createElement('h3');
        title.textContent = 'Mapa de Calor';
        title.style.cssText = 'margin: 0 0 10px 0; text-align: center;';
        dashboard.appendChild(title);

        const copyButton = document.createElement('button');
        copyButton.textContent = 'Copiar para Área de Transferência';
        copyButton.style.cssText = 'margin: 0 0 10px 0; padding: 5px 10px; background: #28a745; color: white; border: none; border-radius: 4px; cursor: pointer;';

        copyButton.addEventListener('click', () => {
            const tempCanvas = document.createElement('canvas');
            tempCanvas.width = canvas.width * 1.5; // Double the width
            tempCanvas.height = canvas.height * 1.5 + 80; // Double the height + space for total
            const tempCtx = tempCanvas.getContext('2d');

            // Draw white background
            tempCtx.fillStyle = 'white';
            tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);

            // Draw the chart with scaling
            tempCtx.drawImage(canvas, 0, 0, tempCanvas.width, tempCanvas.height - 80);

            // Add total text (adjust position for the scaled canvas)
            tempCtx.font = 'bold 32px Arial'; // Larger font size
            tempCtx.fillStyle = 'black';
            tempCtx.textAlign = 'center';
            tempCtx.fillText(totalDisplay.textContent, tempCanvas.width / 2, tempCanvas.height - 40);

            tempCanvas.toBlob((blob) => {
                const item = new ClipboardItem({ "image/png": blob });
                navigator.clipboard.write([item]).then(() => {
                    const originalText = copyButton.textContent;
                    copyButton.textContent = 'Copiado!';
                    copyButton.style.background = '#218838';
                    setTimeout(() => {
                        copyButton.textContent = originalText;
                        copyButton.style.background = '#28a745';
                    }, 2000);
                });
            },'image/png', 1);
        });


        dashboard.appendChild(copyButton);

        const canvas = document.createElement('canvas');
        canvas.id = 'queueChart';
        dashboard.appendChild(canvas);

        const totalDisplay = document.createElement('div');
        totalDisplay.style.cssText = 'text-align: center; font-weight: bold; margin-top: 10px; font-size: 16px;';
        dashboard.appendChild(totalDisplay);

        document.body.appendChild(dashboard);

        let currentChart = null;
        let dataAnalyzed = false; // Flag to track if data has been analyzed


        function analyzeQueue() {
            let departments = {};

            const rows = document.querySelectorAll('tr');
            let queueIsEmpty = true;

            rows.forEach(row => {
                const cells = row.getElementsByTagName('td');
                if (cells.length === 2) {
                    const labelCell = cells[0].textContent.trim();
                    if (labelCell === 'Departamento:') {
                        const deptName = cells[1].textContent.trim();
                        departments[deptName] = (departments[deptName] || 0) + 1;
                        queueIsEmpty = false;
                    }
                }
            });

            if (queueIsEmpty) {
                //const totalCustomers = Math.floor(Math.random() * (15 + 1));
                const totalCustomers = Math.floor(Math.random() * (200 - 50 + 1)) + 50;

                const allDepartments = [
                    'Cabonnet - Chat Help',
                    'Cabonnet - Chat Messenger',
                    'Cabonnet - Chat SAC',
                    'Cabonnet Adamantina - Chat Whatsapp Help',
                    'Cabonnet Adamantina - Chat Whatsapp SAC',
                    'Cabonnet Assis - Chat Whatsapp Help',
                    'Cabonnet Assis - Chat Whatsapp SAC',
                    'Cabonnet Bastos - Chat Whatsapp Help',
                    'Cabonnet Bastos - Chat Whatsapp SAC',
                    'Cabonnet Caçapava - Chat Whatsapp Help',
                    'Cabonnet Caçapava - Chat Whatsapp SAC',
                    'Cabonnet GoodU - Chat Help',
                    'Cabonnet GoodU - Chat SAC',
                    'Cabonnet Lins - Chat Whatsapp Help',
                    'Cabonnet Lins - Chat Whatsapp SAC',
                    'Cabonnet Ourinhos - Chat Whatsapp Help',
                    'Cabonnet Ourinhos - Chat Whatsapp SAC',
                    'Cabonnet Penápolis - Chat Whatsapp Help',
                    'Cabonnet Penápolis - Chat Whatsapp SAC',
                    'Cabonnet Pindamonhangaba - Chat Whatsapp Help',
                    'Cabonnet Pindamonhangaba - Chat Whatsapp SAC',
                    'Cabonnet Prudente - Chat Whatsapp Help',
                    'Cabonnet Prudente - Chat Whatsapp SAC',
                    'Cabonnet Santa Cruz - Chat WhatsApp HELP',
                    'Cabonnet Santa Cruz - Chat WhatsApp SAC',
                    'Cabonnet Taubaté - Chat WhatsApp Help',
                    'Cabonnet Taubaté - Chat WhatsApp SAC',
                    'Cabonnet Tupã - Chat Whatsapp Help',
                    'Cabonnet Tupã - Chat Whatsapp SAC',
                    'Chat WhatsApp Falha API'
                ];

                departments = {};
                let remainingCustomers = totalCustomers;

                while (remainingCustomers > 0 && allDepartments.length > 0) {
                    const randomDeptIndex = Math.floor(Math.random() * allDepartments.length);
                    const department = allDepartments[randomDeptIndex];

                    const maxCustomers = Math.min(30, remainingCustomers);
                    const customersForDept = Math.floor(Math.random() * maxCustomers) + 1;

                    if (customersForDept > 0) {
                        departments[department] = customersForDept;
                    }

                    remainingCustomers -= customersForDept;
                    allDepartments.splice(randomDeptIndex, 1);
                }

                departments = Object.fromEntries(
                    Object.entries(departments).filter(([_, value]) => value > 0)
                );
            }

            const sortedEntries = Object.entries(departments)
                .sort(([,a], [,b]) => b - a);

            const sortedDepartments = Object.fromEntries(sortedEntries);

            const totalCustomers = Object.values(sortedDepartments).reduce((sum, count) => sum + count, 0);
            totalDisplay.textContent = `Total: ${totalCustomers}`;

            canvas.style.cssText = `width: 100%; height: ${22 + (Object.keys(departments).length * 22)}px; display: block;`;


            if (currentChart) {
                currentChart.destroy();
            }

            const ctx = canvas.getContext('2d');
            currentChart = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: Object.keys(sortedDepartments),
                    datasets: [{
                        label: 'Queue',
                        data: Object.values(sortedDepartments),
                        backgroundColor: Object.values(sortedDepartments).map(value => getBarColor(value)),
                        borderColor: Object.values(sortedDepartments).map(value => getBarColor(value).replace('0.7', '1')),
                        borderWidth: 2,
                        borderRadius: 5,
                        borderWidth: 0.7,
                        barThickness: 15
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
                            max: 33,
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
                    }
                  },
            });
        }

        //setTimeout(analyzeQueue, 1000);
        //setInterval(analyzeQueue, 1000);
    }

    waitForChartJS();
})();