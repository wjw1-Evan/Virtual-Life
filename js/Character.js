import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { assetLoader } from './AssetLoader.js';

export class NPC {
    constructor(scene, x, z, id) {
        this.scene = scene;
        this.id = id;
        this.group = new THREE.Group();

        // Load resident texture
        const textureLoader = new THREE.TextureLoader();
        const texture = textureLoader.load('Textures/residents.png');

        // Sprite sheet is 2x2
        // We clone it so each NPC can have its own offset
        const npcTexture = texture.clone();
        npcTexture.needsUpdate = true;
        npcTexture.repeat.set(0.5, 0.5);

        // Randomly pick one of the 4 residents
        const typeIdx = Math.floor(Math.random() * 4);
        const offsetX = (typeIdx % 2) * 0.5;
        const offsetY = Math.floor(typeIdx / 2) === 0 ? 0.5 : 0; // Top row is 0.5 in UV, Bottom row is 0
        npcTexture.offset.set(offsetX, offsetY);

        const spriteMat = new THREE.SpriteMaterial({
            map: npcTexture,
            transparent: true,
            alphaTest: 0.1
        });
        const sprite = new THREE.Sprite(spriteMat);
        sprite.scale.set(3, 3, 1);
        sprite.position.y = 1.5;
        this.group.add(sprite);

        // Simple shadow under feet
        const shadowGeo = new THREE.CircleGeometry(0.4, 16);
        const shadowMat = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.2 });
        const shadow = new THREE.Mesh(shadowGeo, shadowMat);
        shadow.rotation.x = -Math.PI / 2;
        shadow.position.y = 0.05;
        this.group.add(shadow);

        this.group.position.set(x, 0, z);
        this.scene.add(this.group);

        // Movement State
        this.targetX = x;
        this.targetZ = z;
        this.speed = 1.5 + Math.random() * 1.5;
        this.state = 'idle';
        this.timer = Math.random() * 5;

        this.bounds = 200; // Walk within community bounds
    }

    pickNewTarget() {
        // Find a random point on the sidewalk/roads
        // For simplicity, circular random or grid-based
        const angle = Math.random() * Math.PI * 2;
        const dist = Math.random() * this.bounds;
        this.targetX = Math.cos(angle) * dist;
        this.targetZ = Math.sin(angle) * dist;

        this.state = 'walk';
    }

    update(deltaTime) {
        if (this.state === 'walk') {
            const dx = this.targetX - this.group.position.x;
            const dz = this.targetZ - this.group.position.z;
            const distSq = dx * dx + dz * dz;

            if (distSq < 0.2) {
                this.state = 'idle';
                this.timer = 2 + Math.random() * 4;
            } else {
                const dist = Math.sqrt(distSq);
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
        this.mesh = new THREE.Group(); // Container
        this.model = null; // The actual GLB model
        this.mixer = null; // Animation Mixer
        this.actions = {}; // Store animation actions
        this.activeAction = null;

        this.speed = 5;
        this.runSpeed = 10;
        this.rotationSpeed = 10; // Faster rotation for responsiveness

        // Stickman Character Model
        this.placeholder = this.createStickman();
        this.mesh.add(this.placeholder);

        this.mesh.position.y = 0;
        this.scene.add(this.mesh);

        // Load Model (Disabled for Stickman)
        // this.loadModel();

        // Movement state
        this.keys = {
            w: false,
            a: false,
            s: false,
            d: false
        };

        // Camera offset (Higher and further back)
        this.cameraOffset = new THREE.Vector3(0, 15, 25);

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
        this.movementEnabled = true;

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
            if (key === '3') {
                this.mesh.position.set(0, 0, 0);
            }
        });

        window.addEventListener('keyup', (e) => {
            const key = e.key.toLowerCase();
            if (this.keys.hasOwnProperty(key)) {
                this.keys[key] = false;
            }
        });
    }

    handleMovement(deltaTime, buildings) {
        if (!this.movementEnabled) return;
        const moveDistance = this.speed * deltaTime;
        const direction = new THREE.Vector3();

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

            // Collision Detection
            let blocked = false;
            if (buildings && buildings.length > 0) {
                // Check collision at two heights: chest (1.0) and knees (0.4)
                // Use a slightly larger distance to prevent clipping (buffer + moveDistance)
                const collisionRange = Math.max(1.2, moveDistance * 2);
                blocked = this.checkCollision(direction, collisionRange, buildings);
            }

            if (!blocked) {
                this.mesh.position.addScaledVector(direction, moveDistance);
            }

            // Rotate character to face movement direction (only in TPS mode, in FPS we are invisible)
            const angle = Math.atan2(direction.x, direction.z);

            // Smooth rotation
            if (this.model) {
                const targetQuat = new THREE.Quaternion();
                targetQuat.setFromAxisAngle(new THREE.Vector3(0, 1, 0), angle);
                this.mesh.quaternion.slerp(targetQuat, deltaTime * this.rotationSpeed);
            } else {
                this.mesh.rotation.y = angle;
            }

            // Animation State
            this.isMoving = true;
            if (this.mixer) {
                if (moveDistance > this.speed * deltaTime * 1.5) {
                    this.fadeToAction('Walk', 0.2);
                } else {
                    this.fadeToAction('Walk', 0.2);
                }
            }
        } else {
            this.isMoving = false;
            if (this.mixer) {
                this.fadeToAction('Idle', 0.2);
            }
        }
    }

    checkCollision(direction, distance, buildings) {
        if (!this.raycaster) this.raycaster = new THREE.Raycaster();

        // Check at three different heights: knees (0.4), chest (1.0) and head (1.6)
        const heights = [0.4, 1.0, 1.6];
        const bufferedDistance = distance + 0.5; // Add buffer to detect walls slightly earlier

        for (const h of heights) {
            // Start the ray slightly behind the character to prevent "starting inside the wall"
            const backward = direction.clone().multiplyScalar(-0.2);
            const origin = this.mesh.position.clone().add(new THREE.Vector3(0, h, 0)).add(backward);

            this.raycaster.set(origin, direction);
            this.raycaster.far = bufferedDistance;

            const intersects = this.raycaster.intersectObjects(buildings, true);
            const hits = intersects.filter(hit => !hit.object.isSprite && hit.object.visible);

            if (hits.length > 0) {
                // Confirm the hit is actually in front of the character (not behind due to back-offset)
                if (hits[0].distance > 0.1) return true;
            }
        }

        return false;
    }

    loadModel() {
        assetLoader.loadGLTF('assets/models/Soldier.glb').then(gltf => {
            console.log("Character Model Loaded", gltf);

            this.model = gltf.scene.clone();
            this.mesh.remove(this.placeholder);
            this.mesh.add(this.model);

            this.model.traverse(child => {
                if (child.isMesh) child.castShadow = true;
            });

            // Re-setup mixer with the NEW cloned model
            this.mixer = new THREE.AnimationMixer(this.model);

            // Re-link animations from original gltf to the new mixer
            if (gltf.animations && gltf.animations.length > 0) {
                this.actions['Idle'] = this.mixer.clipAction(gltf.animations.find(a => a.name === 'Idle') || gltf.animations[0]);
                this.actions['Walk'] = this.mixer.clipAction(gltf.animations.find(a => a.name === 'Walk') || gltf.animations[1]);
                this.actions['Run'] = this.mixer.clipAction(gltf.animations.find(a => a.name === 'Run') || gltf.animations[2]);

                this.activeAction = this.actions['Idle'];
                if (this.activeAction) this.activeAction.play();
            }
        }).catch(err => {
            console.error("Character: Load failed", err);
        });
    }

    fadeToAction(name, duration) {
        if (!this.mixer || !this.actions[name]) return;

        const previousAction = this.activeAction;
        const activeAction = this.actions[name];

        if (previousAction !== activeAction) {
            previousAction.fadeOut(duration);
            activeAction.reset().fadeIn(duration).play();
            this.activeAction = activeAction;
        }
    }

    update(deltaTime, buildings) {
        if (this.mixer) this.mixer.update(deltaTime); // Update animations

        this.handleMovement(deltaTime, buildings);

        // Procedural Stickman Animation
        if (this.limbs) {
            if (this.walkTime === undefined) this.walkTime = 0;
            if (this.isMoving) {
                this.walkTime += deltaTime * 10;
            } else {
                // Smoothly return to standing pose
                this.walkTime += (0 - this.walkTime) * Math.min(10 * deltaTime, 1.0);
                if (Math.abs(this.walkTime) < 0.01) this.walkTime = 0;
            }

            const sin = Math.sin(this.walkTime);
            this.limbs.leftArmGroup.rotation.x = sin * 0.8;
            this.limbs.rightArmGroup.rotation.x = -sin * 0.8;
            this.limbs.leftLegGroup.rotation.x = -sin * 0.8;
            this.limbs.rightLegGroup.rotation.x = sin * 0.8;
        }

        this.updateStats(deltaTime);
        this.checkInteractions(buildings);
    }

    checkInteractions(buildings) {
        // Raycast forward from character
        const direction = new THREE.Vector3(0, 0, 1);
        direction.applyQuaternion(this.mesh.quaternion);

        let closestBuilding = null;
        let minDistance = this.interactionRange || 3.0; // Ensure range is defined

        const worldPos = new THREE.Vector3();

        for (const building of buildings) {
            if (!building) continue;
            building.getWorldPosition(worldPos);
            const distance = this.mesh.position.distanceTo(worldPos);

            // Adjust range based on object size if needed, but simple distance is fine for now
            if (distance < minDistance) {
                closestBuilding = building;
                minDistance = distance;
            }
        }

        this.interactionTarget = closestBuilding;
        const prompt = document.getElementById('interaction-prompt');

        if (this.interactionTarget) {
            prompt.classList.remove('hidden');
            const type = this.interactionTarget.userData.type || 'Unknown';
            const action = this.interactionTarget.userData.action || '交互';

            if (type === 'Desk') prompt.innerText = `按 E 工作`;
            else if (type === 'Bed') prompt.innerText = `按 E 睡觉`;
            else if (type === 'Kitchen') prompt.innerText = `按 E 吃饭`;
            else if (type === 'Sofa') prompt.innerText = `按 E 休息`;
            else prompt.innerText = `按 E ${action}: ${type}`;
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

    createStickman() {
        const group = new THREE.Group();
        const material = new THREE.MeshStandardMaterial({ color: 0x111111 }); // Black stickman

        // Head
        const headGeo = new THREE.SphereGeometry(0.2, 16, 16);
        const head = new THREE.Mesh(headGeo, material);
        head.position.y = 1.7;
        head.castShadow = true;
        group.add(head);

        // Body
        const bodyGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.8);
        const body = new THREE.Mesh(bodyGeo, material);
        body.position.y = 1.1;
        body.castShadow = true;
        group.add(body);

        // Arms
        const armGeo = new THREE.CylinderGeometry(0.03, 0.03, 0.6);

        const leftArmGroup = new THREE.Group();
        leftArmGroup.position.set(-0.2, 1.4, 0);
        const leftArm = new THREE.Mesh(armGeo, material);
        leftArm.position.y = -0.3;
        leftArmGroup.add(leftArm);
        leftArmGroup.rotation.z = Math.PI / 12;
        group.add(leftArmGroup);

        const rightArmGroup = new THREE.Group();
        rightArmGroup.position.set(0.2, 1.4, 0);
        const rightArm = new THREE.Mesh(armGeo, material);
        rightArm.position.y = -0.3;
        rightArmGroup.add(rightArm);
        rightArmGroup.rotation.z = -Math.PI / 12;
        group.add(rightArmGroup);

        // Legs
        const legGeo = new THREE.CylinderGeometry(0.035, 0.035, 0.7);

        const leftLegGroup = new THREE.Group();
        leftLegGroup.position.set(-0.1, 0.7, 0);
        const leftLeg = new THREE.Mesh(legGeo, material);
        leftLeg.position.y = -0.35;
        leftLegGroup.add(leftLeg);
        group.add(leftLegGroup);

        const rightLegGroup = new THREE.Group();
        rightLegGroup.position.set(0.1, 0.7, 0);
        const rightLeg = new THREE.Mesh(legGeo, material);
        rightLeg.position.y = -0.35;
        rightLegGroup.add(rightLeg);
        group.add(rightLegGroup);

        this.limbs = {
            leftArmGroup, rightArmGroup, leftLegGroup, rightLegGroup
        };

        return group;
    }

    updateCamera() {
        this.camera.position.x = this.mesh.position.x + this.cameraOffset.x;
        this.camera.position.y = this.mesh.position.y + this.cameraOffset.y;
        this.camera.position.z = this.mesh.position.z + this.cameraOffset.z;

        // Look at head level instead of feet
        const targetPos = this.mesh.position.clone().add(new THREE.Vector3(0, 2, 0));
        this.camera.lookAt(targetPos);
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
