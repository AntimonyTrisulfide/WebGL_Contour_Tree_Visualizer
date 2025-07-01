// src/edgeInfo.js
// Edge Information Panel Management

let edgeInfoPanel = null;
let edgeInfoContent = null;
let edgeInfoToggle = null;

// Initialize the edge information panel
function initializeEdgeInfoPanel() {
    try {
        edgeInfoPanel = document.getElementById('edgeInfoPanel');
        edgeInfoContent = document.getElementById('edgeInfoContent');
        edgeInfoToggle = document.getElementById('edgeInfoToggle');
        
        if (!edgeInfoPanel) {
            console.error('Edge info panel element not found!');
            return;
        }
        
        // Set up toggle functionality
        const edgeInfoHeader = document.getElementById('edgeInfoHeader');
        if (edgeInfoHeader) {
            edgeInfoHeader.addEventListener('click', toggleEdgeInfoPanel);
        }
        
        // Initially hide the panel
        hideEdgeInfoPanel();
        
        console.log('Edge info panel initialized successfully');
    } catch (error) {
        console.error('Error initializing edge info panel:', error);
    }
}

// Toggle the collapsed state of the edge info panel
function toggleEdgeInfoPanel() {
    if (edgeInfoPanel.classList.contains('collapsed')) {
        edgeInfoPanel.classList.remove('collapsed');
    } else {
        edgeInfoPanel.classList.add('collapsed');
    }
}

// Show the edge information panel
function showEdgeInfoPanel() {
    edgeInfoPanel.classList.remove('hidden');
}

// Hide the edge information panel
function hideEdgeInfoPanel() {
    edgeInfoPanel.classList.add('hidden');
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

// Update the edge information display
function updateEdgeInfo(edgeIndex) {
    try {
        if (!edgeIndex || !edges || edgeIndex < 1 || edgeIndex > edges.length) {
            console.log('Invalid edge index or edges not available');
            hideEdgeInfoPanel();
            return;
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
        
    // Update the display
    document.getElementById('edgeNumber').textContent = edgeIndex;
    document.getElementById('fromVertex').textContent = `${fromVertexIndex} (${fromVertex[0].toFixed(2)}, ${fromVertex[1].toFixed(2)}, ${fromVertex[2].toFixed(2)})`;
    document.getElementById('toVertex').textContent = `${toVertexIndex} (${toVertex[0].toFixed(2)}, ${toVertex[1].toFixed(2)}, ${toVertex[2].toFixed(2)})`;
    document.getElementById('fromVertexType').textContent = getVertexTypeString(fromType);
    document.getElementById('toVertexType').textContent = getVertexTypeString(toType);
    document.getElementById('fromVertexValue').textContent = fromValue.toString();
    document.getElementById('toVertexValue').textContent = toValue.toString();
        
        // Determine connection type based on vertex positions
        const isHorizontal = Math.abs(fromVertex[1] - toVertex[1]) < 1e-6;
        const isVertical = Math.abs(fromVertex[0] - toVertex[0]) < 1e-6 && Math.abs(fromVertex[2] - toVertex[2]) < 1e-6;
        
        let connectionType = 'L-shaped';
        if (isHorizontal) {
            connectionType = 'Horizontal';
        } else if (isVertical) {
            connectionType = 'Vertical';
        }
        
        document.getElementById('connectionType').textContent = connectionType;
        
        // Show the panel
        showEdgeInfoPanel();
        
        console.log(`Edge info updated for edge ${edgeIndex}: ${fromVertexIndex} -> ${toVertexIndex}`);
    } catch (error) {
        console.error('Error updating edge info:', error);
        hideEdgeInfoPanel();
    }
}

// Clear edge information (when no edge is selected)
function clearEdgeInfo() {
    document.getElementById('edgeNumber').textContent = '-';
    document.getElementById('fromVertex').textContent = '-';
    document.getElementById('toVertex').textContent = '-';
    document.getElementById('fromVertexType').textContent = '-';
    document.getElementById('toVertexType').textContent = '-';
    document.getElementById('fromVertexValue').textContent = '-';
    document.getElementById('toVertexValue').textContent = '-';
    document.getElementById('connectionType').textContent = '-';
    
    hideEdgeInfoPanel();
}

// Initialize when DOM is loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeEdgeInfoPanel);
} else {
    // DOM is already loaded
    initializeEdgeInfoPanel();
}
