import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { assetLoader } from './AssetLoader.js?v=31';

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

        // Physics engine
        this.velocity = new THREE.Vector3(0, 0, 0); // Full 3D velocity
        this.jumpForce = 10;
        this.gravity = -25;
        this.isGrounded = true;
        this.friction = 0.85; // Ground friction (0-1, lower = more friction)
        this.airResistance = 0.98; // Air resistance
        this.moveAcceleration = 20; // How fast character accelerates
        this.maxSpeed = 8; // Maximum horizontal speed
        this.coyoteTime = 0.1; // Time window to jump after leaving edge
        this.coyoteTimer = 0;
        this.jumpBufferTime = 0.1; // Time window to register jump before landing
        this.jumpBufferTimer = 0;
        this.groundNormal = new THREE.Vector3(0, 1, 0);

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
            if (e.code === 'Space') {
                e.preventDefault();
                // Jump buffer - allows jump input slightly before landing
                this.jumpBufferTimer = this.jumpBufferTime;
            }
            if (key === 'e') {
                this.interact();
            }
            if (key === 'i') {
                this.useItem();
            }
            if (key === '3') {
                this.mesh.position.set(0, 0, 0);
                this.velocity.set(0, 0, 0);
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

        // Get camera-relative movement directions
        const forward = new THREE.Vector3(0, 0, -1);
        forward.applyQuaternion(this.camera.quaternion);
        forward.y = 0;
        forward.normalize();

        const right = new THREE.Vector3(1, 0, 0);
        right.applyQuaternion(this.camera.quaternion);
        right.y = 0;
        right.normalize();

        // Calculate desired movement direction
        const moveDir = new THREE.Vector3(0, 0, 0);
        if (this.keys.w) moveDir.add(forward);
        if (this.keys.s) moveDir.sub(forward);
        if (this.keys.a) moveDir.sub(right);
        if (this.keys.d) moveDir.add(right);

        if (moveDir.length() > 0) {
            moveDir.normalize();

            // Check collision before moving
            const collisionRange = 0.5;
            const blocked = this.checkCollision(moveDir, collisionRange, buildings);

            // Apply acceleration in movement direction
            const targetVelocity = moveDir.clone().multiplyScalar(this.maxSpeed);

            // Blend current horizontal velocity toward target
            const horizontalVel = new THREE.Vector3(this.velocity.x, 0, this.velocity.z);
            if (!blocked) {
                horizontalVel.lerp(targetVelocity, this.moveAcceleration * deltaTime);
            } else {
                // Apply friction when blocked
                horizontalVel.multiplyScalar(0.5);
            }

            this.velocity.x = horizontalVel.x;
            this.velocity.z = horizontalVel.z;

            // Rotate character to face movement direction
            const angle = Math.atan2(moveDir.x, moveDir.z);
            if (this.model) {
                const targetQuat = new THREE.Quaternion();
                targetQuat.setFromAxisAngle(new THREE.Vector3(0, 1, 0), angle);
                this.mesh.quaternion.slerp(targetQuat, deltaTime * this.rotationSpeed);
            } else {
                this.mesh.rotation.y = angle;
            }

            this.isMoving = true;
            if (this.mixer) {
                this.fadeToAction('Walk', 0.2);
            }
        } else {
            // Apply friction to slow down when not moving
            const horizontalVel = new THREE.Vector3(this.velocity.x, 0, this.velocity.z);
            horizontalVel.multiplyScalar(this.friction);
            this.velocity.x = horizontalVel.x;
            this.velocity.z = horizontalVel.z;

            // Snap to zero if very slow
            if (this.velocity.length() < 0.1) {
                this.velocity.x = 0;
                this.velocity.z = 0;
            }

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

        // Bridge collision types to ignore (bridge uses ground detection only, not side collision)
        const ignoreTypes = ['Bridge', 'BridgeFill', 'BridgeRailing', 'BridgeSurface', 'BridgeStep', 'BridgeStepWall'];

        for (const h of heights) {
            // Start the ray slightly behind the character to prevent "starting inside the wall"
            const backward = direction.clone().multiplyScalar(-0.2);
            const origin = this.mesh.position.clone().add(new THREE.Vector3(0, h, 0)).add(backward);

            this.raycaster.set(origin, direction);
            this.raycaster.far = bufferedDistance;

            const intersects = this.raycaster.intersectObjects(buildings, true);
            const hits = intersects.filter(hit => {
                if (hit.object.isSprite || !hit.object.visible) return false;
                // Skip bridge collision objects - they are for ground detection only
                if (hit.object.userData && hit.object.userData.isCollisionBox) {
                    const type = hit.object.userData.type;
                    if (ignoreTypes.includes(type)) return false;
                }
                return true;
            });

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
        if (this.mixer) this.mixer.update(deltaTime);

        // Clamp delta to prevent physics explosion on lag
        deltaTime = Math.min(deltaTime, 0.05);

        // Ground detection - raycast downward to find ground surface
        if (this.groundRaycaster === undefined) {
            this.groundRaycaster = new THREE.Raycaster();
        }
        if (this._tempVec3 === undefined) {
            this._tempVec3 = new THREE.Vector3();
        }

        const groundCheckHeight = this.isGrounded ? 3 : 50;
        let groundY = 0;
        let foundGround = false;
        let groundSlopeNormal = new THREE.Vector3(0, 1, 0);

        // Check for bridge surface (math-based smooth arch collision)
        for (const obj of buildings) {
            if (obj.userData && obj.userData.type === 'BridgeSurface') {
                const d = obj.userData;
                obj.getWorldPosition(this._tempVec3);
                const worldCenterZ = this._tempVec3.z;
                const worldCenterX = this._tempVec3.x;

                const localZ = this.mesh.position.z - worldCenterZ;
                const halfLen = d.halfLen;
                const totalLength = d.totalLength;
                const archHeight = d.archHeight;
                const deckThickness = d.deckThickness;
                const bridgeWidth = d.bridgeWidth;

                if (Math.abs(localZ) < halfLen + 3 && Math.abs(this.mesh.position.x - worldCenterX) < bridgeWidth / 2 + 1.5) {
                    const archY = Math.sin(((localZ + halfLen) / totalLength) * Math.PI) * archHeight;
                    const surfaceY = archY + deckThickness;

                    if (this.mesh.position.y >= surfaceY - 1.5) {
                        if (!foundGround || surfaceY > groundY) {
                            groundY = surfaceY;
                            foundGround = true;
                            // Calculate slope normal for bridge
                            const slopeAngle = Math.cos(((localZ + halfLen) / totalLength) * Math.PI);
                            groundSlopeNormal.set(slopeAngle * 0.3, 1, 0).normalize();
                        }
                    }
                }
            }
        }

        // Raycast for other surfaces
        const ignoreTypes = ['Bridge', 'BridgeFill', 'BridgeRailing', 'BridgeSurface', 'BridgeStep', 'BridgeStepWall'];
        const checkPoints = [
            { x: 0, z: 0 },
            { x: 0.3, z: 0 },
            { x: -0.3, z: 0 },
            { x: 0, z: 0.3 },
            { x: 0, z: -0.3 }
        ];

        for (const point of checkPoints) {
            const rayStartY = this.isGrounded ? this.mesh.position.y + 2 : Math.max(this.mesh.position.y + 2, 50);
            const origin = new THREE.Vector3(
                this.mesh.position.x + point.x,
                rayStartY,
                this.mesh.position.z + point.z
            );
            this.groundRaycaster.set(origin, new THREE.Vector3(0, -1, 0));
            this.groundRaycaster.far = groundCheckHeight + (rayStartY - this.mesh.position.y);

            const hits = this.groundRaycaster.intersectObjects(buildings, false);
            for (const hit of hits) {
                if (hit.object.userData && hit.object.userData.isCollisionBox) {
                    const type = hit.object.userData.type;
                    if (ignoreTypes.includes(type)) continue;

                    const surfaceY = hit.point.y;
                    if (surfaceY < this.mesh.position.y + 0.5) {
                        if (!foundGround || surfaceY > groundY) {
                            groundY = surfaceY;
                            foundGround = true;
                            groundSlopeNormal.set(0, 1, 0);
                        }
                    }
                    break;
                }
            }
        }

        // Coyote time - allow jumping briefly after leaving ground
        if (!foundGround && this.isGrounded) {
            this.coyoteTimer = this.coyoteTime;
            this.isGrounded = false;
        }
        if (this.coyoteTimer > 0) {
            this.coyoteTimer -= deltaTime;
        }

        // Jump buffer - register jump input slightly before landing
        if (this.jumpBufferTimer > 0) {
            this.jumpBufferTimer -= deltaTime;
        }

        // Jumping logic with coyote time and jump buffer
        if (this.jumpBufferTimer > 0 && (this.isGrounded || this.coyoteTimer > 0)) {
            this.velocity.y = this.jumpForce;
            this.isGrounded = false;
            this.coyoteTimer = 0;
            this.jumpBufferTimer = 0;
        }

        // Apply gravity
        this.velocity.y += this.gravity * deltaTime;

        // Cap fall speed to prevent tunneling
        const maxFallSpeed = 40;
        if (this.velocity.y < -maxFallSpeed) {
            this.velocity.y = -maxFallSpeed;
        }

        // Apply velocity to position
        this.mesh.position.x += this.velocity.x * deltaTime;
        this.mesh.position.y += this.velocity.y * deltaTime;
        this.mesh.position.z += this.velocity.z * deltaTime;

        // Ground collision - prevent falling through
        if (foundGround && this.mesh.position.y <= groundY + 0.1) {
            // Landing - check if actually hitting ground (not just walking on slope)
            const velY = this.velocity.y;
            this.mesh.position.y = groundY;

            if (velY <= 0) {
                this.velocity.y = 0;
                this.isGrounded = true;
                this.coyoteTimer = 0;

                // Apply slope sliding - push character along slope
                if (groundSlopeNormal.y < 0.9) {
                    // On a slope, slide down
                    const slideForce = (1 - groundSlopeNormal.y) * 5;
                    this.velocity.x += groundSlopeNormal.x * slideForce * deltaTime;
                    this.velocity.z += groundSlopeNormal.z * slideForce * deltaTime;
                }
            }
        }

        // Hard floor at y=0
        if (this.mesh.position.y < 0) {
            this.mesh.position.y = 0;
            this.velocity.y = 0;
            this.isGrounded = true;
        }

        // Safety reset
        if (this.mesh.position.y < -50) {
            this.mesh.position.set(0, 0, 0);
            this.velocity.set(0, 0, 0);
            this.isGrounded = true;
        }

        // Horizontal movement with physics
        this.handleMovement(deltaTime, buildings);

        // Procedural Stickman Animation
        if (this.limbs) {
            if (this.walkTime === undefined) this.walkTime = 0;
            if (this.isMoving) {
                this.walkTime += deltaTime * 10;
            } else {
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

            if (type === 'Office') prompt.innerText = `按 E 进入办公室`;
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

        // Materials
        const skinMat = new THREE.MeshStandardMaterial({ color: 0xffcc99, roughness: 0.7 });
        const shirtMat = new THREE.MeshStandardMaterial({ color: 0x2255cc, roughness: 0.8 });
        const pantsMat = new THREE.MeshStandardMaterial({ color: 0x333344, roughness: 0.9 });
        const shoeMat = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.6 });
        const hairMat = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.8 });
        const eyeMat = new THREE.MeshStandardMaterial({ color: 0x111111 });
        const mouthMat = new THREE.MeshStandardMaterial({ color: 0xcc6666 });

        // Head
        const headGeo = new THREE.SphereGeometry(0.22, 24, 24);
        const head = new THREE.Mesh(headGeo, skinMat);
        head.position.y = 1.65;
        head.castShadow = true;
        head.scale.set(1, 1.05, 0.95);
        group.add(head);

        // Hair
        const hairGeo = new THREE.SphereGeometry(0.24, 24, 16, 0, Math.PI * 2, 0, Math.PI * 0.6);
        const hair = new THREE.Mesh(hairGeo, hairMat);
        hair.position.y = 1.68;
        hair.scale.set(1.05, 1, 1);
        hair.castShadow = true;
        group.add(hair);

        // Hair bangs
        const bangGeo = new THREE.BoxGeometry(0.35, 0.08, 0.15);
        const bang = new THREE.Mesh(bangGeo, hairMat);
        bang.position.set(0, 1.75, 0.12);
        bang.rotation.x = -0.2;
        group.add(bang);

        // Eyes
        const eyeGeo = new THREE.SphereGeometry(0.03, 12, 12);
        for (let side of [-1, 1]) {
            const eye = new THREE.Mesh(eyeGeo, eyeMat);
            eye.position.set(side * 0.08, 1.68, 0.18);
            group.add(eye);

            // Eye whites
            const eyeWhiteGeo = new THREE.SphereGeometry(0.04, 12, 12);
            const eyeWhiteMat = new THREE.MeshStandardMaterial({ color: 0xffffff });
            const eyeWhite = new THREE.Mesh(eyeWhiteGeo, eyeWhiteMat);
            eyeWhite.position.set(side * 0.08, 1.68, 0.17);
            group.add(eyeWhite);
        }

        // Mouth (smile)
        const mouthGeo = new THREE.TorusGeometry(0.04, 0.012, 8, 12, Math.PI);
        const mouth = new THREE.Mesh(mouthGeo, mouthMat);
        mouth.position.set(0, 1.57, 0.18);
        mouth.rotation.x = Math.PI;
        group.add(mouth);

        // Neck
        const neckGeo = new THREE.CylinderGeometry(0.06, 0.07, 0.12, 12);
        const neck = new THREE.Mesh(neckGeo, skinMat);
        neck.position.y = 1.42;
        neck.castShadow = true;
        group.add(neck);

        // Torso (shirt)
        const torsoGeo = new THREE.CylinderGeometry(0.18, 0.16, 0.5, 16);
        const torso = new THREE.Mesh(torsoGeo, shirtMat);
        torso.position.y = 1.1;
        torso.castShadow = true;
        group.add(torso);

        // Collar
        const collarGeo = new THREE.TorusGeometry(0.12, 0.025, 8, 16);
        const collar = new THREE.Mesh(collarGeo, shirtMat);
        collar.position.y = 1.34;
        collar.rotation.x = Math.PI / 2;
        group.add(collar);

        // Shirt design - simple stripe
        const stripeGeo = new THREE.BoxGeometry(0.28, 0.04, 0.19);
        const stripeMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.8 });
        const stripe = new THREE.Mesh(stripeGeo, stripeMat);
        stripe.position.set(0, 1.15, 0);
        group.add(stripe);

        // Hips
        const hipsGeo = new THREE.CylinderGeometry(0.16, 0.15, 0.15, 16);
        const hips = new THREE.Mesh(hipsGeo, pantsMat);
        hips.position.y = 0.78;
        hips.castShadow = true;
        group.add(hips);

        // Belt
        const beltGeo = new THREE.TorusGeometry(0.16, 0.02, 8, 16);
        const beltMat = new THREE.MeshStandardMaterial({ color: 0x553311, roughness: 0.5, metalness: 0.3 });
        const belt = new THREE.Mesh(beltGeo, beltMat);
        belt.position.y = 0.85;
        belt.rotation.x = Math.PI / 2;
        group.add(belt);

        // Belt buckle
        const buckleGeo = new THREE.BoxGeometry(0.06, 0.04, 0.03);
        const buckleMat = new THREE.MeshStandardMaterial({ color: 0xddaa33, metalness: 0.8, roughness: 0.2 });
        const buckle = new THREE.Mesh(buckleGeo, buckleMat);
        buckle.position.set(0, 0.85, 0.16);
        group.add(buckle);

        // Arms
        const leftArmGroup = new THREE.Group();
        leftArmGroup.position.set(-0.22, 1.3, 0);

        // Shoulder
        const shoulderGeo = new THREE.SphereGeometry(0.07, 12, 12);
        const leftShoulder = new THREE.Mesh(shoulderGeo, shirtMat);
        leftArmGroup.add(leftShoulder);

        // Upper arm
        const upperArmGeo = new THREE.CylinderGeometry(0.055, 0.05, 0.35, 12);
        const leftUpperArm = new THREE.Mesh(upperArmGeo, shirtMat);
        leftUpperArm.position.y = -0.18;
        leftUpperArm.castShadow = true;
        leftArmGroup.add(leftUpperArm);

        // Forearm
        const forearmGeo = new THREE.CylinderGeometry(0.045, 0.04, 0.3, 12);
        const leftForearm = new THREE.Mesh(forearmGeo, skinMat);
        leftForearm.position.y = -0.43;
        leftForearm.castShadow = true;
        leftArmGroup.add(leftForearm);

        // Hand
        const handGeo = new THREE.SphereGeometry(0.05, 12, 12);
        const leftHand = new THREE.Mesh(handGeo, skinMat);
        leftHand.position.y = -0.6;
        leftHand.scale.set(0.9, 1.1, 0.7);
        leftArmGroup.add(leftHand);

        leftArmGroup.rotation.z = 0.15;
        group.add(leftArmGroup);

        // Right arm
        const rightArmGroup = new THREE.Group();
        rightArmGroup.position.set(0.22, 1.3, 0);

        const rightShoulder = new THREE.Mesh(shoulderGeo, shirtMat);
        rightArmGroup.add(rightShoulder);

        const rightUpperArm = new THREE.Mesh(upperArmGeo, shirtMat);
        rightUpperArm.position.y = -0.18;
        rightUpperArm.castShadow = true;
        rightArmGroup.add(rightUpperArm);

        const rightForearm = new THREE.Mesh(forearmGeo, skinMat);
        rightForearm.position.y = -0.43;
        rightForearm.castShadow = true;
        rightArmGroup.add(rightForearm);

        const rightHand = new THREE.Mesh(handGeo, skinMat);
        rightHand.position.y = -0.6;
        rightHand.scale.set(0.9, 1.1, 0.7);
        rightArmGroup.add(rightHand);

        rightArmGroup.rotation.z = -0.15;
        group.add(rightArmGroup);

        // Legs
        const leftLegGroup = new THREE.Group();
        leftLegGroup.position.set(-0.1, 0.7, 0);

        // Upper leg (pants)
        const upperLegGeo = new THREE.CylinderGeometry(0.07, 0.065, 0.35, 12);
        const leftUpperLeg = new THREE.Mesh(upperLegGeo, pantsMat);
        leftUpperLeg.position.y = -0.18;
        leftUpperLeg.castShadow = true;
        leftLegGroup.add(leftUpperLeg);

        // Knee
        const kneeGeo = new THREE.SphereGeometry(0.06, 12, 12);
        const leftKnee = new THREE.Mesh(kneeGeo, pantsMat);
        leftKnee.position.y = -0.35;
        leftLegGroup.add(leftKnee);

        // Lower leg
        const lowerLegGeo = new THREE.CylinderGeometry(0.06, 0.055, 0.35, 12);
        const leftLowerLeg = new THREE.Mesh(lowerLegGeo, pantsMat);
        leftLowerLeg.position.y = -0.53;
        leftLowerLeg.castShadow = true;
        leftLegGroup.add(leftLowerLeg);

        // Shoe
        const shoeGeo = new THREE.BoxGeometry(0.1, 0.06, 0.2);
        const leftShoe = new THREE.Mesh(shoeGeo, shoeMat);
        leftShoe.position.set(0, -0.73, 0.03);
        leftShoe.castShadow = true;
        leftLegGroup.add(leftShoe);

        // Shoe sole
        const soleGeo = new THREE.BoxGeometry(0.11, 0.02, 0.21);
        const soleMat = new THREE.MeshStandardMaterial({ color: 0x444444, roughness: 0.9 });
        const leftSole = new THREE.Mesh(soleGeo, soleMat);
        leftSole.position.set(0, -0.77, 0.03);
        leftLegGroup.add(leftSole);

        group.add(leftLegGroup);

        // Right leg
        const rightLegGroup = new THREE.Group();
        rightLegGroup.position.set(0.1, 0.7, 0);

        const rightUpperLeg = new THREE.Mesh(upperLegGeo, pantsMat);
        rightUpperLeg.position.y = -0.18;
        rightUpperLeg.castShadow = true;
        rightLegGroup.add(rightUpperLeg);

        const rightKnee = new THREE.Mesh(kneeGeo, pantsMat);
        rightKnee.position.y = -0.35;
        rightLegGroup.add(rightKnee);

        const rightLowerLeg = new THREE.Mesh(lowerLegGeo, pantsMat);
        rightLowerLeg.position.y = -0.53;
        rightLowerLeg.castShadow = true;
        rightLegGroup.add(rightLowerLeg);

        const rightShoe = new THREE.Mesh(shoeGeo, shoeMat);
        rightShoe.position.set(0, -0.73, 0.03);
        rightShoe.castShadow = true;
        rightLegGroup.add(rightShoe);

        const rightSole = new THREE.Mesh(soleGeo, soleMat);
        rightSole.position.set(0, -0.77, 0.03);
        rightLegGroup.add(rightSole);

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
