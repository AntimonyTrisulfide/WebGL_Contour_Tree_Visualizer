// src/menu.js

class MenuSystem {
    constructor() {
        this.isSidebarOpen = false;
        this.sidebarElement = null;
        this.menuToggle = null;
        this.collapsedSections = new Set(); // Track collapsed sections
        this.initializeMenu();
        this.setupEventListeners();
    }

    initializeMenu() {
        this.createMenuToggle();
        this.createSidebar();
        this.populateMenu();
    }    createMenuToggle() {
        // Create menu toggle button with arrow
        this.menuToggle = document.createElement('button');
        this.menuToggle.id = 'menu-toggle';
        this.menuToggle.className = 'menu-toggle';
        this.menuToggle.innerHTML = '◀'; // Left-pointing arrow
        this.menuToggle.title = 'Toggle Settings Panel';
        
        // Append directly to body instead of controls
        document.body.appendChild(this.menuToggle);
    }

    createSidebar() {
        // Create sidebar panel
        this.sidebarElement = document.createElement('div');
        this.sidebarElement.id = 'settings-sidebar';
        this.sidebarElement.className = 'settings-sidebar';
        
        // Sidebar header
        const header = document.createElement('div');
        header.className = 'sidebar-header';
        header.innerHTML = `
            <h2>Settings</h2>
            <button id="sidebar-close" class="sidebar-close">&times;</button>
        `;
        
        // Sidebar content
        const content = document.createElement('div');
        content.className = 'sidebar-content';
        content.id = 'sidebar-content';
        
        // Sidebar footer
        const footer = document.createElement('div');
        footer.className = 'menu-footer';
        footer.innerHTML = `
            <button id="reset-defaults" class="menu-button secondary">Reset</button>
            <button id="save-config" class="menu-button primary">Save</button>
        `;
        
        this.sidebarElement.appendChild(header);
        this.sidebarElement.appendChild(content);
        this.sidebarElement.appendChild(footer);
        document.body.appendChild(this.sidebarElement);
    }    populateMenu() {
        const content = document.getElementById('sidebar-content');
        content.innerHTML = ''; // Clear existing content
        
        // Wait for parameters to load
        parameterManager.loadPromise.then(() => {
            this.createFileInfoSection(content);
            this.createRenderingSection(content);
            this.createColorSection(content);
            this.createLightingSection(content);
            this.createControlsSection(content);
            this.createLogSection(content);
            
            // Update file name if available
            if (typeof currentFileName !== 'undefined' && currentFileName) {
                this.updateCurrentFileName(currentFileName);
            }
        });
    }

    createFileInfoSection(parent) {
        const section = this.createSection('File Information', parent);
        
        // Current file display
        const fileInfo = document.createElement('div');
        fileInfo.className = 'file-info';
        fileInfo.innerHTML = `
            <div class="info-item">
                <span class="info-label">Current File:</span>
                <span class="info-value" id="current-file-name">No file loaded</span>
            </div>
        `;
        
        section.appendChild(fileInfo);
    }

    createRenderingSection(parent) {
        const section = this.createSection('Rendering', parent);
        
        // Sphere Radius
        this.createSlider(section, 'Sphere Radius', 
            'rendering.sphereRadius', 0.001, 0.5, 0.001, 
            parameterManager.getParameter('rendering.sphereRadius'));
        
        // Pipe Radius
        this.createSlider(section, 'Pipe Radius', 
            'rendering.pipeRadius', 0.001, 0.3, 0.001, 
            parameterManager.getParameter('rendering.pipeRadius'));
        
        // Background Color
        this.createColorPicker(section, 'Background Color', 
            'rendering.backgroundColor', 
            parameterManager.getParameter('rendering.backgroundColor'));
    }

    createColorSection(parent) {
        const section = this.createSection('Colors', parent);
        
        // Pipe Color
        this.createColorPicker(section, 'Pipe Color', 
            'colors.pipeColor', 
            parameterManager.getParameter('colors.pipeColor'));
        
        // Node Colors
        const nodeSection = this.createSubSection('Node Colors', section);
        const nodeColors = parameterManager.getParameter('colors.nodeColors');
        
        this.createColorPicker(nodeSection, 'Minimum Nodes', 
            'colors.nodeColors.minimum', nodeColors.minimum);
        this.createColorPicker(nodeSection, 'Saddle Nodes', 
            'colors.nodeColors.saddle', nodeColors.saddle);
        this.createColorPicker(nodeSection, 'Maximum Nodes', 
            'colors.nodeColors.maximum', nodeColors.maximum);
        this.createColorPicker(nodeSection, 'Intermediate Nodes', 
            'colors.nodeColors.intermediate', nodeColors.intermediate);
    }

    createLightingSection(parent) {
        const section = this.createSection('Lighting', parent);
        
        const lightPos = parameterManager.getParameter('lighting.lightPosition');
        
        // Light Position X
        this.createSlider(section, 'Light X Position', 
            'lighting.lightPosition.0', -50, 50, 0.1, lightPos[0]);
        
        // Light Position Y
        this.createSlider(section, 'Light Y Position', 
            'lighting.lightPosition.1', -50, 50, 0.1, lightPos[1]);
        
        // Light Position Z
        this.createSlider(section, 'Light Z Position', 
            'lighting.lightPosition.2', -50, 50, 0.1, lightPos[2]);
    }

    createControlsSection(parent) {
        const section = this.createSection('Controls', parent);
        
        // Mouse Sensitivity
        this.createSlider(section, 'Mouse Sensitivity', 
            'controls.mouseSensitivity', 0.001, 0.02, 0.001, 
            parameterManager.getParameter('controls.mouseSensitivity'));
    }    createSection(title, parent) {
        const section = document.createElement('div');
        section.className = 'menu-section';
        
        const header = document.createElement('div');
        header.className = 'section-header';
        header.textContent = title;
        header.setAttribute('data-section', title.toLowerCase());
        
        const content = document.createElement('div');
        content.className = 'section-content';
        content.setAttribute('data-section-content', title.toLowerCase());
        
        // Add click handler for collapsible sections
        header.addEventListener('click', () => {
            this.toggleSection(title.toLowerCase(), header, content);
        });
        
        section.appendChild(header);
        section.appendChild(content);
        parent.appendChild(section);
        
        return content;
    }

    toggleSection(sectionName, header, content) {
        const isCollapsed = this.collapsedSections.has(sectionName);
        
        if (isCollapsed) {
            this.collapsedSections.delete(sectionName);
            header.classList.remove('collapsed');
            content.classList.remove('collapsed');
        } else {
            this.collapsedSections.add(sectionName);
            header.classList.add('collapsed');
            content.classList.add('collapsed');
        }
    }

    createSubSection(title, parent) {
        const section = document.createElement('div');
        section.className = 'menu-subsection';
        
        const header = document.createElement('h4');
        header.className = 'subsection-header';
        header.textContent = title;
        
        const content = document.createElement('div');
        content.className = 'subsection-content';
        
        section.appendChild(header);
        section.appendChild(content);
        parent.appendChild(section);
        
        return content;
    }

    createSlider(parent, label, paramPath, min, max, step, value) {
        const container = document.createElement('div');
        container.className = 'control-group';
        
        const labelEl = document.createElement('label');
        labelEl.textContent = label;
        labelEl.className = 'control-label';
        
        const sliderContainer = document.createElement('div');
        sliderContainer.className = 'slider-container';
        
        const slider = document.createElement('input');
        slider.type = 'range';
        slider.min = min;
        slider.max = max;
        slider.step = step;
        slider.value = value;
        slider.className = 'control-slider';
        
        const valueDisplay = document.createElement('span');
        valueDisplay.textContent = value;
        valueDisplay.className = 'slider-value';
        
        slider.addEventListener('input', (e) => {
            const newValue = parseFloat(e.target.value);
            valueDisplay.textContent = newValue.toFixed(3);
            
            // Handle array index updates
            if (paramPath.includes('.')) {
                const parts = paramPath.split('.');
                if (parts[parts.length - 1].match(/^\d+$/)) {
                    // It's an array index
                    const arrayPath = parts.slice(0, -1).join('.');
                    const index = parseInt(parts[parts.length - 1]);
                    const currentArray = parameterManager.getParameter(arrayPath);
                    currentArray[index] = newValue;
                    parameterManager.updateParameter(arrayPath, currentArray);
                } else {
                    parameterManager.updateParameter(paramPath, newValue);
                }
            } else {
                parameterManager.updateParameter(paramPath, newValue);
            }
            
            this.requestRender();
        });
        
        sliderContainer.appendChild(slider);
        sliderContainer.appendChild(valueDisplay);
        
        container.appendChild(labelEl);
        container.appendChild(sliderContainer);
        parent.appendChild(container);
    }

    createColorPicker(parent, label, paramPath, color) {
        const container = document.createElement('div');
        container.className = 'control-group';
        
        const labelEl = document.createElement('label');
        labelEl.textContent = label;
        labelEl.className = 'control-label';
        
        const colorContainer = document.createElement('div');
        colorContainer.className = 'color-container';
        
        const colorInput = document.createElement('input');
        colorInput.type = 'color';
        colorInput.className = 'control-color';
        
        // Convert RGB array to hex
        const r = Math.round(color[0] * 255);
        const g = Math.round(color[1] * 255);
        const b = Math.round(color[2] * 255);
        colorInput.value = `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
        
        colorInput.addEventListener('input', (e) => {
            const hex = e.target.value;
            const r = parseInt(hex.slice(1, 3), 16) / 255;
            const g = parseInt(hex.slice(3, 5), 16) / 255;
            const b = parseInt(hex.slice(5, 7), 16) / 255;
            
            let newColor;
            if (color.length === 4) {
                newColor = [r, g, b, color[3]]; // Preserve alpha
            } else {
                newColor = [r, g, b];
            }
            
            parameterManager.updateParameter(paramPath, newColor);
            this.requestRender();
        });
        
        colorContainer.appendChild(colorInput);
        
        container.appendChild(labelEl);
        container.appendChild(colorContainer);
        parent.appendChild(container);
    }    setupEventListeners() {
        // Menu toggle
        document.addEventListener('click', (e) => {
            if (e.target.id === 'menu-toggle') {
                this.toggleSidebar();
            } else if (e.target.id === 'sidebar-close') {
                this.closeSidebar();
            } else if (e.target.id === 'reset-defaults') {
                this.resetDefaults();
            } else if (e.target.id === 'save-config') {
                this.saveConfiguration();
            }
        });
        
        // ESC key to close sidebar
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isSidebarOpen) {
                this.closeSidebar();
            }
        });
    }

    toggleSidebar() {
        if (this.isSidebarOpen) {
            this.closeSidebar();
        } else {
            this.openSidebar();
        }
    }    openSidebar() {
        this.isSidebarOpen = true;
        this.sidebarElement.classList.add('open');
        this.menuToggle.classList.add('open');
        document.body.classList.add('sidebar-open');
    }

    closeSidebar() {
        this.isSidebarOpen = false;
        this.sidebarElement.classList.remove('open');
        this.menuToggle.classList.remove('open');
        document.body.classList.remove('sidebar-open');
    }resetDefaults() {
        if (confirm('Reset all settings to default values?')) {
            parameterManager.resetToDefaults();
            this.populateMenu(); // Refresh menu with new values
            this.requestRender();
            this.showNotification('Settings reset to defaults', 'success');
        }
    }

    async saveConfiguration() {
        const success = await parameterManager.saveParameters();
        if (success) {
            this.showNotification('Configuration saved successfully', 'success');
        } else {
            this.showNotification('Failed to save configuration', 'error');
        }
    }

    requestRender() {
        // Trigger re-render if data is loaded
        if (typeof offData !== 'undefined' && offData !== '') {
            if (typeof initializeGraph === 'function') {
                initializeGraph(offData);
            }
            if (typeof renderGraph === 'function') {
                renderGraph();
            }
        }
    }

    showNotification(message, type = 'info') {
        if (typeof showStatus === 'function') {
            showStatus(message, type);
        } else {
            console.log(`${type.toUpperCase()}: ${message}`);
        }
    }

    createLogSection(parent) {
        const section = this.createSection('Console Log', parent);
        
        // Log container
        const logContainer = document.createElement('div');
        logContainer.className = 'log-container';
        
        // Log display area
        const logDisplay = document.createElement('div');
        logDisplay.className = 'log-display';
        logDisplay.id = 'log-display';
        
        // Log controls
        const logControls = document.createElement('div');
        logControls.className = 'log-controls';
        logControls.innerHTML = `
            <button id="clear-log" class="log-button">Clear Log</button>
            <button id="export-log" class="log-button">Export Log</button>
        `;
        
        logContainer.appendChild(logDisplay);
        logContainer.appendChild(logControls);
        section.appendChild(logContainer);
        
        // Initialize log system
        this.initializeLogSystem();
    }

    initializeLogSystem() {
        // Store reference to log display
        this.logDisplay = document.getElementById('log-display');
        this.logHistory = [];
        
        // Override the existing showStatus function to capture messages
        if (typeof window.showStatus === 'function') {
            this.originalShowStatus = window.showStatus;
        }
        
        // Create our enhanced showStatus function
        window.showStatus = (message, type = 'info') => {
            this.addLogEntry(message, type);
            // Still call original function for existing behavior
            if (this.originalShowStatus) {
                this.originalShowStatus(message, type);
            } else {
                // Fallback if original doesn't exist
                this.showStatusFallback(message, type);
            }
        };
          // Add event listeners for log controls
        document.addEventListener('click', (e) => {
            if (e.target.id === 'clear-log') {
                this.clearLog();
            } else if (e.target.id === 'export-log') {
                this.exportLog();
            }
        });
        
        // Add initial log entry
        setTimeout(() => {
            this.addLogEntry('Console log initialized', 'info');
            this.addLogEntry('Ready to load OFF files', 'info');
        }, 100);
    }

    addLogEntry(message, type) {
        const timestamp = new Date().toLocaleTimeString();
        const logEntry = {
            message,
            type,
            timestamp,
            id: Date.now() + Math.random()
        };
        
        this.logHistory.push(logEntry);
        
        // Keep only last 100 entries to prevent memory issues
        if (this.logHistory.length > 100) {
            this.logHistory.shift();
        }
        
        this.updateLogDisplay();
    }

    updateLogDisplay() {
        if (!this.logDisplay) return;
        
        const logEntries = this.logHistory.slice(-100); // Show last 20 entries
        
        this.logDisplay.innerHTML = logEntries.map(entry => `
            <div class="log-entry log-${entry.type}">
                <span class="log-timestamp">[${entry.timestamp}]</span>
                <span class="log-message">${entry.message}</span>
            </div>
        `).join('');
        
        // Auto-scroll to bottom
        this.logDisplay.scrollTop = this.logDisplay.scrollHeight;
    }

    clearLog() {
        this.logHistory = [];
        this.updateLogDisplay();
        this.addLogEntry('Log cleared', 'info');
    }

    exportLog() {
        const logText = this.logHistory.map(entry => 
            `[${entry.timestamp}] [${entry.type.toUpperCase()}] ${entry.message}`
        ).join('\n');
        
        const blob = new Blob([logText], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `contour-tree-log-${new Date().toISOString().slice(0, 10)}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        this.addLogEntry('Log exported successfully', 'success');
    }

    showStatusFallback(message, type) {
        // Fallback status display if original function doesn't exist
        const statusElement = document.getElementById('status');
        if (statusElement) {
            statusElement.textContent = message;
            statusElement.className = `status ${type}`;
            statusElement.style.display = 'block';
            
            setTimeout(() => {
                statusElement.style.display = 'none';
            }, 3000);
        }
    }    updateCurrentFileName(fileName) {
        const fileNameElement = document.getElementById('current-file-name');
        if (fileNameElement) {
            fileNameElement.textContent = fileName || 'No file loaded';
            fileNameElement.title = fileName || '';
        }
        
        // Update webpage title
        if (fileName) {
            document.title = `${fileName}`;
        } else {
            document.title = 'Contour Tree Visualizer';
        }
    }
}

// Initialize menu system when DOM is loaded
let menuSystem;
document.addEventListener('DOMContentLoaded', () => {
    menuSystem = new MenuSystem();
});
