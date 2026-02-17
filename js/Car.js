import * as THREE from 'three';

export class AICar {
    constructor(scene, x, z, axis) {
        this.scene = scene;
        // axis: 'x' (moves along X) or 'z' (moves along Z)
        this.axis = axis;

        const carGroup = new THREE.Group();
        const colors = [0xFF0000, 0x00FF00, 0x0000FF, 0xFFFF00, 0xFFFFFF, 0x000000];
        const color = colors[Math.floor(Math.random() * colors.length)];

        // Simple Box Car
        const body = new THREE.Mesh(new THREE.BoxGeometry(2, 0.8, 4), new THREE.MeshStandardMaterial({ color: color }));
        body.position.y = 0.5;
        carGroup.add(body);
        const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.6, 2), new THREE.MeshStandardMaterial({ color: 0x333333 }));
        cabin.position.set(0, 1.2, 0);
        carGroup.add(cabin);

        // Wheels
        const wGeo = new THREE.CylinderGeometry(0.4, 0.4, 0.2);
        const wMat = new THREE.MeshStandardMaterial({ color: 0x000000 });
        [[-1, 1], [1, 1], [-1, -1], [1, -1]].forEach(p => {
            const w = new THREE.Mesh(wGeo, wMat);
            w.rotation.z = Math.PI / 2;
            w.position.set(p[0], 0.4, p[1] * 1.5);
            carGroup.add(w);
        });

        carGroup.position.set(x, 0, z);
        if (axis === 'x') carGroup.rotation.y = Math.PI / 2;

        this.mesh = carGroup;
        this.scene.add(this.mesh);

        this.speed = 10 + Math.random() * 10;
        this.direction = 1; // 1 or -1
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

        this.mesh = this.createCarModel();
        this.mesh.position.set(0, 0, 10); // Start position
        this.mesh.castShadow = true;
        this.scene.add(this.mesh);
    }

    createCarModel() {
        const group = new THREE.Group();

        // Body
        const bodyGeo = new THREE.BoxGeometry(2, 0.5, 4);
        const bodyMat = new THREE.MeshStandardMaterial({ color: 0xff0000 }); // Red
        const body = new THREE.Mesh(bodyGeo, bodyMat);
        body.position.y = 0.5;
        body.castShadow = true;
        group.add(body);

        // Roof
        const roofGeo = new THREE.BoxGeometry(1.8, 0.4, 2);
        const roofMat = new THREE.MeshStandardMaterial({ color: 0xcc0000 });
        const roof = new THREE.Mesh(roofGeo, roofMat);
        roof.position.y = 0.95;
        roof.castShadow = true;
        group.add(roof);

        // Wheels
        const wheelGeo = new THREE.CylinderGeometry(0.3, 0.3, 0.2, 16);
        const wheelMat = new THREE.MeshStandardMaterial({ color: 0x111111 });

        const positions = [
            { x: -1, z: -1.2 }, { x: 1, z: -1.2 },
            { x: -1, z: 1.2 }, { x: 1, z: 1.2 }
        ];

        positions.forEach(pos => {
            const wheel = new THREE.Mesh(wheelGeo, wheelMat);
            wheel.rotation.z = Math.PI / 2;
            wheel.position.set(pos.x, 0.3, pos.z);
            wheel.castShadow = true;
            group.add(wheel);
        });

        // Headlights
        const lightGeo = new THREE.CircleGeometry(0.2, 16);
        const lightMat = new THREE.MeshBasicMaterial({ color: 0xffffaa });
        const leftLight = new THREE.Mesh(lightGeo, lightMat);
        leftLight.position.set(-0.6, 0.6, 2.01);
        group.add(leftLight);

        const rightLight = new THREE.Mesh(lightGeo, lightMat);
        rightLight.position.set(0.6, 0.6, 2.01);
        group.add(rightLight);

        return group;
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

        this.mesh.position.addScaledVector(forward, this.velocity * deltaTime);
    }
}
