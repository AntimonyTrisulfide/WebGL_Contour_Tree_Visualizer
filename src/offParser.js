// src/offParser.js

let offData = ``; // Empty string to hold OFF data

let prevOffData; // Variable to store the OFF file data to compare the strings used by initialize.js

let applySpacing = false; // Flag to apply node spacing
let prevSpacing = false; // Previous state of applySpacing

let vertices, edges, vertexValues, vertexTypes;

let intermediatePoints = []; // Store intermediate points for L-shaped connections
let validVertices = []; // Filtered vertices for rendering
let validTypes = []; // Filtered vertex types for rendering

function calculateBoundingBox(vertices) {
    if(!vertices || vertices.length === 0){
        return {
            min: [-1, -1, -1],
            max: [1, 1, 1],
            center: [0, 0, 0],
            size: [2, 2, 2]
        };
    }

    const min = [Infinity, Infinity, Infinity];
    const max = [-Infinity, -Infinity, -Infinity];

    vertices.forEach(vertex => {
        for (let i = 0; i < 3; i++) {
            min[i] = Math.min(min[i], vertex[i]);
            max[i] = Math.max(max[i], vertex[i]);
        }
    });

    const center = [
        (min[0] + max[0]) / 2,
        (min[1] + max[1]) / 2,
        (min[2] + max[2]) / 2
    ];

    const size = [
        max[0] - min[0],
        max[1] - min[1],
        max[2] - min[2]
    ];

    return {
        min,
        max,
        center,
        size
    };
}

function applyNodeSpacing(vertices, sphereRadius, vertexValues, vertexTypes) {
    const minDistance = sphereRadius * 4;      // Normal minimum spacing
    const overlapDistance = sphereRadius * 2;  // Spacing for overlapping vertices
    const EPSILON = 1e-5;  // For floating point comparison
    let overlappingMinima = [];
    let overlappingSaddles = [];

    // Create array with original indices and metadata
    const workingVertices = vertices.map((vertex, originalIndex) => ({
        vertex: [...vertex],
        originalIndex,
        functionValue: vertexValues[originalIndex],
        type: vertexTypes[originalIndex],
        originalY: vertex[1],
        wasOverlapping: false,
        stackKey: `${vertex[0].toFixed(6)}_${vertex[2].toFixed(6)}`
    }));

    console.log("=== Original vertices ===");
    workingVertices.forEach(item => {
        console.log(`Vertex ${item.originalIndex}: [${item.vertex.join(', ')}], Value: ${item.functionValue}, Type: ${item.type}, Original Y: ${item.originalY}`);
    });

    // Group vertices by X,Z coordinates (stacks)
    const stacks = new Map();
    workingVertices.forEach(item => {
        if (!stacks.has(item.stackKey)) stacks.set(item.stackKey, []);
        stacks.get(item.stackKey).push(item);
    });

    console.log(`\n=== Found ${stacks.size} unique X,Z positions ===`);

    // Step 1: Detect overlaps within stacks and collect alerts
    stacks.forEach((stack, key) => {
        if (stack.length <= 1) return;

        // Sort by original Y for overlap detection
        stack.sort((a, b) => a.originalY - b.originalY);

        for (let i = 0; i < stack.length - 1; i++) {
            const distance = Math.abs(stack[i].originalY - stack[i + 1].originalY);
            if (distance < EPSILON) {
                if (stack[i].type === 'MINIMA' && stack[i + 1].type === 'MINIMA') {
                    overlappingMinima.push([stack[i].originalIndex, stack[i + 1].originalIndex]);
                } else if (stack[i].type === 'SADDLE' && stack[i + 1].type === 'SADDLE') {
                    overlappingSaddles.push([stack[i].originalIndex, stack[i + 1].originalIndex]);
                }
                stack[i].wasOverlapping = true;
                stack[i + 1].wasOverlapping = true;
            }
        }
    });

    // Step 2: Log warnings for overlapping minima and saddles
    if (overlappingMinima.length > 0) {
        overlappingMinima.forEach(([v1, v2]) => {
            console.log(`Warning: Minima vertices ${v1} and ${v2} are overlapping!`);
        });
    }
    if (overlappingSaddles.length > 0) {
        overlappingSaddles.forEach(([v1, v2]) => {
            console.log(`Warning: Saddle vertices ${v1} and ${v2} are overlapping!`);
        });
    }

    // Step 3: Assign global Y positions based on function value order
    const sortedVertices = workingVertices.slice().sort((a, b) => a.functionValue - b.functionValue);
    const yMapping = new Map(); // Maps original Y to new Y
    let currentY = Math.min(...workingVertices.map(v => v.originalY));

    sortedVertices.forEach((vertex, index) => {
        const prevVertex = index > 0 ? sortedVertices[index - 1] : null;
        const yKey = vertex.originalY.toFixed(6);
        const isOverlapping = vertex.wasOverlapping;
        const requiredSpacing = isOverlapping ? overlapDistance : minDistance;

        if (!yMapping.has(yKey)) {
            if (prevVertex) {
                const prevYKey = prevVertex.originalY.toFixed(6);
                const prevMappedY = yMapping.get(prevYKey) || prevVertex.vertex[1];
                const prevIsOverlapping = prevVertex.wasOverlapping;
                const prevRequiredSpacing = prevIsOverlapping ? overlapDistance : minDistance;
                // Use the original distance if it's greater than the required spacing
                const originalDistance = Math.abs(vertex.originalY - prevVertex.originalY);
                const spacing = Math.max(originalDistance, prevRequiredSpacing);
                const proposedY = prevMappedY + spacing;
                yMapping.set(yKey, proposedY);
                console.log(`Mapping original Y=${vertex.originalY} to Y=${proposedY} for group ${yKey} (spacing=${spacing}, originalDistance=${originalDistance})`);
            } else {
                yMapping.set(yKey, currentY);
                console.log(`Mapping original Y=${vertex.originalY} to Y=${currentY} for group ${yKey} (first group)`);
            }
        }

        vertex.vertex[1] = yMapping.get(yKey);
    });

    // Step 4: Handle stacks with same original Y to ensure distinct Y within stack
    stacks.forEach((stack, key) => {
        if (stack.length <= 1) return;

        // Group within stack by original Y
        const stackYGroups = new Map();
        stack.forEach(item => {
            const yKey = item.originalY.toFixed(6);
            if (!stackYGroups.has(yKey)) stackYGroups.set(yKey, []);
            stackYGroups.get(yKey).push(item);
        });

        stackYGroups.forEach((group, yKey) => {
            if (group.length <= 1) return;

            // Sort by function value within group
            group.sort((a, b) => a.functionValue - b.functionValue);

            // Assign distinct Y values within the group
            let baseY = yMapping.get(yKey);
            group.forEach((item, i) => {
                if (i === 0) {
                    item.vertex[1] = baseY;
                    console.log(`Adjusting vertex ${item.originalIndex} in stack ${key} to Y=${item.vertex[1]} (original Y=${item.originalY}, base position)`);
                    return;
                }
                const prevItem = group[i - 1];
                const isOverlapping = item.wasOverlapping || prevItem.wasOverlapping;
                const requiredSpacing = isOverlapping ? overlapDistance : minDistance;
                // Use the original distance if it's greater than the required spacing
                const originalDistance = Math.abs(item.originalY - prevItem.originalY);
                const spacing = Math.max(originalDistance, requiredSpacing);
                item.vertex[1] = prevItem.vertex[1] + spacing;
                console.log(`Adjusting vertex ${item.originalIndex} in stack ${key} to Y=${item.vertex[1]} (original Y=${item.originalY}, spacing=${spacing}, originalDistance=${originalDistance})`);
            });
        });
    });

    // Step 5: Create result array in original order
    const result = new Array(vertices.length);
    workingVertices.forEach(item => {
        result[item.originalIndex] = item.vertex;
    });

    console.log("\n=== Final vertices ===");
    result.forEach((vertex, i) => {
        console.log(`Vertex ${i}: [${vertex.join(', ')}]`);
    });

    return result;
}

function getNodeType(typeStr) {
    switch (typeStr.toUpperCase()) {
        case 'MINIMA': return NODE_TYPES.MINIMUM;
        case 'MAXIMA': return NODE_TYPES.MAXIMUM;
        case 'SADDLE': return NODE_TYPES.SADDLE;
        default:
            console.warn(`Unknown type: ${typeStr}, defaulting to SADDLE`);
            return NODE_TYPES.SADDLE;
    }
}

// Parse OFF data
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
    if(applySpacing === true) {
        vertices = applyNodeSpacing(vertices, sphereRadius, vertexValues, vertexTypes);
    }

    if(applySpacing === false){
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

function createLShapedConnections(vertices, edges, vertexTypes, vertexValues) {
    const lShapedEdges = [];
    intermediatePoints = []; // Clear previous intermediate points

    const EPSILON = 1e-6; // Small threshold for floating-point comparisons

    edges.forEach((edge, originalEdgeIndex) => {
        const startVertex = vertices[edge[0]];
        const endVertex = vertices[edge[1]];
        const startType = vertexTypes[edge[0]];
        const endType = vertexTypes[edge[1]];
        const startValue = vertexValues[edge[0]];
        const endValue = vertexValues[edge[1]];

        // Check if the connection is purely horizontal or vertical
        const isHorizontal = Math.abs(startVertex[1] - endVertex[1]) < EPSILON;
        const isVertical = Math.abs(startVertex[0] - endVertex[0]) < EPSILON && Math.abs(startVertex[2] - endVertex[2]) < EPSILON;

        if (isHorizontal || isVertical) {
            // Straight connection: add a single segment from vertex center to vertex center
            lShapedEdges.push({
                start: startVertex,
                end: endVertex,
                type: isHorizontal ? 'horizontal' : 'vertical',
                originalEdgeIndex: originalEdgeIndex + 1 // Store 1-based original edge index
            });
            return; // Skip L-shaped processing for this edge
        }

        // Determine which vertex is the saddle and which is the extremum
        let saddleVertex, extremumVertex, saddleValue, extremumValue;

        if (startType === NODE_TYPES.SADDLE && (endType === NODE_TYPES.MAXIMUM || endType === NODE_TYPES.MINIMUM)) {
            saddleVertex = startVertex;
            extremumVertex = endVertex;
            saddleValue = startValue;
            extremumValue = endValue;
        } else if (endType === NODE_TYPES.SADDLE && (startType === NODE_TYPES.MAXIMUM || startType === NODE_TYPES.MINIMUM)) {
            saddleVertex = endVertex;
            extremumVertex = startVertex;
            saddleValue = endValue;
            extremumValue = startValue;
        } else if (startType === NODE_TYPES.SADDLE && endType === NODE_TYPES.SADDLE) {
            // Both are saddles, choose based on distance from the main trunk (z=0, x=0)
            const startDistance = Math.sqrt(startVertex[0] * startVertex[0] + startVertex[2] * startVertex[2]);
            const endDistance = Math.sqrt(endVertex[0] * endVertex[0] + endVertex[2] * endVertex[2]);

            if (startDistance < endDistance) {
                saddleVertex = startVertex;
                extremumVertex = endVertex;
                saddleValue = startValue;
                extremumValue = endValue;
            } else {
                saddleVertex = endVertex;
                extremumVertex = startVertex;
                saddleValue = endValue;
                extremumValue = startValue;
            }
        } else {
            // Default case: treat as saddle-to-extremum with start as saddle
            saddleVertex = startVertex;
            extremumVertex = endVertex;
            saddleValue = startValue;
            extremumValue = endValue;
        }        // Create L-shaped connection based on function value relationship
        if (saddleValue > extremumValue) {
            // Lower to Higher: Vertical first, then horizontal
            const intermediatePoint = [
                extremumVertex[0], // Move horizontally to extremum's X position
                saddleVertex[1],  // Keep saddle's Y position (height)
                extremumVertex[2] // Move horizontally to extremum's Z position
            ];
            
            // Calculate directions for extension
            const horizontalDir = [
                intermediatePoint[0] - saddleVertex[0],
                intermediatePoint[1] - saddleVertex[1],
                intermediatePoint[2] - saddleVertex[2]
            ];
            const horizontalLength = Math.sqrt(horizontalDir[0]*horizontalDir[0] + horizontalDir[1]*horizontalDir[1] + horizontalDir[2]*horizontalDir[2]);
            const horizontalUnit = [horizontalDir[0]/horizontalLength, horizontalDir[1]/horizontalLength, horizontalDir[2]/horizontalLength];
            
            const verticalDir = [
                extremumVertex[0] - intermediatePoint[0],
                extremumVertex[1] - intermediatePoint[1],
                extremumVertex[2] - intermediatePoint[2]
            ];
            const verticalLength = Math.sqrt(verticalDir[0]*verticalDir[0] + verticalDir[1]*verticalDir[1] + verticalDir[2]*verticalDir[2]);
            const verticalUnit = [verticalDir[0]/verticalLength, verticalDir[1]/verticalLength, verticalDir[2]/verticalLength];
            
            // Extend horizontal segment (end extended by pipe radius)
            const extendedHorizontalEnd = [
                intermediatePoint[0] + horizontalUnit[0] * pipeRadius,
                intermediatePoint[1] + horizontalUnit[1] * pipeRadius,
                intermediatePoint[2] + horizontalUnit[2] * pipeRadius
            ];
            
            // Extend vertical segment (start extended by pipe radius)
            const extendedVerticalStart = [
                intermediatePoint[0] - verticalUnit[0] * pipeRadius,
                intermediatePoint[1] - verticalUnit[1] * pipeRadius,
                intermediatePoint[2] - verticalUnit[2] * pipeRadius
            ];            // Calculate 45-degree cutting plane normal for L-shaped downward connection
            // The plane normal is 45-degree upward from the horizontal cylinder direction
            const sqrt2 = Math.sqrt(2.0);
            const horizontalCutNormal = [
                horizontalUnit[0] / sqrt2,  // Normalize to maintain 45-degree angle
                -1.0 / sqrt2,                // 45-degree upward component
                horizontalUnit[2] / sqrt2   // Normalize to maintain 45-degree angle
            ];
            
            // Normalize the result
            const horizontalCutLength = Math.sqrt(horizontalCutNormal[0]*horizontalCutNormal[0] + 
                                                 horizontalCutNormal[1]*horizontalCutNormal[1] + 
                                                 horizontalCutNormal[2]*horizontalCutNormal[2]);
            const normalizedHorizontalCut = [
                horizontalCutNormal[0]/horizontalCutLength,
                horizontalCutNormal[1]/horizontalCutLength, 
                horizontalCutNormal[2]/horizontalCutLength
            ];

            // For vertical cylinder, use the same plane but ensure consistency
            // The cutting plane should be the same for both cylinders at the joint
            const verticalCutNormal = normalizedHorizontalCut;

            // First segment: saddle to extended intermediate (horizontal)
            lShapedEdges.push({
                start: saddleVertex,
                end: extendedHorizontalEnd,
                type: 'horizontal',
                originalEdgeIndex: originalEdgeIndex + 1,
                jointPoint: intermediatePoint,
                cutPlaneNormal: normalizedHorizontalCut // 45-degree upward cutting plane
            });

            // Second segment: extended intermediate to extremum (vertical)
            lShapedEdges.push({
                start: extendedVerticalStart,
                end: extremumVertex,
                type: 'vertical',
                originalEdgeIndex: originalEdgeIndex + 1,
                jointPoint: intermediatePoint,
                cutPlaneNormal: verticalCutNormal // Same plane, opposite orientation
            });

            // Store intermediate point for sphere rendering
            // intermediatePoints.push(intermediatePoint);        
        } else {
            // Higher to Lower: Horizontal first, then vertical
            const verticalIntermediatePoint = [
                saddleVertex[0],    // Keep saddle's X position
                extremumVertex[1],  // Move vertically to extremum's Y position
                saddleVertex[2]     // Keep saddle's Z position
            ];
            
            // Calculate directions for extension
            const verticalDir = [
                verticalIntermediatePoint[0] - saddleVertex[0],
                verticalIntermediatePoint[1] - saddleVertex[1],
                verticalIntermediatePoint[2] - saddleVertex[2]
            ];
            const verticalLength = Math.sqrt(verticalDir[0]*verticalDir[0] + verticalDir[1]*verticalDir[1] + verticalDir[2]*verticalDir[2]);
            const verticalUnit = [verticalDir[0]/verticalLength, verticalDir[1]/verticalLength, verticalDir[2]/verticalLength];
            
            const horizontalDir = [
                extremumVertex[0] - verticalIntermediatePoint[0],
                extremumVertex[1] - verticalIntermediatePoint[1],
                extremumVertex[2] - verticalIntermediatePoint[2]
            ];
            const horizontalLength = Math.sqrt(horizontalDir[0]*horizontalDir[0] + horizontalDir[1]*horizontalDir[1] + horizontalDir[2]*horizontalDir[2]);
            const horizontalUnit = [horizontalDir[0]/horizontalLength, horizontalDir[1]/horizontalLength, horizontalDir[2]/horizontalLength];
            
            // Extend vertical segment (end extended by pipe radius)
            const extendedVerticalEnd = [
                verticalIntermediatePoint[0] + verticalUnit[0] * pipeRadius,
                verticalIntermediatePoint[1] + verticalUnit[1] * pipeRadius,
                verticalIntermediatePoint[2] + verticalUnit[2] * pipeRadius
            ];
            
            // Extend horizontal segment (start extended by pipe radius)
            const extendedHorizontalStart = [
                verticalIntermediatePoint[0] - horizontalUnit[0] * pipeRadius,
                verticalIntermediatePoint[1] - horizontalUnit[1] * pipeRadius,
                verticalIntermediatePoint[2] - horizontalUnit[2] * pipeRadius
            ];            // Calculate 45-degree cutting plane normal for L-shaped upward connection
            // The plane normal is 45-degree downward from the horizontal cylinder direction
            const sqrt2 = Math.sqrt(2.0);
            const horizontalCutNormal = [
                horizontalUnit[0] / sqrt2,  // Normalize to maintain 45-degree angle
                1.0 / sqrt2,               // 45-degree downward component
                horizontalUnit[2] / sqrt2   // Normalize to maintain 45-degree angle
            ];
            
            // Normalize the result
            const horizontalCutLength = Math.sqrt(horizontalCutNormal[0]*horizontalCutNormal[0] + 
                                                 horizontalCutNormal[1]*horizontalCutNormal[1] + 
                                                 horizontalCutNormal[2]*horizontalCutNormal[2]);
            const normalizedHorizontalCut = [
                horizontalCutNormal[0]/horizontalCutLength,
                horizontalCutNormal[1]/horizontalCutLength, 
                horizontalCutNormal[2]/horizontalCutLength
            ];

            // For vertical cylinder, use the same plane to ensure consistency
            // The cutting plane should be the same for both cylinders at the joint
            const verticalCutNormal = normalizedHorizontalCut;

            // First segment: saddle to extended intermediate (vertical)
            lShapedEdges.push({
                start: saddleVertex,
                end: extendedVerticalEnd,
                type: 'vertical',
                originalEdgeIndex: originalEdgeIndex + 1,
                jointPoint: verticalIntermediatePoint,
                cutPlaneNormal: verticalCutNormal // 45-degree cutting plane
            });

            // Second segment: extended intermediate to extremum (horizontal)
            lShapedEdges.push({
                start: extendedHorizontalStart,
                end: extremumVertex,
                type: 'horizontal',
                originalEdgeIndex: originalEdgeIndex + 1,
                jointPoint: verticalIntermediatePoint,
                cutPlaneNormal: normalizedHorizontalCut // Same plane, for horizontal cutting
            });

            // Store intermediate point for sphere rendering
            // intermediatePoints.push(verticalIntermediatePoint);
        }
    });

    return lShapedEdges;
}