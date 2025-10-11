// src/selectionManager.js
// Centralized selection management system for the WebGL Contour Tree Visualizer

/**
 * SelectionManager class - handles all edge selection logic
 * Integrates directly with the library and provides callbacks for UI updates
 */
class SelectionManager {
    constructor() {
        this.selectedEdges = [];
        this.callbacks = {
            onSelectionChange: [],
            onSelectionClear: [],
            onSingleSelect: [],
            onMultiSelect: []
        };
        this.isInitialized = false;
        
        // Initialize the manager
        this.initialize();
    }

    /**
     * Initialize the selection manager
     */
    initialize() {
        // Ensure global selectedEdges array exists and is synchronized
        if (!window.selectedEdges) {
            window.selectedEdges = [];
        }
        
        // Sync with existing selection
        this.selectedEdges = [...window.selectedEdges];
        
        // Add selection change listener for selectedEdges array
        this.setupGlobalArrayWatcher();
        
        // Add a default callback that provides console feedback
        this.addCallback('onSelectionChange', (selectedEdges) => {
            console.log(`📊 Selection changed: [${selectedEdges.join(', ')}] (${selectedEdges.length} edge${selectedEdges.length === 1 ? '' : 's'})`);
        });
        
        this.isInitialized = true;
        console.log('SelectionManager initialized');
    }

    /**
     * Set up a watcher for the global selectedEdges array
     * This ensures the manager stays in sync even if external code modifies the array
     */
    setupGlobalArrayWatcher() {
        // Set up a periodic check for array changes
        this.lastKnownSelection = [...this.selectedEdges];
        
        const checkForChanges = () => {
            if (window.selectedEdges && 
                JSON.stringify(window.selectedEdges) !== JSON.stringify(this.lastKnownSelection)) {
                
                console.log('External selectedEdges change detected, syncing...');
                this.selectedEdges = [...window.selectedEdges];
                this.lastKnownSelection = [...this.selectedEdges];
                this.triggerCallbacks('onSelectionChange', this.selectedEdges);
            }
        };
        
        // Check every 100ms for changes
        setInterval(checkForChanges, 100);
    }

    /**
     * Add a callback for selection events
     * @param {string} event - Event type: 'onSelectionChange', 'onSelectionClear', 'onSingleSelect', 'onMultiSelect'
     * @param {function} callback - Callback function
     */
    addCallback(event, callback) {
        if (this.callbacks[event]) {
            this.callbacks[event].push(callback);
            console.log(`Added callback for ${event}`);
        } else {
            console.warn(`Unknown event type: ${event}`);
        }
    }

    /**
     * Remove a callback
     * @param {string} event - Event type
     * @param {function} callback - Callback function to remove
     */
    removeCallback(event, callback) {
        if (this.callbacks[event]) {
            const index = this.callbacks[event].indexOf(callback);
            if (index > -1) {
                this.callbacks[event].splice(index, 1);
                console.log(`Removed callback for ${event}`);
            }
        }
    }

    /**
     * Trigger callbacks for an event
     * @param {string} event - Event type
     * @param {*} data - Data to pass to callbacks
     */
    triggerCallbacks(event, data) {
        if (this.callbacks[event]) {
            this.callbacks[event].forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    console.error(`Error in ${event} callback:`, error);
                }
            });
        }
    }

    /**
     * Select a single edge (replaces current selection)
     * @param {number} edgeIndex - Edge index to select
     */
    selectSingle(edgeIndex) {
        console.log(`SelectionManager: Selecting single edge ${edgeIndex}`);
        
        this.selectedEdges = [edgeIndex];
        this.syncGlobalArrays();
        
        this.triggerCallbacks('onSingleSelect', edgeIndex);
        this.triggerCallbacks('onSelectionChange', this.selectedEdges);
        
        this.updateVisualization();
    }

    /**
     * Toggle an edge in the selection (for multi-select)
     * @param {number} edgeIndex - Edge index to toggle
     */
    toggleEdge(edgeIndex) {
        console.log(`SelectionManager: Toggling edge ${edgeIndex}`);
        
        const index = this.selectedEdges.indexOf(edgeIndex);
        if (index > -1) {
            // Edge is selected, remove it
            this.selectedEdges.splice(index, 1);
            console.log(`Edge ${edgeIndex} removed from selection`);
        } else {
            // Edge is not selected, add it
            this.selectedEdges.push(edgeIndex);
            console.log(`Edge ${edgeIndex} added to selection`);
        }
        
        this.syncGlobalArrays();
        this.triggerCallbacks('onMultiSelect', { edgeIndex, isSelected: index === -1 });
        this.triggerCallbacks('onSelectionChange', this.selectedEdges);
        
        this.updateVisualization();
    }

    /**
     * Add an edge to the selection
     * @param {number} edgeIndex - Edge index to add
     */
    addEdge(edgeIndex) {
        if (!this.selectedEdges.includes(edgeIndex)) {
            console.log(`SelectionManager: Adding edge ${edgeIndex}`);
            this.selectedEdges.push(edgeIndex);
            this.syncGlobalArrays();
            
            this.triggerCallbacks('onSelectionChange', this.selectedEdges);
            this.updateVisualization();
        }
    }

    /**
     * Remove an edge from the selection
     * @param {number} edgeIndex - Edge index to remove
     */
    removeEdge(edgeIndex) {
        const index = this.selectedEdges.indexOf(edgeIndex);
        if (index > -1) {
            console.log(`SelectionManager: Removing edge ${edgeIndex}`);
            this.selectedEdges.splice(index, 1);
            this.syncGlobalArrays();
            
            this.triggerCallbacks('onSelectionChange', this.selectedEdges);
            this.updateVisualization();
        }
    }

    /**
     * Clear all selections
     */
    clearSelection() {
        console.log('SelectionManager: Clearing all selections');
        
        this.selectedEdges = [];
        this.syncGlobalArrays();
        
        this.triggerCallbacks('onSelectionClear', []);
        this.triggerCallbacks('onSelectionChange', this.selectedEdges);
        
        this.updateVisualization();
    }

    /**
     * Set multiple edges as selected
     * @param {Array} edgeIndices - Array of edge indices to select
     */
    setSelection(edgeIndices) {
        console.log(`SelectionManager: Setting selection to [${edgeIndices.join(', ')}]`);
        
        this.selectedEdges = [...edgeIndices];
        this.syncGlobalArrays();
        
        this.triggerCallbacks('onSelectionChange', this.selectedEdges);
        this.updateVisualization();
    }

    /**
     * Get current selection
     * @returns {Array} Array of selected edge indices
     */
    getSelection() {
        return [...this.selectedEdges];
    }

    /**
     * Get selection count
     * @returns {number} Number of selected edges
     */
    getSelectionCount() {
        return this.selectedEdges.length;
    }

    /**
     * Check if an edge is selected
     * @param {number} edgeIndex - Edge index to check
     * @returns {boolean} True if edge is selected
     */
    isSelected(edgeIndex) {
        return this.selectedEdges.includes(edgeIndex);
    }

    /**
     * Sync with global arrays (for backwards compatibility)
     */
    syncGlobalArrays() {
        window.selectedEdges = [...this.selectedEdges];
        
        // Update legacy compatibility arrays
        if (window.syncEdgeIdArray && typeof window.syncEdgeIdArray === 'function') {
            window.syncEdgeIdArray();
        }
        
        // Update selectedEdge for single selection compatibility
        if (typeof window.selectedEdge !== 'undefined') {
            window.selectedEdge = this.selectedEdges.length > 0 ? this.selectedEdges[this.selectedEdges.length - 1] : null;
        }
        
        // Update selectedEdge in global scope
        if (typeof selectedEdge !== 'undefined') {
            selectedEdge = this.selectedEdges.length > 0 ? this.selectedEdges[this.selectedEdges.length - 1] : null;
        }
    }

    /**
     * Update visualization after selection change
     */
    updateVisualization() {
        // Update edge highlighting
        if (typeof updateMultipleEdgeHighlighting === 'function') {
            updateMultipleEdgeHighlighting();
        } else if (typeof updatePipeHighlighting === 'function') {
            updatePipeHighlighting();
        }

        // Update edge info display
        if (typeof updateMultipleEdgeInfo === 'function') {
            updateMultipleEdgeInfo(this.selectedEdges);
        }

        // Re-render the scene
        if (typeof renderGraph === 'function') {
            renderGraph();
        }
    }

    /**
     * Handle mouse click for selection
     * @param {number} edgeIndex - Clicked edge index
     * @param {boolean} isCtrlPressed - Whether Ctrl key was pressed
     */
    handleMouseClick(edgeIndex, isCtrlPressed = false) {
        if (isCtrlPressed) {
            this.toggleEdge(edgeIndex);
        } else {
            // Check if the edge is already selected and it's the only selection
            if (this.selectedEdges.length === 1 && this.selectedEdges[0] === edgeIndex) {
                // Deselect the edge if it's the only one selected
                this.clearSelection();
            } else if (this.selectedEdges.includes(edgeIndex)) {
                // If multiple edges are selected and this edge is one of them, 
                // make it the only selection (don't deselect)
                this.selectSingle(edgeIndex);
            } else {
                // Edge is not selected, select it
                this.selectSingle(edgeIndex);
            }
        }
    }
}

// Create global selection manager instance
const selectionManager = new SelectionManager();

// Make it globally accessible
window.selectionManager = selectionManager;

// Export legacy-compatible functions
window.addEdgeToSelection = (edgeIndex) => selectionManager.addEdge(edgeIndex);
window.removeEdgeFromSelection = (edgeIndex) => selectionManager.removeEdge(edgeIndex);
window.clearEdgeSelection = () => selectionManager.clearSelection();
window.getSelectedEdges = () => selectionManager.getSelection();
window.setSelectedEdges = (edgeIndices) => selectionManager.setSelection(edgeIndices);

console.log('SelectionManager loaded and initialized');
