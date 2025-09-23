// ==UserScript==
// @name         Hi - Gestão de Filas
// @namespace    http://tampermonkey.net/
// @version      1.5
// @description  Script desenvolvido com intenção de otimizar a gestão de filas
// @author       Julio Santos feat. AI
// @match        https://www5.directtalk.com.br/static/beta/admin/main.html*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    let buttonsCreated = false;
    let sacChecked = false;
    let helpChecked = false;
    let selectAllButtonState = 'purple';

    const buttonIds = {
        sac: 'toggle-sac-button',
        help: 'toggle-help-button'
    };

    const exceptions = [
        'cabonnet - chat messenger',
        'fibra fast - chat whatsapp help',
        'fibra fast - chat whatsapp sac',
        'cmnet - chat whatsapp help',
        'cmnet - chat whatsapp sac',
        'cabonnet goodu adamantina - chat whatsapp help',
        'cabonnet goodu adamantina - chat whatsapp sac',
        'cabonnet goodu florida paulista - chat whatsapp help',
        'cabonnet goodu florida paulista - chat whatsapp sac',
        'cabonnet goodu inúbia paulista - chat whatsapp help',
        'cabonnet goodu inúbia paulista - chat whatsapp sac',
        'cabonnet goodu lucélia - chat whatsapp help',
        'cabonnet goodu lucélia - chat whatsapp sac',
        'cabonnet goodu osvaldo cruz - chat whatsapp help',
        'cabonnet goodu osvaldo cruz - chat whatsapp sac',
        'cabonnet premium - chat whatsapp help',
        'cabonnet premium - chat whatsapp sac',
        'cabonnet premium corp - chat whatsapp help',
        'cabonnet premium corp - chat whatsapp sac'
    ];

    const departments = [
        'Cabonnet - Chat Help',
        //'Cabonnet - Chat Messenger',
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
    ]

    function isModalVisible() {
        const modal = document.getElementById('edicaoAlert');
        return modal && modal.style.display === 'block';
    }

    function createDepartmentDropdown() {
        const dropdown = document.createElement('div');
        dropdown.id = 'department-dropdown';
        dropdown.style.position = 'fixed';
        dropdown.style.top = '96px';
        dropdown.style.left = '10px';
        dropdown.style.zIndex = '10000';
        dropdown.style.backgroundColor = '#fff';
        dropdown.style.border = '1px solid #ddd';
        dropdown.style.padding = '10px';
        dropdown.style.maxHeight = '700px';
        dropdown.style.display = 'none';
        dropdown.style.display = 'flex';
        dropdown.style.flexDirection = 'column';

        const checkboxContainer = document.createElement('div');
        checkboxContainer.style.overflowY = 'auto';
        checkboxContainer.style.maxHeight = '400px';
        checkboxContainer.style.marginBottom = '10px';

        departments.forEach((dept, index) => {
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.id = `dept-${index}`;
            checkbox.value = dept;
            checkbox.style.marginRight = '5px';

            const label = document.createElement('label');
            label.htmlFor = `dept-${index}`;
            label.textContent = dept;

            checkboxContainer.appendChild(checkbox);
            checkboxContainer.appendChild(label);
            checkboxContainer.appendChild(document.createElement('br'));
        });

        dropdown.appendChild(checkboxContainer);

        const buttonContainer = document.createElement('div');
        buttonContainer.style.display = 'flex';
        buttonContainer.style.flexDirection = 'column';
        buttonContainer.style.marginTop = 'auto';

        const topRowContainer = document.createElement('div');
        topRowContainer.style.display = 'flex';
        topRowContainer.style.justifyContent = 'space-between';
        topRowContainer.style.marginBottom = '10px';

        const selectAllButton = document.createElement('button');
        selectAllButton.textContent = 'Selecionar Todas';
        selectAllButton.onclick = selectAllDepartments;
        selectAllButton.style.transition = 'transform 0.1s';

        const deselectAllButton = document.createElement('button');
        deselectAllButton.textContent = 'Deselecionar Todas';
        deselectAllButton.onclick = deselectAllDepartments;
        deselectAllButton.style.transition = 'transform 0.1s';

        const invertSelectionButton = document.createElement('button');
        invertSelectionButton.textContent = 'Inverter Seleção';
        invertSelectionButton.onclick = invertDepartmentSelection;
        invertSelectionButton.style.transition = 'transform 0.1s';

        topRowContainer.appendChild(selectAllButton);
        topRowContainer.appendChild(deselectAllButton);
        topRowContainer.appendChild(invertSelectionButton);

        const saveButton = document.createElement('button');
        saveButton.textContent = 'Aplicar';
        saveButton.onclick = applyDepartmentSelection;
        saveButton.style.backgroundColor = '#007bff';
        saveButton.style.border = 'none';
        saveButton.style.color = '#fff';
        saveButton.style.width = '100%';
        saveButton.style.transition = 'transform 0.1s';
        saveButton.style.borderRadius = '5px';

        function addButtonEffect(button) {
            button.style.transition = 'transform 0.1s';
            button.addEventListener('mousedown', () => {
                button.style.transform = 'scale(0.95)';
            });
            button.addEventListener('mouseup', () => {
                button.style.transform = 'scale(1)';
            });
            button.addEventListener('mouseleave', () => {
                button.style.transform = 'scale(1)';
            });
        }

        addButtonEffect(selectAllButton);
        addButtonEffect(deselectAllButton);
        addButtonEffect(invertSelectionButton);
        addButtonEffect(saveButton);

        buttonContainer.appendChild(topRowContainer);
        buttonContainer.appendChild(saveButton);

        dropdown.appendChild(buttonContainer);

        document.body.appendChild(dropdown);
    }



function toggleDepartmentDropdown() {
    let dropdown = document.getElementById('department-dropdown');
    if (!dropdown) {
        createDepartmentDropdown();
        dropdown = document.getElementById('department-dropdown');
        dropdown.style.display = 'block';
    } else {
        dropdown.style.display = dropdown.style.display === 'none' ? 'block' : 'none';
    }
}

function addFilterInput() {
    const modalBody = document.querySelector('#edicaoAlert .modal-body');
    if (!modalBody || document.getElementById('hideDisabled')) return;

    const filterContainer = document.createElement('div');
    filterContainer.style.display = 'flex';
    filterContainer.style.flexDirection = 'column'; // Changed to column layout
    filterContainer.style.margin = '10px 0';

    const filterInput = document.createElement('input');
    filterInput.type = 'text';
    filterInput.placeholder = 'Procurar...';
    filterInput.style.width = '100%'; // Full width
    filterInput.style.padding = '5px';
    filterInput.style.marginBottom = '5px'; // Add space between input and checkbox

    const checkboxContainer = document.createElement('div');
    checkboxContainer.style.display = 'flex';
    checkboxContainer.style.alignItems = 'center';
    //checkboxContainer.style.justifyContent = 'center'; // Centers horizontally

    const hideDisabledCheckbox = document.createElement('input');
    hideDisabledCheckbox.type = 'checkbox';
    hideDisabledCheckbox.id = 'hideDisabled';
    hideDisabledCheckbox.checked = true;
    hideDisabledCheckbox.style.margin = '0'; // Reset margin
    hideDisabledCheckbox.style.marginRight = '8px'; // Adds space between checkbox and label
    hideDisabledCheckbox.style.marginLeft = '4px';

    const checkboxLabel = document.createElement('label');
    checkboxLabel.htmlFor = 'hideDisabled';
    checkboxLabel.textContent = 'Ocultar Bloqueados';
    checkboxLabel.style.marginLeft = '5px';
    checkboxLabel.style.userSelect = 'none';
    checkboxLabel.style.margin = '0'; // Reset margin
    checkboxLabel.style.display = 'flex';
    checkboxLabel.style.alignItems = 'center';


    checkboxContainer.appendChild(hideDisabledCheckbox);
    checkboxContainer.appendChild(checkboxLabel);
    filterContainer.appendChild(filterInput);
    filterContainer.appendChild(checkboxContainer);
    modalBody.insertBefore(filterContainer, modalBody.firstChild);

    // Add event listeners
    filterInput.addEventListener('input', () => filterDepartments(filterInput.value));
    hideDisabledCheckbox.addEventListener('change', () => filterDepartments(filterInput.value));

    // Initial filter
    setTimeout(() => filterDepartments(filterInput.value), 100);

    const departmentObserver = new MutationObserver((mutations, observer) => {
        const departments = document.querySelectorAll('#edicaoAlert .modal-body .checkbox');
        if (departments.length > 0) {
            filterDepartments.call(filterInput);
            observer.disconnect();
        }
    });

    departmentObserver.observe(modalBody, {
        childList: true,
        subtree: true
    });
}

function filterDepartments(filterValue = '') {
    const hideDisabled = document.getElementById('hideDisabled')?.checked;
    const departments = document.querySelectorAll('#edicaoAlert .modal-body .checkbox');

    departments.forEach(dept => {
        const deptName = dept.textContent.toLowerCase();
        const isDisabled = dept.classList.contains('checkbox-disabled');
        const matchesFilter = deptName.includes(filterValue.toLowerCase());

        if (hideDisabled && isDisabled) {
            dept.style.display = 'none';
        } else {
            dept.style.display = matchesFilter ? '' : 'none';
        }
    });
}

function adjustWindowPosition() {
    const modal = document.querySelector('#edicaoAlert');
    if (modal) {
        const currentTop = parseInt(window.getComputedStyle(modal).top);
        modal.style.top = (currentTop - 25) + 'px';
    }
}

function selectAllDepartments() {
    const checkboxes = document.querySelectorAll('#department-dropdown input[type="checkbox"]');
    checkboxes.forEach(checkbox => {
        checkbox.checked = true;
    });
}

function deselectAllDepartments() {
    const checkboxes = document.querySelectorAll('#department-dropdown input[type="checkbox"]');
    checkboxes.forEach(checkbox => {
        checkbox.checked = false;
    });
}

function invertDepartmentSelection() {
    const checkboxes = document.querySelectorAll('#department-dropdown input[type="checkbox"]');
    checkboxes.forEach(checkbox => {
        checkbox.checked = !checkbox.checked;
    });
}

function applyDepartmentSelection() {
    const selectedDepartments = Array.from(document.querySelectorAll('#department-dropdown input:checked'))
        .map(checkbox => checkbox.value);

    const labels = document.querySelectorAll('label');

    labels.forEach(label => {
        const checkbox = label.querySelector('input[type="checkbox"]');
        if (checkbox) {
            const labelText = label.textContent.trim();
            if (labelText !== "Cabonnet - Chat Messenger") {
                checkbox.checked = !selectedDepartments.some(dept => labelText.includes(dept));
                simulateCheckboxInteraction(checkbox);
            }
        }
    });

    //document.getElementById('department-dropdown').style.display = 'none';
}

    function isException(labelText) {
        const normalizedLabelText = labelText.toLowerCase();
        return exceptions.some(exception => normalizedLabelText.includes(exception));
    }

    function simulateCheckboxInteraction(checkbox) {
        const event = new Event('change', { bubbles: true });
        checkbox.dispatchEvent(event);

        checkbox.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
        checkbox.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
        checkbox.dispatchEvent(new MouseEvent('click', { bubbles: true }));

        // Get the department div
        const departmentDiv = checkbox.closest('.ng-scope');
        if (departmentDiv) {
            // Check if current state matches original state
            const isOriginalState = checkbox.checked === checkbox.defaultChecked;

            // Set or remove highlight based on state
            departmentDiv.style.backgroundColor = isOriginalState ? '' : '#FFB6C1';
        }
    }


    function toggleALLCheckboxes() {
        const labels = document.querySelectorAll('label');

        labels.forEach(label => {
            const checkbox = label.querySelector('input[type="checkbox"]');
            if (checkbox) {
                const labelText = label.textContent.trim().toLowerCase();

                if ((labelText.includes('chat whatsapp sac') || labelText.includes('cabonnet goodu - chat sac') || labelText.includes('cabonnet - chat sac') || labelText.includes('chat whatsapp falha api')) && !isException(labelText)) {
                    checkbox.checked = !sacChecked;
                    simulateCheckboxInteraction(checkbox);
                }

                if ((labelText.includes('chat whatsapp help') || labelText.includes('cabonnet - chat help') || (labelText.includes('cabonnet goodu - chat help'))) && !isException(labelText)) {
                    checkbox.checked = !helpChecked;
                    simulateCheckboxInteraction(checkbox);
                }
            }
        });

        helpChecked = !helpChecked;
        sacChecked = !sacChecked;
        console.log(sacChecked ? 'Todas selecionadas' : 'Todas desmarcadas');
    }

    function toggleSACCheckboxes() {
        const labels = document.querySelectorAll('label');

        labels.forEach(label => {
            const checkbox = label.querySelector('input[type="checkbox"]');
            if (checkbox) {
                const labelText = label.textContent.trim().toLowerCase();

                if ((labelText.includes('chat whatsapp sac') || labelText.includes('cabonnet goodu - chat sac')) && !isException(labelText)) {
                    checkbox.checked = !sacChecked;
                    simulateCheckboxInteraction(checkbox);
                }
            }
        });

        sacChecked = !sacChecked;
        console.log(sacChecked ? 'SAC selecionadas' : 'SAC desmarcadas');
    }

    function toggleHelpCheckboxes() {
        const labels = document.querySelectorAll('label');

        labels.forEach(label => {
            const checkbox = label.querySelector('input[type="checkbox"]');
            if (checkbox) {
                const labelText = label.textContent.trim().toLowerCase();

                if ((labelText.includes('chat whatsapp help') || labelText.includes('cabonnet goodu - chat help')) && !isException(labelText)) {
                    checkbox.checked = !helpChecked;
                    simulateCheckboxInteraction(checkbox);
                }
            }
        });

        helpChecked = !helpChecked;
        console.log(helpChecked ? 'Help selecionadas' : 'Help desmarcadas');
    }

    function createButton(id, text, onClickFunction, top, left, color) {
        const button = document.createElement('button');
        button.id = id;
        button.textContent = text;
        button.style.position = 'fixed';
        button.style.top = top;
        button.style.left = left;
        button.style.zIndex = '9999';
        button.style.backgroundColor = color;
        button.style.color = '#fff';
        button.style.border = 'none';
        button.style.padding = '10px 20px';
        button.style.fontSize = '14px';
        button.style.cursor = 'pointer';
        button.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.1)';
        button.style.pointerEvents = 'auto';
        button.style.width = '160px'; // Adjust this value as needed
        button.style.textAlign = 'center';
        button.style.whiteSpace = 'nowrap';
        button.style.overflow = 'hidden';
        button.style.textOverflow = 'ellipsis';
        button.style.transition = 'transform 0.1s';
        button.style.borderRadius = '5px';
        button.addEventListener('mousedown', () => {
            button.style.transform = 'scale(0.95)';
        });
        button.addEventListener('mouseup', () => {
            button.style.transform = 'scale(1)';
        });
        button.addEventListener('mouseleave', () => {
            button.style.transform = 'scale(1)';
        });

        button.onclick = onClickFunction;
        document.body.appendChild(button);
    }

    function addCheckboxListeners() {
        const checkboxes = document.querySelectorAll('#edicaoAlert .modal-body .checkbox input[type="checkbox"]');
        checkboxes.forEach(checkbox => {
            checkbox.addEventListener('change', function() {
                const departmentDiv = this.closest('.ng-scope');
                if (departmentDiv) {
                    const isOriginalState = this.checked === this.defaultChecked;
                    departmentDiv.style.backgroundColor = isOriginalState ? '' : '#fff3cd';
                }
            });
        });
    }


    function createButtons() {

        if (!isModalVisible()) return;

        if (!document.getElementById(buttonIds.all)) {
            createButton(
                buttonIds.all,
                'Selecionar Todas',
                function() {
                    toggleALLCheckboxes();
                    if (selectAllButtonState === 'purple') {
                        this.style.backgroundColor = '#dc3545'; // Red
                        selectAllButtonState = 'red';
                    } else {
                        this.style.backgroundColor = '#5814a6'; // Purple
                        selectAllButtonState = 'purple';
                    }
                },
                '10px', '10px', '#5814a6'
            );
        }

        if (!document.getElementById(buttonIds.sac)) {
            createButton(
                buttonIds.sac,
                'Selecionar SAC',
                function() {
                    toggleSACCheckboxes();
                    this.textContent = sacChecked ? 'Deselecionar SAC' : 'Selecionar SAC';
                },
                '10px', '172px', '#007bff'
            );
        }

        if (!document.getElementById(buttonIds.help)) {
            createButton(
                buttonIds.help,
                'Selecionar Help',
                function() {
                    toggleHelpCheckboxes();
                    this.textContent = helpChecked ? 'Deselecionar Help' : 'Selecionar Help';
                },
                '10px', '334px', '#28a745'
            );
        }

        if (!document.getElementById('department-selector')) {
            const dropdownButton = document.createElement('button');
            dropdownButton.id = 'department-selector';
            dropdownButton.textContent = 'Especificas';
            dropdownButton.style.position = 'fixed';
            dropdownButton.style.top = '55px';
            dropdownButton.style.left = '10px';
            dropdownButton.style.zIndex = '9999';
            dropdownButton.style.backgroundColor = '#ffc107';
            dropdownButton.style.color = '#000';
            dropdownButton.style.border = 'none';
            dropdownButton.style.padding = '10px 20px';
            dropdownButton.style.fontSize = '15px';
            dropdownButton.style.cursor = 'pointer';
            dropdownButton.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.1)';
            dropdownButton.style.pointerEvents = 'auto';
            dropdownButton.style.width = '160px'; // Adjust this value as needed
            dropdownButton.style.textAlign = 'center';
            dropdownButton.style.whiteSpace = 'nowrap';
            dropdownButton.style.overflow = 'hidden';
            dropdownButton.style.textOverflow = 'ellipsis';
            dropdownButton.style.transition = 'transform 0.1s';
            dropdownButton.addEventListener('mousedown', () => {
                dropdownButton.style.transform = 'scale(0.95)';
            });
            dropdownButton.addEventListener('mouseup', () => {
                dropdownButton.style.transform = 'scale(1)';
            });
            dropdownButton.addEventListener('mouseleave', () => {
                dropdownButton.style.transform = 'scale(1)';
            });

            dropdownButton.onclick = toggleDepartmentDropdown;
            document.body.appendChild(dropdownButton);
        }
    }

    // Cria os botões inicialmente
    createButtons();

    // Observador de Mutação para verificar mudanças no DOM
    const observer = new MutationObserver(mutations => {
        mutations.forEach(mutation => {
            if (mutation.addedNodes.length) {
                // Apenas recria os botões se necessário
                createButtons();
            }
        });
    });

    // Configura o observador para observar alterações no corpo do documento
    observer.observe(document.body, {
        childList: true,
        subtree: true
    });

    const modalObserver = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.type === 'attributes' && mutation.attributeName === 'style') {
                if (isModalVisible()) {
                    createButtons();
                    toggleDepartmentDropdown();
                    //addFilterInput()
                } else {
                    // Remove buttons when modal is hidden
                    removeButtons();
                }
            }
        });
    });
    const modal = document.getElementById('edicaoAlert');
    if (modal) {
        modalObserver.observe(modal, { attributes: true, attributeFilter: ['style'] });
    }

    function removeButtons() {
        const buttons = [
            document.getElementById(buttonIds.all),
            document.getElementById(buttonIds.sac),
            document.getElementById(buttonIds.help),
            document.getElementById('department-selector')
            //document.getElementById('department-dropdown')
        ];
        buttons.forEach(button => button && button.remove());

        document.getElementById('department-dropdown').style.display = 'none';
    }



function checkModalAndManageButtons() {
    const modal = document.getElementById('edicaoAlert');
    if (modal && modal.style.display === 'block' && !buttonsCreated) {
        createButtons();
        toggleDepartmentDropdown();
        addFilterInput();
        addCheckboxListeners();

        // Add department loading observer
        const departmentObserver = new MutationObserver((mutations, observer) => {
            const departments = document.querySelectorAll('#edicaoAlert .modal-body .checkbox');
            if (departments.length > 0) {
                filterDepartments.call(document.querySelector('#edicaoAlert .modal-body input[type="text"]'));

                // Add manual checkbox listeners
                departments.forEach(dept => {
                    const checkbox = dept.querySelector('input[type="checkbox"]');
                    if (checkbox && !checkbox.hasListener) {
                        checkbox.hasListener = true;
                        checkbox.addEventListener('change', function() {
                            const departmentDiv = this.closest('.ng-scope');
                            if (departmentDiv) {
                                const isOriginalState = this.checked === this.defaultChecked;
                                departmentDiv.style.backgroundColor = isOriginalState ? '' : '#FFB6C1';
                            }
                        });
                    }
                });

                observer.disconnect();
            }
        });


        departmentObserver.observe(modal, {
            childList: true,
            subtree: true
        });

        buttonsCreated = true;
    } else if ((!modal || modal.style.display === 'none') && buttonsCreated) {
        removeButtons();
        buttonsCreated = false;
    }
}

    const observert = new MutationObserver((mutations) => {
        for (let mutation of mutations) {
            if (mutation.type === 'childList') {
                const addedNodes = mutation.addedNodes;
                for (let node of addedNodes) {
                    if (node.id === 'edicaoAlert') {
                        //addFilterInput();
                        filterDepartments.call({value: ''}); // Initially hide disabled checkboxes
                        adjustWindowPosition();
                        observert.disconnect();
                        return;
                    }
                }
            }
        }
    });

    observert.observe(document.body, { childList: true, subtree: true });
    setInterval(checkModalAndManageButtons, 100);

})();