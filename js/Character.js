import * as THREE from 'three';

export class NPC {
    constructor(scene, x, z, id) {
        this.scene = scene;
        this.id = id;

        // Simple NPC Mesh (Capsule-like)
        this.group = new THREE.Group();

        const colors = [0xFF0000, 0x00FF00, 0x0000FF, 0xFFFF00, 0x00FFFF, 0xFF00FF, 0xFFFFFF, 0x000000];
        const color = colors[Math.floor(Math.random() * colors.length)];

        const bodyGeo = new THREE.CylinderGeometry(0.3, 0.3, 1.4);
        const bodyMat = new THREE.MeshStandardMaterial({ color: color });
        const body = new THREE.Mesh(bodyGeo, bodyMat);
        body.position.y = 0.7;
        this.group.add(body);

        const headGeo = new THREE.SphereGeometry(0.25);
        const headMat = new THREE.MeshStandardMaterial({ color: 0xFFCCAA }); // Skin tone
        const head = new THREE.Mesh(headGeo, headMat);
        head.position.y = 1.6;
        this.group.add(head);

        this.group.position.set(x, 0, z);
        this.scene.add(this.group);

        // Movement State
        this.targetX = x;
        this.targetZ = z;
        this.speed = 2 + Math.random();
        this.state = 'idle'; // idle, walk
        this.timer = 0;

        this.pickNewTarget();
    }

    pickNewTarget() {
        // Random point within city bounds (-150 to 150)
        this.targetX = (Math.random() - 0.5) * 300;
        this.targetZ = (Math.random() - 0.5) * 300;
        this.state = 'walk';

        // Face target
        this.group.lookAt(this.targetX, 0, this.targetZ);
    }

    update(deltaTime) {
        if (this.state === 'walk') {
            const dx = this.targetX - this.group.position.x;
            const dz = this.targetZ - this.group.position.z;
            const dist = Math.sqrt(dx * dx + dz * dz);

            if (dist < 0.5) {
                this.state = 'idle';
                this.timer = 1 + Math.random() * 3; // Wait 1-4s
            } else {
                this.group.position.x += (dx / dist) * this.speed * deltaTime;
                this.group.position.z += (dz / dist) * this.speed * deltaTime;
            }
        } else if (this.state === 'idle') {
            this.timer -= deltaTime;
            if (this.timer <= 0) {
                this.pickNewTarget();
            }
        }
    }
}

export class Character {
    constructor(scene, camera) {
        this.scene = scene;
        this.camera = camera;
        this.mesh = null;
        this.speed = 5;
        this.runSpeed = 10;
        this.rotationSpeed = 5;

        // Create character mesh (Humanoid Group)
        this.mesh = this.createHumanoid();
        this.mesh.position.y = 0; // pivot at feet
        this.scene.add(this.mesh);

        // Movement state
        this.keys = {
            w: false,
            a: false,
            s: false,
            d: false
        };

        // Camera offset
        this.cameraOffset = new THREE.Vector3(0, 10, 15);

        // Stats
        this.stats = {
            hunger: 100,
            energy: 100,
            money: 100,
            health: 100,
            stress: 0,
            hygiene: 100
        };

        this.inventory = [];

        // Interaction
        this.raycaster = new THREE.Raycaster();
        this.interactionTarget = null;
        this.interactionRange = 5;

        this.initInput();
    }

    initInput() {
        window.addEventListener('keydown', (e) => {
            const key = e.key.toLowerCase();
            if (this.keys.hasOwnProperty(key)) {
                this.keys[key] = true;
            }
            if (key === 'e') {
                this.interact();
            }
            if (key === 'i') {
                this.useItem();
            }
        });

        window.addEventListener('keyup', (e) => {
            const key = e.key.toLowerCase();
            if (this.keys.hasOwnProperty(key)) {
                this.keys[key] = false;
            }
        });
    }

    update(deltaTime, buildings) {
        this.handleMovement(deltaTime);
        // this.updateCamera(); // Disable built-in camera follow to use OrbitControls
        this.updateStats(deltaTime);
        this.checkInteractions(buildings);
    }

    checkInteractions(buildings) {
        // Raycast forward from character
        const direction = new THREE.Vector3(0, 0, 1);
        direction.applyQuaternion(this.mesh.quaternion); // If mesh rotates, otherwise use movement direction

        // Simpler approach: Check distance to all buildings
        // Since we don't have character rotation fully implemented yet, let's use distance

        let closestBuilding = null;
        let minDistance = this.interactionRange;

        for (const building of buildings) {
            const distance = this.mesh.position.distanceTo(building.position);
            if (distance < minDistance) {
                closestBuilding = building;
                minDistance = distance;
            }
        }

        this.interactionTarget = closestBuilding;
        const prompt = document.getElementById('interaction-prompt');

        if (this.interactionTarget) {
            prompt.classList.remove('hidden');
            if (this.interactionTarget.userData.type === 'Desk') {
                prompt.innerText = "按 E 工作 (写代码)";
            } else {
                prompt.innerText = `按 E 交互: ${this.interactionTarget.userData.type}`;
            }
        } else {
            prompt.classList.add('hidden');
        }
    }

    interact() {
        if (this.interactionTarget) {
            console.log(`Interacting with ${this.interactionTarget.userData.type}`);
            // Dispatch event for Game.js to handle
            const event = new CustomEvent('interaction', { detail: this.interactionTarget.userData });
            window.dispatchEvent(event);
        }
    }

    useItem() {
        const foodIndex = this.inventory.findIndex(item => item.type === 'food');
        if (foodIndex !== -1) {
            const item = this.inventory[foodIndex];
            this.inventory.splice(foodIndex, 1);
            this.stats.hunger = Math.min(100, this.stats.hunger + item.value);

            // Dispatch event for UI feedback
            const event = new CustomEvent('itemUsed', { detail: { item: item, message: `吃了 ${item.name}, 饥饿度 +${item.value}` } });
            window.dispatchEvent(event);
        } else {
            const event = new CustomEvent('itemUsed', { detail: { message: "背包中没有食物！" } });
            window.dispatchEvent(event);
        }
    }

    handleMovement(deltaTime) {
        const moveDistance = this.speed * deltaTime;
        const direction = new THREE.Vector3();

        // Check if we are in FPS mode (implicit via camera check)
        // If FPS mode, keys move relative to camera look direction
        // If TPS mode, keys move relative to world (for now, or we can make it camera relative too)

        // Let's get camera forward vector projected on XZ plane
        const forward = new THREE.Vector3(0, 0, -1);
        forward.applyQuaternion(this.camera.quaternion);
        forward.y = 0;
        forward.normalize();

        const right = new THREE.Vector3(1, 0, 0);
        right.applyQuaternion(this.camera.quaternion);
        right.y = 0;
        right.normalize();

        if (this.keys.w) direction.add(forward);
        if (this.keys.s) direction.sub(forward);
        if (this.keys.a) direction.sub(right);
        if (this.keys.d) direction.add(right);

        if (direction.length() > 0) {
            direction.normalize();
            this.mesh.position.addScaledVector(direction, moveDistance);

            // Rotate character to face movement direction (only in TPS mode, in FPS we are invisible)
            // We can just always rotate mesh, it doesn't hurt.
            // But in world-axis movement (old way), we rotated 
            /*
            if (this.keys.w) direction.z -= 1;
            if (this.keys.s) direction.z += 1;
            ...
            
            Now we are camera relative.
            */

            // If we are visible, we should rotate mesh to face direction?
            // Actually in FPS, the mesh mimics camera, but it's hidden.
            // In TPS, it's nice to face movement.
            const angle = Math.atan2(direction.x, direction.z);
            this.mesh.rotation.y = angle; // Simple rotation
        }
    }

    createHumanoid() {
        const group = new THREE.Group();

        const material = new THREE.MeshStandardMaterial({ color: 0xffccaa }); // Skin
        const shirtMat = new THREE.MeshStandardMaterial({ color: 0x3366cc }); // Blue Shirt
        const pantsMat = new THREE.MeshStandardMaterial({ color: 0x333333 }); // Dark Pants

        // Head
        const headGeo = new THREE.SphereGeometry(0.4, 16, 16);
        const head = new THREE.Mesh(headGeo, material);
        head.position.y = 1.7;
        head.castShadow = true;
        group.add(head);

        // Body
        const bodyGeo = new THREE.BoxGeometry(0.6, 0.8, 0.3);
        const body = new THREE.Mesh(bodyGeo, shirtMat);
        body.position.y = 1.1;
        body.castShadow = true;
        group.add(body);

        // Arms
        const armGeo = new THREE.CylinderGeometry(0.1, 0.1, 0.6);
        const leftArm = new THREE.Mesh(armGeo, shirtMat);
        leftArm.position.set(-0.4, 1.1, 0);
        leftArm.rotation.z = Math.PI / 8;
        leftArm.castShadow = true;
        group.add(leftArm);

        const rightArm = new THREE.Mesh(armGeo, shirtMat);
        rightArm.position.set(0.4, 1.1, 0);
        rightArm.rotation.z = -Math.PI / 8;
        rightArm.castShadow = true;
        group.add(rightArm);

        // Legs
        const legGeo = new THREE.CylinderGeometry(0.12, 0.12, 0.7);
        const leftLeg = new THREE.Mesh(legGeo, pantsMat);
        leftLeg.position.set(-0.2, 0.35, 0);
        leftLeg.castShadow = true;
        group.add(leftLeg);

        const rightLeg = new THREE.Mesh(legGeo, pantsMat);
        rightLeg.position.set(0.2, 0.35, 0);
        rightLeg.castShadow = true;
        group.add(rightLeg);

        return group;
    }

    updateCamera() {
        // Follow character logic moved to Game.js or kept simple here?
        // Let's keep it here for now but we might change it soon.
        this.camera.position.x = this.mesh.position.x + this.cameraOffset.x;
        this.camera.position.y = this.mesh.position.y + this.cameraOffset.y;
        this.camera.position.z = this.mesh.position.z + this.cameraOffset.z;
        this.camera.lookAt(this.mesh.position);
    }

    updateStats(deltaTime) {
        // Decrease stats over time
        this.stats.hunger = Math.max(0, this.stats.hunger - deltaTime * 0.5);
        this.stats.energy = Math.max(0, this.stats.energy - deltaTime * 0.2);

        // New stats logic
        this.stats.hygiene = Math.max(0, this.stats.hygiene - deltaTime * 0.3);

        // Stress increases if hunger/energy/hygiene are bad
        if (this.stats.hunger < 20 || this.stats.energy < 20 || this.stats.hygiene < 20) {
            this.stats.stress = Math.min(100, this.stats.stress + deltaTime * 2);
        } else {
            this.stats.stress = Math.max(0, this.stats.stress - deltaTime * 0.5); // Relax if needs met
        }

        // Health decays if very hungry or stressed
        if (this.stats.hunger === 0 || this.stats.stress > 90) {
            this.stats.health = Math.max(0, this.stats.health - deltaTime * 1);
        }

        // Update UI
        const hungerBar = document.getElementById('hunger-bar');
        const energyBar = document.getElementById('energy-bar');
        const moneyEl = document.getElementById('money');

        // New UI Elements
        const healthBar = document.getElementById('health-bar');
        const stressBar = document.getElementById('stress-bar');
        const hygieneBar = document.getElementById('hygiene-bar');
        const stressLabel = document.getElementById('stress-bar')?.parentElement?.nextElementSibling; // Hacky way to find label if needed, but not needed

        if (hungerBar) hungerBar.style.width = this.stats.hunger + '%';
        if (energyBar) energyBar.style.width = this.stats.energy + '%';
        if (moneyEl) moneyEl.innerText = Math.floor(this.stats.money);

        if (healthBar) healthBar.style.width = this.stats.health + '%';
        if (stressBar) stressBar.style.width = this.stats.stress + '%';
        if (hygieneBar) hygieneBar.style.width = this.stats.hygiene + '%';

        // Update Text Values
        const hVal = document.getElementById('hunger-val');
        const eVal = document.getElementById('energy-val');
        const hlVal = document.getElementById('health-val');
        const sVal = document.getElementById('stress-val');
        const hyVal = document.getElementById('hygiene-val');

        if (hVal) hVal.innerText = Math.floor(this.stats.hunger);
        if (eVal) eVal.innerText = Math.floor(this.stats.energy);
        if (hlVal) hlVal.innerText = Math.floor(this.stats.health);
        if (sVal) sVal.innerText = Math.floor(this.stats.stress);
        if (hyVal) hyVal.innerText = Math.floor(this.stats.hygiene);
    }
}
