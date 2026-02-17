import * as THREE from 'three';

export class DigitalTwinEngine {
    constructor(scene, camera) {
        this.scene = scene;
        this.camera = camera;
        this.twins = [];
        this.enabled = false;

        // Create a group for UI elements to easily toggle
        this.uiGroup = new THREE.Group();
        this.scene.add(this.uiGroup);
        this.uiGroup.visible = false;

        // Visual Connections
        this.connectionsGroup = new THREE.Group();
        this.scene.add(this.connectionsGroup);
        this.connectionsGroup.visible = false;
    }

    init(buildings) {
        buildings.forEach(b => this.register(b));
    }

    register(building) {
        if (!building || !building.userData) return;
        const type = building.userData.type;

        // Only register relevant assets
        const relevantTypes = [
            'Factory', 'Power Plant', 'Office', 'Hospital', 'Server',
            'Supermarket', 'Airport', 'Mall', 'Skyscraper A', 'Skyscraper B'
        ];

        // Allow fuzzy match for Skyscrapers
        const isRelevant = relevantTypes.some(t => type.includes(t)) || building.userData.type === 'University';

        if (!isRelevant) return;

        const twinData = {
            id: building.id,
            mesh: building,
            type: type,
            stats: this.generateInitialStats(type),
            label: this.createDataLabel(building)
        };

        this.twins.push(twinData);
    }

    generateInitialStats(type) {
        const stats = { value: 0, delta: 0 };
        if (type.includes('Power Plant')) return { ...stats, name: 'Power Output', value: 845.2, unit: 'MW', min: 600, max: 950 };
        if (type.includes('Factory')) return { ...stats, name: 'Production', value: 92.5, unit: '%', min: 70, max: 100 };
        if (type.includes('Hospital')) return { ...stats, name: 'Occupancy', value: 78, unit: '%', min: 40, max: 98 };
        if (type.includes('Office') || type.includes('Skyscraper')) return { ...stats, name: 'Energy Usage', value: 1450, unit: 'kWh', min: 800, max: 2000 };
        if (type.includes('Airport')) return { ...stats, name: 'Flights', value: 42, unit: '/hr', min: 10, max: 60 };
        if (type.includes('University')) return { ...stats, name: 'Active Students', value: 3400, unit: '', min: 100, max: 5000 };
        return { ...stats, name: 'System Status', value: 100, unit: '%', min: 90, max: 100 };
    }

    createDataLabel(building) {
        // Create a canvas texture for High-Tech looking label
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 256;
        const ctx = canvas.getContext('2d');

        const texture = new THREE.CanvasTexture(canvas);
        const material = new THREE.SpriteMaterial({
            map: texture,
            transparent: true,
            opacity: 0.9,
            depthTest: false // Always visible on top? Maybe too messy. Let's keep depthTest true but float high.
        });
        const sprite = new THREE.Sprite(material);

        // Calculate height based on building
        const box = new THREE.Box3().setFromObject(building);
        const height = box.max.y - box.min.y;

        sprite.position.copy(building.position);
        sprite.position.y += height + 10; // Float above
        sprite.scale.set(20, 10, 1);

        this.uiGroup.add(sprite);
        return { sprite, canvas, ctx, texture };
    }

    update(deltaTime, time) {
        if (!this.enabled) return;

        // Animate Connections
        this.updateConnections(time);

        // Update Data
        this.twins.forEach(twin => {
            // Simulate random data fluctuation
            if (Math.random() < 0.1) { // 10% chance per frame to jitter
                const range = twin.stats.max - twin.stats.min;
                const jitter = (Math.random() - 0.5) * range * 0.05;
                twin.stats.value = Math.max(twin.stats.min, Math.min(twin.stats.max, twin.stats.value + jitter));

                // Track trend
                twin.stats.delta = jitter;

                this.updateLabel(twin);
            }
        });
    }

    updateLabel(twin) {
        const { ctx, canvas, texture } = twin.label;
        const { name, value, unit, delta } = twin.stats;

        // Clear
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // --- Sci-Fi Panel Drawing ---

        // Glow effect
        ctx.shadowBlur = 10;
        ctx.shadowColor = '#00FFFF';

        // Border Panel
        ctx.fillStyle = 'rgba(0, 15, 30, 0.85)';
        ctx.strokeStyle = '#00AAFF';
        ctx.lineWidth = 4;

        // Hexagon-ish shape or sliced corners
        ctx.beginPath();
        const w = canvas.width, h = canvas.height;
        const cut = 30;
        ctx.moveTo(cut, 0);
        ctx.lineTo(w - cut, 0);
        ctx.lineTo(w, cut);
        ctx.lineTo(w, h - cut);
        ctx.lineTo(w - cut, h);
        ctx.lineTo(cut, h);
        ctx.lineTo(0, h - cut);
        ctx.lineTo(0, cut);
        ctx.closePath();

        ctx.fill();
        ctx.stroke();

        // Reset shadow
        ctx.shadowBlur = 0;

        // Header Line
        ctx.beginPath();
        ctx.moveTo(20, 60);
        ctx.lineTo(w - 20, 60);
        ctx.lineWidth = 2;
        ctx.strokeStyle = 'rgba(0, 255, 255, 0.5)';
        ctx.stroke();

        // Text: Type Title
        ctx.fillStyle = '#00FFFF';
        ctx.font = 'bold 40px Arial';
        ctx.textAlign = 'left';
        ctx.fillText(twin.type.toUpperCase(), 30, 45);

        // Status Circle (Right aligned)
        const statusColor = value > twin.stats.max * 0.95 || value < twin.stats.min * 1.05 ? '#FF4444' : '#00FF00';
        ctx.fillStyle = statusColor;
        ctx.beginPath();
        ctx.arc(w - 40, 30, 15, 0, Math.PI * 2);
        ctx.fill();

        // Value Display
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 80px Courier New';
        ctx.textAlign = 'center';
        ctx.fillText(Math.floor(value).toString(), w / 2, 160);

        // Unit
        ctx.font = '30px Arial';
        ctx.fillStyle = '#AAAAAA';
        ctx.fillText(unit, w / 2, 200);

        // Data Name
        ctx.font = '30px Arial';
        ctx.fillStyle = '#00AAFF';
        ctx.fillText(name, w / 2, 240);

        // Trend Arrow
        if (Math.abs(delta) > 0.01) {
            ctx.font = '40px Arial';
            ctx.fillStyle = delta > 0 ? '#00FF00' : '#FF0000';
            ctx.fillText(delta > 0 ? '▲' : '▼', w - 50, 160);
        }

        texture.needsUpdate = true;
    }

    toggle() {
        this.enabled = !this.enabled;
        this.uiGroup.visible = this.enabled;
        this.connectionsGroup.visible = this.enabled;

        if (this.enabled) {
            console.log("Digital Twin Engine: ACTIVATED");
            // Force refresh all
            this.twins.forEach(t => this.updateLabel(t));
            this.createConnections();
        } else {
            console.log("Digital Twin Engine: DEACTIVATED");
        }
        return this.enabled;
    }

    createConnections() {
        // Create lines connecting random active twins to simulate "Network"
        // Clear old
        while (this.connectionsGroup.children.length > 0) {
            this.connectionsGroup.remove(this.connectionsGroup.children[0]);
        }

        if (this.twins.length < 2) return;

        const material = new THREE.LineBasicMaterial({ color: 0x004488, transparent: true, opacity: 0.3 });

        // Simple connectivity: Connect close nodes
        for (let i = 0; i < this.twins.length; i++) {
            for (let j = i + 1; j < this.twins.length; j++) {
                const dist = this.twins[i].mesh.position.distanceTo(this.twins[j].mesh.position);
                if (dist < 150) {
                    const points = [];
                    points.push(this.twins[i].mesh.position);
                    points.push(this.twins[j].mesh.position);
                    const geometry = new THREE.BufferGeometry().setFromPoints(points);
                    const line = new THREE.Line(geometry, material);
                    this.connectionsGroup.add(line);
                }
            }
        }
    }

    updateConnections(time) {
        // Pulse links?
        // Expensive to update geometry. Just update material opacity?
        // this.connectionsGroup.traverse(child => {
        //    if (child.isLine) {
        //        child.material.opacity = 0.3 + Math.sin(time * 0.1) * 0.2;
        //    }
        // });
    }
}
