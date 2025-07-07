// src/visualizerAPI.js
// Main API function for the contour tree visualizer

/**
 * Main function to invoke the contour tree visualizer
 * @param {Object} treeData - The parsed tree data containing nodes, vertices, edges, etc.
 * @param {Ob    // Initialize mouse picking
    if (typeof initializeMousePicking === 'function') {
        initializeMousePicking();
    }
    
    // Initialize edge info panel
    if (typeof initializeEdgeInfoPanel === 'function') {
        initializeEdgeInfoPanel();
    }
    
    // Initialize multiple edge info panel
    if (typeof initializeMultipleEdgeInfoPanel === 'function') {
        initializeMultipleEdgeInfoPanel();
    }htConfig - Light configuration with directions and colors
 * @param {Array} colors - Color configuration
 * @param {Object} globalVars - Other global variables
 * @param {Array} edgeIds - Array of edge IDs to highlight and display info for
 * @returns {Object} Updated state including new selected edges
 */
function invokeContourTreeVisualizer(treeData, lightConfig, colors, globalVars, edgeIds = []) {
    try {
        console.log('invokeContourTreeVisualizer called with:', {
            treeData: treeData ? `${treeData.vertices?.length || 0} vertices, ${treeData.edges?.length || 0} edges` : 'null',
            lightConfig: lightConfig ? 'provided' : 'null',
            colors: colors ? 'provided' : 'null', 
            globalVars: globalVars ? 'provided' : 'null',
            edgeIds: edgeIds
        });
        
        // Update global variables with provided data
        updateGlobalVariables(treeData, lightConfig, colors, globalVars);
        
        // Set the selected edges
        setSelectedEdges(edgeIds);
        
        // Initialize or update the visualization
        if (!isVisualizationInitialized()) {
            console.log('Visualization not initialized, initializing...');
            initializeVisualization();
        } else {
            console.log('Visualization already initialized, updating...');
        }
        
        // Update the display
        updateVisualization();
        
        // Return the current state
        return {
            selectedEdges: getSelectedEdges(),
            success: true,
            message: `Visualizer updated with ${edgeIds.length} selected edges`
        };
    } catch (error) {
        console.error('Error in contour tree visualizer:', error);
        return {
            selectedEdges: [],
            success: false,
            message: error.message
        };
    }
}

/**
 * Add an edge to the selection
 * @param {number} edgeId - The edge ID to add
 */
function addEdgeToSelection(edgeId) {
    if (!window.selectedEdges.includes(edgeId)) {
        window.selectedEdges.push(edgeId);
        
        // Synchronize edgeId array for integration compatibility
        if (typeof window.syncEdgeIdArray === 'function') {
            window.syncEdgeIdArray();
        }
        
        updateEdgeDisplay();
        updateVisualization();
    }
}

/**
 * Remove an edge from the selection
 * @param {number} edgeId - The edge ID to remove
 */
function removeEdgeFromSelection(edgeId) {
    const index = window.selectedEdges.indexOf(edgeId);
    if (index > -1) {
        window.selectedEdges.splice(index, 1);
        
        // Synchronize edgeId array for integration compatibility
        if (typeof window.syncEdgeIdArray === 'function') {
            window.syncEdgeIdArray();
        }
        
        updateEdgeDisplay();
        updateVisualization();
    }
}

/**
 * Clear all selected edges
 */
function clearEdgeSelection() {
    window.selectedEdges = [];
    
    // Synchronize edgeId array for integration compatibility
    if (typeof window.syncEdgeIdArray === 'function') {
        window.syncEdgeIdArray();
    }
    
    updateEdgeDisplay();
    updateVisualization();
    
    // Update menu system if available
    if (typeof menuSystem !== 'undefined' && menuSystem.updateOnEdgeSelectionChange) {
        menuSystem.updateOnEdgeSelectionChange(0);
    }
}

/**
 * Get current selected edges
 * @returns {Array} Array of selected edge IDs
 */
function getSelectedEdges() {
    return [...window.selectedEdges];
}

/**
 * Update the selected edges array and trigger visualization update
 * This is the main function you should call with an array of edge IDs
 * @param {Array} edgeIds - Array of edge IDs to highlight and display info for
 * @returns {Object} Result object with success status
 */
function updateSelectedEdges(edgeIds = []) {
    try {
        console.log('updateSelectedEdges called with:', edgeIds);
        
        // Update the global selected edges array
        window.selectedEdges = [...edgeIds];
        
        // Synchronize edgeId array for integration compatibility
        if (typeof window.syncEdgeIdArray === 'function') {
            window.syncEdgeIdArray();
        }
        
        // Update edge highlighting
        if (typeof updateMultipleEdgeHighlighting === 'function') {
            updateMultipleEdgeHighlighting();
        }
        
        // Update edge info display
        if (typeof updateMultipleEdgeInfo === 'function') {
            updateMultipleEdgeInfo(window.selectedEdges);
        } else if (typeof updateEdgeInfo === 'function' && window.selectedEdges.length > 0) {
            updateEdgeInfo(window.selectedEdges[0]); // Fallback to single edge
        }
        
        // Re-render the scene
        if (typeof renderGraph === 'function') {
            renderGraph();
        }
        
        console.log(`Successfully updated ${edgeIds.length} selected edges`);
        return {
            selectedEdges: [...window.selectedEdges],
            success: true,
            message: `Updated ${edgeIds.length} selected edges`
        };
    } catch (error) {
        console.error('Error updating selected edges:', error);
        return {
            selectedEdges: [],
            success: false,
            message: `Error updating selected edges: ${error.message}`
        };
    }
}

/**
 * Set selected edges
 * @param {Array} edgeIds - Array of edge IDs to select
 */
function setSelectedEdges(edgeIds) {
    window.selectedEdges = [...edgeIds];
    
    // Synchronize edgeId array for integration compatibility
    if (typeof window.syncEdgeIdArray === 'function') {
        window.syncEdgeIdArray();
    }
    updateEdgeDisplay();
}

/**
 * Update global variables with new data
 * @param {Object} treeData - Tree data
 * @param {Object} lightConfig - Light configuration object with directions and colors
 * @param {Array} colors - Colors
 * @param {Object} globalVars - Global variables
 */
function updateGlobalVariables(treeData, lightConfig, colors, globalVars) {
    console.log('updateGlobalVariables called');
    
    // Update tree data
    if (treeData.vertices) {
        vertices = treeData.vertices;
        console.log('Updated vertices:', vertices.length);
    }
    if (treeData.edges) {
        edges = treeData.edges;
        console.log('Updated edges:', edges.length);
    }
    if (treeData.vertexTypes) {
        vertexTypes = treeData.vertexTypes;
        console.log('Updated vertexTypes:', vertexTypes.length);
    }
    if (treeData.vertexValues) {
        vertexValues = treeData.vertexValues;
        console.log('Updated vertexValues:', vertexValues.length);
    }
    
    // Update lighting configuration (directional lights)
    if (lightConfig) {
        // Store light configuration globally
        window.lightConfig = lightConfig;
        window.usingAPILighting = true;
        
        console.log('Updated lighting configuration:', lightConfig);
        
        // Note: The actual light directions and colors are set in the renderer
        // These are directional lights, not positioned lights
    }
    
    // Update colors
    if (colors) {
        if (colors.nodeColors) {
            NODE_COLORS = colors.nodeColors;
            console.log('Updated NODE_COLORS:', NODE_COLORS);
            
            // Set a flag to indicate API colors are being used
            window.usingAPIColors = true;
        }
        if (colors.pipeColor) pipeColor = colors.pipeColor;
        if (colors.backgroundColor) backgroundColor = colors.backgroundColor;
    }
    
    // Update other global variables with API protection
    if (globalVars) {
        if (globalVars.sphereRadius !== undefined) {
            sphereRadius = globalVars.sphereRadius;
            console.log('API: Set sphereRadius to', sphereRadius);
        }
        if (globalVars.pipeRadius !== undefined) {
            pipeRadius = globalVars.pipeRadius;
            console.log('API: Set pipeRadius to', pipeRadius);
        }
        
        // Mark that API is managing these values
        window.usingAPIGlobals = true;
    }
}

/**
 * Check if visualization is initialized
 * @returns {boolean} True if initialized
 */
function isVisualizationInitialized() {
    return gl && sphereVAO && pipeVAO;
}

/**
 * Initialize the visualization
 */
function initializeVisualization() {
    // Initialize WebGL components using the global offData
    if (typeof initializeGraph === 'function' && typeof offData !== 'undefined') {
        console.log('Calling initializeGraph with offData');
        initializeGraph(offData);
    } else if (typeof initialize === 'function') {
        console.log('Calling initialize as fallback');
        initialize();
    }
    
    // Initialize mouse picking
    if (typeof initializeMousePicking === 'function') {
        initializeMousePicking();
    }
    
    // Initialize edge info panel
    if (typeof initializeEdgeInfoPanel === 'function') {
        initializeEdgeInfoPanel();
    }
}

/**
 * Update the visualization
 */
function updateVisualization() {
    // Update edge highlighting
    if (typeof updateMultipleEdgeHighlighting === 'function') {
        updateMultipleEdgeHighlighting();
    }
    
    // Update edge info display - use multiple edge info for arrays
    if (typeof updateMultipleEdgeInfo === 'function') {
        updateMultipleEdgeInfo(window.selectedEdges);
    } else if (typeof updateEdgeInfo === 'function' && window.selectedEdges.length > 0) {
        updateEdgeInfo(window.selectedEdges[0]); // Fallback to single edge
    }
    
    // Re-render the scene
    if (typeof renderGraph === 'function') {
        renderGraph();
    }
}

/**
 * Update edge display after selection changes
 */
function updateEdgeDisplay() {
    // This will be called when edges are added/removed
    // The actual display update logic will be in the updated edge info system
}

/**
 * Update lighting configuration via API
 * @param {Object} lightConfig - Light configuration with directions and colors
 * @returns {Object} Result object with success status
 */
function updateLightingConfiguration(lightConfig) {
    try {
        if (lightConfig) {
            window.lightConfig = lightConfig;
            window.usingAPILighting = true;
            
            console.log('Lighting configuration updated via API:', lightConfig);
            
            // Trigger a re-render to apply changes
            if (typeof updateVisualization === 'function') {
                updateVisualization();
            }
            
            return {
                success: true,
                message: 'Lighting configuration updated successfully'
            };
        } else {
            return {
                success: false,
                message: 'No lighting configuration provided'
            };
        }
    } catch (error) {
        console.error('Error updating lighting configuration:', error);
        return {
            success: false,
            message: `Error updating lighting: ${error.message}`
        };
    }
}

/**
 * Update color configuration via API
 * @param {Object} colors - Color configuration object
 * @returns {Object} Result object with success status
 */
function updateColorConfiguration(colors) {
    try {
        if (colors) {
            if (colors.nodeColors) {
                NODE_COLORS = colors.nodeColors;
                window.usingAPIColors = true;
                console.log('Node colors updated via API:', NODE_COLORS);
            }
            if (colors.pipeColor) {
                pipeColor = colors.pipeColor;
                console.log('Pipe color updated via API:', pipeColor);
            }
            if (colors.backgroundColor) {
                backgroundColor = colors.backgroundColor;
                console.log('Background color updated via API:', backgroundColor);
            }
            
            // Trigger a re-render to apply changes
            if (typeof updateVisualization === 'function') {
                updateVisualization();
            }
            
            return {
                success: true,
                message: 'Color configuration updated successfully'
            };
        } else {
            return {
                success: false,
                message: 'No color configuration provided'
            };
        }
    } catch (error) {
        console.error('Error updating color configuration:', error);
        return {
            success: false,
            message: `Error updating colors: ${error.message}`
        };
    }
}

/**
 * Update global rendering parameters via API
 * @param {Object} globalVars - Global variables object
 * @returns {Object} Result object with success status
 */
function updateGlobalParameters(globalVars) {
    try {
        if (globalVars) {
            if (globalVars.sphereRadius !== undefined) {
                sphereRadius = globalVars.sphereRadius;
                console.log('Sphere radius updated via API:', sphereRadius);
            }
            if (globalVars.pipeRadius !== undefined) {
                pipeRadius = globalVars.pipeRadius;
                console.log('Pipe radius updated via API:', pipeRadius);
            }
            
            // Trigger a re-render to apply changes
            if (typeof updateVisualization === 'function') {
                updateVisualization();
            }
            
            return {
                success: true,
                message: 'Global parameters updated successfully'
            };
        } else {
            return {
                success: false,
                message: 'No global parameters provided'
            };
        }
    } catch (error) {
        console.error('Error updating global parameters:', error);
        return {
            success: false,
            message: `Error updating parameters: ${error.message}`
        };
    }
}

/**
 * Get current lighting configuration
 * @returns {Object} Current lighting configuration
 */
function getCurrentLightingConfiguration() {
    return window.lightConfig || null;
}

/**
 * Get current color configuration
 * @returns {Object} Current color configuration
 */
function getCurrentColorConfiguration() {
    return {
        nodeColors: NODE_COLORS,
        pipeColor: pipeColor,
        backgroundColor: backgroundColor
    };
}

/**
 * Get current global parameters
 * @returns {Object} Current global parameters
 */
function getCurrentGlobalParameters() {
    return {
        sphereRadius: sphereRadius,
        pipeRadius: pipeRadius
    };
}

/**
 * Get current edgeId array (legacy compatibility array that mirrors selectedEdges)
 * @returns {Array} Array of edge IDs (same as selectedEdges)
 */
function getEdgeId() {
    return window.edgeId ? [...window.edgeId] : [];
}

// Export the main function for external use
window.invokeContourTreeVisualizer = invokeContourTreeVisualizer;
window.addEdgeToSelection = addEdgeToSelection;
window.removeEdgeFromSelection = removeEdgeFromSelection;
window.clearEdgeSelection = clearEdgeSelection;
window.getSelectedEdges = getSelectedEdges;
window.getEdgeId = getEdgeId; // Legacy compatibility getter
window.updateSelectedEdges = updateSelectedEdges;

// Also expose the individual functions globally immediately
window.setSelectedEdges = setSelectedEdges;
window.updateGlobalVariables = updateGlobalVariables;
window.isVisualizationInitialized = isVisualizationInitialized;
window.initializeVisualization = initializeVisualization;
window.updateVisualization = updateVisualization;
window.updateLightingConfiguration = updateLightingConfiguration;
window.updateColorConfiguration = updateColorConfiguration;
window.updateGlobalParameters = updateGlobalParameters;
window.getCurrentLightingConfiguration = getCurrentLightingConfiguration;
window.getCurrentColorConfiguration = getCurrentColorConfiguration;
window.getCurrentGlobalParameters = getCurrentGlobalParameters;
window.getEdgeId = getEdgeId;