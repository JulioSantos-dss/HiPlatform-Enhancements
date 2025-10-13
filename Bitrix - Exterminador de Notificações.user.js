// ==UserScript==
// @name         Bitrix - Exterminador de Notificações
// @namespace    http://tampermonkey.net/
// @version      0.7
// @description  Shows a "Dismiss All" icon on a notification when you hover over it.
// @author       Julio Santos feat. AI
// @match        https://cabonnet.bitrix24.com.br/*
// @grant        GM_addStyle
// @downloadURL  https://raw.githubusercontent.com/JulioSantos-dss/HiPlatform-Enhancements/main/Bitrix%20-%20Exterminador%20de%20Notifica%C3%A7%C3%B5es.user.js
// @updateURL    https://raw.githubusercontent.com/JulioSantos-dss/HiPlatform-Enhancements/main/Bitrix%20-%20Exterminador%20de%20Notifica%C3%A7%C3%B5es.user.js
// ==/UserScript==

(function() {
    'use strict';

    const BUTTON_ID = 'custom-dismiss-all-icon-btn';

    // Function to hide all notification balloons
    function dismissAllNotifications() {
        const notifications = document.querySelectorAll('.ui-notification-manager-browser-balloon');
        notifications.forEach(notification => {
            notification.style.display = 'none';
        });
    }

    // Function to add the "Dismiss All" icon button to a notification
    function addDismissButton(notification) {
        // Don't add a button if one already exists
        if (notification.querySelector(`#${BUTTON_ID}`)) {
            return;
        }

        const btn = document.createElement('div');
        btn.id = BUTTON_ID;
        btn.title = 'Suprimir todas notificações';

        // Set the inner HTML to the bell-slash SVG icon
        btn.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                <path d="M18 16.5l-2.79-2.79a2 2 0 0 1 .15-3.16A6.01 6.01 0 0 0 18 11V9a6 6 0 0 0-6-6 6 6 0 0 0-4.36 1.64L4.22 2.22 2.81 3.63l18.36 18.36 1.41-1.41L18 16.5zM6 11v5l-2 2v1h10.37l-2-2H6zM12 22a2 2 0 0 0 2-2h-4a2 2 0 0 0 2 2z"/>
            </svg>
        `;

        // Attach the click event to the dismiss-all function
        btn.addEventListener('click', (e) => {
            e.stopPropagation(); // Prevent the notification's own click event from firing
            dismissAllNotifications();
        });

        notification.appendChild(btn);
    }

    // Function to remove the button
    function removeDismissButton(notification) {
        const btn = notification.querySelector(`#${BUTTON_ID}`);
        if (btn) {
            btn.remove();
        }
    }

    // This function sets up the hover listeners on a notification element
    function setupNotification(notification) {
        notification.addEventListener('mouseenter', () => addDismissButton(notification));
        notification.addEventListener('mouseleave', () => removeDismissButton(notification));
    }

    // Use a MutationObserver to detect when new notifications are added to the page
    const observer = new MutationObserver((mutationsList) => {
        for (const mutation of mutationsList) {
            if (mutation.type === 'childList') {
                mutation.addedNodes.forEach(node => {
                    if (node.nodeType === 1 && node.classList.contains('ui-notification-manager-browser-balloon')) {
                        setupNotification(node);
                    } else if (node.nodeType === 1) {
                        const notifications = node.querySelectorAll('.ui-notification-manager-browser-balloon');
                        notifications.forEach(setupNotification);
                    }
                });
            }
        }
    });

    // Start observing the entire document for changes
    observer.observe(document.body, { childList: true, subtree: true });

    // Add the CSS styles for our new icon button
    GM_addStyle(`
        #${BUTTON_ID} {
            position: absolute;
            top: 6px;
            right: 32px; /* Position it to the left of the original 'x' button */
            width: 22px;
            height: 22px;
            background-color: rgba(0, 0, 0, 0.4);
            border-radius: 50%; /* Make it a circle */
            cursor: pointer;
            z-index: 2000;
            transition: background-color 0.2s;

            /* Use flexbox to center the SVG icon inside */
            display: flex;
            align-items: center;
            justify-content: center;
        }

        #${BUTTON_ID}:hover {
            background-color: rgba(0, 0, 0, 0.6);
        }

        /* Style the SVG icon itself */
        #${BUTTON_ID} svg {
            width: 14px;
            height: 14px;
            fill: white;
        }
    `);
})();
