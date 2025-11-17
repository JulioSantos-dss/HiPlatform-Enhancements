// ==UserScript==
// @name         Hi - Fila na Aba do Navegador
// @namespace    http://tampermonkey.net/
// @version      0.3
// @description  Shows the number of clients in the queue in the browser tab title using a specific selector.
// @author       Julio Santos feat. AI
// @match        https://www5.directtalk.com.br/static/beta/admin/main.html*
// @grant        none
// @downloadURL  https://raw.githubusercontent.com/JulioSantos-dss/HiPlatform-Enhancements/main/Hi%20-%20Fila%20na%20Aba%20do%20Navegador.user.js
// @updateURL    https://raw.githubusercontent.com/JulioSantos-dss/HiPlatform-Enhancements/main/Hi%20-%20Fila%20na%20Aba%20do%20Navegador.user.js
// ==/UserScript==

(function() {
    'use strict';

    // Store the original title of the page
    const originalTitle = document.title;
    // This is a selector for a higher-level container that is less likely to be replaced.
    // This one points to the orange bar containing the queue info.
    const stableParentSelector = "div.dt-chart-summary";

    function updateTabTitleWithQueueCount() {
        // First, find the stable parent container.
        const parentElement = document.querySelector(stableParentSelector);

        // If the parent container doesn't exist, do nothing and revert the title.
        if (!parentElement) {
            document.title = originalTitle;
            return;
        }

        // Now, look for the 'strong' element *inside* the parent container.
        // This is much more reliable.
        const queueElement = parentElement.querySelector("strong");

        if (queueElement) {
            const queueCountText = queueElement.textContent.trim();
            const queueCountNumber = parseInt(queueCountText, 10);

            // Only update the title if the number is greater than 0
            if (queueCountNumber > 0) {
                document.title = `(${queueCountText}) ${originalTitle}`;
            } else {
                document.title = originalTitle;
            }
        } else {
            // If the number can't be found inside the container, revert the title.
            document.title = originalTitle;
        }
    }

    // Run the function every 2 seconds (2000 milliseconds) to be more responsive.
    setInterval(updateTabTitleWithQueueCount, 2000);

    // Run it once immediately on load
    updateTabTitleWithQueueCount();

})();
