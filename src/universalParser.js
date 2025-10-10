// Parser-independent input system
// This system can detect file types and route to appropriate parsers

// // Parse OFF data
function parseOFFData(data) {
    const lines = data.trim().split('\n').map(line => line.trim());
    
    // Skip the OFF header
    let currentLine = 1;
    
    // Parse counts (vertices, faces, edges)
    const counts = lines[currentLine].split(/\s+/).map(Number);
    const numVertices = counts[0];
    const numFaces = counts[1];
    currentLine++;
    
    // Parse vertices (only coordinates now)
    let vertices = [];
    
    for (let i = 0; i < numVertices; i++) {
        const parts = lines[currentLine].split(/\s+/);
        
        // Extract coordinates (first 3 values)
        const coords = [
            parseFloat(parts[0]),
            parseFloat(parts[1]),
            parseFloat(parts[2])
        ];
        
        vertices.push(coords);
        currentLine++;
    }
    
    // Initialize arrays for vertex data
    const vertexValues = new Array(numVertices);
    const vertexTypes = new Array(numVertices);
    
    // Parse edges and extract vertex data
    const edges = [];
    for (let i = 0; i < numFaces; i++) {
        // Format 2 v1 v2 val1 val2 type1 type2
        const parts = lines[currentLine].split(/\s+/);
        if (parts.length < 7 || parts[0] !== '2') {
            console.warn(`Skipping malformed or unsupported edge line: ${lines[currentLine - 1]}`);
            continue;
        }

        const v1 = parseInt(parts[1]);
        const v2 = parseInt(parts[2]);
        const val1 = parseFloat(parts[3]);
        const val2 = parseFloat(parts[4]);
        const type1 = getNodeType(parts[5]);
        const type2 = getNodeType(parts[6]);

        // Assign vertex 1
        if (vertexValues[v1] === undefined) {
            vertexValues[v1] = val1;
            vertexTypes[v1] = type1;
        }

        // Assign vertex 2
        if (vertexValues[v2] === undefined) {
            vertexValues[v2] = val2;
            vertexTypes[v2] = type2;
        }

        edges.push([v1, v2]);
        currentLine++;
    }
    
    // Fill any missing vertex data with defaults
    for (let i = 0; i < numVertices; i++) {
        if (vertexValues[i] === undefined) {
            vertexValues[i] = 0.0;
            vertexTypes[i] = NODE_TYPES.SADDLE;
            console.warn(`Missing data for vertex ${i}, using defaults`);
        }
    }  

    // Apply node spacing to vertices
    if(window.applySpacing === true) {
        vertices = applyNodeSpacing(vertices, sphereRadius, vertexValues, vertexTypes);
    }

    if(window.applySpacing === false){
        // use original vertices
        vertices = vertices.map(vertex => [
            vertex[0],
            vertex[1],
            vertex[2]
        ]);
    }

    validVertices = [...vertices];
    validTypes = [...vertexTypes];  // Vertex Types now get from OFF data 

    
    return { 
        vertices, 
        edges, 
        vertexValues, 
        vertexTypes 
    };
}

// Registry of parsers - Only OFF format supported
const parserRegistry = {
    '.off': function(data) {
        // Use the built-in OFF parser
        if (typeof parseOFFData === 'function') {
            return parseOFFData(data);
        }
        throw new Error('OFF parser not available');
    }
};

// Register a custom parser
function registerParser(extension, parserFunction) {
    parserRegistry[extension.toLowerCase()] = parserFunction;
    console.log(`Parser registered for ${extension} files`);
}

// Get file extension
function getFileExtension(filename) {
    return filename.toLowerCase().substring(filename.lastIndexOf('.'));
}

// Parse file based on extension
function parseFile(filename, data) {
    const extension = getFileExtension(filename);
    
    if (parserRegistry[extension]) {
        console.log(`Using parser for ${extension} files`);
        const result = parserRegistry[extension](data);
        
        // Store original vertices for spacing toggle functionality
        if (result && result.vertices) {
            result.originalVertices = result.vertices.map(v => [...v]); // Deep copy
        }
        
        return result;
    } else {
        throw new Error(`No parser available for ${extension} files`);
    }
}

// Universal file input handler
function setupUniversalFileInput(inputElementId, onSuccess, onError) {
    const fileInput = document.getElementById(inputElementId);
    
    if (!fileInput) {
        console.log(`[INFO] File input element ${inputElementId} not found`);
        return;
    }
    
    fileInput.addEventListener('change', function() {
        const file = this.files[0];
        if (!file) {
            return;
        }
        
        const reader = new FileReader();
        reader.onload = function(e) {
            try {
                const treeData = parseFile(file.name, e.target.result);
                console.log(`✅ Successfully parsed ${file.name}:`, treeData);
                
                if (onSuccess) {
                    onSuccess(treeData, file.name);
                }
            } catch (error) {
                console.error(`❌ Error parsing ${file.name}:`, error);
                
                if (onError) {
                    onError(error, file.name);
                } else {
                    alert(`Error parsing ${file.name}: ${error.message}`);
                }
            }
        };
        
        reader.readAsText(file);
    });
}

// Apply spacing to any tree data (universal functionality)
function applySpacingToTreeData(treeData, enableSpacing = false) {
    if (!treeData || !treeData.vertices) {
        console.warn('No tree data available for spacing application');
        return treeData;
    }
    
    let vertices = treeData.originalVertices ? [...treeData.originalVertices] : [...treeData.vertices];
    
    if (enableSpacing && typeof window.applyNodeSpacing === 'function') {
        console.log('[INFO] Applying universal node spacing');
        vertices = window.applyNodeSpacing(
            vertices,
            window.sphereRadius || 0.1,
            treeData.vertexValues,
            treeData.vertexTypes
        );
    } else if (!enableSpacing) {
        console.log('[INFO] Using original vertex positions (no spacing)');
        // Use original vertices without spacing
        vertices = vertices.map(vertex => [vertex[0], vertex[1], vertex[2]]);
    }
    
    return {
        ...treeData,
        vertices: vertices
    };
}

// Export functions for global use
window.registerParser = registerParser;
window.parseFile = parseFile;
window.setupUniversalFileInput = setupUniversalFileInput;
window.parserRegistry = parserRegistry;
window.applySpacingToTreeData = applySpacingToTreeData;

console.log('🔧 OFF parser system loaded');
console.log('📁 Supported format: OFF');
