# Contour Tree Visualizer - Universal Parser System

A WebGL-based contour tree visualization library with an intelligent universal parser system that automatically detects file formats and routes to appropriate parsers.

## 🚀 Features

- **Universal Parser System**: Automatically detects and parses JSON, XML, CSV, and OFF files
- **Parser-Independent**: Use any data format with the extensible parser registry
- **WebGL-Powered**: High-performance 3D visualization
- **Interactive**: Click to select edges, multi-select with Ctrl
- **Configurable**: Customizable colors, lighting, and rendering parameters
- **Real-time**: Dynamic edge selection and information display
- **Extensible**: Easy to add support for new file formats

## 📁 Project Structure

```
WebGL_Contour_Tree_Visualizer/
├── index.html                 # Main demo with OFF file support
├── examples/
│   ├── custom-parser-example.html  # Universal parser demonstration
│   ├── sample-tree.json            # Sample JSON data
│   ├── sample-tree-data.xml        # Sample XML data
│   └── sample-tree.csv             # Sample CSV data
├── src/
│   ├── visualizerAPI.js       # Main API (parser-independent)
│   ├── universalParser.js     # Universal parser system
│   ├── offParser.js           # OFF file parser (built-in)
│   ├── initialize.js          # WebGL initialization
│   ├── renderer.js            # 3D rendering engine
│   ├── camera.js              # Camera controls
│   ├── mousePicking.js        # Mouse interaction
│   ├── edgeInfo.js            # Edge information display
│   └── ...                    # Other core files
└── lib/
    └── gl-matrix-min.js       # WebGL math library
```

## 🛠️ Quick Start

### 1. Universal Parser System (Recommended)

```javascript
// The universal parser automatically detects file types and uses the right parser
setupUniversalFileInput('fileInput', 
    function(treeData, filename) {
        // Success: visualize the parsed data
        visualizeTreeData(treeData, filename);
    },
    function(error, filename) {
        // Error: handle parsing errors
        console.error('Error parsing', filename, ':', error);
    }
);
```

### 2. Manual Parser Usage

```javascript
// Parse any supported file format
const treeData = parseFile('mydata.json', fileContent);

// Or use specific parsers
const treeData = parserRegistry['.json'](jsonContent);
const treeData = parserRegistry['.xml'](xmlContent);
const treeData = parserRegistry['.csv'](csvContent);
const treeData = parserRegistry['.off'](offContent);
```

### 3. Register Custom Parsers

```javascript
// Register a custom parser for .xyz files
registerParser('.xyz', function(data) {
    // Your custom parsing logic
    return {
        vertices: [[x, y, z], ...],
        edges: [[v1, v2], ...],
        vertexTypes: [0, 1, 2, ...],  // MIN, SADDLE, MAX
        vertexValues: [val1, val2, ...]
    };
});
```

## 📊 Supported File Formats

### JSON Format
```json
{
    "vertices": [[0, 0, 0], [1, 1, 0], ...],
    "edges": [[0, 1], [1, 2], ...],
    "vertexTypes": [0, 1, 2, ...],
    "vertexValues": [0.0, 0.5, 1.0, ...]
}
```

### XML Format
```xml
<?xml version="1.0" encoding="UTF-8"?>
<tree>
    <vertices>
        <vertex x="0" y="0" z="0" type="0" value="0.0"/>
        <vertex x="1" y="1" z="0" type="1" value="0.5"/>
    </vertices>
    <edges>
        <edge from="0" to="1"/>
    </edges>
</tree>
```

### CSV Format
```csv
VERTICES
0,0,0,0,0.0
1,1,0,1,0.5
EDGES
0,1
```

### OFF Format
```
OFF
4 3 0
0.0 0.0 0.0
1.0 0.0 0.0
0.0 1.0 0.0
0.0 0.0 1.0
2 0 1 0.0 0.5 MINIMUM SADDLE
2 1 2 0.5 1.0 SADDLE MAXIMUM
2 2 3 1.0 0.2 MAXIMUM MINIMUM
```

## 🎯 API Reference

### Universal Parser Functions

#### `setupUniversalFileInput(elementId, onSuccess, onError)`
Set up automatic file parsing for any file input element.

#### `parseFile(filename, data)`
Parse data based on file extension.

#### `registerParser(extension, parserFunction)`
Register a custom parser for a specific file extension.

### Core Visualization Functions

#### `invokeContourTreeVisualizer(treeData, lightConfig, colors, globalVars, edgeIds)`
Main function to initialize/update the visualization.

#### `updateSelectedEdges(edgeIds)`
Update selected edges and refresh visualization.

#### `clearEdgeSelection()`
Clear all selected edges.

## 🔧 Advanced Usage

### Custom Parser Registration
```javascript
// Register a binary format parser
registerParser('.bin', function(data) {
    const buffer = new ArrayBuffer(data.length);
    const view = new DataView(buffer);
    
    // Your binary parsing logic here
    return {
        vertices: parsedVertices,
        edges: parsedEdges,
        vertexTypes: parsedTypes,
        vertexValues: parsedValues
    };
});
```

### Dynamic Configuration
```javascript
// Update visualization parameters at runtime
updateLightingConfiguration({
    directions: { key: [0.5, 0.3, 0.8] },
    colors: { key: [1.0, 0.9, 0.7] }
});

updateColorConfiguration({
    nodeColors: {
        0: [0.0, 0.0, 1.0, 1.0],  // Blue minima
        1: [0.0, 1.0, 1.0, 1.0],  // Cyan saddles
        2: [1.0, 0.0, 0.0, 1.0]   // Red maxima
    }
});
```

## 🎮 Controls

- **Left Mouse Drag**: Rotate camera
- **Mouse Click**: Select/deselect edges
- **Ctrl + Click**: Multi-select edges
- **Mouse Wheel**: Zoom in/out
- **W/S**: Zoom in/out (keyboard)
- **T/G**: Pan camera up/down
- **R**: Reset camera
- **X**: Reset camera target
- **P**: Toggle edge spacing

## 🧪 Testing

1. **Universal Parser**: Open `examples/custom-parser-example.html`
2. **Test Files**: Use the provided sample files (JSON, XML, CSV)
3. **Custom Data**: Create your own files following the format specifications
4. **Sample Generator**: Use the built-in sample generator for testing

## 📦 What's Fixed

✅ **Complete Parser Independence**: No more hard dependencies on specific parsers  
✅ **Universal File Support**: Automatic detection and parsing of multiple formats  
✅ **Robust Error Handling**: Graceful handling of malformed data and missing elements  
✅ **Spacing Toggle Fix**: P key and button functionality now works in all contexts  
✅ **Instance Data Fix**: Proper sphere and pipe rendering for all file formats  
✅ **File Switching Fix**: Clean state management when switching between files  
✅ **Memory Management**: Proper cleanup of VAOs and buffers  
✅ **Clean Architecture**: Modular design with extensible parser registry  
✅ **Backward Compatibility**: Existing OFF files still work perfectly  

## 🚢 Ready to Ship!

This library is now **truly universal** and ready for production use. The universal parser system makes it:

- **Format Agnostic**: Works with any structured data format
- **User Friendly**: Automatic file type detection
- **Developer Friendly**: Easy to extend with custom parsers
- **Error Resilient**: Comprehensive error handling and reporting
- **Performance Optimized**: Efficient parsing and rendering pipeline

Users can now simply drop in their data files (JSON, XML, CSV, OFF, or custom formats) and the system will automatically parse and visualize them!
