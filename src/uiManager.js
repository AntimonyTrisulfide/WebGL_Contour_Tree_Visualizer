// src/uiManager.js
// UI Manager for handling selection-related UI updates

/**
 * UIManager class - handles all UI updates related to selection
 */
class UIManager {
    constructor() {
        this.initialized = false;
        this.setupCallbacks();
    }

    /**
     * Setup callbacks with the selection manager
     */
    setupCallbacks() {
        // Wait for selection manager to be available
        const setupWhenReady = () => {
            if (window.selectionManager) {
                this.initializeCallbacks();
            } else {
                setTimeout(setupWhenReady, 100);
            }
        };
        setupWhenReady();
    }

    /**
     * Initialize callbacks with the selection manager
     */
    initializeCallbacks() {
        // Add callbacks for selection changes
        window.selectionManager.addCallback('onSelectionChange', (selectedEdges) => {
            this.updateSelectionStatus(selectedEdges);
            this.updateEdgeSelect(selectedEdges);
            this.updateEdgeCount(selectedEdges.length);
            this.updateEdgeInfo(selectedEdges);
        });

        window.selectionManager.addCallback('onSelectionClear', () => {
            this.updateSelectionStatus([]);
            this.updateEdgeSelect([]);
            this.updateEdgeCount(0);
            this.updateEdgeInfo([]);
        });

        this.initialized = true;
        console.log('UIManager initialized with selection callbacks');
    }

    /**
     * Update selection status display - DISABLED (removed from UI)
     * @param {Array} selectedEdges - Array of selected edge indices
     */
    updateSelectionStatus(selectedEdges) {
        // Selection status display removed - we now use the edge menu instead
        return;
    }

    /**
     * Update edge select input field
     * @param {Array} selectedEdges - Array of selected edge indices
     */
    updateEdgeSelect(selectedEdges) {
        const edgeSelectInput = document.getElementById('edgeSelect');
        if (edgeSelectInput) {
            edgeSelectInput.value = selectedEdges.join(', ');
        }
    }

    /**
     * Update edge count display
     * @param {number} count - Number of selected edges
     */
    updateEdgeCount(count) {
        const countElement = document.getElementById('selectedEdgeCount');
        if (countElement) {
            countElement.textContent = count.toString();
        }

        // Update menu system if available
        if (typeof menuSystem !== 'undefined' && menuSystem.updateOnEdgeSelectionChange) {
            menuSystem.updateOnEdgeSelectionChange(count);
        }
    }

    /**
     * Update edge info display
     * @param {Array} selectedEdges - Array of selected edge indices
     */
    updateEdgeInfo(selectedEdges) {
        // Update multiple edge info if function exists
        if (typeof updateMultipleEdgeInfo === 'function') {
            updateMultipleEdgeInfo(selectedEdges);
        }

        // Update single edge info for backwards compatibility
        if (selectedEdges.length === 1 && typeof updateEdgeInfo === 'function') {
            updateEdgeInfo(selectedEdges[0]);
        }
    }

    /**
     * Create a simple selection status display if it doesn't exist
     */
    createSelectionStatusDisplay() {
        if (!document.getElementById('selectionStatus')) {
            const statusDiv = document.createElement('div');
            statusDiv.id = 'selectionStatus';
            statusDiv.style.cssText = `
                position: fixed;
                top: 10px;
                right: 10px;
                background: rgba(0, 0, 0, 0.8);
                color: white;
                padding: 10px;
                border-radius: 5px;
                font-family: monospace;
                font-size: 14px;
                z-index: 1000;
            `;
            statusDiv.textContent = 'No edges selected';
            document.body.appendChild(statusDiv);
            console.log('Created selection status display');
        }
    }

    /**
     * Add a clear selection button if it doesn't exist
     */
    createClearSelectionButton() {
        if (!document.getElementById('clearSelection')) {
            const clearButton = document.createElement('button');
            clearButton.id = 'clearSelection';
            clearButton.textContent = 'Clear Selection';
            clearButton.style.cssText = `
                position: fixed;
                top: 50px;
                right: 10px;
                background: #f44336;
                color: white;
                border: none;
                padding: 10px 15px;
                border-radius: 5px;
                cursor: pointer;
                font-size: 14px;
                z-index: 1000;
            `;
            clearButton.onclick = () => {
                if (window.selectionManager) {
                    window.selectionManager.clearSelection();
                } else if (typeof clearEdgeSelection === 'function') {
                    clearEdgeSelection();
                }
            };
            document.body.appendChild(clearButton);
            console.log('Created clear selection button');
        } else {
            // Update existing button to use selection manager
            const clearButton = document.getElementById('clearSelection');
            clearButton.onclick = () => {
                if (window.selectionManager) {
                    window.selectionManager.clearSelection();
                } else if (typeof clearEdgeSelection === 'function') {
                    clearEdgeSelection();
                }
            };
        }
    }

    /**
     * Initialize default UI elements if they don't exist
     */
    initializeDefaultUI() {
        // Remove the selected edges display from top left
        // this.createSelectionStatusDisplay();
        // Clear selection button is now in the menu, so we don't create it here
        // this.createClearSelectionButton();
    }

    /**
     * Update UI based on current selection
     */
    updateUI() {
        if (window.selectionManager) {
            const selectedEdges = window.selectionManager.getSelection();
            this.updateSelectionStatus(selectedEdges);
            this.updateEdgeSelect(selectedEdges);
            this.updateEdgeCount(selectedEdges.length);
            this.updateEdgeInfo(selectedEdges);
        }
    }
}

// Create global UI manager instance
const uiManager = new UIManager();

// Make it globally accessible
window.uiManager = uiManager;

// Initialize default UI when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    uiManager.initializeDefaultUI();
});

console.log('UIManager loaded');
