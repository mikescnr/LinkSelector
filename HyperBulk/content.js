let isDragging = false;
let isClick = false; // Flag for click vs drag
let startX, startY, selectionBox, linkCountDisplay;
let highlightedLinks = []; // Array to track highlighted links

// Load settings from chrome storage
chrome.storage.sync.get({
    selectionBoxColor: 'rgba(0, 120, 215, 0.2)', // Default value
    borderColor: '#005a8c', // Default value
    counterBgColor: '#0078d7', // Default value
    counterTextColor: '#ffffff' // Default value
}, (settings) => {
    // Apply the loaded settings to the selection box and counter
    applySettings(settings);
});

function applySettings(settings) {
    // Apply the selection box color with the proper transparency
    selectionBox.style.background = settings.selectionBoxColor;
    selectionBox.style.border = `2px dashed ${settings.borderColor}`;

    // Update counter background color and text color
    linkCountDisplay.style.background = settings.counterBgColor;
    linkCountDisplay.style.color = settings.counterTextColor;
}

document.addEventListener('mousedown', (e) => {
    if (e.altKey && e.button === 0) { // Alt + Left Click
        isClick = true; // Set the flag to true for a click (not a drag yet)
        isDragging = false; // Reset dragging initially
        startX = e.pageX;
        startY = e.pageY;

        // Prevent default behavior (like text selection)
        e.preventDefault();

        // Create the selection box
        selectionBox = document.createElement('div');
        selectionBox.style.position = 'absolute';
        selectionBox.style.zIndex = '10000';
        document.body.appendChild(selectionBox);

        // Create the link count display
        linkCountDisplay = document.createElement('div');
        linkCountDisplay.style.position = 'absolute';
        linkCountDisplay.style.padding = '2px 5px';
        linkCountDisplay.style.borderRadius = '3px';
        linkCountDisplay.style.fontSize = '12px';
        linkCountDisplay.style.fontWeight = 'bold';
        linkCountDisplay.style.pointerEvents = 'none';
        linkCountDisplay.textContent = 'Links: 0';
        document.body.appendChild(linkCountDisplay);

        // Apply styles to the new elements
        chrome.storage.sync.get({
            selectionBoxColor: 'rgba(0, 120, 215, 0.2)',
            borderColor: '#005a8c',
            counterBgColor: '#0078d7',
            counterTextColor: '#ffffff'
        }, (settings) => {
            applySettings(settings);
        });
    }
});

document.addEventListener('mousemove', (e) => {
    if (isClick && !isDragging && (Math.abs(e.pageX - startX) > 5 || Math.abs(e.pageY - startY) > 5)) {
        isDragging = true; // Begin dragging
    }

    if (isDragging) {
        const x = Math.min(e.pageX, startX);
        const y = Math.min(e.pageY, startY);
        const width = Math.abs(e.pageX - startX);
        const height = Math.abs(e.pageY - startY);

        selectionBox.style.left = `${x}px`;
        selectionBox.style.top = `${y}px`;
        selectionBox.style.width = `${width}px`;
        selectionBox.style.height = `${height}px`;

        const rect = selectionBox.getBoundingClientRect();

        // Get all links in the page
        const links = Array.from(document.querySelectorAll('a'));
        let selectedLinks = [];

        // Highlight links within the selection box
        links.forEach(link => {
            const linkRect = link.getBoundingClientRect();
            if (
                linkRect.right >= rect.left &&
                linkRect.left <= rect.right &&
                linkRect.bottom >= rect.top &&
                linkRect.top <= rect.bottom
            ) {
                link.style.backgroundColor = 'rgba(0, 120, 215, 0.3)'; // Highlighted background
                if (!highlightedLinks.includes(link)) {
                    highlightedLinks.push(link); // Track highlighted link
                }
                selectedLinks.push(link);
            } else {
                link.style.backgroundColor = ''; // Reset background for non-selected links
                const index = highlightedLinks.indexOf(link);
                if (index !== -1) {
                    highlightedLinks.splice(index, 1); // Remove from tracked highlighted links
                }
            }
        });

        linkCountDisplay.textContent = `Links: ${selectedLinks.length}`;

        // Position the link count display relative to the cursor
        const offset = 10; // Offset from cursor
        let xPos = e.clientX + offset;  // Use clientX for horizontal positioning
        let yPos = e.clientY + offset + window.scrollY;  // Use clientY + scrollY for vertical positioning

        // Get the viewport dimensions
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;

        // Get the dimensions of the element
        const elementWidth = linkCountDisplay.offsetWidth;
        const elementHeight = linkCountDisplay.offsetHeight;

        // Debugging: log current xPos, yPos, and size
        console.log(`Original xPos: ${xPos}, yPos: ${yPos}`);
        console.log(`Viewport Width: ${viewportWidth}, Height: ${viewportHeight}`);
        console.log(`Element Width: ${elementWidth}, Height: ${elementHeight}`);

        // Constrain x position to prevent overflow
        if (xPos + elementWidth > viewportWidth) {
            xPos = viewportWidth - elementWidth - offset; // Ensure it stops exactly at the edge
            console.log(`Constrained xPos: ${xPos}`);
        }

        // Constrain y position to prevent overflow
        if (yPos + elementHeight > viewportHeight + window.scrollY) {
            yPos = viewportHeight + window.scrollY - elementHeight - offset; // Ensure it stops exactly at the edge
            console.log(`Constrained yPos: ${yPos}`);
        }

        // Set the final position of the display
        linkCountDisplay.style.left = `${xPos}px`;
        linkCountDisplay.style.top = `${yPos}px`;

    }
});

document.addEventListener('mouseup', (e) => {
    if (isClick && !isDragging) {
        // If it's just a click and not a drag, reset the click flag
        isClick = false; // Reset the click flag
        return; // Prevent opening links
    }

    if (isDragging) {
        isDragging = false; // Reset dragging

        const rect = selectionBox.getBoundingClientRect();
        const links = Array.from(document.querySelectorAll('a'));
        let selectedLinks = [];

        links.forEach(link => {
            const linkRect = link.getBoundingClientRect();
            if (
                linkRect.right >= rect.left &&
                linkRect.left <= rect.right &&
                linkRect.bottom >= rect.top &&
                linkRect.top <= rect.bottom
            ) {
                selectedLinks.push(link); // Add to selected links
            }
        });

        // Load the maxLinks setting from storage
        chrome.storage.sync.get({ maxLinks: 10 }, (settings) => {
            const maxLinks = settings.maxLinks;

            if (maxLinks > 0 && selectedLinks.length > maxLinks) {
                // Show a warning if the number of links exceeds maxLinks
                const confirmation = confirm(`You are trying to open ${selectedLinks.length} links. Are you sure?`);

                if (confirmation) {
                    // Open all selected links
                    selectedLinks.forEach(link => {
                        window.open(link.href, '_blank');
                    });
                }
            } else {
                // Open all selected links if it's within the limit or no limit
                selectedLinks.forEach(link => {
                    window.open(link.href, '_blank');
                });
            }
        });

        // Clean up
        document.body.removeChild(selectionBox);
        document.body.removeChild(linkCountDisplay);

        // Reset the highlight for all links
        highlightedLinks.forEach(link => {
            link.style.backgroundColor = ''; // Reset highlight
        });

        highlightedLinks = []; // Clear the tracked highlighted links

        e.preventDefault();
    }

    // Reset the click flag if ALT is no longer held
    isClick = false; // Reset click flag after mouseup
});

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && (isClick || isDragging)) {
        isClick = false; // Reset click flag
        isDragging = false; // Reset dragging flag

        if (selectionBox && selectionBox.parentNode) {
            document.body.removeChild(selectionBox);
        }
        if (linkCountDisplay && linkCountDisplay.parentNode) {
            document.body.removeChild(linkCountDisplay);
        }

        // Reset link backgrounds if ESC is pressed
        document.querySelectorAll('a').forEach(link => {
            link.style.backgroundColor = ''; // Reset highlight
        });

        highlightedLinks = []; // Clear the tracked highlighted links

        e.preventDefault();
    }
});

document.addEventListener('keyup', (e) => {
    if (e.key === 'Alt') {
        // When ALT is released, reset the click flag
        isClick = false; // Make sure click flag is reset
        isDragging = false; // Reset dragging flag
    }

    // If ALT is released, reset background of all links
    if (selectionBox && selectionBox.parentNode) {
        document.body.removeChild(selectionBox);
    }
    if (linkCountDisplay && linkCountDisplay.parentNode) {
        document.body.removeChild(linkCountDisplay);
    }

    // Reset link backgrounds if ALT is released
    document.querySelectorAll('a').forEach(link => {
        link.style.backgroundColor = ''; // Reset highlight
    });
});
