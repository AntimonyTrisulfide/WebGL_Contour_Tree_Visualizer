// src/parameterManager.js

class ParameterManager {
    constructor() {
        this.parameters = {};
        this.defaultParameters = {};
        this.callbacks = {};
        this.loadPromise = this.loadParameters();
    }

    async loadParameters() {
        try {
            const response = await fetch('./parameters.json');
            const params = await response.json();
            this.defaultParameters = JSON.parse(JSON.stringify(params)); // Deep copy
            this.parameters = params;
            this.applyParameters();
            console.log('Parameters loaded successfully');
            return true;
        } catch (error) {
            console.warn('Could not load parameters.json, using defaults:', error);
            this.setDefaultParameters();
            return false;
        }
    }

    setDefaultParameters() {        this.defaultParameters = {
            rendering: {
                sphereRadius: 0.025,
                pipeRadius: 0.005,
                backgroundColor: [0.9, 0.9, 0.9, 1.0]
            },
            colors: {
                pipeColor: [0.8, 0.8, 0.8],
                lightColor: [1.0, 1.0, 1.0],
                nodeColors: {
                    minimum: [0.0, 0.4, 1.0],
                    saddle: [0.0, 1.0, 1.0],
                    maximum: [1.0, 0.0, 0.0],
                    intermediate: [0.8, 0.8, 0.8]
                }
            },
            lighting: {
                lightPosition: [10, 10, 10]
            },
            controls: {
                mouseSensitivity: 0.005
            }
        };
        this.parameters = JSON.parse(JSON.stringify(this.defaultParameters));
        this.applyParameters();
    }

    applyParameters() {
        // Apply to global variables
        if (typeof sphereRadius !== 'undefined') {
            sphereRadius = this.parameters.rendering.sphereRadius;
        }
        if (typeof pipeRadius !== 'undefined') {
            pipeRadius = this.parameters.rendering.pipeRadius;
        }
        if (typeof backgroundColor !== 'undefined') {
            backgroundColor[0] = this.parameters.rendering.backgroundColor[0];
            backgroundColor[1] = this.parameters.rendering.backgroundColor[1];            backgroundColor[2] = this.parameters.rendering.backgroundColor[2];
            backgroundColor[3] = this.parameters.rendering.backgroundColor[3];
        }
        if (typeof pipeColor !== 'undefined') {
            pipeColor[0] = this.parameters.colors.pipeColor[0];
            pipeColor[1] = this.parameters.colors.pipeColor[1];
            pipeColor[2] = this.parameters.colors.pipeColor[2];
        }
        if (typeof lightColor !== 'undefined') {
            lightColor[0] = this.parameters.colors.lightColor[0];
            lightColor[1] = this.parameters.colors.lightColor[1];
            lightColor[2] = this.parameters.colors.lightColor[2];
        }
        if (typeof lightPosition !== 'undefined') {
            lightPosition[0] = this.parameters.lighting.lightPosition[0];
            lightPosition[1] = this.parameters.lighting.lightPosition[1];
            lightPosition[2] = this.parameters.lighting.lightPosition[2];
        }        if (typeof mouseSensitivity !== 'undefined' && window) {
            mouseSensitivity = this.parameters.controls.mouseSensitivity;
        }

        // Update node colors
        if (typeof NODE_COLORS !== 'undefined') {
            NODE_COLORS[NODE_TYPES.MINIMUM] = this.parameters.colors.nodeColors.minimum;
            NODE_COLORS[NODE_TYPES.SADDLE] = this.parameters.colors.nodeColors.saddle;
            NODE_COLORS[NODE_TYPES.MAXIMUM] = this.parameters.colors.nodeColors.maximum;
            NODE_COLORS[NODE_TYPES.INTERMEDIATE] = this.parameters.colors.nodeColors.intermediate;
        }

        // Trigger callbacks
        Object.keys(this.callbacks).forEach(key => {
            this.callbacks[key](this.parameters);
        });
    }

    updateParameter(path, value) {
        // Update nested parameter using dot notation (e.g., "rendering.sphereRadius")
        const keys = path.split('.');
        let current = this.parameters;
        
        for (let i = 0; i < keys.length - 1; i++) {
            if (!current[keys[i]]) current[keys[i]] = {};
            current = current[keys[i]];
        }
        
        current[keys[keys.length - 1]] = value;
        this.applyParameters();
    }

    getParameter(path) {
        const keys = path.split('.');
        let current = this.parameters;
        
        for (const key of keys) {
            if (current[key] === undefined) return undefined;
            current = current[key];
        }
        
        return current;
    }

    resetToDefaults() {
        this.parameters = JSON.parse(JSON.stringify(this.defaultParameters));
        this.applyParameters();
    }

    async saveParameters() {
        try {
            const blob = new Blob([JSON.stringify(this.parameters, null, 2)], {
                type: 'application/json'
            });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'parameters.json';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            return true;
        } catch (error) {
            console.error('Error saving parameters:', error);
            return false;
        }
    }

    onParameterChange(callback) {
        const id = Math.random().toString(36).substr(2, 9);
        this.callbacks[id] = callback;
        return id;
    }

    offParameterChange(id) {
        delete this.callbacks[id];
    }
}

// Global parameter manager instance
const parameterManager = new ParameterManager();

// Initialize parameters when the page loads
window.addEventListener('load', async () => {
    await parameterManager.loadPromise;
    console.log('Parameters initialized');
});
