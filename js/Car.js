import * as THREE from 'three';
import { assetLoader } from './AssetLoader.js';

export class Car {
    constructor(scene, x, y, z) {
        this.scene = scene;
        this.mesh = new THREE.Group();
        this.mesh.position.set(x, y, z);
        this.mesh.userData = {
            type: 'Car',
            action: '驾驶',
            instance: this
        };
        this.scene.add(this.mesh);

        this.model = null;
        this.loadModel();

        // Driving physics
        this.speed = 0;
        this.maxSpeed = 40;
        this.acceleration = 15;
        this.friction = 5;
        this.braking = 30;
        this.steering = 0;
        this.steeringSpeed = 1.5;
        this.rotation = 0;

        this.isDriving = false;
        this.keys = {
            w: false,
            a: false,
            s: false,
            d: false
        };

        this.initInput();
    }

    async loadModel() {
        try {
            const gltf = await assetLoader.loadGLTF('assets/models/car.glb');
            this.model = gltf.scene.clone();

            // Auto-scale if needed, but let's try 1 first
            this.model.scale.set(1.5, 1.5, 1.5);
            this.model.traverse(child => {
                if (child.isMesh) {
                    child.castShadow = true;
                    child.receiveShadow = true;
                }
            });
            this.mesh.add(this.model);

            // Add interaction data
            this.mesh.userData = {
                type: 'Car',
                action: '驾驶',
                instance: this
            };
        } catch (err) {
            console.error("Car: Load failed", err);
            // Fallback: simple box car
            const cube = new THREE.Mesh(
                new THREE.BoxGeometry(2, 1, 4),
                new THREE.MeshStandardMaterial({ color: 0xff0000 })
            );
            cube.position.y = 0.5;
            this.mesh.add(cube);
            this.mesh.userData = {
                type: 'Car',
                action: '驾驶',
                instance: this
            };
        }
    }

    initInput() {
        // We handle keys externally in Game.js for active vehicle, 
        // but it's good to have them here if we want independent update
    }

    update(deltaTime, buildings) {
        if (!this.isDriving) {
            // Passive friction
            if (this.speed > 0) this.speed = Math.max(0, this.speed - this.friction * deltaTime);
            if (this.speed < 0) this.speed = Math.min(0, this.speed + this.friction * deltaTime);
        } else {
            // Handle acceleration
            if (this.keys.w) {
                this.speed += this.acceleration * deltaTime;
            } else if (this.keys.s) {
                this.speed -= this.acceleration * deltaTime;
            } else {
                // Friction
                if (this.speed > 0) this.speed = Math.max(0, this.speed - this.friction * deltaTime);
                if (this.speed < 0) this.speed = Math.min(0, this.speed + this.friction * deltaTime);
            }

            // Cap speed
            this.speed = THREE.MathUtils.clamp(this.speed, -this.maxSpeed / 2, this.maxSpeed);

            // Steering
            if (Math.abs(this.speed) > 1) { // Can only steer if moving
                const steeringDir = this.speed > 0 ? 1 : -1;
                if (this.keys.a) {
                    this.rotation += this.steeringSpeed * deltaTime * (Math.abs(this.speed) / this.maxSpeed + 0.5) * steeringDir;
                }
                if (this.keys.d) {
                    this.rotation -= this.steeringSpeed * deltaTime * (Math.abs(this.speed) / this.maxSpeed + 0.5) * steeringDir;
                }
            }
        }

        // Apply rotation
        this.mesh.rotation.y = this.rotation;

        // Apply movement with collision check
        const direction = new THREE.Vector3(0, 0, this.speed > 0 ? 1 : -1);
        direction.applyQuaternion(this.mesh.quaternion);

        const moveDist = Math.abs(this.speed) * deltaTime;

        if (moveDist > 0 && buildings) {
            if (this.checkCollision(direction, moveDist + 1, buildings)) {
                this.speed = 0; // Stop on collision
                return;
            }
        }

        const velocity = direction.clone().multiplyScalar(moveDist);
        this.mesh.position.add(velocity);
    }

    checkCollision(direction, distance, buildings) {
        if (!this.raycaster) this.raycaster = new THREE.Raycaster();

        // Check from front/back of car
        const origin = this.mesh.position.clone().add(new THREE.Vector3(0, 1, 0));
        this.raycaster.set(origin, direction);
        this.raycaster.far = distance + 2; // Buffer for car length

        const intersects = this.raycaster.intersectObjects(buildings, true);
        return intersects.length > 0;
    }

    enter() {
        this.isDriving = true;
    }

    exit() {
        this.isDriving = false;
        this.keys.w = false;
        this.keys.a = false;
        this.keys.s = false;
        this.keys.d = false;
    }
}
