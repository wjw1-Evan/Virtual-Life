import * as THREE from 'three';
import { assetLoader } from './AssetLoader.js';

export class AICar {
    constructor(scene, x, z, axis) {
        this.scene = scene;
        this.axis = axis;

        this.mesh = new THREE.Group();
        this.mesh.position.set(x, 0, z);
        if (axis === 'x') this.mesh.rotation.y = Math.PI / 2;
        this.scene.add(this.mesh);

        // Load Model
        assetLoader.loadModel('assets/models/car.glb').then(model => {
            model.scale.set(3.2, 3.2, 3.2); // Proportional scale for AI cars
            // Rotate model if needed (Ferrari model in Three.js usually faces -Z or +Z)
            model.rotation.y = Math.PI;
            this.mesh.add(model);

            // Random color if model supports it (Ferrari usually doesn't easily without deep traversal, but let's try)
            model.traverse(child => {
                if (child.isMesh && child.name.includes('body')) {
                    child.material = child.material.clone();
                    child.material.color.setHex(Math.random() * 0xffffff);
                }
            });
        });

        this.speed = 10 + Math.random() * 10;
        this.direction = 1;
    }

    update(deltaTime) {
        if (this.axis === 'x') {
            this.mesh.position.x += this.speed * this.direction * deltaTime;
            // Loop around world bounds
            if (this.mesh.position.x > 200) this.mesh.position.x = -200;
            if (this.mesh.position.x < -200) this.mesh.position.x = 200;
        } else {
            this.mesh.position.z += this.speed * this.direction * deltaTime;
            if (this.mesh.position.z > 200) this.mesh.position.z = -200;
            if (this.mesh.position.z < -200) this.mesh.position.z = 200;
        }
    }
}

export class Car {
    constructor(scene, x, z) {
        this.scene = scene;
        this.speed = 0;
        this.maxSpeed = 5.0; // Boosted speed!
        this.acceleration = 50; // Faster acceleration
        this.turnSpeed = 4;
        this.friction = 15;

        this.velocity = 0;
        this.rotation = 0;

        this.mesh = new THREE.Group();
        this.mesh.position.set(0, 0, 10);
        this.scene.add(this.mesh);

        // Load High Quality Model
        assetLoader.loadModel('assets/models/car.glb').then(model => {
            model.scale.set(3.5, 3.5, 3.5); // Proportional scale for player car
            model.rotation.y = Math.PI;
            this.mesh.add(model);
        });
    }



    update(deltaTime, keys) {
        // Acceleration
        if (keys.w) {
            this.velocity += this.acceleration * deltaTime;
        } else if (keys.s) {
            this.velocity -= this.acceleration * deltaTime;
        } else {
            // Friction
            if (this.velocity > 0) {
                this.velocity = Math.max(0, this.velocity - this.friction * deltaTime);
            } else if (this.velocity < 0) {
                this.velocity = Math.min(0, this.velocity + this.friction * deltaTime);
            }
        }

        // Cap speed
        this.velocity = Math.max(-this.maxSpeed * 10, Math.min(this.maxSpeed * 20, this.velocity));

        // Turning (only when moving)
        if (Math.abs(this.velocity) > 0.1) {
            if (keys.a) {
                this.rotation += this.turnSpeed * deltaTime * Math.sign(this.velocity);
            }
            if (keys.d) {
                this.rotation -= this.turnSpeed * deltaTime * Math.sign(this.velocity);
            }
        }

        // Apply movement
        this.mesh.rotation.y = this.rotation;

        const forward = new THREE.Vector3(0, 0, 1);
        forward.applyAxisAngle(new THREE.Vector3(0, 1, 0), this.rotation);

        const moveVector = forward.clone().multiplyScalar(this.velocity * deltaTime);

        // Collision Detection for Car
        let blocked = false;
        if (arguments[2] && arguments[2].length > 0) { // Check if buildings array passed
            const buildings = arguments[2];
            if (!this.raycaster) this.raycaster = new THREE.Raycaster();

            // Car is smaller now, adjusted offsets
            const offsets = [1.5, 0, -1.5];
            const moveDir = moveVector.clone().normalize();

            if (moveVector.length() > 0.001) {
                for (const zOff of offsets) {
                    const origin = this.mesh.position.clone();
                    // Offset origin along car local axis
                    const localOffset = new THREE.Vector3(0, 1, zOff).applyAxisAngle(new THREE.Vector3(0, 1, 0), this.rotation);
                    origin.add(localOffset);

                    this.raycaster.set(origin, moveDir);
                    this.raycaster.far = Math.max(3.0, moveVector.length() + 1.0);
                    const intersects = this.raycaster.intersectObjects(buildings, true);
                    if (intersects.some(hit => !hit.object.isSprite)) {
                        blocked = true;
                        break;
                    }
                }
            }
        }

        if (!blocked) {
            this.mesh.position.add(moveVector);
        } else {
            this.velocity *= -0.5; // Bounce back slightly
        }
    }
}
