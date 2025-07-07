// src/multipleEdgeInfo.js
// Multiple Edge Information Panel Management with Collapsible Subinfo Tabs

let multipleEdgeInfoPanel = null;
let multipleEdgeInfoContent = null;
let multipleEdgeInfoToggle = null;
let selectedEdgesData = [];

// Initialize the multiple edge information panel
function initializeMultipleEdgeInfoPanel() {
    try {
        // Create the panel if it doesn't exist
        createMultipleEdgeInfoPanel();
        
        console.log('Multiple edge info panel initialized successfully');
    } catch (error) {
        console.error('Error initializing multiple edge info panel:', error);
    }
}

// Create the multiple edge info panel HTML structure
function createMultipleEdgeInfoPanel() {
    // Remove existing single edge panel if present
    const existingPanel = document.getElementById('edgeInfoPanel');
    if (existingPanel) {
        existingPanel.style.display = 'none';
    }
    
    // Create new multiple edge panel
    multipleEdgeInfoPanel = document.createElement('div');
    multipleEdgeInfoPanel.id = 'multipleEdgeInfoPanel';
    multipleEdgeInfoPanel.className = 'multiple-edge-info-panel hidden';
    
    multipleEdgeInfoPanel.innerHTML = `
        <div class="multiple-edge-info-header" id="multipleEdgeInfoHeader">
            <span class="multiple-edge-info-title">Selected Edges (<span id="selectedEdgeCount">0</span>)</span>
            <button class="multiple-edge-info-toggle" id="multipleEdgeInfoToggle">▼</button>
        </div>
        <div class="multiple-edge-info-content" id="multipleEdgeInfoContent">
            <div class="edge-selection-controls">
                <button class="edge-control-btn" id="clearAllEdges">Clear All</button>
                <button class="edge-control-btn" id="collapseAllEdges">Collapse All</button>
                <button class="edge-control-btn" id="expandAllEdges">Expand All</button>
            </div>
            <div class="edges-container" id="edgesContainer">
                <!-- Individual edge tabs will be inserted here -->
            </div>
        </div>
    `;
    
    document.body.appendChild(multipleEdgeInfoPanel);
    
    // Set up references
    multipleEdgeInfoContent = document.getElementById('multipleEdgeInfoContent');
    multipleEdgeInfoToggle = document.getElementById('multipleEdgeInfoToggle');
    
    // Set up event listeners
    setupEventListeners();
}

// Set up event listeners for the panel
function setupEventListeners() {
    // Main panel toggle
    const header = document.getElementById('multipleEdgeInfoHeader');
    if (header) {
        header.addEventListener('click', toggleMultipleEdgeInfoPanel);
    }
    
    // Control buttons
    const clearAllBtn = document.getElementById('clearAllEdges');
    if (clearAllBtn) {
        clearAllBtn.addEventListener('click', () => {
            clearEdgeSelection();
        });
    }
    
    const collapseAllBtn = document.getElementById('collapseAllEdges');
    if (collapseAllBtn) {
        collapseAllBtn.addEventListener('click', collapseAllEdgeTabs);
    }
    
    const expandAllBtn = document.getElementById('expandAllEdges');
    if (expandAllBtn) {
        expandAllBtn.addEventListener('click', expandAllEdgeTabs);
    }
}

// Toggle the collapsed state of the multiple edge info panel
function toggleMultipleEdgeInfoPanel() {
    if (multipleEdgeInfoPanel.classList.contains('collapsed')) {
        multipleEdgeInfoPanel.classList.remove('collapsed');
        multipleEdgeInfoToggle.textContent = '▼';
    } else {
        multipleEdgeInfoPanel.classList.add('collapsed');
        multipleEdgeInfoToggle.textContent = '▶';
    }
}

// Show the multiple edge information panel
function showMultipleEdgeInfoPanel() {
    multipleEdgeInfoPanel.classList.remove('hidden');
}

// Hide the multiple edge information panel
function hideMultipleEdgeInfoPanel() {
    multipleEdgeInfoPanel.classList.add('hidden');
}

// Update the multiple edge information display
function updateMultipleEdgeInfo(edgeIndices) {
    try {
        if (!edgeIndices || edgeIndices.length === 0) {
            hideMultipleEdgeInfoPanel();
            // Also hide the single edge info panel
            if (typeof clearEdgeInfo === 'function') {
                clearEdgeInfo();
            }
            return;
        }
        
        // Update selected edges data
        selectedEdgesData = edgeIndices.map(edgeIndex => getEdgeData(edgeIndex)).filter(data => data !== null);
        
        // Update edge count
        document.getElementById('selectedEdgeCount').textContent = selectedEdgesData.length;
        
        // Update edges container
        updateEdgesContainer();
        
        // Show the panel
        showMultipleEdgeInfoPanel();
        
        // For single edge selection, also update the simple edge info panel
        if (edgeIndices.length === 1 && typeof updateEdgeInfo === 'function') {
            updateEdgeInfo(edgeIndices[0]);
        }
        
        console.log(`Multiple edge info updated for ${selectedEdgesData.length} edges`);
    } catch (error) {
        console.error('Error updating multiple edge info:', error);
        hideMultipleEdgeInfoPanel();
    }
}

// Get edge data for a given edge index
function getEdgeData(edgeIndex) {
    try {
        if (!edges || edgeIndex < 1 || edgeIndex > edges.length) {
            return null;
        }
        
        // Get the original edge (1-based to 0-based conversion)
        const edge = edges[edgeIndex - 1];
        const fromVertexIndex = edge[0];
        const toVertexIndex = edge[1];
        
        // Get vertex information
        const fromVertex = vertices[fromVertexIndex];
        const toVertex = vertices[toVertexIndex];
        const fromType = vertexTypes[fromVertexIndex];
        const toType = vertexTypes[toVertexIndex];
        const fromValue = vertexValues[fromVertexIndex];
        const toValue = vertexValues[toVertexIndex];
        
        // Determine connection type
        const isHorizontal = Math.abs(fromVertex[1] - toVertex[1]) < 1e-6;
        const isVertical = Math.abs(fromVertex[0] - toVertex[0]) < 1e-6 && Math.abs(fromVertex[2] - toVertex[2]) < 1e-6;
        
        let connectionType = 'L-shaped';
        if (isHorizontal) {
            connectionType = 'Horizontal';
        } else if (isVertical) {
            connectionType = 'Vertical';
        }
        
        return {
            edgeIndex,
            fromVertexIndex,
            toVertexIndex,
            fromVertex,
            toVertex,
            fromType,
            toType,
            fromValue,
            toValue,
            connectionType
        };
    } catch (error) {
        console.error(`Error getting edge data for edge ${edgeIndex}:`, error);
        return null;
    }
}

// Update the edges container with individual edge tabs
function updateEdgesContainer() {
    const container = document.getElementById('edgesContainer');
    if (!container) return;
    
    container.innerHTML = '';
    
    selectedEdgesData.forEach((edgeData, index) => {
        const edgeTab = createEdgeTab(edgeData, index);
        container.appendChild(edgeTab);
    });
}

// Create an individual edge tab
function createEdgeTab(edgeData, index) {
    const edgeTab = document.createElement('div');
    edgeTab.className = 'edge-tab';
    edgeTab.dataset.edgeIndex = edgeData.edgeIndex;
    
    const isExpanded = index === 0; // Expand first edge by default
    
    edgeTab.innerHTML = `
        <div class="edge-tab-header" onclick="toggleEdgeTab(${edgeData.edgeIndex})">
            <span class="edge-tab-title">Edge ${edgeData.edgeIndex}</span>
            <div class="edge-tab-summary">
                ${getVertexTypeString(edgeData.fromType)} → ${getVertexTypeString(edgeData.toType)}
            </div>
            <button class="edge-tab-toggle">${isExpanded ? '▼' : '▶'}</button>
            <button class="edge-tab-remove" onclick="removeEdgeFromSelection(${edgeData.edgeIndex}); event.stopPropagation();">×</button>
        </div>
        <div class="edge-tab-content" ${isExpanded ? '' : 'style="display: none;"'}>
            <div class="edge-info-grid">
                <div class="edge-info-row">
                    <span class="edge-info-label">From Vertex:</span>
                    <span class="edge-info-value">${edgeData.fromVertexIndex} (${edgeData.fromVertex[0].toFixed(2)}, ${edgeData.fromVertex[1].toFixed(2)}, ${edgeData.fromVertex[2].toFixed(2)})</span>
                </div>
                <div class="edge-info-row">
                    <span class="edge-info-label">To Vertex:</span>
                    <span class="edge-info-value">${edgeData.toVertexIndex} (${edgeData.toVertex[0].toFixed(2)}, ${edgeData.toVertex[1].toFixed(2)}, ${edgeData.toVertex[2].toFixed(2)})</span>
                </div>
                <div class="edge-info-row">
                    <span class="edge-info-label">From Type:</span>
                    <span class="edge-info-value">${getVertexTypeString(edgeData.fromType)}</span>
                </div>
                <div class="edge-info-row">
                    <span class="edge-info-label">To Type:</span>
                    <span class="edge-info-value">${getVertexTypeString(edgeData.toType)}</span>
                </div>
                <div class="edge-info-row">
                    <span class="edge-info-label">From Value:</span>
                    <span class="edge-info-value">${edgeData.fromValue}</span>
                </div>
                <div class="edge-info-row">
                    <span class="edge-info-label">To Value:</span>
                    <span class="edge-info-value">${edgeData.toValue}</span>
                </div>
                <div class="edge-info-row">
                    <span class="edge-info-label">Connection:</span>
                    <span class="edge-info-value">${edgeData.connectionType}</span>
                </div>
            </div>
        </div>
    `;
    
    return edgeTab;
}

// Toggle individual edge tab
function toggleEdgeTab(edgeIndex) {
    const edgeTab = document.querySelector(`[data-edge-index="${edgeIndex}"]`);
    if (!edgeTab) return;
    
    const content = edgeTab.querySelector('.edge-tab-content');
    const toggle = edgeTab.querySelector('.edge-tab-toggle');
    
    if (content.style.display === 'none') {
        content.style.display = 'block';
        toggle.textContent = '▼';
    } else {
        content.style.display = 'none';
        toggle.textContent = '▶';
    }
}

// Collapse all edge tabs
function collapseAllEdgeTabs() {
    const edgeTabs = document.querySelectorAll('.edge-tab');
    edgeTabs.forEach(tab => {
        const content = tab.querySelector('.edge-tab-content');
        const toggle = tab.querySelector('.edge-tab-toggle');
        content.style.display = 'none';
        toggle.textContent = '▶';
    });
}

// Expand all edge tabs
function expandAllEdgeTabs() {
    const edgeTabs = document.querySelectorAll('.edge-tab');
    edgeTabs.forEach(tab => {
        const content = tab.querySelector('.edge-tab-content');
        const toggle = tab.querySelector('.edge-tab-toggle');
        content.style.display = 'block';
        toggle.textContent = '▼';
    });
}

// Clear multiple edge information
function clearMultipleEdgeInfo() {
    selectedEdgesData = [];
    document.getElementById('selectedEdgeCount').textContent = '0';
    document.getElementById('edgesContainer').innerHTML = '';
    hideMultipleEdgeInfoPanel();
}

// Get vertex type as readable string
function getVertexTypeString(type) {
    switch(type) {
        case NODE_TYPES.MINIMUM: return 'Minimum';
        case NODE_TYPES.SADDLE: return 'Saddle';
        case NODE_TYPES.MAXIMUM: return 'Maximum';
        case NODE_TYPES.INTERMEDIATE: return 'Intermediate';
        default: return 'Unknown';
    }
}

// Initialize when DOM is loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeMultipleEdgeInfoPanel);
} else {
    // DOM is already loaded
    initializeMultipleEdgeInfoPanel();
}

// Export functions for external use
window.initializeMultipleEdgeInfoPanel = initializeMultipleEdgeInfoPanel;
window.updateMultipleEdgeInfo = updateMultipleEdgeInfo;
window.clearMultipleEdgeInfo = clearMultipleEdgeInfo;
window.toggleEdgeTab = toggleEdgeTab;
window.collapseAllEdgeTabs = collapseAllEdgeTabs;
window.expandAllEdgeTabs = expandAllEdgeTabs;
