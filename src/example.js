// Example usage of the Contour Tree Visualizer API

// Wait for the visualizer to be ready
document.addEventListener('DOMContentLoaded', function() {
    // Example function to demonstrate the API usage
    function demonstrateMultipleEdgeSelection() {
        console.log('Demonstrating multiple edge selection...');
        
        // Example tree data structure (this would normally come from your parser)
        const exampleTreeData = {
            vertices: [
                [0, 0, 0],
                [1, 0, 0],
                [2, 0, 0],
                [0, 1, 0],
                [1, 1, 0],
                [2, 1, 0]
            ],
            edges: [
                [0, 1],
                [1, 2],
                [0, 3],
                [1, 4],
                [2, 5],
                [3, 4],
                [4, 5]
            ],
            vertexTypes: [0, 1, 2, 0, 1, 2], // MINIMUM, SADDLE, MAXIMUM, etc.
            vertexValues: [0.0, 0.5, 1.0, 0.2, 0.7, 0.9]
        };
        
        // Example light positions
        const lightPositions = [
            [2, 2, 2],
            [-2, -2, 2]
        ];
        
        // Example colors
        const colors = {
            nodeColors: {
                0: [0.106, 0.239, 0.506],   // Blue for minimum
                1: [0.216, 0.961, 0.922],   // Cyan for saddle
                2: [0.702, 0.055, 0.086],   // Red for maximum
                3: [0.8, 0.8, 0.8]          // Gray for intermediate
            },
            pipeColor: [0.8, 0.8, 0.8],
            backgroundColor: [0.9, 0.9, 0.9, 1.0]
        };
        
        // Example global variables
        const globalVars = {
            sphereRadius: 0.025,
            pipeRadius: 0.005
        };
        
        // Example: Select multiple edges (edges 1, 3, and 5)
        const selectedEdgeIds = [1, 3, 5];
        
        // Call the main visualizer function
        if (typeof invokeContourTreeVisualizer === 'function') {
            const result = invokeContourTreeVisualizer(
                exampleTreeData,
                lightPositions,
                colors,
                globalVars,
                selectedEdgeIds
            );
            
            console.log('Visualizer result:', result);
            
            // Example: Add another edge to the selection after 2 seconds
            setTimeout(() => {
                if (typeof addEdgeToSelection === 'function') {
                    addEdgeToSelection(2);
                    console.log('Added edge 2 to selection');
                }
            }, 2000);
            
            // Example: Remove an edge from selection after 4 seconds
            setTimeout(() => {
                if (typeof removeEdgeFromSelection === 'function') {
                    removeEdgeFromSelection(1);
                    console.log('Removed edge 1 from selection');
                }
            }, 4000);
            
            // Example: Clear all selections after 6 seconds
            setTimeout(() => {
                if (typeof clearEdgeSelection === 'function') {
                    clearEdgeSelection();
                    console.log('Cleared all edge selections');
                }
            }, 6000);
        }
    }
    
    // Add a button to test the API
    function addTestButton() {
        const controlsDiv = document.querySelector('.controls');
        if (controlsDiv) {
            const testButton = document.createElement('button');
            testButton.textContent = 'Test Multiple Edge Selection';
            testButton.className = 'reset-button';
            testButton.style.marginLeft = '10px';
            testButton.onclick = demonstrateMultipleEdgeSelection;
            controlsDiv.appendChild(testButton);
        }
    }
    
    // Add test button
    addTestButton();
    
    // Add keyboard shortcut for testing
    document.addEventListener('keydown', function(e) {
        if (e.key === 'M' && e.ctrlKey) {
            e.preventDefault();
            demonstrateMultipleEdgeSelection();
        }
    });
    
    console.log('Multiple edge selection demo ready!');
    console.log('- Click edges while holding Ctrl to select multiple');
    console.log('- Press Ctrl+M to run the API demonstration');
    console.log('- Use the "Test Multiple Edge Selection" button to see the API in action');
});

// Example of how to integrate with external systems
function integrateWithExternalSystem() {
    // This function shows how an external system might use the visualizer
    
    // Get data from external source (database, file, API, etc.)
    const externalData = getDataFromExternalSource();
    
    // Transform data to visualizer format
    const treeData = transformToVisualizerFormat(externalData);
    
    // Get current selected edges from external system
    const currentSelection = getSelectedEdgesFromExternalSystem();
    
    // Invoke the visualizer
    const result = invokeContourTreeVisualizer(
        treeData,
        externalData.lightPositions,
        externalData.colors,
        externalData.globalVars,
        currentSelection
    );
    
    // Update external system with new selection
    if (result.success) {
        updateExternalSystemSelection(result.selectedEdges);
    }
    
    return result;
}

// Mock functions for the example above
function getDataFromExternalSource() {
    // In a real implementation, this would fetch data from your system
    return {
        nodes: [],
        edges: [],
        lightPositions: [],
        colors: {},
        globalVars: {}
    };
}

function transformToVisualizerFormat(data) {
    // Transform your data format to the visualizer's expected format
    return {
        vertices: data.nodes,
        edges: data.edges,
        vertexTypes: data.nodeTypes,
        vertexValues: data.nodeValues
    };
}

function getSelectedEdgesFromExternalSystem() {
    // Get currently selected edges from your system
    return [];
}

function updateExternalSystemSelection(selectedEdges) {
    // Update your external system with the new selection
    console.log('Updated external system with edges:', selectedEdges);
}

// Export functions for external use
window.integrateWithExternalSystem = integrateWithExternalSystem;
