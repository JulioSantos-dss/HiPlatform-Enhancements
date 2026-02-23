// ==UserScript==
// @name         Hi - Gestão de Filas
// @namespace    http://tampermonkey.net/
// @version      2.0
// @description  Script desenvolvido com intenção de otimizar a gestão de filas
// @author       Julio Santos feat. AI
// @match        https://www5.directtalk.com.br/static/beta/admin/main.html*
// @grant        none
// @downloadURL  https://raw.githubusercontent.com/JulioSantos-dss/HiPlatform-Enhancements/main/Hi%20-%20Gest%C3%A3o%20de%20Filas.user.js
// @updateURL    https://raw.githubusercontent.com/JulioSantos-dss/HiPlatform-Enhancements/main/Hi%20-%20Gest%C3%A3o%20de%20Filas.user.js
// ==/UserScript==

(function() {
    'use strict';

    // Variável global para armazenar o nome do agente clicado
    let clickedAgentName = '';

    // Intercepta o clique no botão que abre o modal para capturar o nome do agente
    document.addEventListener('click', function(e) {
        // Verifica se o elemento clicado (ou seu elemento pai) é o botão de abrir o modal
        const btn = e.target.closest('button[ng-click^="openModal"]');
        if (btn) {
            // Procura a linha correspondente (TR) ou a célula (TD) onde o botão está
            const container = btn.closest('td') || btn.closest('tr');
            if (container) {
                // Captura o texto do link com a classe cursor-pointer (que contém o nome do agente)
                const nameLink = container.querySelector('a.cursor-pointer');
                if (nameLink) {
                    clickedAgentName = nameLink.textContent.trim();
                }
            }
        }
    }, true); // Usamos true (capture phase) para garantir que capturamos antes de o Angular abrir o modal

    // Lista de prioridade e ordem visual das categorias na tela
    const categoriesOrder = [
        'SAC', 'Help', 'Retenção', 'Suporte N3', 'Casos Críticos', 'Agendamento',
        'Escritório', 'Cobrança', 'Churn Safra', 'Refidelização', 'Vendas',
        'COPE Distribuição', 'COPE', 'Loja', 'Cadastro', 'Bot', 'Inativo', 'Outros'
    ];

    // Dicionário de mapeamento das strings
    const categoryKeywords = {
        'SAC': [
            'Cabonnet - Chat SAC', 'Cabonnet GoodU - Chat SAC', 'Cabonnet Adamantina - Chat Whatsapp SAC',
            'Cabonnet Assis - Chat Whatsapp SAC', 'Cabonnet Bastos - Chat Whatsapp SAC', 'Cabonnet Caçapava - Chat Whatsapp SAC',
            'Cabonnet Lins - Chat Whatsapp SAC', 'Cabonnet Ourinhos - Chat Whatsapp SAC', 'Cabonnet Penápolis - Chat Whatsapp SAC',
            'Cabonnet Pindamonhangaba - Chat Whatsapp SAC', 'Cabonnet Prudente - Chat Whatsapp SAC', 'Cabonnet Santa Cruz - Chat WhatsApp SAC',
            'Cabonnet Taubaté - Chat WhatsApp SAC', 'Cabonnet - Chat Messenger', 'Chat WhatsApp Falha API', 'Cabonnet Tupã - Chat Whatsapp SAC'
        ],
        'Help': [
            'Cabonnet - Chat Help', 'Cabonnet GoodU - Chat Help', 'Cabonnet Adamantina - Chat Whatsapp Help',
            'Cabonnet Assis - Chat Whatsapp Help', 'Cabonnet Bastos - Chat Whatsapp Help', 'Cabonnet Caçapava - Chat Whatsapp Help',
            'Cabonnet Lins - Chat Whatsapp Help', 'Cabonnet Ourinhos - Chat Whatsapp Help', 'Cabonnet Penápolis - Chat Whatsapp Help',
            'Cabonnet Pindamonhangaba - Chat Whatsapp Help', 'Cabonnet Prudente - Chat Whatsapp Help', 'Cabonnet Santa Cruz - Chat WhatsApp HELP',
            'Cabonnet Taubaté - Chat WhatsApp Help', 'Cabonnet Tupã - Chat Whatsapp Help'
        ],
        'Vendas': [
            'Cabonnet Taubaté - Chat WhatsApp Vendas', 'Cabonnet Assis - Chat Whatsapp Vendas', 'Cabonnet Adamantina - Chat Whatsapp Vendas',
            'Cabonnet Pindamonhangaba - Chat Whatsapp Vendas', 'Cabonnet Tupã - Chat Whatsapp Vendas', 'Cabonnet Prudente - Chat Whatsapp Vendas',
            'Cabonnet - Chat Vendas', 'Cabonnet Penápolis - Chat Whatsapp Vendas', 'Cabonnet Caçapava - Chat Whatsapp Vendas',
            'Cabonnet Lins - Chat Whatsapp Vendas', 'Cabonnet Santa Cruz - Chat WhatsApp Vendas', 'Cabonnet Ourinhos - Chat Whatsapp Vendas',
            'Cabonnet Bastos - Chat Whatsapp Vendas'
        ],
        'Inativo': [
            'GoodU Adamantina', 'GoodU Florida Paulista', 'GoodU Inúbia Paulista', 'GoodU Lucélia', 'GoodU Osvaldo Cruz',
            'Cabonnet Premium', 'Tera', 'Cmnet', 'CMNet', 'Lins Fibra', 'Fibra Fast', 'Chat SAC', 'Chat Help',
            'Cabonnet Vale - Chat Whatsapp Churn', 'Chat Vendas',
            'Tera - Chat WhatsApp Churn Safra', 'Cmnet - Chat WhatsApp Churn Safra',
            'Tera - Chat WhatsApp Cobrança', 'Cmnet - Chat WhatsApp Cobrança'
        ],
        'Cadastro': ['Cadastro'],
        'Casos Críticos': ['Casos Críticos'],
        'Refidelização': ['Refidelização'],
        'Suporte N3': ['Suporte N3'],
        'Agendamento': ['Agendamento'],
        'Churn Safra': ['Churn Safra'],
        'Cobrança': ['Cobrança', 'Financeiro - Chat Whatsapp'],
        'Escritório': ['Escritório'],
        'Loja': ['Loja'],
        'Retenção': ['Retenção', 'Retencao'],
        'COPE Distribuição': ['COPE Distribuição'],
        'COPE': ['COPE'],
        'Bot': ['Bot']
    };

    /**
     * Define a qual categoria o departamento pertence baseado no nome
     */
    function getCategory(text) {
        text = text.toLowerCase();

        // 0. Checa correspondência EXATA primeiro (Prioridade Absoluta).
        for (const cat of categoriesOrder) {
            const keywords = categoryKeywords[cat] || [];
            for (const kw of keywords) {
                if (text === kw.toLowerCase()) {
                    return cat;
                }
            }
        }

        // 1. Checa a categoria Inativo usando correspondência parcial (Prioridade Máxima Parcial).
        const inativoKeywords = categoryKeywords['Inativo'] || [];
        for (const kw of inativoKeywords) {
            if (text.includes(kw.toLowerCase())) {
                return 'Inativo';
            }
        }

        // 2. Itera na ordem normal para correspondências parciais do restante das categorias
        for (const cat of categoriesOrder) {
            if (cat === 'Inativo') continue; // Pula Inativo pois já checamos

            const keywords = categoryKeywords[cat] || [];
            for (const kw of keywords) {
                if (text.includes(kw.toLowerCase())) {
                    return cat;
                }
            }
        }
        return 'Outros';
    }

    /**
     * Executa a manipulação DOM para reordenar de forma visual e criar os cabeçalhos
     */
    function reorganizeDOM(container, checkboxes) {
        // Altera o modal para ocupar mais espaço na tela e mostrar tudo de uma vez
        const modalDialog = container.closest('.modal-dialog');
        if (modalDialog) {
            modalDialog.style.width = '95vw';
            modalDialog.style.maxWidth = '1600px';
        }

        // Marca de forma definitiva esse container
        container.dataset.gridContainer = "true";

        // Transforma o container original em um Grid flexível e ajusta para ocupar espaço no flexbox
        container.style.flexGrow = '1';     // Expande para preencher todo o meio da tela, empurrando o rodapé pro fim
        container.style.maxHeight = 'none'; // Flexbox controla agora
        container.style.overflowY = 'auto'; // Mantém rolagem se a grid transbordar internamente
        container.style.display = 'grid';
        container.style.gridTemplateColumns = 'repeat(auto-fit, minmax(320px, 1fr))';
        container.style.gap = '15px';
        container.style.alignItems = 'start'; // Evita que cards estiquem verticalmente
        container.style.padding = '10px';

        const groups = {};
        categoriesOrder.forEach(cat => groups[cat] = []);

        checkboxes.forEach(cb => {
            const labelText = cb.textContent.trim();
            const cat = getCategory(labelText);
            groups[cat].push(cb);
        });

        const fragment = document.createDocumentFragment();

        categoriesOrder.forEach(cat => {
            if (groups[cat].length > 0) {
                // Cria um container simulando um "Card" para cada categoria
                const groupContainer = document.createElement('div');
                groupContainer.className = 'category-group';
                groupContainer.style.cssText = `
                    background: #fdfdfd;
                    border: 1px solid #ddd;
                    border-radius: 6px;
                    padding: 10px;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.05);
                `;

                // Cabeçalho
                const header = document.createElement('div');
                header.className = 'category-group-header';
                header.style.cssText = `
                    background: #e9ecef;
                    padding: 8px 10px;
                    margin-bottom: 10px;
                    border-radius: 4px;
                    color: #333;
                    border-left: 4px solid #007bff;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                `;

                // Título
                const titleSpan = document.createElement('span');
                titleSpan.style.cssText = 'cursor: pointer; font-weight: bold; text-transform: uppercase; flex-grow: 1; user-select: none; font-size: 14px;';
                titleSpan.innerHTML = `▼ ${cat}`;

                // Botão de alternar
                const toggleAllBtn = document.createElement('button');
                toggleAllBtn.textContent = 'Marcar Todos';
                toggleAllBtn.type = 'button';
                toggleAllBtn.style.cssText = `
                    background: #007bff;
                    color: white;
                    border: none;
                    border-radius: 3px;
                    padding: 4px 8px;
                    font-size: 11px;
                    cursor: pointer;
                    margin-left: 10px;
                    transition: background 0.2s;
                `;
                toggleAllBtn.onmouseover = () => toggleAllBtn.style.background = '#0056b3';
                toggleAllBtn.onmouseout = () => toggleAllBtn.style.background = '#007bff';

                header.appendChild(titleSpan);
                header.appendChild(toggleAllBtn);

                // Container interno de checkboxes
                const contentWrapper = document.createElement('div');
                contentWrapper.className = 'category-content';

                // Função para atualizar os contadores e textos dinamicamente
                const updateState = () => {
                    const inputs = contentWrapper.querySelectorAll('input[type="checkbox"]');
                    const total = inputs.length;
                    const checkedCount = Array.from(inputs).filter(i => i.checked).length;
                    const isHidden = contentWrapper.style.display === 'none';

                    // Atualiza o título com o contador
                    titleSpan.innerHTML = `${isHidden ? '▼' : '▶'} ${cat} <span style="font-size: 11px; color: #666; margin-left: 5px;">(${checkedCount}/${total})</span>`;

                    // Altera o texto do botão inteligente
                    const anyUnchecked = Array.from(inputs).some(input => !input.checked && !input.disabled);
                    toggleAllBtn.textContent = anyUnchecked ? 'Marcar Todos' : 'Desmarcar Todos';
                };

                groups[cat].forEach(cb => {
                    // Remove classes do bootstrap que forçavam a quebra indesejada no grid
                    cb.classList.remove('col-sm-12');
                    cb.style.paddingLeft = '5px';
                    cb.style.marginBottom = '5px';
                    contentWrapper.appendChild(cb);

                    // Atualiza o contador quando a checkbox for clicada individualmente
                    const input = cb.querySelector('input[type="checkbox"]');
                    if (input) {
                        input.addEventListener('change', () => setTimeout(updateState, 10));
                    }
                });

                // Lógica de Recolher/Expandir
                titleSpan.addEventListener('click', () => {
                    const isHidden = contentWrapper.style.display === 'none';
                    contentWrapper.style.display = isHidden ? 'block' : 'none';
                    updateState();
                });

                // Lógica de Alternar Todos
                toggleAllBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    const inputs = contentWrapper.querySelectorAll('input[type="checkbox"]');

                    const anyUnchecked = Array.from(inputs).some(input => !input.checked && !input.disabled);

                    inputs.forEach(input => {
                        if (!input.disabled) {
                            if (anyUnchecked && !input.checked) {
                                input.click();
                            } else if (!anyUnchecked && input.checked) {
                                input.click();
                            }
                        }
                    });
                    updateState();
                });

                // Dispara o estado inicial
                updateState();

                groupContainer.appendChild(header);
                groupContainer.appendChild(contentWrapper);
                fragment.appendChild(groupContainer);
            }
        });

        container.appendChild(fragment);
    }

    /**
     * Observador de mutação
     */
    const observer = new MutationObserver(() => {
        const legends = document.querySelectorAll('legend');
        for (let legend of legends) {
            // Usamos startsWith pois o texto será alterado e não queremos perder a referência
            if (legend.textContent.trim().startsWith('Troca de departamento')) {
                const form = legend.closest('form');
                if (form) {

                    // --- Transforma o formulário em Flexbox para garantir Topo e Rodapé fixos na tela ---
                    if (!form.dataset.flexEnhanced) {
                        form.style.display = 'flex';
                        form.style.flexDirection = 'column';
                        form.style.height = '80vh'; // Define uma altura global ocupando 80% da tela
                        form.dataset.flexEnhanced = "true";

                        // Oculta a barra de rolagem externa da página/modal para focar apenas na lista interna
                        const modalBody = form.closest('.modal-body');
                        if (modalBody) {
                            modalBody.style.overflow = 'hidden';
                            modalBody.style.paddingBottom = '0'; // Dá mais espaço e cola o rodapé no fim
                        }
                    }

                    // Altera o título sempre que o nome atual não corresponder ao nome recém-clicado
                    const expectedTitle = `Troca de departamento - ${clickedAgentName}`;
                    if (clickedAgentName && legend.textContent.trim() !== expectedTitle) {
                        legend.textContent = expectedTitle;
                    }

                    // --- ADIÇÃO DA BARRA DE BUSCA E BOTÃO DE FECHAR (X) ---
                    if (!legend.dataset.enhanced) {
                        const headerContainer = legend.parentElement;

                        // Transforma o container original da tag legend num item Fixo no topo do Flexbox
                        headerContainer.style.display = 'flex';
                        headerContainer.style.justifyContent = 'space-between';
                        headerContainer.style.alignItems = 'center';
                        headerContainer.style.borderBottom = '1px solid #e5e5e5';
                        headerContainer.style.padding = '10px 0';
                        headerContainer.style.flexShrink = '0'; // Impede o cabeçalho de encolher
                        headerContainer.style.backgroundColor = '#fff';

                        // Ajustes no Legend para caber na mesma linha
                        legend.style.borderBottom = 'none';
                        legend.style.margin = '0';
                        legend.style.width = 'auto';

                        // Container lado-a-lado para o input e botão
                        const controlsDiv = document.createElement('div');
                        controlsDiv.style.display = 'flex';
                        controlsDiv.style.alignItems = 'center';
                        controlsDiv.style.gap = '15px';

                        // Botão Global de Recolher/Expandir Tudo
                        const globalToggleBtn = document.createElement('button');
                        globalToggleBtn.type = 'button';
                        globalToggleBtn.textContent = 'Recolher Tudo';
                        globalToggleBtn.style.cssText = `
                            background: #6c757d;
                            color: white;
                            border: none;
                            border-radius: 3px;
                            padding: 6px 12px;
                            font-size: 12px;
                            cursor: pointer;
                            transition: background 0.2s;
                        `;
                        globalToggleBtn.onmouseover = () => globalToggleBtn.style.background = '#5a6268';
                        globalToggleBtn.onmouseout = () => globalToggleBtn.style.background = '#6c757d';

                        globalToggleBtn.onclick = () => {
                            const isCollapsing = globalToggleBtn.textContent === 'Recolher Tudo';
                            globalToggleBtn.textContent = isCollapsing ? 'Expandir Tudo' : 'Recolher Tudo';

                            const groups = form.querySelectorAll('.category-group');
                            groups.forEach(group => {
                                const titleSpan = group.querySelector('.category-group-header span');
                                const contentWrapper = group.querySelector('.category-content');
                                if (titleSpan && contentWrapper) {
                                    const isHidden = contentWrapper.style.display === 'none';
                                    if ((isCollapsing && !isHidden) || (!isCollapsing && isHidden)) {
                                        titleSpan.click(); // Alterna visualmente usando a lógica já existente
                                    }
                                }
                            });
                        };

                        // Input de Busca
                        const searchInput = document.createElement('input');
                        searchInput.type = 'text';
                        searchInput.id = 'cabonnet-dept-search';
                        searchInput.placeholder = 'Buscar departamento...';
                        searchInput.className = 'form-control'; // Classe nativa do painel para manter a estética
                        searchInput.style.width = '250px';
                        searchInput.style.height = '34px';

                        // Botão de Fechar
                        const closeBtn = document.createElement('button');
                        closeBtn.type = 'button';
                        closeBtn.className = 'close';
                        closeBtn.innerHTML = '&times;';
                        closeBtn.style.fontSize = '28px';
                        closeBtn.style.marginTop = '-5px';
                        closeBtn.title = 'Fechar modal';
                        closeBtn.onclick = () => {
                            // Clica programaticamente no botão real de Cancelar do Angular para fechar em segurança
                            const cancelBtn = document.getElementById('dt-modal-confirm-cancel');
                            if (cancelBtn) cancelBtn.click();
                        };

                        // Lógica de filtro da Busca
                        searchInput.addEventListener('input', (e) => {
                            const term = e.target.value.toLowerCase();

                            const categoryGroups = form.querySelectorAll('.category-group');
                            categoryGroups.forEach(group => {
                                let hasVisibleItems = false;
                                const items = group.querySelectorAll('.checkbox'); // Pega todos os departamentos deste grupo

                                items.forEach(item => {
                                    const text = item.textContent.toLowerCase();
                                    if (text.includes(term)) {
                                        item.style.display = ''; // Exibe
                                        hasVisibleItems = true;
                                    } else {
                                        item.style.display = 'none'; // Esconde
                                    }
                                });

                                // Se não houver itens visíveis na categoria, esconde o card todo
                                group.style.display = hasVisibleItems ? 'block' : 'none';
                            });
                        });

                        controlsDiv.appendChild(globalToggleBtn);
                        controlsDiv.appendChild(searchInput);
                        controlsDiv.appendChild(closeBtn);
                        headerContainer.appendChild(controlsDiv);

                        // Marca que o Header já possui os controles para não duplicá-los no futuro
                        legend.dataset.enhanced = "true";
                    }

                    // --- ADIÇÃO DO RODAPÉ FIXO ---
                    const footer = form.querySelector('.modal-footer');
                    if (footer && !footer.dataset.enhanced) {
                        footer.style.flexShrink = '0'; // Garante que o rodapé fica cravado no final da coluna
                        footer.style.backgroundColor = '#fff';
                        footer.style.borderTop = '1px solid #e5e5e5';
                        footer.style.padding = '15px';
                        footer.style.margin = '0';

                        footer.dataset.enhanced = "true";
                    }

                    // Busca o container da grade (pela marcação anterior ou caindo para a original do Angular)
                    let container = form.querySelector('[data-grid-container="true"]');
                    if (!container) {
                        const containers = form.querySelectorAll('div[style*="max-height"]');
                        container = Array.from(containers).find(el => el.style.overflowY === 'auto' || el.style.maxHeight);
                    }

                    if (container) {
                        // Busca checkboxes que AINDA NÃO estão dentro de um grupo nosso
                        const unorganizedCheckboxes = Array.from(container.querySelectorAll('.checkbox')).filter(cb => !cb.closest('.category-group'));

                        // Se encontrou checkboxes soltos, significa que o Angular acabou de renderizá-los
                        if (unorganizedCheckboxes.length > 0) {
                            // Limpa os grupos antigos (e os checkboxes zumbis dentro deles) da última abertura
                            container.querySelectorAll('.category-group').forEach(el => el.remove());

                            // Reorganiza utilizando apenas os checkboxes mais recentes
                            reorganizeDOM(container, unorganizedCheckboxes);

                            // Se houver algum texto pendente na Busca, aciona ela para os itens recém-renderizados!
                            const searchInput = document.getElementById('cabonnet-dept-search');
                            if (searchInput && searchInput.value) {
                                searchInput.dispatchEvent(new Event('input'));
                            }

                            // Auto-Focus: Dá foco imediato na barra de busca para digitação rápida sem precisar usar o mouse
                            setTimeout(() => {
                                if (searchInput) searchInput.focus();
                            }, 50);
                        }
                    }
                }
            }
        }
    });

    observer.observe(document.body, { childList: true, subtree: true });

})();
