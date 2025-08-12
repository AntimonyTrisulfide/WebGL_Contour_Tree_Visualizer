// src/menu.js
// Menu system for the Contour Tree Visualizer - API-driven architecture

/**
 * Menu system for the contour tree visualizer
 * All UI interactions are routed through the visualizer API
 */

class MenuSystem {
    constructor() {
        this.isInitialized = false;
        this.currentFileName = '';
        this.isOpen = false;
        this.sectionStates = {};
        
        // Initialize when DOM is ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.initialize());
        } else {
            this.initialize();
        }
    }

    initialize() {
        try {
            this.createMenuElements();
            this.setupEventListeners();
            this.isInitialized = true;
            console.log('Menu system initialized successfully');
        } catch (error) {
            console.error('Error initializing menu system:', error);
        }
    }

    createMenuElements() {
        // Create menu toggle button
        const menuToggle = document.createElement('button');
        menuToggle.id = 'menuToggle';
        menuToggle.className = 'menu-toggle';
        menuToggle.innerHTML = '⚙';
        menuToggle.title = 'Settings';
        
        // Create sidebar
        const sidebar = document.createElement('div');
        sidebar.id = 'settingsSidebar';
        sidebar.className = 'settings-sidebar';
        
        sidebar.innerHTML = `
            <div class="sidebar-header">
                <h2>Settings</h2>
                <button class="sidebar-close" id="sidebarClose">×</button>
            </div>
            <div class="sidebar-content">
                ${this.createVisualizationSection()}
                ${this.createColorSection()}
                ${this.createLightingSection()}
                ${this.createFileInfoSection()}
            </div>
            <div class="menu-footer">
                <button class="menu-button primary" id="resetAllSettings">Reset All</button>
                <button class="menu-button secondary" id="exportSettings">Export</button>
            </div>
        `;
        
        // Add to DOM
        const controlsDiv = document.querySelector('.controls');
        if (controlsDiv) {
            controlsDiv.appendChild(menuToggle);
        } else {
            document.body.appendChild(menuToggle);
        }
        
        document.body.appendChild(sidebar);
    }

    createVisualizationSection() {
        return `
            <div class="menu-section">
                <div class="section-header" data-section="visualization">
                    Visualization
                </div>
                <div class="section-content" data-section-content="visualization">
                    <div class="control-group">
                        <label class="control-label">Sphere Radius</label>
                        <div class="slider-container">
                            <input type="range" class="control-slider" id="sphereRadiusSlider" 
                                   min="0.005" max="0.1" step="0.001" value="0.025">
                            <span class="slider-value" id="sphereRadiusValue">0.025</span>
                        </div>
                    </div>
                    <div class="control-group">
                        <label class="control-label">Pipe Radius</label>
                        <div class="slider-container">
                            <input type="range" class="control-slider" id="pipeRadiusSlider" 
                                   min="0.001" max="0.02" step="0.0005" value="0.005">
                            <span class="slider-value" id="pipeRadiusValue">0.005</span>
                        </div>
                    </div>
                    <div class="control-group">
                        <label class="control-label">Background Color</label>
                        <div class="color-container">
                            <input type="color" class="control-color" id="backgroundColorPicker" value="#e6e6e6">
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    createColorSection() {
        return `
            <div class="menu-section">
                <div class="section-header" data-section="colors">
                    Colors
                </div>
                <div class="section-content" data-section-content="colors">
                    <div class="control-group">
                        <label class="control-label">Minimum Nodes</label>
                        <div class="color-container">
                            <input type="color" class="control-color" id="minimumColorPicker" value="#1b3d81">
                        </div>
                    </div>
                    <div class="control-group">
                        <label class="control-label">Saddle Nodes</label>
                        <div class="color-container">
                            <input type="color" class="control-color" id="saddleColorPicker" value="#37f5eb">
                        </div>
                    </div>
                    <div class="control-group">
                        <label class="control-label">Maximum Nodes</label>
                        <div class="color-container">
                            <input type="color" class="control-color" id="maximumColorPicker" value="#b30e16">
                        </div>
                    </div>
                    <div class="control-group">
                        <label class="control-label">Pipe Color</label>
                        <div class="color-container">
                            <input type="color" class="control-color" id="pipeColorPicker" value="#cccccc">
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    createLightingSection() {
        return `
            <div class="menu-section">
                <div class="section-header" data-section="lighting">
                    Lighting
                </div>
                <div class="section-content" data-section-content="lighting">
                    <div class="menu-subsection">
                        <div class="subsection-header">Light Direction</div>
                        <div class="subsection-content">
                            <div class="control-group">
                                <label class="control-label">Light X</label>
                                <div class="slider-container">
                                    <input type="range" class="control-slider" id="lightXSlider" 
                                           min="-2" max="2" step="0.1" value="0.5">
                                    <span class="slider-value" id="lightXValue">0.5</span>
                                </div>
                            </div>
                            <div class="control-group">
                                <label class="control-label">Light Y</label>
                                <div class="slider-container">
                                    <input type="range" class="control-slider" id="lightYSlider" 
                                           min="-2" max="2" step="0.1" value="1.0">
                                    <span class="slider-value" id="lightYValue">1.0</span>
                                </div>
                            </div>
                            <div class="control-group">
                                <label class="control-label">Light Z</label>
                                <div class="slider-container">
                                    <input type="range" class="control-slider" id="lightZSlider" 
                                           min="-2" max="2" step="0.1" value="1.0">
                                    <span class="slider-value" id="lightZValue">1.0</span>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="menu-subsection">
                        <div class="subsection-header">Light Color</div>
                        <div class="subsection-content">
                            <div class="control-group">
                                <label class="control-label">Light Color</label>
                                <div class="color-container">
                                    <input type="color" class="control-color" id="lightColorPicker" value="#ffffff">
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    createFileInfoSection() {
        return `
            <div class="menu-section">
                <div class="section-header" data-section="fileinfo">
                    File Information
                </div>
                <div class="section-content" data-section-content="fileinfo">
                    <div class="file-info">
                        <div class="info-item">
                            <span>File:</span>
                            <span id="currentFileName">None</span>
                        </div>
                        <div class="info-item">
                            <span>Vertices:</span>
                            <span id="vertexCount">0</span>
                        </div>
                        <div class="info-item">
                            <span>Edges:</span>
                            <span id="edgeCount">0</span>
                        </div>
                        <div class="info-item">
                            <span>Selected:</span>
                            <span id="selectedCount">0</span>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    setupEventListeners() {
        // Menu toggle
        const menuToggle = document.getElementById('menuToggle');
        const sidebar = document.getElementById('settingsSidebar');
        const sidebarClose = document.getElementById('sidebarClose');
        
        if (menuToggle) {
            menuToggle.addEventListener('click', () => this.toggleMenu());
        }
        
        if (sidebarClose) {
            sidebarClose.addEventListener('click', () => this.closeMenu());
        }
        
        // Section toggles
        document.querySelectorAll('.section-header').forEach(header => {
            header.addEventListener('click', () => this.toggleSection(header.dataset.section));
        });
        
        // Sliders
        this.setupSliders();
        
        // Color pickers
        this.setupColorPickers();
        
        // Footer buttons
        this.setupFooterButtons();
    }

    setupSliders() {
        // Sphere radius
        const sphereRadiusSlider = document.getElementById('sphereRadiusSlider');
        const sphereRadiusValue = document.getElementById('sphereRadiusValue');
        if (sphereRadiusSlider) {
            sphereRadiusSlider.addEventListener('input', (e) => {
                const value = parseFloat(e.target.value);
                sphereRadiusValue.textContent = value.toFixed(3);
                this.updateGlobalParameters({ sphereRadius: value });
            });
        }
        
        // Pipe radius
        const pipeRadiusSlider = document.getElementById('pipeRadiusSlider');
        const pipeRadiusValue = document.getElementById('pipeRadiusValue');
        if (pipeRadiusSlider) {
            pipeRadiusSlider.addEventListener('input', (e) => {
                const value = parseFloat(e.target.value);
                pipeRadiusValue.textContent = value.toFixed(4);
                this.updateGlobalParameters({ pipeRadius: value });
            });
        }
        
        // Light direction sliders
        const lightXSlider = document.getElementById('lightXSlider');
        const lightXValue = document.getElementById('lightXValue');
        if (lightXSlider) {
            lightXSlider.addEventListener('input', (e) => {
                const value = parseFloat(e.target.value);
                lightXValue.textContent = value.toFixed(1);
                this.updateLightDirection();
            });
        }
        
        const lightYSlider = document.getElementById('lightYSlider');
        const lightYValue = document.getElementById('lightYValue');
        if (lightYSlider) {
            lightYSlider.addEventListener('input', (e) => {
                const value = parseFloat(e.target.value);
                lightYValue.textContent = value.toFixed(1);
                this.updateLightDirection();
            });
        }
        
        const lightZSlider = document.getElementById('lightZSlider');
        const lightZValue = document.getElementById('lightZValue');
        if (lightZSlider) {
            lightZSlider.addEventListener('input', (e) => {
                const value = parseFloat(e.target.value);
                lightZValue.textContent = value.toFixed(1);
                this.updateLightDirection();
            });
        }
    }

    setupColorPickers() {
        // Background color
        const backgroundColorPicker = document.getElementById('backgroundColorPicker');
        if (backgroundColorPicker) {
            backgroundColorPicker.addEventListener('change', (e) => {
                const color = this.hexToRgb(e.target.value);
                this.updateGlobalParameters({ backgroundColor: [...color, 1.0] });
            });
        }
        
        // Node colors
        const minimumColorPicker = document.getElementById('minimumColorPicker');
        if (minimumColorPicker) {
            minimumColorPicker.addEventListener('change', (e) => {
                const color = this.hexToRgb(e.target.value);
                this.updateNodeColors({ minimum: color });
            });
        }
        
        const saddleColorPicker = document.getElementById('saddleColorPicker');
        if (saddleColorPicker) {
            saddleColorPicker.addEventListener('change', (e) => {
                const color = this.hexToRgb(e.target.value);
                this.updateNodeColors({ saddle: color });
            });
        }
        
        const maximumColorPicker = document.getElementById('maximumColorPicker');
        if (maximumColorPicker) {
            maximumColorPicker.addEventListener('change', (e) => {
                const color = this.hexToRgb(e.target.value);
                this.updateNodeColors({ maximum: color });
            });
        }
        
        const pipeColorPicker = document.getElementById('pipeColorPicker');
        if (pipeColorPicker) {
            pipeColorPicker.addEventListener('change', (e) => {
                const color = this.hexToRgb(e.target.value);
                this.updateGlobalParameters({ pipeColor: color });
            });
        }
        
        // Light color
        const lightColorPicker = document.getElementById('lightColorPicker');
        if (lightColorPicker) {
            lightColorPicker.addEventListener('change', (e) => {
                const color = this.hexToRgb(e.target.value);
                this.updateLightColor(color);
            });
        }
    }

    setupFooterButtons() {
        const resetAllButton = document.getElementById('resetAllSettings');
        const exportButton = document.getElementById('exportSettings');
        
        if (resetAllButton) {
            resetAllButton.addEventListener('click', () => this.resetAllSettings());
        }
        
        if (exportButton) {
            exportButton.addEventListener('click', () => this.exportSettings());
        }
    }

    toggleMenu() {
        this.isOpen = !this.isOpen;
        const menuToggle = document.getElementById('menuToggle');
        const sidebar = document.getElementById('settingsSidebar');
        
        if (this.isOpen) {
            menuToggle.classList.add('open');
            sidebar.classList.add('open');
        } else {
            menuToggle.classList.remove('open');
            sidebar.classList.remove('open');
        }
    }

    closeMenu() {
        this.isOpen = false;
        const menuToggle = document.getElementById('menuToggle');
        const sidebar = document.getElementById('settingsSidebar');
        
        menuToggle.classList.remove('open');
        sidebar.classList.remove('open');
    }

    toggleSection(sectionName) {
        const header = document.querySelector(`[data-section="${sectionName}"]`);
        const content = document.querySelector(`[data-section-content="${sectionName}"]`);
        
        if (header && content) {
            const isCollapsed = header.classList.contains('collapsed');
            
            if (isCollapsed) {
                header.classList.remove('collapsed');
                content.classList.remove('collapsed');
                this.sectionStates[sectionName] = false;
            } else {
                header.classList.add('collapsed');
                content.classList.add('collapsed');
                this.sectionStates[sectionName] = true;
            }
        }
    }

    // API Integration Methods
    updateGlobalParameters(params) {
        if (typeof updateGlobalParameters === 'function') {
            updateGlobalParameters(params);
        } else {
            console.warn('updateGlobalParameters API function not available');
        }
    }

    updateNodeColors(colors) {
        if (typeof updateColorConfiguration === 'function') {
            updateColorConfiguration(colors);
        } else {
            console.warn('updateColorConfiguration API function not available');
        }
    }

    updateLightDirection() {
        const lightX = parseFloat(document.getElementById('lightXSlider').value);
        const lightY = parseFloat(document.getElementById('lightYSlider').value);
        const lightZ = parseFloat(document.getElementById('lightZSlider').value);
        
        if (typeof updateLightingConfiguration === 'function') {
            updateLightingConfiguration({
                lightDirection: [lightX, lightY, lightZ]
            });
        } else {
            console.warn('updateLightingConfiguration API function not available');
        }
    }

    updateLightColor(color) {
        if (typeof updateLightingConfiguration === 'function') {
            updateLightingConfiguration({
                lightColor: color
            });
        } else {
            console.warn('updateLightingConfiguration API function not available');
        }
    }

    resetAllSettings() {
        // Reset all sliders and color pickers to default values
        document.getElementById('sphereRadiusSlider').value = '0.025';
        document.getElementById('sphereRadiusValue').textContent = '0.025';
        
        document.getElementById('pipeRadiusSlider').value = '0.005';
        document.getElementById('pipeRadiusValue').textContent = '0.005';
        
        document.getElementById('backgroundColorPicker').value = '#e6e6e6';
        document.getElementById('minimumColorPicker').value = '#1b3d81';
        document.getElementById('saddleColorPicker').value = '#37f5eb';
        document.getElementById('maximumColorPicker').value = '#b30e16';
        document.getElementById('pipeColorPicker').value = '#cccccc';
        
        document.getElementById('lightXSlider').value = '0.5';
        document.getElementById('lightXValue').textContent = '0.5';
        document.getElementById('lightYSlider').value = '1.0';
        document.getElementById('lightYValue').textContent = '1.0';
        document.getElementById('lightZSlider').value = '1.0';
        document.getElementById('lightZValue').textContent = '1.0';
        document.getElementById('lightColorPicker').value = '#ffffff';
        
        // Apply defaults through API
        this.updateGlobalParameters({
            sphereRadius: 0.025,
            pipeRadius: 0.005,
            backgroundColor: [0.9, 0.9, 0.9, 1.0],
            pipeColor: [0.8, 0.8, 0.8]
        });
        
        this.updateNodeColors({
            minimum: [0.106, 0.239, 0.506],
            saddle: [0.216, 0.961, 0.922],
            maximum: [0.702, 0.055, 0.086]
        });
        
        this.updateLightDirection();
        this.updateLightColor([1.0, 1.0, 1.0]);
    }

    exportSettings() {
        const settings = {
            sphereRadius: parseFloat(document.getElementById('sphereRadiusSlider').value),
            pipeRadius: parseFloat(document.getElementById('pipeRadiusSlider').value),
            backgroundColor: this.hexToRgb(document.getElementById('backgroundColorPicker').value),
            minimumColor: this.hexToRgb(document.getElementById('minimumColorPicker').value),
            saddleColor: this.hexToRgb(document.getElementById('saddleColorPicker').value),
            maximumColor: this.hexToRgb(document.getElementById('maximumColorPicker').value),
            pipeColor: this.hexToRgb(document.getElementById('pipeColorPicker').value),
            lightDirection: [
                parseFloat(document.getElementById('lightXSlider').value),
                parseFloat(document.getElementById('lightYSlider').value),
                parseFloat(document.getElementById('lightZSlider').value)
            ],
            lightColor: this.hexToRgb(document.getElementById('lightColorPicker').value)
        };
        
        const blob = new Blob([JSON.stringify(settings, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'contour_tree_settings.json';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    // Utility methods
    hexToRgb(hex) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? [
            parseInt(result[1], 16) / 255,
            parseInt(result[2], 16) / 255,
            parseInt(result[3], 16) / 255
        ] : [1, 1, 1];
    }

    rgbToHex(r, g, b) {
        return "#" + ((1 << 24) + (Math.round(r * 255) << 16) + (Math.round(g * 255) << 8) + Math.round(b * 255)).toString(16).slice(1);
    }

    // Public methods for external access
    updateCurrentFileName(fileName) {
        this.currentFileName = fileName;
        const fileNameElement = document.getElementById('currentFileName');
        if (fileNameElement) {
            fileNameElement.textContent = fileName || 'None';
        }
    }

    updateFileInfo(vertexCount, edgeCount, selectedCount) {
        const vertexCountElement = document.getElementById('vertexCount');
        const edgeCountElement = document.getElementById('edgeCount');
        const selectedCountElement = document.getElementById('selectedCount');
        
        if (vertexCountElement) vertexCountElement.textContent = vertexCount || 0;
        if (edgeCountElement) edgeCountElement.textContent = edgeCount || 0;
        if (selectedCountElement) selectedCountElement.textContent = selectedCount || 0;
    }

    // Update menu when new file is loaded
    updateOnFileLoad(fileName, vertexCount, edgeCount) {
        this.updateCurrentFileName(fileName);
        this.updateFileInfo(vertexCount, edgeCount, 0);
    }

    // Update menu when edge selection changes
    updateOnEdgeSelectionChange(selectedCount) {
        this.updateFileInfo(
            document.getElementById('vertexCount').textContent,
            document.getElementById('edgeCount').textContent,
            selectedCount
        );
    }
}

// Initialize menu system
let menuSystem = null;

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        menuSystem = new MenuSystem();
        // Make it globally accessible
        window.menuSystem = menuSystem;
    });
} else {
    menuSystem = new MenuSystem();
    // Make it globally accessible
    window.menuSystem = menuSystem;
}

// Update lighting configuration on load
if (typeof updateLightingConfiguration === 'function') {
    updateLightingConfiguration({
        lightDirection: [0, 0, 1],
        lightColor: [1.0, 1.0, 1.0]
    });
}
