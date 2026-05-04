import * as THREE from 'three';
import { assetLoader } from './AssetLoader.js?v=31';

export class World {
    constructor(scene) {
        this.scene = scene;
        this.buildings = [];
        this.collisionObjects = [];
        this.neonMaterials = [];
        this.mixers = [];
        this.particles = [];
        this.streetLightMat = null;

        this.init();
    }

    addCollisionBox(parent, width, height, depth, position, userData = {}) {
        const geometry = new THREE.BoxGeometry(width, height, depth);
        const material = new THREE.MeshBasicMaterial({ visible: false });
        const box = new THREE.Mesh(geometry, material);
        if (position) box.position.copy(position);
        box.userData = { isCollisionBox: true, ...userData };
        parent.add(box);
        this.collisionObjects.push(box);
        return box;
    }

    async init() {
        this.createGround();
        this.createBuildings();
        this.createMainGate(); // New: Community entrance
        this.createLake();
        this.createTrees();
        this.createRoads();
        this.createStreetLights();
        // this.createParticles(); // Placeholder
        this.createCommunityFence(); // Enclose the grid
        this.addUrbanProps();
    }

    update(deltaTime, time, playerPos) {
        this.mixers.forEach(mixer => mixer.update(deltaTime));
        this.updateMaterials(time);

        // Update electronic boards
        if (this.boards) {
            this.boards.forEach(board => {
                board.scrollOffset += deltaTime * 40;
                this.updateBoardContent(board);
            });
        }

        // Update automatic doors if player is near
        if (this.autoDoors && playerPos) {
            this.autoDoors.forEach(doorData => {
                // Calculate distance from player to the gate's center
                const dist = playerPos.distanceTo(doorData.centerPos);
                const isNear = dist < doorData.triggerDistance;

                // Lerp rotation towards target (open or closed)
                const targetRot = isNear ? doorData.openRot : doorData.closedRot;
                doorData.door.rotation.y += (targetRot - doorData.door.rotation.y) * 5.0 * deltaTime;
            });
        }
    }

    createGround() {
        const geometry = new THREE.PlaneGeometry(1000, 1000);
        const material = new THREE.MeshStandardMaterial({
            color: 0xeeeeee,
            roughness: 0.8,
            metalness: 0.1
        });
        const ground = new THREE.Mesh(geometry, material);
        ground.rotation.x = -Math.PI / 2;
        ground.receiveShadow = true;
        this.scene.add(ground);
    }

    createBuildings() {
        const zones = [
            { name: 'Central Park', type: 'park_amenity', cellX: 1, cellZ: 0, label: '中央公园' }
        ];

        zones.forEach(zone => {
            const roadSpacing = 100;
            const blockCenterX = zone.cellX >= 0 ? zone.cellX * roadSpacing + roadSpacing / 2 : zone.cellX * roadSpacing + roadSpacing / 2;
            const blockCenterZ = zone.cellZ >= 0 ? zone.cellZ * roadSpacing + roadSpacing / 2 : zone.cellZ * roadSpacing + roadSpacing / 2;

            let finalX = blockCenterX;
            let finalZ = blockCenterZ;
            let finalRotation = 0;

            const group = new THREE.Group();
            group.position.set(finalX, 0, finalZ);
            group.rotation.y = finalRotation;
            this.scene.add(group);

            if (zone.type === 'park_amenity') {
                this.createSmallPark(group);
            }

            if (zone.label) {
                const label = this.createLabel(zone.label);
                label.position.set(0, 15, 0);
                group.add(label);
            }
        });
    }

    createSkyscraper(group, height, color, isCommercial = false) {
        const width = isCommercial ? 25 : 18;
        const depth = isCommercial ? 25 : 18;

        // Main structural base
        const bodyGeo = new THREE.BoxGeometry(width, height, depth);
        const bodyMat = new THREE.MeshStandardMaterial({ color: color, roughness: 0.2, metalness: 0.5 });
        const body = new THREE.Mesh(bodyGeo, bodyMat);
        body.position.y = height / 2;
        body.castShadow = true;
        body.receiveShadow = true;
        group.add(body);

        // Windows
        const windowColor = isCommercial ? 0x88ccff : 0xffffaa;
        const windowMat = new THREE.MeshStandardMaterial({
            color: windowColor,
            emissive: windowColor,
            emissiveIntensity: 0.5,
            transparent: true,
            opacity: 0.9
        });

        this.neonMaterials.push(windowMat); // Add to pulse system

        const floors = Math.floor(height / 4);
        const windowsPerRow = isCommercial ? 6 : 4;
        const winSpacingX = width / (windowsPerRow + 1);
        const winSpacingZ = depth / (windowsPerRow + 1);

        for (let f = 1; f < floors; f++) {
            const h = f * 4;
            const isBalconyFloor = f % 2 === 0;

            // Front windows/balconies
            for (let w = 1; w <= windowsPerRow; w++) {
                const xPos = -width / 2 + w * winSpacingX;

                if (!isCommercial && isBalconyFloor && (w === 1 || w === windowsPerRow)) {
                    // Add a balcony
                    const balGeo = new THREE.BoxGeometry(winSpacingX * 1.5, 0.2, 2.5);
                    const bal = new THREE.Mesh(balGeo, bodyMat);
                    bal.position.set(xPos, h - 1.8, depth / 2 + 1.25);
                    group.add(bal);
                    // Railing
                    const rail = new THREE.Mesh(new THREE.BoxGeometry(winSpacingX * 1.5, 1.2, 0.1), new THREE.MeshStandardMaterial({ color: 0x111111 }));
                    rail.position.set(xPos, h - 1.2, depth / 2 + 2.5);
                    group.add(rail);
                } else {
                    const winGeo = new THREE.PlaneGeometry(winSpacingX * 0.6, 2);
                    const win = new THREE.Mesh(winGeo, windowMat);
                    win.position.set(xPos, h, depth / 2 + 0.1);
                    group.add(win);

                    // Add an AC unit next to some windows
                    if (!isCommercial && Math.random() > 0.4) {
                        const ac = new THREE.Mesh(new THREE.BoxGeometry(1.4, 1.0, 1.0), new THREE.MeshStandardMaterial({ color: 0xeeeeee }));
                        ac.position.set(xPos + (w > windowsPerRow / 2 ? -1.8 : 1.8), h - 0.5, depth / 2 + 0.5);
                        group.add(ac);
                    }
                }
            }

            // Simple back windows
            for (let w = 1; w <= windowsPerRow; w++) {
                const win = new THREE.Mesh(new THREE.PlaneGeometry(winSpacingX * 0.6, 2), windowMat);
                win.position.set(-width / 2 + w * winSpacingX, h, -depth / 2 - 0.1);
                win.rotation.y = Math.PI;
                group.add(win);
            }
        }

        // Roof details
        const roofHeight = 4;
        const roofGeo = new THREE.BoxGeometry(width * 0.8, roofHeight, depth * 0.8);
        const roof = new THREE.Mesh(roofGeo, bodyMat);
        roof.position.y = height + roofHeight / 2;
        group.add(roof);

        // Antenna
        const antGeo = new THREE.CylinderGeometry(0.2, 0.2, 10);
        const ant = new THREE.Mesh(antGeo, new THREE.MeshStandardMaterial({ color: 0x111111 }));
        ant.position.set(0, height + roofHeight + 5, 0);
        group.add(ant);

        // Collision
        body.userData = { type: 'Skyscraper', label: isCommercial ? '写字楼' : '住宅大厦' };
        this.buildings.push(body);
    }

    createLandscaping(group) {
        // Sidewalk
        const pathGeo = new THREE.RingGeometry(20, 22, 4, 1, Math.PI / 4, Math.PI * 2);
        const pathMat = new THREE.MeshStandardMaterial({ color: 0x777777 });
        const path = new THREE.Mesh(pathGeo, pathMat);
        path.rotation.x = -Math.PI / 2;
        path.position.y = 0.06;
        group.add(path);

        // Street benches or planters
        for (let i = 0; i < 4; i++) {
            const angle = (i / 4) * Math.PI * 2;
            const x = Math.cos(angle) * 25;
            const z = Math.sin(angle) * 25;
            this.createFlowerBed(group, x, z);
        }
    }

    createFlowerBed(group, x, z) {
        const bedGeo = new THREE.BoxGeometry(6, 0.5, 6);
        const bedMat = new THREE.MeshStandardMaterial({ color: 0x443322 });
        const bed = new THREE.Mesh(bedGeo, bedMat);
        bed.position.set(x, 0.25, z);
        group.add(bed);

        const flowerColors = [0xff4444, 0xffaa00, 0x44ff44];
        for (let i = 0; i < 6; i++) {
            const f = new THREE.Mesh(new THREE.SphereGeometry(0.4), new THREE.MeshStandardMaterial({ color: flowerColors[i % 3] }));
            f.position.set(x + (Math.random() - 0.5) * 4, 0.7, z + (Math.random() - 0.5) * 4);
            group.add(f);
        }
    }

    createSmallPark(group) {
        const parkRadius = 35;

        // Multi-layer grass base
        const grass = new THREE.Mesh(
            new THREE.CircleGeometry(parkRadius, 64),
            new THREE.MeshStandardMaterial({ color: 0x3a8c3a, roughness: 0.9 })
        );
        grass.rotation.x = -Math.PI / 2;
        grass.position.y = 0.05;
        group.add(grass);

        // Lighter grass ring
        const grassRing = new THREE.Mesh(
            new THREE.RingGeometry(parkRadius * 0.6, parkRadius, 64),
            new THREE.MeshStandardMaterial({ color: 0x4a9c4a, roughness: 0.95 })
        );
        grassRing.rotation.x = -Math.PI / 2;
        grassRing.position.y = 0.06;
        group.add(grassRing);

        // Stone border around park
        const borderGeo = new THREE.TorusGeometry(parkRadius, 0.4, 8, 64);
        const borderMat = new THREE.MeshStandardMaterial({ color: 0x888888, roughness: 0.7 });
        const border = new THREE.Mesh(borderGeo, borderMat);
        border.rotation.x = -Math.PI / 2;
        border.position.y = 0.2;
        group.add(border);

        // Cross-shaped stone paths
        const pathMat = new THREE.MeshStandardMaterial({ color: 0xbbaa99, roughness: 0.8 });
        const pathWidth = 3;
        const pathLength = parkRadius - 2;
        for (let i = 0; i < 4; i++) {
            const path = new THREE.Mesh(new THREE.BoxGeometry(pathWidth, 0.08, pathLength), pathMat);
            path.position.set(0, 0.1, pathLength / 2 - parkRadius);
            path.receiveShadow = true;
            group.add(path);
            // Rotate for cardinal directions
            path.rotation.y = (Math.PI / 2) * i;
            // Recalculate positions for rotated paths
            path.position.x = Math.sin(path.rotation.y) * (pathLength / 2 - parkRadius);
            path.position.z = Math.cos(path.rotation.y) * (pathLength / 2 - parkRadius);
        }

        // Circular central plaza
        const plazaMat = new THREE.MeshStandardMaterial({ color: 0x999999, roughness: 0.6 });
        const plaza = new THREE.Mesh(new THREE.CircleGeometry(8, 32), plazaMat);
        plaza.rotation.x = -Math.PI / 2;
        plaza.position.y = 0.12;
        group.add(plaza);

        // Circular path around center
        const circlePath = new THREE.Mesh(
            new THREE.RingGeometry(8, 9.5, 32),
            new THREE.MeshStandardMaterial({ color: 0xaaaa99, roughness: 0.8 })
        );
        circlePath.rotation.x = -Math.PI / 2;
        circlePath.position.y = 0.1;
        group.add(circlePath);

        // Central ornate fountain
        this.createOrnateFountain(group);

        // Decorative lampposts around circular path
        for (let i = 0; i < 8; i++) {
            const angle = (i / 8) * Math.PI * 2;
            const x = Math.cos(angle) * 10;
            const z = Math.sin(angle) * 10;
            this.createParkLamp(group, x, z);
        }

        // Park benches facing inward along outer circle
        for (let i = 0; i < 6; i++) {
            const angle = (i / 6) * Math.PI * 2 + Math.PI / 6;
            const x = Math.cos(angle) * 28;
            const z = Math.sin(angle) * 28;
            const bench = this.createParkBench();
            bench.position.set(x, 0, z);
            bench.rotation.y = -angle + Math.PI;
            group.add(bench);
        }

        // Flower beds in a ring pattern
        for (let i = 0; i < 12; i++) {
            const angle = (i / 12) * Math.PI * 2;
            const x = Math.cos(angle) * 18;
            const z = Math.sin(angle) * 18;
            this.createDetailedFlowerBed(group, x, z);
        }

        // Decorative trees scattered around
        const treePositions = [
            { x: 15, z: 15 }, { x: -15, z: 15 }, { x: 15, z: -15 }, { x: -15, z: -15 },
            { x: 25, z: 5 }, { x: -25, z: 5 }, { x: 25, z: -5 }, { x: -25, z: -5 },
            { x: 10, z: 25 }, { x: -10, z: -25 }, { x: 30, z: 15 }, { x: -30, z: 15 }
        ];
        treePositions.forEach(pos => {
            const tree = this.createParkTree();
            tree.position.set(pos.x, 0, pos.z);
            tree.rotation.y = Math.random() * Math.PI * 2;
            group.add(tree);
        });

        // Small pond in southeast corner
        this.createParkPond(group, 20, -18);

        // Playground area in northwest
        this.createPlayground(group, -22, 18);

        // Trash cans at key points
        for (let i = 0; i < 6; i++) {
            const angle = (i / 6) * Math.PI * 2;
            const x = Math.cos(angle) * 20;
            const z = Math.sin(angle) * 20;
            group.add(this.createTrashCan(x, z));
        }

        // Decorative hedges along paths
        for (let i = 0; i < 4; i++) {
            const angle = (i / 4) * Math.PI * 2 + Math.PI / 4;
            const hedge = this.createHedge();
            hedge.position.set(Math.cos(angle) * 6, 0, Math.sin(angle) * 6);
            hedge.rotation.y = angle;
            group.add(hedge);
        }

        // Central sculpture on pedestal
        this.createSculpture(group);
    }

    createOrnateFountain(group) {
        const stoneMat = new THREE.MeshStandardMaterial({ color: 0xcccccc, roughness: 0.4, metalness: 0.2 });
        const darkStone = new THREE.MeshStandardMaterial({ color: 0x888888, roughness: 0.5 });

        // Multi-tiered base
        const base1 = new THREE.Mesh(new THREE.CylinderGeometry(5, 5.5, 1, 32), stoneMat);
        base1.position.y = 0.5;
        group.add(base1);

        const base2 = new THREE.Mesh(new THREE.CylinderGeometry(3.5, 4, 0.8, 32), stoneMat);
        base2.position.y = 1.4;
        group.add(base2);

        // Water surfaces
        const waterMat = new THREE.MeshStandardMaterial({
            color: 0x3399ff,
            transparent: true,
            opacity: 0.7,
            roughness: 0.05,
            metalness: 0.3
        });
        const water1 = new THREE.Mesh(new THREE.CircleGeometry(5.3, 32), waterMat);
        water1.rotation.x = -Math.PI / 2;
        water1.position.y = 1.05;
        group.add(water1);

        const water2 = new THREE.Mesh(new THREE.CircleGeometry(3.8, 32), waterMat.clone());
        water2.rotation.x = -Math.PI / 2;
        water2.position.y = 1.85;
        group.add(water2);

        // Center pillar
        const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.8, 3, 16), stoneMat);
        pillar.position.y = 3.3;
        group.add(pillar);

        // Decorative top bowl
        const bowl = new THREE.Mesh(new THREE.TorusGeometry(1.5, 0.3, 8, 16), darkStone);
        bowl.rotation.x = Math.PI / 2;
        bowl.position.y = 4.8;
        group.add(bowl);

        // Spout
        const spout = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.2, 0.5, 8), stoneMat);
        spout.position.y = 5.1;
        group.add(spout);

        // Water particles (static spray effect)
        const sprayMat = new THREE.MeshStandardMaterial({ color: 0xaaddff, transparent: true, opacity: 0.6 });
        for (let i = 0; i < 24; i++) {
            const angle = (i / 24) * Math.PI * 2;
            const radius = 1.5 + Math.random() * 0.5;
            const drop = new THREE.Mesh(new THREE.SphereGeometry(0.15, 6, 6), sprayMat);
            drop.position.set(Math.cos(angle) * radius, 5.5 + Math.random() * 0.5, Math.sin(angle) * radius);
            group.add(drop);
        }

        // Corner ornaments on base
        for (let i = 0; i < 4; i++) {
            const angle = (i / 4) * Math.PI * 2;
            const orn = new THREE.Mesh(new THREE.SphereGeometry(0.4, 8, 8), darkStone);
            orn.position.set(Math.cos(angle) * 4.5, 1.2, Math.sin(angle) * 4.5);
            group.add(orn);
        }

        // Fountain collision
        const fountainCollider = new THREE.Mesh(
            new THREE.CylinderGeometry(5.5, 5.5, 5, 16),
            new THREE.MeshBasicMaterial({ visible: false })
        );
        fountainCollider.position.y = 2.5;
        fountainCollider.userData = { isCollisionBox: true, type: 'Fountain' };
        group.add(fountainCollider);
        this.collisionObjects.push(fountainCollider);
    }

    createParkLamp(group, x, z) {
        const lampGroup = new THREE.Group();
        const poleMat = new THREE.MeshStandardMaterial({ color: 0x2a2a2a, metalness: 0.6, roughness: 0.4 });

        // Ornate pole
        const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.12, 4, 8), poleMat);
        pole.position.y = 2;
        lampGroup.add(pole);

        // Decorative base
        const base = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.35, 0.4, 8), poleMat);
        base.position.y = 0.2;
        lampGroup.add(base);

        // Ornate arm
        const arm = new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.05, 4, 8, Math.PI), poleMat);
        arm.position.y = 4;
        arm.rotation.y = Math.PI / 2;
        lampGroup.add(arm);

        // Lantern
        const lanternMat = new THREE.MeshStandardMaterial({
            color: 0xffffcc,
            emissive: 0xffaa00,
            emissiveIntensity: 0.8,
            transparent: true,
            opacity: 0.9
        });
        const lantern = new THREE.Mesh(new THREE.SphereGeometry(0.25, 8, 8), lanternMat);
        lantern.position.y = 4.1;
        lampGroup.add(lantern);

        // Glass housing
        const housing = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.2, 0.6, 6), new THREE.MeshStandardMaterial({ color: 0x111111, metalness: 0.8 }));
        housing.position.y = 4.2;
        lampGroup.add(housing);

        // Point light
        const light = new THREE.PointLight(0xffaa44, 1, 15);
        light.position.y = 4.1;
        lampGroup.add(light);

        // Park lamp collision
        const lampCollider = new THREE.Mesh(
            new THREE.CylinderGeometry(0.3, 0.3, 4.5, 6),
            new THREE.MeshBasicMaterial({ visible: false })
        );
        lampCollider.position.y = 2.25;
        lampCollider.userData = { isCollisionBox: true, type: 'ParkLamp' };
        lampGroup.add(lampCollider);
        this.collisionObjects.push(lampCollider);

        lampGroup.position.set(x, 0, z);
        group.add(lampGroup);
    }

    createParkBench() {
        const benchGroup = new THREE.Group();
        const woodMat = new THREE.MeshStandardMaterial({ color: 0x6b4423, roughness: 0.8 });
        const metalMat = new THREE.MeshStandardMaterial({ color: 0x222222, metalness: 0.7, roughness: 0.3 });

        // Seat slats
        for (let i = 0; i < 4; i++) {
            const slat = new THREE.Mesh(new THREE.BoxGeometry(3, 0.1, 0.4), woodMat);
            slat.position.set(0, 0.6, -0.6 + i * 0.45);
            benchGroup.add(slat);
        }

        // Back slats
        for (let i = 0; i < 3; i++) {
            const slat = new THREE.Mesh(new THREE.BoxGeometry(3, 0.1, 0.3), woodMat);
            slat.position.set(0, 0.9 + i * 0.4, -0.7);
            benchGroup.add(slat);
        }

        // Metal supports
        for (let x of [-1.2, 0, 1.2]) {
            const leg = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.6, 0.8), metalMat);
            leg.position.set(x, 0.3, -0.3);
            benchGroup.add(leg);
        }

        // Armrests
        for (let side of [-1.5, 1.5]) {
            const arm = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.4, 1.5), metalMat);
            arm.position.set(side, 0.8, -0.15);
            benchGroup.add(arm);
        }

        // Bench collision
        const benchCollider = new THREE.Mesh(
            new THREE.BoxGeometry(3.2, 1.5, 1.5),
            new THREE.MeshBasicMaterial({ visible: false })
        );
        benchCollider.position.set(0, 0.75, -0.15);
        benchCollider.userData = { isCollisionBox: true, type: 'ParkBench' };
        benchGroup.add(benchCollider);
        this.collisionObjects.push(benchCollider);

        return benchGroup;
    }

    createDetailedFlowerBed(group, x, z) {
        const bedGroup = new THREE.Group();
        const edgeMat = new THREE.MeshStandardMaterial({ color: 0x887766, roughness: 0.9 });

        // Circular flower bed edge
        const edge = new THREE.Mesh(new THREE.TorusGeometry(1.5, 0.2, 6, 12), edgeMat);
        edge.rotation.x = Math.PI / 2;
        edge.position.y = 0.2;
        bedGroup.add(edge);

        // Soil
        const soil = new THREE.Mesh(
            new THREE.CircleGeometry(1.4, 12),
            new THREE.MeshStandardMaterial({ color: 0x553322, roughness: 1 })
        );
        soil.rotation.x = -Math.PI / 2;
        soil.position.y = 0.15;
        bedGroup.add(soil);

        // Various flowers
        const flowerColors = [0xff4466, 0xff8844, 0xffcc22, 0xaa44ff, 0xff66aa, 0x66aaff, 0xffffff, 0xff5555];
        for (let i = 0; i < 8; i++) {
            const angle = (i / 8) * Math.PI * 2;
            const r = 0.5 + Math.random() * 0.7;
            const fx = Math.cos(angle) * r;
            const fz = Math.sin(angle) * r;

            // Stem
            const stem = new THREE.Mesh(
                new THREE.CylinderGeometry(0.02, 0.03, 0.5, 4),
                new THREE.MeshStandardMaterial({ color: 0x338822 })
            );
            stem.position.set(fx, 0.4, fz);
            bedGroup.add(stem);

            // Flower head
            const flower = new THREE.Mesh(
                new THREE.SphereGeometry(0.15 + Math.random() * 0.1, 6, 6),
                new THREE.MeshStandardMaterial({ color: flowerColors[i % flowerColors.length], roughness: 0.8 })
            );
            flower.position.set(fx, 0.65 + Math.random() * 0.1, fz);
            bedGroup.add(flower);
        }

        bedGroup.position.set(x, 0, z);
        group.add(bedGroup);
    }

    createParkTree() {
        const treeGroup = new THREE.Group();
        const trunkMat = new THREE.MeshStandardMaterial({ color: 0x5a3a1a, roughness: 0.9 });

        // Curved trunk
        const trunkHeight = 3 + Math.random() * 2;
        const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.4, trunkHeight, 8), trunkMat);
        trunk.position.y = trunkHeight / 2;
        trunk.castShadow = true;
        treeGroup.add(trunk);

        // Layered canopy (3 layers for fullness)
        const leafColors = [0x2d5a1e, 0x3a7a2a, 0x4a8a3a, 0x2a6a22];
        const layers = [
            { y: trunkHeight + 0.5, r: 2.5, color: 0 },
            { y: trunkHeight - 0.5, r: 3, color: 1 },
            { y: trunkHeight - 1.5, r: 2.8, color: 2 }
        ];

        layers.forEach(layer => {
            const leaves = new THREE.Mesh(
                new THREE.SphereGeometry(layer.r, 8, 6),
                new THREE.MeshStandardMaterial({
                    color: leafColors[layer.color],
                    roughness: 0.85,
                    flatShading: true
                })
            );
            leaves.position.set(
                (Math.random() - 0.5) * 0.5,
                layer.y,
                (Math.random() - 0.5) * 0.5
            );
            leaves.scale.y = 0.7;
            leaves.castShadow = true;
            treeGroup.add(leaves);
        });

        // Small bushes at base
        for (let i = 0; i < 3; i++) {
            const angle = (i / 3) * Math.PI * 2;
            const bush = new THREE.Mesh(
                new THREE.SphereGeometry(0.6, 6, 4),
                new THREE.MeshStandardMaterial({ color: 0x3a7a2a, flatShading: true })
            );
            bush.position.set(Math.cos(angle) * 0.5, 0.3, Math.sin(angle) * 0.5);
            bush.scale.y = 0.6;
            treeGroup.add(bush);
        }

        // Park tree collision
        const treeCollider = new THREE.Mesh(
            new THREE.CylinderGeometry(0.6, 0.6, trunkHeight + 2, 6),
            new THREE.MeshBasicMaterial({ visible: false })
        );
        treeCollider.position.y = (trunkHeight + 2) / 2;
        treeCollider.userData = { isCollisionBox: true, type: 'ParkTree' };
        treeGroup.add(treeCollider);
        this.collisionObjects.push(treeCollider);

        return treeGroup;
    }

    createParkPond(group, x, z) {
        const pondGroup = new THREE.Group();

        // Pond basin
        const basinMat = new THREE.MeshStandardMaterial({ color: 0x666655, roughness: 0.9 });
        const basin = new THREE.Mesh(new THREE.TorusGeometry(4, 0.5, 8, 16), basinMat);
        basin.rotation.x = Math.PI / 2;
        basin.position.y = 0.2;
        pondGroup.add(basin);

        // Water
        const waterMat = new THREE.MeshStandardMaterial({
            color: 0x2277aa,
            transparent: true,
            opacity: 0.8,
            roughness: 0.05,
            metalness: 0.4
        });
        const water = new THREE.Mesh(new THREE.CircleGeometry(3.8, 16), waterMat);
        water.rotation.x = -Math.PI / 2;
        water.position.y = 0.15;
        pondGroup.add(water);

        // Lily pads
        for (let i = 0; i < 5; i++) {
            const angle = (i / 5) * Math.PI * 2;
            const r = 1 + Math.random() * 2;
            const lily = new THREE.Mesh(
                new THREE.CircleGeometry(0.4, 8),
                new THREE.MeshStandardMaterial({ color: 0x22aa33, roughness: 0.8 })
            );
            lily.rotation.x = -Math.PI / 2;
            lily.position.set(Math.cos(angle) * r, 0.17, Math.sin(angle) * r);
            pondGroup.add(lily);
        }

        // Lily flowers
        const lilyFlower = new THREE.Mesh(
            new THREE.SphereGeometry(0.15, 6, 4),
            new THREE.MeshStandardMaterial({ color: 0xff66aa })
        );
        lilyFlower.position.set(1, 0.25, 1.5);
        pondGroup.add(lilyFlower);

        // Decorative rocks around pond
        const rockMat = new THREE.MeshStandardMaterial({ color: 0x777766, roughness: 0.95 });
        for (let i = 0; i < 8; i++) {
            const angle = (i / 8) * Math.PI * 2;
            const rock = new THREE.Mesh(
                new THREE.SphereGeometry(0.3 + Math.random() * 0.3, 5, 4),
                rockMat
            );
            rock.position.set(Math.cos(angle) * 4.2, 0.15, Math.sin(angle) * 4.2);
            rock.scale.y = 0.5;
            pondGroup.add(rock);
        }

        // Small willow tree beside pond
        const willow = this.createParkTree();
        willow.position.set(5, 0, 5);
        willow.scale.set(1.3, 1.3, 1.3);
        pondGroup.add(willow);

        // Pond collision
        const pondCollider = new THREE.Mesh(
            new THREE.CylinderGeometry(4.5, 4.5, 1, 16),
            new THREE.MeshBasicMaterial({ visible: false })
        );
        pondCollider.position.y = 0.5;
        pondCollider.userData = { isCollisionBox: true, type: 'ParkPond' };
        pondGroup.add(pondCollider);
        this.collisionObjects.push(pondCollider);

        pondGroup.position.set(x, 0, z);
        group.add(pondGroup);
    }

    createPlayground(group, x, z) {
        const playGroup = new THREE.Group();
        const metalMat = new THREE.MeshStandardMaterial({ color: 0xcc4422, roughness: 0.5 });
        const yellowMat = new THREE.MeshStandardMaterial({ color: 0xffcc00, roughness: 0.6 });
        const blueMat = new THREE.MeshStandardMaterial({ color: 0x3366cc, roughness: 0.5 });

        // Sandbox area
        const sandMat = new THREE.MeshStandardMaterial({ color: 0xddcc99, roughness: 1 });
        const sandbox = new THREE.Mesh(new THREE.CylinderGeometry(3, 3, 0.3, 12), sandMat);
        sandbox.position.set(0, 0.15, 0);
        playGroup.add(sandbox);

        // Sandbox edge
        const sandEdge = new THREE.Mesh(
            new THREE.TorusGeometry(3, 0.2, 6, 12),
            yellowMat
        );
        sandEdge.rotation.x = Math.PI / 2;
        sandEdge.position.y = 0.3;
        playGroup.add(sandEdge);

        // Slide
        const slideGroup = new THREE.Group();
        slideGroup.position.set(5, 0, 0);

        // Platform
        const platform = new THREE.Mesh(new THREE.BoxGeometry(2, 2.5, 2), blueMat);
        platform.position.y = 1.25;
        slideGroup.add(platform);

        // Ladder
        for (let i = 0; i < 5; i++) {
            const rung = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.05, 0.05), yellowMat);
            rung.position.set(1, 0.5 + i * 0.45, -1);
            slideGroup.add(rung);
        }

        // Slide surface
        const slideSurface = new THREE.Mesh(
            new THREE.BoxGeometry(1.2, 0.1, 3),
            metalMat
        );
        slideSurface.position.set(0, 2.5, 1.5);
        slideSurface.rotation.x = Math.PI / 6;
        slideGroup.add(slideSurface);

        // Slide sides
        for (let side of [-0.6, 0.6]) {
            const slideSide = new THREE.Mesh(
                new THREE.BoxGeometry(0.05, 0.3, 3),
                yellowMat
            );
            slideSide.position.set(side, 2.65, 1.5);
            slideSide.rotation.x = Math.PI / 6;
            slideGroup.add(slideSide);
        }

        playGroup.add(slideGroup);

        // Swing set
        const swingGroup = new THREE.Group();
        swingGroup.position.set(-4, 0, 0);

        // A-frame
        for (let side of [-1.5, 1.5]) {
            const leg1 = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 3, 6), metalMat);
            leg1.position.set(side, 1.5, -0.5);
            leg1.rotation.z = side * 0.15;
            swingGroup.add(leg1);

            const leg2 = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 3, 6), metalMat);
            leg2.position.set(side, 1.5, 0.5);
            leg2.rotation.z = -side * 0.15;
            swingGroup.add(leg2);
        }

        // Top bar
        const topBar = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 3.5, 6), yellowMat);
        topBar.rotation.x = Math.PI / 2;
        topBar.position.y = 3;
        swingGroup.add(topBar);

        // Swing chains and seats
        for (let i = -1; i <= 1; i += 2) {
            const seat = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.05, 0.3), blueMat);
            seat.position.set(i * 0.8, 1, 0);
            swingGroup.add(seat);

            for (let chain of [-0.2, 0.2]) {
                const chainLink = new THREE.Mesh(
                    new THREE.CylinderGeometry(0.02, 0.02, 2, 4),
                    metalMat
                );
                chainLink.position.set(i * 0.8 + chain, 2, 0);
                swingGroup.add(chainLink);
            }
        }

        playGroup.add(swingGroup);

        // Playground collision
        const playgroundCollider = new THREE.Mesh(
            new THREE.BoxGeometry(10, 3, 10),
            new THREE.MeshBasicMaterial({ visible: false })
        );
        playgroundCollider.position.y = 1.5;
        playgroundCollider.userData = { isCollisionBox: true, type: 'Playground' };
        playGroup.add(playgroundCollider);
        this.collisionObjects.push(playgroundCollider);

        playGroup.position.set(x, 0, z);
        group.add(playGroup);
    }

    createTrashCan(x, z) {
        const canGroup = new THREE.Group();
        const mat = new THREE.MeshStandardMaterial({ color: 0x336633, roughness: 0.8 });

        // Body
        const body = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.25, 0.8, 8), mat);
        body.position.y = 0.4;
        canGroup.add(body);

        // Lid
        const lid = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.05, 8), mat);
        lid.position.y = 0.82;
        canGroup.add(lid);

        // Rim
        const rim = new THREE.Mesh(
            new THREE.TorusGeometry(0.28, 0.03, 4, 8),
            new THREE.MeshStandardMaterial({ color: 0x222222, metalness: 0.6 })
        );
        rim.rotation.x = Math.PI / 2;
        rim.position.y = 0.85;
        canGroup.add(rim);

        // Trash can collision
        const trashCollider = new THREE.Mesh(
            new THREE.CylinderGeometry(0.35, 0.35, 0.9, 6),
            new THREE.MeshBasicMaterial({ visible: false })
        );
        trashCollider.position.y = 0.45;
        trashCollider.userData = { isCollisionBox: true, type: 'TrashCan' };
        canGroup.add(trashCollider);
        this.collisionObjects.push(trashCollider);

        canGroup.position.set(x, 0, z);
        return canGroup;
    }

    createHedge() {
        const hedgeGroup = new THREE.Group();
        const hedgeMat = new THREE.MeshStandardMaterial({ color: 0x2a6a1a, roughness: 0.9, flatShading: true });

        // Trimmed rectangular hedge
        const body = new THREE.Mesh(new THREE.BoxGeometry(2, 1, 0.5), hedgeMat);
        body.position.y = 0.5;
        body.castShadow = true;
        hedgeGroup.add(body);

        // Rounded top
        const top = new THREE.Mesh(new THREE.SphereGeometry(0.35, 6, 4), hedgeMat);
        top.position.set(0.7, 1, 0);
        top.scale.set(1, 0.7, 0.7);
        hedgeGroup.add(top);

        const top2 = top.clone();
        top2.position.set(-0.7, 1, 0);
        hedgeGroup.add(top2);

        // Hedge collision
        const hedgeCollider = new THREE.Mesh(
            new THREE.BoxGeometry(2, 1.2, 0.6),
            new THREE.MeshBasicMaterial({ visible: false })
        );
        hedgeCollider.position.y = 0.6;
        hedgeCollider.userData = { isCollisionBox: true, type: 'Hedge' };
        hedgeGroup.add(hedgeCollider);
        this.collisionObjects.push(hedgeCollider);

        return hedgeGroup;
    }

    createSculpture(group) {
        const sculptureGroup = new THREE.Group();
        const bronzeMat = new THREE.MeshStandardMaterial({ color: 0x8b6914, metalness: 0.8, roughness: 0.3 });
        const stoneMat = new THREE.MeshStandardMaterial({ color: 0xdddddd, roughness: 0.5 });

        // Stone pedestal
        const pedestal = new THREE.Mesh(new THREE.BoxGeometry(2, 1.5, 2), stoneMat);
        pedestal.position.y = 0.75;
        pedestal.castShadow = true;
        sculptureGroup.add(pedestal);

        // Pedestal trim
        const trim = new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.2, 2.3), new THREE.MeshStandardMaterial({ color: 0xbbbbbb }));
        trim.position.y = 1.6;
        sculptureGroup.add(trim);

        // Abstract sphere sculpture
        const mainSphere = new THREE.Mesh(new THREE.SphereGeometry(1.2, 16, 16), bronzeMat);
        mainSphere.position.y = 3;
        mainSphere.castShadow = true;
        sculptureGroup.add(mainSphere);

        // Orbiting smaller spheres
        const orbitRadii = [1.8, 2.2, 1.5];
        const orbitAngles = [0, Math.PI * 0.66, Math.PI * 1.33];
        const sizes = [0.3, 0.25, 0.35];

        for (let i = 0; i < 3; i++) {
            const smallSphere = new THREE.Mesh(new THREE.SphereGeometry(sizes[i], 8, 8), bronzeMat);
            smallSphere.position.set(
                Math.cos(orbitAngles[i]) * orbitRadii[i],
                3 + Math.sin(orbitAngles[i]) * 0.5,
                Math.sin(orbitAngles[i]) * orbitRadii[i]
            );
            smallSphere.castShadow = true;
            sculptureGroup.add(smallSphere);
        }

        // Abstract ring
        const ring = new THREE.Mesh(new THREE.TorusGeometry(1.5, 0.1, 8, 24), bronzeMat);
        ring.position.y = 3;
        ring.rotation.x = Math.PI / 4;
        sculptureGroup.add(ring);

        // Sculpture collision
        const sculptureCollider = new THREE.Mesh(
            new THREE.BoxGeometry(3, 4, 3),
            new THREE.MeshBasicMaterial({ visible: false })
        );
        sculptureCollider.position.y = 2;
        sculptureCollider.userData = { isCollisionBox: true, type: 'Sculpture' };
        sculptureGroup.add(sculptureCollider);
        this.collisionObjects.push(sculptureCollider);

        group.add(sculptureGroup);
    }


    createBench() {
        const group = new THREE.Group();
        const mat = new THREE.MeshStandardMaterial({ color: 0x4a3b2c });
        const seat = new THREE.Mesh(new THREE.BoxGeometry(4, 0.2, 1.2), mat);
        seat.position.y = 0.6;
        const back = new THREE.Mesh(new THREE.BoxGeometry(4, 1, 0.1), mat);
        back.position.set(0, 1.1, -0.6);
        group.add(seat, back);
        return group;
    }

    createLabel(text) {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = 256;
        canvas.height = 128;
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.roundRect(0, 0, 256, 128, 20);
        ctx.fill();
        ctx.font = 'Bold 40px Arial';
        ctx.fillStyle = 'white';
        ctx.textAlign = 'center';
        ctx.fillText(text, 128, 80);

        const texture = new THREE.CanvasTexture(canvas);
        const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true }));
        sprite.scale.set(10 * (canvas.width / canvas.height), 10, 1);
        return sprite;
    }

    createProceduralTree(treeColors) {
        const treeGroup = new THREE.Group();

        const trunkMat = new THREE.MeshStandardMaterial({ color: 0x4a3b2c, roughness: 1.0 });

        // Pick a base color and slightly randomize it
        const baseHex = treeColors[Math.floor(Math.random() * treeColors.length)];
        const baseColor = new THREE.Color(baseHex);
        const hsl = { h: 0, s: 0, l: 0 };
        baseColor.getHSL(hsl);
        baseColor.setHSL(hsl.h + (Math.random() * 0.1 - 0.05), hsl.s, hsl.l + (Math.random() * 0.1 - 0.05));

        const leafMat = new THREE.MeshStandardMaterial({
            color: baseColor,
            roughness: 0.8,
            flatShading: true // Gives a nice, realistic stylized look
        });

        // Main Trunk
        const trunkHeight = 5 + Math.random() * 3;
        const trunkGeo = new THREE.CylinderGeometry(0.4, 0.7, trunkHeight, 7);
        const trunk = new THREE.Mesh(trunkGeo, trunkMat);
        trunk.position.y = trunkHeight / 2;
        trunk.castShadow = true;
        trunk.receiveShadow = true;
        treeGroup.add(trunk);

        // Branches and leaves
        const numBranches = 4 + Math.floor(Math.random() * 3);
        const branchGeoBase = new THREE.CylinderGeometry(0.15, 0.35, 1, 5);
        branchGeoBase.translate(0, 0.5, 0); // Pivot at bottom

        const leafGeo = new THREE.IcosahedronGeometry(1.5, 1); // 1 detail for more spherical but still faceted

        for (let i = 0; i < numBranches; i++) {
            const heightFactor = 0.3 + (i / numBranches) * 0.6; // From 30% to 90% up the trunk
            const startY = trunkHeight * heightFactor;

            const branchLength = 2.5 + Math.random() * 2;
            const branchAngleY = (i * ((Math.PI * 2) / numBranches)) + (Math.random() * 1.0); // Spread around trunk
            const branchAngleZ = 0.6 + Math.random() * 0.6; // Bend outward angle

            const branch = new THREE.Mesh(branchGeoBase, trunkMat);
            branch.scale.set(1, branchLength, 1);

            // Pivot group to handle rotation cleanly
            const branchPivot = new THREE.Group();
            branchPivot.position.set(0, startY, 0);
            branchPivot.rotation.y = branchAngleY;

            branch.rotation.z = branchAngleZ;
            branch.castShadow = true;
            branch.receiveShadow = true;
            branchPivot.add(branch);

            // Leaves at end of branch
            const leafScale = 1.0 + Math.random() * 0.8;
            const leaves = new THREE.Mesh(leafGeo, leafMat);

            // Position at end of the bent branch
            leaves.position.set(
                -Math.sin(branchAngleZ) * branchLength,
                Math.cos(branchAngleZ) * branchLength,
                0
            );
            leaves.scale.set(leafScale, leafScale, leafScale);
            leaves.castShadow = true;
            leaves.receiveShadow = true;

            branchPivot.add(leaves);
            treeGroup.add(branchPivot);
        }

        // Main canopy on top
        const topLeafGeo = new THREE.IcosahedronGeometry(2.5, 1);
        const topLeaves = new THREE.Mesh(topLeafGeo, leafMat);
        topLeaves.position.set(0, trunkHeight + 0.5, 0);
        topLeaves.scale.set(1.2, 0.8 + Math.random() * 0.4, 1.2);
        topLeaves.castShadow = true;
        topLeaves.receiveShadow = true;
        treeGroup.add(topLeaves);

        // Collision box for tree trunk
        const trunkCollider = new THREE.Mesh(
            new THREE.CylinderGeometry(0.8, 0.8, trunkHeight + 2, 6),
            new THREE.MeshBasicMaterial({ visible: false })
        );
        trunkCollider.position.y = (trunkHeight + 2) / 2;
        trunkCollider.userData = { isCollisionBox: true, type: 'Tree' };
        treeGroup.add(trunkCollider);
        this.collisionObjects.push(trunkCollider);

        return treeGroup;
    }

    createTrees() {
        const treePositions = [];
        const treeSpacing = 50; // Increased spacing to make it less dense
        const roadGridSize = 100;
        const roadEdgeOffset = 10;
        const bound = 200;

        const lakeP = this.lakeInfo ? this.lakeInfo.pos : null;
        const lakeR = this.lakeInfo ? this.lakeInfo.radius : 0;

        // Along N-S roads
        for (let x = -bound; x <= bound; x += roadGridSize) {
            for (let z = -bound; z <= bound; z += treeSpacing) {
                if (Math.abs(z % roadGridSize) < 15) continue;

                // Avoid lake
                if (lakeP) {
                    if (new THREE.Vector2(x - roadEdgeOffset, z).distanceTo(new THREE.Vector2(lakeP.x, lakeP.z)) < lakeR + 5) continue;
                    if (new THREE.Vector2(x + roadEdgeOffset, z).distanceTo(new THREE.Vector2(lakeP.x, lakeP.z)) < lakeR + 5) continue;
                }

                treePositions.push({ x: x - roadEdgeOffset, z: z });
                treePositions.push({ x: x + roadEdgeOffset, z: z });
            }
        }

        // Along E-W roads
        for (let z = -bound; z <= bound; z += roadGridSize) {
            for (let x = -bound; x <= bound; x += treeSpacing) {
                if (Math.abs(x % roadGridSize) < 15) continue;

                // Avoid lake
                if (lakeP) {
                    if (new THREE.Vector2(x, z - roadEdgeOffset).distanceTo(new THREE.Vector2(lakeP.x, lakeP.z)) < lakeR + 5) continue;
                    if (new THREE.Vector2(x, z + roadEdgeOffset).distanceTo(new THREE.Vector2(lakeP.x, lakeP.z)) < lakeR + 5) continue;
                }

                treePositions.push({ x: x, z: z - roadEdgeOffset });
                treePositions.push({ x: x, z: z + roadEdgeOffset });
            }
        }

        // Add some sparse trees near the water
        if (lakeP) {
            const numLakeTrees = 6; // Sparse as requested
            for (let i = 0; i < numLakeTrees; i++) {
                const angle = (i / numLakeTrees) * Math.PI * 2 + Math.random();
                const dist = lakeR + 8 + Math.random() * 12;
                const tx = lakeP.x + Math.cos(angle) * dist;
                const tz = lakeP.z + Math.sin(angle) * dist;

                // Only if not directly on the formal roads
                if (Math.abs(tx % roadGridSize) > 15 && Math.abs(tz % roadGridSize) > 15) {
                    treePositions.push({ x: tx, z: tz });
                }
            }
        }

        const treeColors = [
            0x2d4c1e, // Dark green
            0x3a5f27, // Forest green
            0x4b7331, // Standard green
            0x5c873b, // Light green
            0x8b5a2b, // Autumn brown
            0xcc7722  // Autumn orange
        ];

        treePositions.forEach(pos => {
            const tree = this.createProceduralTree(treeColors);

            const scale = 1.0 + Math.random() * 0.5;
            tree.position.set(pos.x, 0, pos.z);
            tree.scale.set(scale, scale, scale);
            tree.rotation.y = Math.random() * Math.PI * 2;

            this.scene.add(tree);
        });
    }

    createLake() {
        const lakeGroup = new THREE.Group();
        const lakeRadius = 22;
        const lakeCenter = new THREE.Vector3(0, 0, 0);

        // Multi-depth water layers for realistic look
        const deepWaterMat = new THREE.MeshStandardMaterial({
            color: 0x0a4a8a,
            transparent: true,
            opacity: 0.9,
            roughness: 0.05,
            metalness: 0.5
        });
        const midWaterMat = new THREE.MeshStandardMaterial({
            color: 0x1e7abf,
            transparent: true,
            opacity: 0.85,
            roughness: 0.08,
            metalness: 0.4
        });
        const shallowWaterMat = new THREE.MeshStandardMaterial({
            color: 0x33aadd,
            transparent: true,
            opacity: 0.75,
            roughness: 0.1,
            metalness: 0.3
        });

        // Deep water core
        const deepWater = new THREE.Mesh(new THREE.CircleGeometry(lakeRadius * 0.6, 48), deepWaterMat);
        deepWater.rotation.x = -Math.PI / 2;
        deepWater.position.y = 0.08;
        lakeGroup.add(deepWater);

        // Mid water ring
        const midWater = new THREE.Mesh(new THREE.RingGeometry(lakeRadius * 0.55, lakeRadius * 0.8, 48), midWaterMat);
        midWater.rotation.x = -Math.PI / 2;
        midWater.position.y = 0.09;
        lakeGroup.add(midWater);

        // Shallow water edge
        const shallowWater = new THREE.Mesh(new THREE.RingGeometry(lakeRadius * 0.75, lakeRadius, 48), shallowWaterMat);
        shallowWater.rotation.x = -Math.PI / 2;
        shallowWater.position.y = 0.1;
        lakeGroup.add(shallowWater);

        // Lake bed (visible through shallow water)
        const lakeBed = new THREE.Mesh(
            new THREE.CircleGeometry(lakeRadius - 2, 48),
            new THREE.MeshStandardMaterial({ color: 0x8a7a5a, roughness: 1 })
        );
        lakeBed.rotation.x = -Math.PI / 2;
        lakeBed.position.y = 0.03;
        lakeGroup.add(lakeBed);

        // Layered shoreline - sand ring
        const sandMat = new THREE.MeshStandardMaterial({ color: 0xd4c4a0, roughness: 1 });
        const sand = new THREE.Mesh(new THREE.RingGeometry(lakeRadius, lakeRadius + 4, 64), sandMat);
        sand.rotation.x = -Math.PI / 2;
        sand.position.y = 0.06;
        lakeGroup.add(sand);

        // Pebble ring
        const pebbleMat = new THREE.MeshStandardMaterial({ color: 0x998877, roughness: 0.95 });
        const pebbles = new THREE.Mesh(new THREE.RingGeometry(lakeRadius + 3, lakeRadius + 7, 64), pebbleMat);
        pebbles.rotation.x = -Math.PI / 2;
        pebbles.position.y = 0.07;
        lakeGroup.add(pebbles);

        // Grass transition edge
        const grassEdge = new THREE.Mesh(
            new THREE.RingGeometry(lakeRadius + 6, lakeRadius + 10, 64),
            new THREE.MeshStandardMaterial({ color: 0x669944, roughness: 0.95 })
        );
        grassEdge.rotation.x = -Math.PI / 2;
        grassEdge.position.y = 0.06;
        lakeGroup.add(grassEdge);

        // Decorative rocks around shore
        const rockMat = new THREE.MeshStandardMaterial({ color: 0x776655, roughness: 0.9, flatShading: true });
        const darkRock = new THREE.MeshStandardMaterial({ color: 0x554433, roughness: 0.95, flatShading: true });
        for (let i = 0; i < 60; i++) {
            const angle = (i / 60) * Math.PI * 2 + (Math.random() - 0.5) * 0.1;
            const dist = lakeRadius - 2 + Math.random() * 12;
            const size = 0.3 + Math.random() * 0.8;
            const rock = new THREE.Mesh(
                new THREE.SphereGeometry(size, 5, 4),
                Math.random() > 0.5 ? rockMat : darkRock
            );
            rock.position.set(Math.cos(angle) * dist, size * 0.4, Math.sin(angle) * dist);
            rock.scale.y = 0.4 + Math.random() * 0.3;
            rock.rotation.y = Math.random() * Math.PI;
            lakeGroup.add(rock);
        }

        // Wooden dock/pier
        this.createLakeDock(lakeGroup, 0, lakeRadius + 2, 0);

        // Stone bridge crossing the lake center
        this.createLakeBridge(lakeGroup, 0, 0, 0);

        // Reeds and cattails in clusters
        for (let i = 0; i < 8; i++) {
            const angle = (i / 8) * Math.PI * 2 + Math.random() * 0.3;
            const dist = lakeRadius - 3 + Math.random() * 3;
            this.createReedCluster(lakeGroup, Math.cos(angle) * dist, Math.sin(angle) * dist);
        }

        // Lily pads and lotus flowers scattered on water
        for (let i = 0; i < 25; i++) {
            const angle = Math.random() * Math.PI * 2;
            const dist = Math.random() * (lakeRadius - 10);
            const x = Math.cos(angle) * dist;
            const z = Math.sin(angle) * dist;

            // Lily pad
            const lily = new THREE.Mesh(
                new THREE.CircleGeometry(0.6 + Math.random() * 0.4, 8),
                new THREE.MeshStandardMaterial({ color: 0x22aa44, roughness: 0.8, side: THREE.DoubleSide })
            );
            lily.rotation.x = -Math.PI / 2;
            lily.position.set(x, 0.13, z);
            lily.rotation.z = Math.random() * Math.PI;
            lakeGroup.add(lily);

            // Lotus flower (every 3rd lily)
            if (i % 3 === 0) {
                const lotus = this.createLotusFlower();
                lotus.position.set(x + (Math.random() - 0.5) * 0.3, 0.15, z + (Math.random() - 0.5) * 0.3);
                lakeGroup.add(lotus);
            }
        }

        // Fishing spots removed - benches/chairs were blocking bridge access

        // Stone pathway around lake
        this.createLakePath(lakeGroup, lakeRadius + 10);

        // Lake lanterns along path
        for (let i = 0; i < 12; i++) {
            const angle = (i / 12) * Math.PI * 2;
            const x = Math.cos(angle) * (lakeRadius + 9);
            const z = Math.sin(angle) * (lakeRadius + 9);
            this.createStoneLantern(lakeGroup, x, z);
        }

        // Small waterfall/stream feature on northwest side
        this.createWaterfall(lakeGroup, -35, -30, Math.PI / 4);

        // Willow trees near shore
        for (let i = 0; i < 6; i++) {
            const angle = (i / 6) * Math.PI * 2 + Math.random() * 0.2;
            const dist = lakeRadius + 5 + Math.random() * 5;
            const willow = this.createWillowTree();
            willow.position.set(Math.cos(angle) * dist, 0, Math.sin(angle) * dist);
            willow.rotation.y = Math.random() * Math.PI;
            lakeGroup.add(willow);
        }

        // Decorative stone benches removed - were blocking bridge access

        lakeGroup.position.copy(lakeCenter);
        this.scene.add(lakeGroup);

        this.lakeInfo = { pos: lakeCenter, radius: lakeRadius };

        // Add a label
        const label = this.createLabel('心愿湖 (Lake)');
        label.position.set(0, 18, -lakeRadius - 15);
        this.scene.add(label);

        // Keep reference for animation
        this.waterMaterials = [deepWaterMat, midWaterMat, shallowWaterMat];
    }

    createLakeIsland(parent, x, z, radius, trees) {
        const islandGroup = new THREE.Group();

        // Island base rising from water
        const islandMat = new THREE.MeshStandardMaterial({ color: 0x99aa66, roughness: 0.9 });
        const islandBase = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius + 1, 1.5, 16), islandMat);
        islandBase.position.y = 0.5;
        islandGroup.add(islandBase);

        // Grassy top
        const grass = new THREE.Mesh(
            new THREE.CircleGeometry(radius, 16),
            new THREE.MeshStandardMaterial({ color: 0x44aa33, roughness: 0.9 })
        );
        grass.rotation.x = -Math.PI / 2;
        grass.position.y = 1.3;
        islandGroup.add(grass);

        // Rocks around edge
        const rockMat = new THREE.MeshStandardMaterial({ color: 0x666655, roughness: 0.9, flatShading: true });
        for (let i = 0; i < 10; i++) {
            const angle = (i / 10) * Math.PI * 2;
            const rock = new THREE.Mesh(
                new THREE.SphereGeometry(0.3 + Math.random() * 0.4, 5, 4),
                rockMat
            );
            rock.position.set(Math.cos(angle) * (radius - 0.5), 0.4, Math.sin(angle) * (radius - 0.5));
            rock.scale.y = 0.5;
            islandGroup.add(rock);
        }

        // Trees on island
        for (let i = 0; i < trees; i++) {
            const angle = (i / trees) * Math.PI * 2;
            const dist = radius * 0.5;
            const tree = this.createParkTree();
            tree.position.set(Math.cos(angle) * dist, 1.3, Math.sin(angle) * dist);
            tree.scale.set(0.8, 0.8, 0.8);
            islandGroup.add(tree);
        }

        islandGroup.position.set(x, 0, z);
        parent.add(islandGroup);
    }

    createLakeDock(parent, x, z, rotY) {
        const dockGroup = new THREE.Group();
        const woodMat = new THREE.MeshStandardMaterial({ color: 0x8b6914, roughness: 0.8 });
        const darkWood = new THREE.MeshStandardMaterial({ color: 0x6b4f12, roughness: 0.85 });

        // Dock platform extending over water
        const platform = new THREE.Mesh(new THREE.BoxGeometry(4, 0.2, 12), woodMat);
        platform.position.y = 0.5;
        platform.receiveShadow = true;
        dockGroup.add(platform);

        // Wood plank lines
        const lineMat = new THREE.MeshStandardMaterial({ color: 0x553300 });
        for (let i = -5; i <= 5; i += 0.8) {
            const line = new THREE.Mesh(new THREE.BoxGeometry(4.02, 0.02, 0.05), lineMat);
            line.position.set(0, 0.61, i);
            dockGroup.add(line);
        }

        // Support posts underwater
        for (let px of [-1.5, 1.5]) {
            for (let pz of [-4, 0, 4]) {
                const post = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 1.5, 6), darkWood);
                post.position.set(px, -0.25, pz);
                dockGroup.add(post);
            }
        }

        // Railings
        const railMat = new THREE.MeshStandardMaterial({ color: 0x99aa88, metalness: 0.3 });
        for (let side of [-2, 2]) {
            // Top rail
            const topRail = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 10), railMat);
            topRail.position.set(side, 1, 0);
            dockGroup.add(topRail);

            // Vertical posts
            for (let pz = -4; pz <= 4; pz += 2) {
                const vPost = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 1, 4), railMat);
                vPost.position.set(side, 0.5, pz);
                dockGroup.add(vPost);
            }
        }

        // Bollards for tying boats
        for (let side of [-1.5, 1.5]) {
            const bollard = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.12, 0.6, 8), darkWood);
            bollard.position.set(side, 0.9, 5.5);
            dockGroup.add(bollard);
        }

        // Small fishing net decoration
        const netGroup = new THREE.Group();
        for (let i = 0; i < 6; i++) {
            const rope = new THREE.Mesh(
                new THREE.CylinderGeometry(0.01, 0.01, 1.5, 3),
                new THREE.MeshStandardMaterial({ color: 0x887766 })
            );
            rope.position.set(1.5 + (Math.random() - 0.5) * 0.5, 0.6, 4 + i * 0.25);
            netGroup.add(rope);
        }
        dockGroup.add(netGroup);

        // Dock collision
        const dockCollider = new THREE.Mesh(
            new THREE.BoxGeometry(4.5, 1.2, 12.5),
            new THREE.MeshBasicMaterial({ visible: false })
        );
        dockCollider.position.y = 0.6;
        dockCollider.userData = { isCollisionBox: true, type: 'Dock' };
        dockGroup.add(dockCollider);
        this.collisionObjects.push(dockCollider);

        dockGroup.position.set(x, 0, z);
        dockGroup.rotation.y = rotY;
        parent.add(dockGroup);
    }

    createLakeBridge(parent, x, z, rotY) {
        const bridgeGroup = new THREE.Group();
        const stoneMat = new THREE.MeshStandardMaterial({ color: 0xd5d0c8, roughness: 0.55 });
        const stoneDark = new THREE.MeshStandardMaterial({ color: 0x999990, roughness: 0.65 });
        const stoneLight = new THREE.MeshStandardMaterial({ color: 0xeae6de, roughness: 0.4 });
        const redMat = new THREE.MeshStandardMaterial({ color: 0xb82222, roughness: 0.5 });
        const goldMat = new THREE.MeshStandardMaterial({ color: 0xddaa44, roughness: 0.25, metalness: 0.6 });

        const bridgeWidth = 5;
        const totalLength = 60;
        const archHeight = 6;
        const halfLen = totalLength / 2;
        const deckThickness = 0.6;
        const segments = 120;

        // Helper: arch height at any z
        const archY = (z) => Math.sin(((z + halfLen) / totalLength) * Math.PI) * archHeight;

        // Build bridge with overlapping segments (no gaps)
        for (let i = 0; i < segments; i++) {
            const z1 = -halfLen + (i / segments) * totalLength;
            const z2 = -halfLen + ((i + 1.05) / segments) * totalLength; // 5% overlap
            const midZ = (z1 + z2) / 2;
            const segLen = z2 - z1;

            const yTop = archY(midZ) + deckThickness;
            const yBottom = Math.max(0, archY(midZ) - deckThickness * 0.5);

            // Deck slab
            const deck = new THREE.Mesh(new THREE.BoxGeometry(bridgeWidth, deckThickness, segLen + 0.05), stoneMat);
            deck.position.set(0, yTop - deckThickness / 2, midZ);
            deck.castShadow = true;
            deck.receiveShadow = true;
            bridgeGroup.add(deck);

            // Arch fill beneath
            const fillH = yTop - deckThickness - yBottom;
            if (fillH > 0.1) {
                const fill = new THREE.Mesh(
                    new THREE.BoxGeometry(bridgeWidth - 0.8, fillH, segLen + 0.05),
                    stoneDark
                );
                fill.position.set(0, yBottom + fillH / 2, midZ);
                fill.castShadow = true;
                bridgeGroup.add(fill);
            }
        }

        // Railing pillars
        const numBays = 20;
        const pillarSpacing = totalLength / numBays;

        for (let p = 0; p <= numBays; p++) {
            const pz = -halfLen + p * pillarSpacing;
            const py = archY(pz) + deckThickness;

            for (let side of [-1, 1]) {
                const sx = side * (bridgeWidth / 2);
                const pillar = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.7, 0.12), stoneLight);
                pillar.position.set(sx, py + 0.35, pz);
                pillar.castShadow = true;
                bridgeGroup.add(pillar);

                const ball = new THREE.Mesh(new THREE.SphereGeometry(0.05, 6, 6), stoneDark);
                ball.position.set(sx, py + 0.75, pz);
                bridgeGroup.add(ball);
            }

            // Red panels
            if (p > 0 && p < numBays) {
                const prevZ = -halfLen + (p - 1) * pillarSpacing;
                const panelZ = (prevZ + pz) / 2;
                const panelY = archY(panelZ) + deckThickness + 0.35;

                for (let side of [-1, 1]) {
                    const panel = new THREE.Mesh(
                        new THREE.BoxGeometry(0.03, 0.55, pillarSpacing - 0.12),
                        redMat
                    );
                    panel.position.set(side * (bridgeWidth / 2), panelY, panelZ);
                    bridgeGroup.add(panel);
                }
            }
        }

        // Handrails
        for (let r = 0; r < 2; r++) {
            const yOff = 0.1 + r * 0.4;
            for (let p = 0; p < numBays; p++) {
                const z1 = -halfLen + p * pillarSpacing;
                const z2 = -halfLen + (p + 1) * pillarSpacing;
                const midZ = (z1 + z2) / 2;
                const y1 = archY(z1) + deckThickness + 0.35 + yOff;
                const y2 = archY(z2) + deckThickness + 0.35 + yOff;
                const midY = (y1 + y2) / 2;
                const segLen = Math.sqrt((z2 - z1) ** 2 + (y2 - y1) ** 2);
                const angle = Math.atan2(y2 - y1, z2 - z1);

                for (let side of [-1, 1]) {
                    const rail = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.04, segLen + 0.02), stoneDark);
                    rail.position.set(side * (bridgeWidth / 2), midY, midZ);
                    rail.rotation.x = -(angle - Math.PI / 2);
                    bridgeGroup.add(rail);
                }
            }
        }

        // Center ornament
        const centerY = archHeight + deckThickness;
        const dragonBase = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.5, 0.3, 8), stoneDark);
        dragonBase.position.set(0, centerY + 0.15, 0);
        bridgeGroup.add(dragonBase);

        for (let i = 0; i < 8; i++) {
            const angle = (i / 8) * Math.PI * 2;
            const flame = new THREE.Mesh(new THREE.SphereGeometry(0.1, 6, 4), goldMat);
            flame.position.set(Math.cos(angle) * 0.3, centerY + 0.45, Math.sin(angle) * 0.3);
            flame.scale.set(1, 1.5, 1);
            bridgeGroup.add(flame);
        }

        const pearl = new THREE.Mesh(new THREE.SphereGeometry(0.25, 12, 12), goldMat);
        pearl.position.set(0, centerY + 0.7, 0);
        bridgeGroup.add(pearl);

        // Steps at ends
        for (let end of [-1, 1]) {
            const startZ = end * halfLen;
            const numSteps = 12;
            for (let s = 0; s < numSteps; s++) {
                const stepZ = startZ + end * (0.7 + s * 1.2);
                const stepY = -s * 0.3;

                const step = new THREE.Mesh(new THREE.BoxGeometry(bridgeWidth + 1, 0.25, 1.3), stoneMat);
                step.position.set(0, stepY, stepZ);
                step.castShadow = true;
                step.receiveShadow = true;
                bridgeGroup.add(step);

                const stepCol = new THREE.Mesh(
                    new THREE.BoxGeometry(bridgeWidth + 1, 0.3, 1.3),
                    new THREE.MeshBasicMaterial({ visible: false })
                );
                stepCol.position.set(0, stepY, stepZ);
                stepCol.userData = { isCollisionBox: true, type: 'BridgeStep' };
                bridgeGroup.add(stepCol);
                this.collisionObjects.push(stepCol);

                for (let side of [-1, 1]) {
                    const wallH = 0.3 + s * 0.25;
                    const wall = new THREE.Mesh(new THREE.BoxGeometry(0.2, wallH, 1.3), stoneDark);
                    wall.position.set(side * (bridgeWidth / 2 + 0.6), stepY - 0.05, stepZ);
                    wall.castShadow = true;
                    bridgeGroup.add(wall);

                    const wallCol = new THREE.Mesh(
                        new THREE.BoxGeometry(0.25, wallH + 0.1, 1.3),
                        new THREE.MeshBasicMaterial({ visible: false })
                    );
                    wallCol.position.set(side * (bridgeWidth / 2 + 0.6), stepY - 0.05, stepZ);
                    wallCol.userData = { isCollisionBox: true, type: 'BridgeStepWall' };
                    bridgeGroup.add(wallCol);
                    this.collisionObjects.push(wallCol);
                }
            }
        }

        // Bridge surface collision object - contains arch formula for smooth walking
        const bridgeSurface = new THREE.Mesh(
            new THREE.BoxGeometry(1, 1, 1),
            new THREE.MeshBasicMaterial({ visible: false })
        );
        bridgeSurface.userData = {
            isCollisionBox: true,
            type: 'BridgeSurface',
            bridgeWidth: bridgeWidth,
            totalLength: totalLength,
            archHeight: archHeight,
            deckThickness: deckThickness,
            halfLen: halfLen
        };
        bridgeSurface.position.set(0, 0, 0);
        bridgeSurface.scale.set(bridgeWidth + 2, archHeight + deckThickness + 2, totalLength + 2);
        bridgeGroup.add(bridgeSurface);
        this.collisionObjects.push(bridgeSurface);

        // Bridge collision - deck level (follows arch angle precisely)
        const colSegments = 80;
        for (let i = 0; i < colSegments; i++) {
            const t1 = i / colSegments;
            const t2 = (i + 1) / colSegments;
            const z1 = -halfLen + t1 * totalLength;
            const z2 = -halfLen + t2 * totalLength;
            const midZ = (z1 + z2) / 2;

            // Calculate arch Y at both ends
            const y1 = archY(z1) + deckThickness;
            const y2 = archY(z2) + deckThickness;
            const midY = (y1 + y2) / 2;

            // Segment length and slope angle
            const dz = z2 - z1;
            const dy = y2 - y1;
            const segLen = Math.sqrt(dz * dz + dy * dy);
            const slopeAngle = Math.atan2(dy, dz);

            // Collision box - matches deck exactly, rotated to follow slope
            const colW = bridgeWidth + 0.2;
            const colH = deckThickness + 0.2;
            const colD = segLen + 0.05;

            const col = new THREE.Mesh(
                new THREE.BoxGeometry(colW, colH, colD),
                new THREE.MeshBasicMaterial({ visible: false })
            );
            // Position at center of segment, slightly below top surface
            col.position.set(0, midY - colH / 2 + 0.1, midZ);
            // Rotate to match the arch slope
            col.rotation.x = -slopeAngle;
            col.userData = { isCollisionBox: true, type: 'Bridge' };
            bridgeGroup.add(col);
            this.collisionObjects.push(col);
        }

        // Bridge collision - arch fill beneath deck (vertical boxes from ground up)
        const fillSegments = 60;
        for (let i = 0; i < fillSegments; i++) {
            const t1 = i / fillSegments;
            const t2 = (i + 1) / fillSegments;
            const z1 = -halfLen + t1 * totalLength;
            const z2 = -halfLen + t2 * totalLength;
            const midZ = (z1 + z2) / 2;
            const segLen = z2 - z1;

            // Arch height at this segment (bottom of deck)
            const archBottom = archY(midZ);

            // Only create collision where arch exists above ground
            if (archBottom > 0.3) {
                // Collision fills from ground (y=0) up to deck bottom
                const colH = archBottom;
                const colW = bridgeWidth - 0.6;

                const col = new THREE.Mesh(
                    new THREE.BoxGeometry(colW, colH, segLen + 0.05),
                    new THREE.MeshBasicMaterial({ visible: false })
                );
                // Center vertically between ground and arch bottom
                col.position.set(0, colH / 2, midZ);
                col.userData = { isCollisionBox: true, type: 'BridgeFill' };
                bridgeGroup.add(col);
                this.collisionObjects.push(col);
            }
        }

        // Railing collision - thin boxes along railing height
        const railColSegments = 40;
        for (let i = 0; i < railColSegments; i++) {
            const t1 = i / railColSegments;
            const t2 = (i + 1) / railColSegments;
            const z1 = -halfLen + t1 * totalLength;
            const z2 = -halfLen + t2 * totalLength;
            const midZ = (z1 + z2) / 2;
            const segLen = Math.sqrt((z2 - z1) ** 2 + (archY(z2) - archY(z1)) ** 2);
            const slopeAngle = Math.atan2(archY(z2) - archY(z1), z2 - z1);

            const deckTopY = archY(midZ) + deckThickness;
            const railBaseY = deckTopY + 0.1;
            const railTopY = deckTopY + 0.8;
            const railH = railTopY - railBaseY;

            for (let side of [-1, 1]) {
                const col = new THREE.Mesh(
                    new THREE.BoxGeometry(0.15, railH, segLen + 0.05),
                    new THREE.MeshBasicMaterial({ visible: false })
                );
                col.position.set(side * (bridgeWidth / 2), railBaseY + railH / 2, midZ);
                col.rotation.x = -slopeAngle;
                col.userData = { isCollisionBox: true, type: 'BridgeRailing' };
                bridgeGroup.add(col);
                this.collisionObjects.push(col);
            }
        }

        bridgeGroup.position.set(x, 0, z);
        bridgeGroup.rotation.y = rotY;
        parent.add(bridgeGroup);
    }

    createBridgeLantern() {
        const lanternGroup = new THREE.Group();
        const metalMat = new THREE.MeshStandardMaterial({ color: 0x222222, metalness: 0.7, roughness: 0.3 });
        const glassMat = new THREE.MeshStandardMaterial({
            color: 0xffddaa,
            emissive: 0xffaa44,
            emissiveIntensity: 0.8,
            transparent: true,
            opacity: 0.9
        });

        const base = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.25, 0.2, 8), metalMat);
        base.position.y = 0.1;
        lanternGroup.add(base);

        const body = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.6, 0.3), glassMat);
        body.position.y = 0.5;
        lanternGroup.add(body);

        const roof = new THREE.Mesh(new THREE.ConeGeometry(0.25, 0.3, 4), metalMat);
        roof.position.y = 0.9;
        roof.rotation.y = Math.PI / 4;
        lanternGroup.add(roof);

        for (let i = 0; i < 4; i++) {
            const angle = (i / 4) * Math.PI * 2 + Math.PI / 4;
            const tassel = new THREE.Mesh(
                new THREE.CylinderGeometry(0.02, 0.04, 0.4, 4),
                new THREE.MeshStandardMaterial({ color: 0xcc0000 })
            );
            tassel.position.set(Math.cos(angle) * 0.2, 0.1, Math.sin(angle) * 0.2);
            lanternGroup.add(tassel);
        }

        return lanternGroup;
    }

    createReedCluster(parent, x, z) {
        const reedGroup = new THREE.Group();
        const stemMat = new THREE.MeshStandardMaterial({ color: 0x557722 });

        for (let i = 0; i < 12; i++) {
            const height = 1.5 + Math.random() * 1.5;
            const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.03, height, 4), stemMat);
            const rx = (Math.random() - 0.5) * 2;
            const rz = (Math.random() - 0.5) * 2;
            stem.position.set(rx, height / 2, rz);
            stem.rotation.x = (Math.random() - 0.5) * 0.2;
            stem.rotation.z = (Math.random() - 0.5) * 0.2;
            reedGroup.add(stem);

            // Reed top
            if (Math.random() > 0.3) {
                const top = new THREE.Mesh(
                    new THREE.CylinderGeometry(0.04, 0.06, 0.4, 4),
                    new THREE.MeshStandardMaterial({ color: 0x774422 })
                );
                top.position.set(rx, height + 0.1, rz);
                reedGroup.add(top);
            }
        }

        reedGroup.position.set(x, 0.1, z);
        parent.add(reedGroup);
    }

    createLotusFlower() {
        const lotusGroup = new THREE.Group();
        const petalColors = [0xff88aa, 0xffaacc, 0xffbbee, 0xff6688];

        // Petals in layers
        for (let layer = 0; layer < 3; layer++) {
            const petals = 6 - layer;
            const size = 0.3 - layer * 0.05;
            for (let i = 0; i < petals; i++) {
                const angle = (i / petals) * Math.PI * 2;
                const petal = new THREE.Mesh(
                    new THREE.SphereGeometry(size, 6, 4),
                    new THREE.MeshStandardMaterial({
                        color: petalColors[layer % petalColors.length],
                        roughness: 0.6
                    })
                );
                petal.position.set(Math.cos(angle) * size * 0.8, layer * 0.1, Math.sin(angle) * size * 0.8);
                petal.scale.set(1, 0.4, 1);
                lotusGroup.add(petal);
            }
        }

        // Center
        const center = new THREE.Mesh(
            new THREE.SphereGeometry(0.15, 6, 4),
            new THREE.MeshStandardMaterial({ color: 0xffdd44 })
        );
        center.position.y = 0.2;
        lotusGroup.add(center);

        return lotusGroup;
    }

    createFishingSpot(parent, x, z, rotY) {
        const spotGroup = new THREE.Group();

        // Stone platform
        const platform = new THREE.Mesh(
            new THREE.BoxGeometry(2, 0.2, 3),
            new THREE.MeshStandardMaterial({ color: 0x888877, roughness: 0.9 })
        );
        platform.position.y = 0.1;
        spotGroup.add(platform);

        // Wooden bench
        const bench = this.createParkBench();
        bench.position.set(0, 0, 1);
        bench.rotation.y = Math.PI;
        spotGroup.add(bench);

        // Fishing rod in water
        const rod = new THREE.Mesh(
            new THREE.CylinderGeometry(0.02, 0.03, 3, 4),
            new THREE.MeshStandardMaterial({ color: 0x664422 })
        );
        rod.position.set(0, 0.8, -0.5);
        rod.rotation.x = Math.PI / 4;
        spotGroup.add(rod);

        // Fishing line
        const line = new THREE.Mesh(
            new THREE.CylinderGeometry(0.005, 0.005, 2, 3),
            new THREE.MeshStandardMaterial({ color: 0xcccccc })
        );
        line.position.set(0, 0.2, -2);
        line.rotation.x = Math.PI / 6;
        spotGroup.add(line);

        // Cooler box
        const cooler = new THREE.Mesh(
            new THREE.BoxGeometry(0.8, 0.5, 0.5),
            new THREE.MeshStandardMaterial({ color: 0x3366aa })
        );
        cooler.position.set(0.6, 0.35, 0.8);
        spotGroup.add(cooler);

        // Fishing spot collision
        const fishingCollider = new THREE.Mesh(
            new THREE.BoxGeometry(3, 1.5, 4),
            new THREE.MeshBasicMaterial({ visible: false })
        );
        fishingCollider.position.y = 0.75;
        fishingCollider.userData = { isCollisionBox: true, type: 'FishingSpot' };
        spotGroup.add(fishingCollider);
        this.collisionObjects.push(fishingCollider);

        spotGroup.position.set(x, 0, z);
        spotGroup.rotation.y = rotY;
        parent.add(spotGroup);
    }

    createLakePath(parent, radius) {
        const pathMat = new THREE.MeshStandardMaterial({ color: 0x998877, roughness: 0.8 });

        // Circular stone path
        for (let i = 0; i < 36; i++) {
            const angle = (i / 36) * Math.PI * 2;
            const nextAngle = ((i + 1) / 36) * Math.PI * 2;

            const segment = new THREE.Mesh(
                new THREE.PlaneGeometry(3, radius * (nextAngle - angle) + 0.1),
                pathMat
            );
            segment.rotation.x = -Math.PI / 2;
            segment.position.y = 0.12;

            // Position at midpoint of segment
            const midAngle = (angle + nextAngle) / 2;
            segment.position.x = Math.cos(midAngle) * radius;
            segment.position.z = Math.sin(midAngle) * radius;
            segment.rotation.z = -midAngle;

            parent.add(segment);
        }

        // Stepping stones at intervals
        for (let i = 0; i < 12; i++) {
            const angle = (i / 12) * Math.PI * 2;
            const stone = new THREE.Mesh(
                new THREE.CircleGeometry(0.5 + Math.random() * 0.3, 8),
                new THREE.MeshStandardMaterial({ color: 0xaa9988, roughness: 0.85 })
            );
            stone.rotation.x = -Math.PI / 2;
            stone.position.set(Math.cos(angle) * radius, 0.13, Math.sin(angle) * radius);
            parent.add(stone);
        }
    }

    createStoneLantern(parent, x, z) {
        const lanternGroup = new THREE.Group();
        const stoneMat = new THREE.MeshStandardMaterial({ color: 0x888877, roughness: 0.7 });

        // Base
        const base = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.2, 0.6), stoneMat);
        base.position.y = 0.1;
        lanternGroup.add(base);

        // Pillar
        const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.2, 1.2, 6), stoneMat);
        pillar.position.y = 0.7;
        lanternGroup.add(pillar);

        // Light housing
        const housing = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.5), stoneMat);
        housing.position.y = 1.5;
        lanternGroup.add(housing);

        // Glowing light
        const light = new THREE.Mesh(
            new THREE.SphereGeometry(0.15, 6, 6),
            new THREE.MeshStandardMaterial({ color: 0xffffaa, emissive: 0xffaa44, emissiveIntensity: 1 })
        );
        light.position.y = 1.5;
        lanternGroup.add(light);

        // Roof
        const roof = new THREE.Mesh(
            new THREE.ConeGeometry(0.5, 0.3, 4),
            stoneMat
        );
        roof.position.y = 1.9;
        roof.rotation.y = Math.PI / 4;
        lanternGroup.add(roof);

        // Stone lantern collision
        const lanternCollider = new THREE.Mesh(
            new THREE.CylinderGeometry(0.35, 0.35, 2, 6),
            new THREE.MeshBasicMaterial({ visible: false })
        );
        lanternCollider.position.y = 1;
        lanternCollider.userData = { isCollisionBox: true, type: 'StoneLantern' };
        lanternGroup.add(lanternCollider);
        this.collisionObjects.push(lanternCollider);

        lanternGroup.position.set(x, 0, z);
        parent.add(lanternGroup);
    }

    createWaterfall(parent, x, z, rotY) {
        const waterfallGroup = new THREE.Group();

        // Rock formation
        const rockMat = new THREE.MeshStandardMaterial({ color: 0x665544, roughness: 0.9, flatShading: true });
        const cliff = new THREE.Mesh(new THREE.BoxGeometry(6, 4, 3), rockMat);
        cliff.position.y = 2;
        waterfallGroup.add(cliff);

        // Rock details
        for (let i = 0; i < 5; i++) {
            const rock = new THREE.Mesh(
                new THREE.SphereGeometry(0.5 + Math.random() * 1, 5, 4),
                rockMat
            );
            rock.position.set((Math.random() - 0.5) * 5, Math.random() * 3, (Math.random() - 0.5) * 2);
            rock.scale.y = 0.6;
            waterfallGroup.add(rock);
        }

        // Waterfall stream
        const waterMat = new THREE.MeshStandardMaterial({
            color: 0xaaddff,
            transparent: true,
            opacity: 0.7,
            roughness: 0.1
        });
        for (let i = 0; i < 5; i++) {
            const stream = new THREE.Mesh(
                new THREE.CylinderGeometry(0.15 + Math.random() * 0.1, 0.3, 3.5, 6),
                waterMat
            );
            stream.position.set(-2 + i * 1, 1.5, 0.5);
            waterfallGroup.add(stream);
        }

        // Splash pool
        const pool = new THREE.Mesh(
            new THREE.CircleGeometry(3, 12),
            new THREE.MeshStandardMaterial({ color: 0x44aacc, transparent: true, opacity: 0.8, roughness: 0.1 })
        );
        pool.rotation.x = -Math.PI / 2;
        pool.position.set(0, 0.1, 3);
        waterfallGroup.add(pool);

        // Splash particles
        const splashMat = new THREE.MeshStandardMaterial({ color: 0xccddff, transparent: true, opacity: 0.6 });
        for (let i = 0; i < 15; i++) {
            const drop = new THREE.Mesh(new THREE.SphereGeometry(0.1, 4, 4), splashMat);
            drop.position.set(
                (Math.random() - 0.5) * 3,
                Math.random() * 0.5,
                2.5 + Math.random() * 2
            );
            waterfallGroup.add(drop);
        }

        // Waterfall collision
        const waterfallCollider = new THREE.Mesh(
            new THREE.BoxGeometry(6, 4, 4),
            new THREE.MeshBasicMaterial({ visible: false })
        );
        waterfallCollider.position.set(0, 2, 1.5);
        waterfallCollider.userData = { isCollisionBox: true, type: 'Waterfall' };
        waterfallGroup.add(waterfallCollider);
        this.collisionObjects.push(waterfallCollider);

        waterfallGroup.position.set(x, 0, z);
        waterfallGroup.rotation.y = rotY;
        parent.add(waterfallGroup);
    }

    createWillowTree() {
        const treeGroup = new THREE.Group();
        const trunkMat = new THREE.MeshStandardMaterial({ color: 0x4a3a2a, roughness: 0.9 });

        // Trunk (slightly curved)
        const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.6, 5, 8), trunkMat);
        trunk.position.y = 2.5;
        trunk.rotation.z = 0.1;
        treeGroup.add(trunk);

        // Drooping branches
        const branchMat = new THREE.MeshStandardMaterial({ color: 0x336622, roughness: 0.8 });
        const numBranches = 12;
        for (let i = 0; i < numBranches; i++) {
            const angle = (i / numBranches) * Math.PI * 2;
            const branchLength = 3 + Math.random() * 2;

            // Branch
            const branch = new THREE.Mesh(
                new THREE.CylinderGeometry(0.03, 0.08, branchLength, 4),
                trunkMat
            );
            branch.position.set(0, 4.8, 0);
            branch.rotation.z = Math.PI / 3 + (Math.random() - 0.5) * 0.3;
            branch.rotation.y = angle;
            treeGroup.add(branch);

            // Drooping leaves
            for (let l = 0; l < 5; l++) {
                const t = l / 5;
                const leaf = new THREE.Mesh(
                    new THREE.SphereGeometry(0.4 + Math.random() * 0.3, 5, 4),
                    new THREE.MeshStandardMaterial({
                        color: 0x447733 + Math.floor(Math.random() * 0x111111),
                        roughness: 0.85,
                        flatShading: true
                    })
                );
                const dropDist = t * branchLength;
                leaf.position.set(
                    Math.sin(angle) * Math.sin(Math.PI / 3) * dropDist,
                    4.8 - t * branchLength * 0.8 - t * t * 2,
                    Math.cos(angle) * Math.sin(Math.PI / 3) * dropDist
                );
                treeGroup.add(leaf);
            }
        }

        // Canopy top
        const canopy = new THREE.Mesh(
            new THREE.SphereGeometry(2.5, 8, 6),
            new THREE.MeshStandardMaterial({ color: 0x3a7a2a, roughness: 0.85, flatShading: true })
        );
        canopy.position.y = 5;
        canopy.scale.y = 0.6;
        treeGroup.add(canopy);

        // Willow tree collision
        const willowCollider = new THREE.Mesh(
            new THREE.CylinderGeometry(0.8, 0.8, 5.5, 6),
            new THREE.MeshBasicMaterial({ visible: false })
        );
        willowCollider.position.y = 2.75;
        willowCollider.userData = { isCollisionBox: true, type: 'WillowTree' };
        treeGroup.add(willowCollider);
        this.collisionObjects.push(willowCollider);

        return treeGroup;
    }

    createStoneBench() {
        const benchGroup = new THREE.Group();
        const stoneMat = new THREE.MeshStandardMaterial({ color: 0x999988, roughness: 0.7 });

        // Seat
        const seat = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.2, 0.8), stoneMat);
        seat.position.y = 0.6;
        benchGroup.add(seat);

        // Supports
        for (let x of [-1, 0, 1]) {
            const support = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.6, 0.6), stoneMat);
            support.position.set(x, 0.3, 0);
            benchGroup.add(support);
        }

        // Back rest
        const back = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.6, 0.15), stoneMat);
        back.position.set(0, 0.9, -0.35);
        benchGroup.add(back);

        // Stone bench collision
        const benchCollider = new THREE.Mesh(
            new THREE.BoxGeometry(2.7, 1, 0.8),
            new THREE.MeshBasicMaterial({ visible: false })
        );
        benchCollider.position.set(0, 0.5, -0.1);
        benchCollider.userData = { isCollisionBox: true, type: 'StoneBench' };
        benchGroup.add(benchCollider);
        this.collisionObjects.push(benchCollider);

        return benchGroup;
    }

    createRoads() {
        const roadWidth = 10;
        const roadMat = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.9 });
        const roadGridSize = 100;
        const gridBound = 200;
        const lakeSkipRadius = 30; // Keep roads away from lake

        // Vertical roads (along Z)
        for (let x = -gridBound; x <= gridBound; x += roadGridSize) {
            if (x === 0) {
                // Split road into two segments with a gap for the lake
                const road1 = new THREE.Mesh(new THREE.PlaneGeometry(roadWidth, gridBound - lakeSkipRadius), roadMat);
                road1.rotation.x = -Math.PI / 2;
                road1.position.set(x, 0.05, -(gridBound + lakeSkipRadius) / 2);
                road1.receiveShadow = true;
                this.scene.add(road1);

                const road2 = new THREE.Mesh(new THREE.PlaneGeometry(roadWidth, gridBound - lakeSkipRadius), roadMat);
                road2.rotation.x = -Math.PI / 2;
                road2.position.set(x, 0.05, (gridBound + lakeSkipRadius) / 2);
                road2.receiveShadow = true;
                this.scene.add(road2);
            } else {
                const road = new THREE.Mesh(new THREE.PlaneGeometry(roadWidth, gridBound * 2), roadMat);
                road.rotation.x = -Math.PI / 2;
                road.position.set(x, 0.05, 0);
                road.receiveShadow = true;
                this.scene.add(road);
            }
        }

        // Horizontal roads (along X)
        for (let z = -gridBound; z <= gridBound; z += roadGridSize) {
            if (z === 0) {
                // Split road into two segments with a gap for the lake
                const road1 = new THREE.Mesh(new THREE.PlaneGeometry(gridBound - lakeSkipRadius, roadWidth), roadMat);
                road1.rotation.x = -Math.PI / 2;
                road1.position.set(-(gridBound + lakeSkipRadius) / 2, 0.05, z);
                road1.receiveShadow = true;
                this.scene.add(road1);

                const road2 = new THREE.Mesh(new THREE.PlaneGeometry(gridBound - lakeSkipRadius, roadWidth), roadMat);
                road2.rotation.x = -Math.PI / 2;
                road2.position.set((gridBound + lakeSkipRadius) / 2, 0.05, z);
                road2.receiveShadow = true;
                this.scene.add(road2);
            } else {
                const road = new THREE.Mesh(new THREE.PlaneGeometry(gridBound * 2, roadWidth), roadMat);
                road.rotation.x = -Math.PI / 2;
                road.position.set(0, 0.05, z);
                road.receiveShadow = true;
                this.scene.add(road);
            }
        }
    }



    createStreetLights() {
        const poleGeo = new THREE.CylinderGeometry(0.1, 0.1, 8);
        const poleMat = new THREE.MeshStandardMaterial({ color: 0x333333 });
        const bulbMat = new THREE.MeshStandardMaterial({ color: 0xFFFFCC, emissive: 0x000000 });
        this.streetLightMat = bulbMat;
        const roadGridSize = 100;
        const gridBound = 200;

        for (let x = -gridBound; x <= gridBound; x += roadGridSize) {
            for (let z = -gridBound; z <= gridBound; z += roadGridSize) {
                [[-6, -6], [6, 6]].forEach(off => {
                    const pole = new THREE.Mesh(poleGeo, poleMat);
                    pole.position.set(x + off[0], 4, z + off[1]);
                    this.scene.add(pole);

                    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.3), bulbMat);
                    bulb.position.set(x + off[0], 8, z + off[1]);
                    this.scene.add(bulb);

                    // Light pole collision
                    const poleCollider = new THREE.Mesh(
                        new THREE.CylinderGeometry(0.3, 0.3, 8, 6),
                        new THREE.MeshBasicMaterial({ visible: false })
                    );
                    poleCollider.position.set(x + off[0], 4, z + off[1]);
                    poleCollider.userData = { isCollisionBox: true, type: 'StreetLight' };
                    this.scene.add(poleCollider);
                    this.collisionObjects.push(poleCollider);
                });
            }
        }
    }

    updateMaterials(time) {
        const isNight = (time < 360 || time > 1080);
        if (this.streetLightMat) {
            this.streetLightMat.emissive.setHex(isNight ? 0xFFFFCC : 0x000000);
            this.streetLightMat.emissiveIntensity = isNight ? 2 : 0;
        }
        const pulse = 1 + Math.sin(Date.now() * 0.005) * 0.2;
        this.neonMaterials.forEach(mat => {
            mat.emissiveIntensity = isNight ? 1.5 * pulse : 0.1;
        });
    }

    addUrbanProps() {
        this.createElectricBoard(75, -60, -Math.PI / 4);
        this.createDeliveryLocker(-60, 0, Math.PI / 2);
        this.createGarbageStation(-60, -30, Math.PI / 2);
    }

    createDeliveryLocker(x, z, rotY) {
        const group = new THREE.Group();
        const mat = new THREE.MeshStandardMaterial({ color: 0xdddddd });
        const screenMat = new THREE.MeshStandardMaterial({ color: 0x000000, emissive: 0x00ff00, emissiveIntensity: 0.5 });

        // Main cabinet (horizontal array of lockers)
        const cabinet = new THREE.Mesh(new THREE.BoxGeometry(10, 5, 2), mat);
        cabinet.position.y = 2.5;
        group.add(cabinet);

        // Individual locker lines
        const lineMat = new THREE.MeshStandardMaterial({ color: 0x888888 });
        for (let i = -4; i <= 4; i += 1.5) {
            const line = new THREE.Mesh(new THREE.BoxGeometry(0.05, 5, 0.1), lineMat);
            line.position.set(i, 2.5, 1.01);
            group.add(line);
        }

        // Screen/Console
        const console = new THREE.Mesh(new THREE.BoxGeometry(1.5, 2, 0.2), screenMat);
        console.position.set(0, 3, 1.05);
        group.add(console);

        const roof = new THREE.Mesh(new THREE.BoxGeometry(11, 0.2, 3), new THREE.MeshStandardMaterial({ color: 0x444444 }));
        roof.position.y = 5.1;
        group.add(roof);

        group.position.set(x, 0, z);
        group.rotation.y = rotY;
        this.scene.add(group);

        // Collision box
        const lockerCollider = new THREE.Mesh(
            new THREE.BoxGeometry(10, 5, 2),
            new THREE.MeshBasicMaterial({ visible: false })
        );
        lockerCollider.position.set(x, 2.5, z);
        lockerCollider.rotation.y = rotY;
        lockerCollider.userData = { isCollisionBox: true, type: 'DeliveryLocker' };
        this.scene.add(lockerCollider);
        this.collisionObjects.push(lockerCollider);

        const label = this.createLabel('智能快递柜 (Smart Locker)');
        label.position.set(x, 7, z);
        this.scene.add(label);
    }

    createGarbageStation(x, z, rotY) {
        const group = new THREE.Group();
        const colors = [0x0000ff, 0x00ff00, 0xff0000, 0x555555]; // Blue, Green, Red, Grey
        const labels = ['可回收', '厨余', '有害', '其他'];

        for (let i = 0; i < 4; i++) {
            const binGroup = new THREE.Group();
            const bin = new THREE.Mesh(new THREE.BoxGeometry(1.5, 2.5, 1.5), new THREE.MeshStandardMaterial({ color: colors[i] }));
            bin.position.y = 1.25;
            binGroup.add(bin);

            const lid = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.2, 1.7), new THREE.MeshStandardMaterial({ color: 0x222222 }));
            lid.position.y = 2.5;
            binGroup.add(lid);

            binGroup.position.x = -3 + i * 2;
            group.add(binGroup);
        }

        group.position.set(x, 0, z);
        group.rotation.y = rotY;
        this.scene.add(group);

        // Collision box for garbage station
        const garbageCollider = new THREE.Mesh(
            new THREE.BoxGeometry(8, 2.5, 1.5),
            new THREE.MeshBasicMaterial({ visible: false })
        );
        garbageCollider.position.set(x, 1.25, z);
        garbageCollider.rotation.y = rotY;
        garbageCollider.userData = { isCollisionBox: true, type: 'GarbageStation' };
        this.scene.add(garbageCollider);
        this.collisionObjects.push(garbageCollider);

        const label = this.createLabel('垃圾分类站 (Garbage Station)');
        label.position.set(x, 5, z);
        this.scene.add(label);
    }

    createMainGate() {
        // Positioned at the South entrance (0, bound)
        const bound = 220;
        const gateGroup = new THREE.Group();

        // Security Booth (Bao'an Pavilion)
        const booth = new THREE.Group();
        const body = new THREE.Mesh(new THREE.BoxGeometry(4, 5, 4), new THREE.MeshStandardMaterial({ color: 0xeeeeee }));
        body.position.y = 2.5;
        const roof = new THREE.Mesh(new THREE.BoxGeometry(5, 0.5, 5), new THREE.MeshStandardMaterial({ color: 0xaa2222 }));
        roof.position.y = 5.25;
        const windowGeo = new THREE.PlaneGeometry(3, 2);
        const windowMat = new THREE.MeshStandardMaterial({ color: 0x88ccff, transparent: true, opacity: 0.5 });
        const w1 = new THREE.Mesh(windowGeo, windowMat); w1.position.set(0, 3, 2.01);
        const w2 = new THREE.Mesh(windowGeo, windowMat); w2.position.set(2.01, 3, 0); w2.rotation.y = Math.PI / 2;
        booth.add(body, roof, w1, w2);
        booth.position.set(12, 0, bound - 10);
        gateGroup.add(booth);

        // Booth collision
        const boothCollider = new THREE.Mesh(
            new THREE.BoxGeometry(4, 5, 4),
            new THREE.MeshBasicMaterial({ visible: false })
        );
        boothCollider.position.set(12, 2.5, bound - 10);
        boothCollider.userData = { isCollisionBox: true, type: 'SecurityBooth' };
        this.scene.add(boothCollider);
        this.collisionObjects.push(boothCollider);

        // Boom Barrier (Lever)
        const barrierBase = new THREE.Mesh(new THREE.BoxGeometry(1, 4, 1), new THREE.MeshStandardMaterial({ color: 0xffaa00 }));
        barrierBase.position.set(8, 2, bound);
        gateGroup.add(barrierBase);

        // Barrier collision
        const barrierCollider = new THREE.Mesh(
            new THREE.BoxGeometry(1, 4, 1),
            new THREE.MeshBasicMaterial({ visible: false })
        );
        barrierCollider.position.set(8, 2, bound);
        barrierCollider.userData = { isCollisionBox: true, type: 'Barrier' };
        this.scene.add(barrierCollider);
        this.collisionObjects.push(barrierCollider);

        const lever = new THREE.Mesh(new THREE.BoxGeometry(12, 0.3, 0.3), new THREE.MeshStandardMaterial({ color: 0xffffff }));
        lever.position.set(2, 3.5, bound);
        gateGroup.add(lever);

        // Large community name board
        const wall = new THREE.Mesh(new THREE.BoxGeometry(10, 6, 2), new THREE.MeshStandardMaterial({ color: 0x333333 }));
        wall.position.set(-15, 3, bound);
        gateGroup.add(wall);

        // Wall collision
        const wallCollider = new THREE.Mesh(
            new THREE.BoxGeometry(10, 6, 2),
            new THREE.MeshBasicMaterial({ visible: false })
        );
        wallCollider.position.set(-15, 3, bound);
        wallCollider.userData = { isCollisionBox: true, type: 'NameBoard' };
        this.scene.add(wallCollider);
        this.collisionObjects.push(wallCollider);

        const label = this.createLabel('锦绣华庭 (JINXIU TOWER)');
        label.position.set(-15, 10, bound);
        this.scene.add(label);

        this.scene.add(gateGroup);
    }

    createElectricBoard(x, z, rotY) {
        const group = new THREE.Group();

        // High-tech Stand
        const baseGeo = new THREE.BoxGeometry(4, 1, 2);
        const metalMat = new THREE.MeshStandardMaterial({ color: 0x222222, metalness: 0.9, roughness: 0.1 });
        const base = new THREE.Mesh(baseGeo, metalMat);
        base.position.y = 0.5;
        group.add(base);

        const pillarGeo = new THREE.BoxGeometry(1, 10, 1);
        const pillar = new THREE.Mesh(pillarGeo, metalMat);
        pillar.position.y = 5.5;
        group.add(pillar);

        // Screen Frame
        const frameGeo = new THREE.BoxGeometry(12, 7, 0.6);
        const frame = new THREE.Mesh(frameGeo, metalMat);
        frame.position.y = 12;
        group.add(frame);

        // Screen Surface
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 256;
        const ctx = canvas.getContext('2d');

        const texture = new THREE.CanvasTexture(canvas);
        const screenMat = new THREE.MeshStandardMaterial({
            map: texture,
            emissive: 0xffffff,
            emissiveMap: texture,
            emissiveIntensity: 1.2
        });

        const screenGeo = new THREE.PlaneGeometry(11.5, 6.5);
        const screen = new THREE.Mesh(screenGeo, screenMat);
        screen.position.set(0, 12, 0.31);
        group.add(screen);

        const boardData = {
            ctx,
            canvas,
            texture,
            scrollOffset: 0,
            messages: [
                "欢迎来到 锦绣华庭 智慧社区",
                "今日天气: 晴 24°C | 空气质量: 优",
                "物业通知: 明日 10:00 进行电梯维保",
                "温馨提示: 文明出行, 共建和谐小区",
                "Virtual Life Engine v1.5 已上线"
            ]
        };

        if (!this.boards) this.boards = [];
        this.boards.push(boardData);

        // Electric board collision
        const boardCollider = new THREE.Mesh(
            new THREE.BoxGeometry(12, 11, 1),
            new THREE.MeshBasicMaterial({ visible: false })
        );
        boardCollider.position.set(x, 6, z);
        boardCollider.rotation.y = rotY;
        boardCollider.userData = { isCollisionBox: true, type: 'ElectricBoard' };
        this.scene.add(boardCollider);
        this.collisionObjects.push(boardCollider);

        group.position.set(x, 0, z);
        group.rotation.y = rotY;
        this.scene.add(group);
    }

    updateBoardContent(board) {
        const { ctx, canvas, texture, scrollOffset, messages } = board;
        const w = canvas.width;
        const h = canvas.height;

        // Background
        ctx.fillStyle = '#000033';
        ctx.fillRect(0, 0, w, h);

        // Grid effect for tech look
        ctx.strokeStyle = '#000066';
        ctx.lineWidth = 1;
        for (let i = 0; i < w; i += 20) {
            ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, h); ctx.stroke();
        }
        for (let j = 0; j < h; j += 20) {
            ctx.beginPath(); ctx.moveTo(0, j); ctx.lineTo(w, j); ctx.stroke();
        }

        // Header
        ctx.fillStyle = '#00ffff';
        ctx.font = 'bold 36px Arial';
        ctx.textAlign = 'center';
        ctx.fillText("社区动态公告 (BULLETIN)", w / 2, 50);

        // Scrolling Text
        ctx.font = '32px STHeiti, "Microsoft YaHei", Arial';
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'left';

        const fullText = messages.join("   |   ");
        const textWidth = ctx.measureText(fullText).width;

        // Loop scrolling
        let xPos = w - (scrollOffset % (textWidth + w));

        ctx.shadowBlur = 10;
        ctx.shadowColor = '#00ffff';
        ctx.fillText(fullText, xPos, 160);
        ctx.shadowBlur = 0;

        // Bottom status line
        ctx.fillStyle = '#ffaa00';
        ctx.font = '24px Courier New';
        ctx.fillText("SYSTEM STATUS: OK | DATA SYNCED", 30, h - 30);

        texture.needsUpdate = true;
    }

    createCommunityFence() {
        const bound = 220;
        const roadGap = 20;

        const fenceGroup = new THREE.Group();

        // Materials
        const pillarMat = new THREE.MeshStandardMaterial({ color: 0x555555, roughness: 1.0 });
        // Simulating wire mesh with a slightly transparent, dark material (since drawing real mesh is expensive)
        // A better approach for low-poly is vertical iron bars
        const barMat = new THREE.MeshStandardMaterial({ color: 0x222222, metalness: 0.8, roughness: 0.2 });

        const pillarSize = 0.8;
        const pillarHeight = 3.5;
        const panelHeight = 3.0;
        const panelElevation = 0.2; // Gap at the bottom

        const pillarGeo = new THREE.BoxGeometry(pillarSize, pillarHeight, pillarSize);
        // We'll create a reusable "Fence Panel" group
        const createPanel = (length) => {
            const panel = new THREE.Group();

            // Top and bottom horizontal rails
            const railGeo = new THREE.BoxGeometry(length, 0.1, 0.1);
            const bottomRail = new THREE.Mesh(railGeo, barMat);
            bottomRail.position.y = panelElevation;
            const topRail = new THREE.Mesh(railGeo, barMat);
            topRail.position.y = panelElevation + panelHeight;
            panel.add(bottomRail, topRail);

            // Vertical bars and spikes
            const barSpacing = 0.4;
            const barCount = Math.floor(length / barSpacing);
            const actualSpacing = length / barCount;

            const vBarGeo = new THREE.BoxGeometry(0.05, panelHeight + 0.2, 0.05);
            const spikeGeo = new THREE.ConeGeometry(0.06, 0.2, 4);

            for (let i = 1; i < barCount; i++) {
                const xPos = -length / 2 + i * actualSpacing;

                const vBar = new THREE.Mesh(vBarGeo, barMat);
                vBar.position.set(xPos, panelElevation + panelHeight / 2, 0);
                vBar.castShadow = true;

                const spike = new THREE.Mesh(spikeGeo, barMat);
                spike.position.set(xPos, panelElevation + panelHeight + 0.2, 0);

                panel.add(vBar, spike);
            }
            return panel;
        };

        const addFenceLine = (startX, startZ, endX, endZ) => {
            const dx = endX - startX;
            const dz = endZ - startZ;
            const length = Math.sqrt(dx * dx + dz * dz);
            const angle = Math.atan2(dx, dz);

            const maxSegmentLength = 10;
            const segments = Math.ceil(length / maxSegmentLength);
            const segmentLength = length / segments;

            for (let i = 0; i < segments; i++) {
                const fraction = (i + 0.5) / segments;
                const cx = startX + dx * fraction;
                const cz = startZ + dz * fraction;

                const panel = createPanel(segmentLength);
                panel.position.set(cx, 0, cz);
                panel.rotation.y = angle + Math.PI / 2;
                fenceGroup.add(panel);

                // Fence panel collision
                const panelCollider = new THREE.Mesh(
                    new THREE.BoxGeometry(segmentLength, panelHeight + 0.2, 0.2),
                    new THREE.MeshBasicMaterial({ visible: false })
                );
                panelCollider.position.set(cx, panelElevation + panelHeight / 2, cz);
                panelCollider.rotation.y = angle + Math.PI / 2;
                panelCollider.userData = { isCollisionBox: true, type: 'FencePanel' };
                this.scene.add(panelCollider);
                this.collisionObjects.push(panelCollider);

                // Add a pillar at the start of the segment
                const px = startX + dx * (i / segments);
                const pz = startZ + dz * (i / segments);
                const pillar = new THREE.Mesh(pillarGeo, pillarMat);
                pillar.position.set(px, pillarHeight / 2, pz);
                pillar.castShadow = true;
                pillar.receiveShadow = true;
                fenceGroup.add(pillar);

                // Pillar collision
                const pillarCollider = new THREE.Mesh(
                    new THREE.BoxGeometry(pillarSize, pillarHeight, pillarSize),
                    new THREE.MeshBasicMaterial({ visible: false })
                );
                pillarCollider.position.set(px, pillarHeight / 2, pz);
                pillarCollider.userData = { isCollisionBox: true, type: 'FencePillar' };
                this.scene.add(pillarCollider);
                this.collisionObjects.push(pillarCollider);
            }
            // Add final pillar at the end
            const endPillar = new THREE.Mesh(pillarGeo, pillarMat);
            endPillar.position.set(endX, pillarHeight / 2, endZ);
            endPillar.castShadow = true;
            endPillar.receiveShadow = true;
            fenceGroup.add(endPillar);

            // Final pillar collision
            const endPillarCollider = new THREE.Mesh(
                new THREE.BoxGeometry(pillarSize, pillarHeight, pillarSize),
                new THREE.MeshBasicMaterial({ visible: false })
            );
            endPillarCollider.position.set(endX, pillarHeight / 2, endZ);
            endPillarCollider.userData = { isCollisionBox: true, type: 'FencePillar' };
            this.scene.add(endPillarCollider);
            this.collisionObjects.push(endPillarCollider);
        };

        const gateWidth = 3;

        // North Wall (Z = -bound) - Small Gate Gap
        addFenceLine(-bound, -bound, -gateWidth / 2, -bound);
        addFenceLine(gateWidth / 2, -bound, bound, -bound);
        // South Wall (Z = bound) - Keep Gate
        addFenceLine(-bound, bound, -roadGap / 2, bound); // Left part
        addFenceLine(roadGap / 2, bound, bound, bound);   // Right part
        // West Wall (X = -bound) - Closed
        addFenceLine(-bound, -bound, -bound, bound);
        // East Wall (X = bound) - Closed
        addFenceLine(bound, -bound, bound, bound);

        // For animating the doors
        if (!this.autoDoors) this.autoDoors = [];

        // --- Rectangular Small Iron Gate (Single Leaf) ---
        const buildSmallIronGate = (x, z, rotY, width = 3, height = 3.0) => {
            const gateGroup = new THREE.Group();
            const ironMat = new THREE.MeshStandardMaterial({ color: 0x111111, metalness: 0.9, roughness: 0.3 });

            // Side Posts (Rectangular)
            const postHeight = height + 0.2;
            const postGeo = new THREE.BoxGeometry(0.5, postHeight, 0.5);
            const leftPost = new THREE.Mesh(postGeo, ironMat);
            leftPost.position.set(-width / 2 - 0.25, postHeight / 2, 0);
            const rightPost = new THREE.Mesh(postGeo, ironMat);
            rightPost.position.set(width / 2 + 0.25, postHeight / 2, 0);
            gateGroup.add(leftPost, rightPost);

            // Iron Doors
            const createIronDoor = (dWidth, dHeight) => {
                const door = new THREE.Group();
                const frameSize = 0.2;

                // Outer rectangular frame
                const botFrame = new THREE.Mesh(new THREE.BoxGeometry(dWidth, frameSize, frameSize), ironMat);
                const topFrame = new THREE.Mesh(new THREE.BoxGeometry(dWidth, frameSize, frameSize), ironMat);
                const leftFrame = new THREE.Mesh(new THREE.BoxGeometry(frameSize, dHeight, frameSize), ironMat);
                const rightFrame = new THREE.Mesh(new THREE.BoxGeometry(frameSize, dHeight, frameSize), ironMat);

                botFrame.position.set(dWidth / 2, frameSize / 2, 0);
                topFrame.position.set(dWidth / 2, dHeight - frameSize / 2, 0);
                leftFrame.position.set(frameSize / 2, dHeight / 2, 0);
                rightFrame.position.set(dWidth - frameSize / 2, dHeight / 2, 0);
                door.add(botFrame, topFrame, leftFrame, rightFrame);

                // Vertical bars
                const barSpacing = 0.4;
                const bars = Math.floor(dWidth / barSpacing);
                const actualSpacing = dWidth / bars;
                for (let i = 1; i < bars; i++) {
                    const bar = new THREE.Mesh(new THREE.BoxGeometry(0.05, dHeight - frameSize * 2, 0.05), ironMat);
                    bar.position.set(i * actualSpacing, dHeight / 2, 0);
                    door.add(bar);
                }
                return door;
            };

            const doorW = width - 0.1;
            const leftDoor = createIronDoor(doorW, height);
            leftDoor.position.set(-width / 2, 0, 0); // Hinge on the left post

            gateGroup.add(leftDoor);
            gateGroup.position.set(x, 0, z);
            gateGroup.rotation.y = rotY;

            // Collision
            [leftPost, rightPost].forEach(p => {
                p.userData = { type: 'Iron Gate', label: '铁门' };
                this.buildings.push(p);
            });

            // Animation
            const gatePos = new THREE.Vector3(x, 0, z);
            this.autoDoors.push({
                door: leftDoor,
                centerPos: gatePos,
                closedRot: 0,
                openRot: -Math.PI / 2.2,
                triggerDistance: 8
            });

            fenceGroup.add(gateGroup);
        };

        // --- European Main Gates at Road Entrances ---
        const buildEuropeanGate = (x, z, rotY, isPedestrian = false) => {
            const gateGroup = new THREE.Group();

            // Materials
            const stoneMat = new THREE.MeshStandardMaterial({ color: 0xe6dfd5, roughness: 0.9 });
            const darkStoneMat = new THREE.MeshStandardMaterial({ color: 0x8a847a, roughness: 1.0 });
            const ironMat = new THREE.MeshStandardMaterial({ color: 0x111111, metalness: 0.9, roughness: 0.3 });
            const goldMat = new THREE.MeshStandardMaterial({ color: 0xd4af37, metalness: 1.0, roughness: 0.2 });

            const pWidth = isPedestrian ? 2.5 : 4;
            const pHeight = isPedestrian ? 5 : 9;
            const pDepth = isPedestrian ? 2.5 : 4;

            // For pedestrian gate, we drastically reduce the gap
            const currentGap = isPedestrian ? 5 : roadGap;

            // Ornate stone pillars
            const createPillar = () => {
                const grp = new THREE.Group();
                const baseWidth = pWidth + (isPedestrian ? 0.4 : 0.6);
                const base = new THREE.Mesh(new THREE.BoxGeometry(baseWidth, 1.2, pDepth + (isPedestrian ? 0.4 : 0.6)), darkStoneMat);
                base.position.y = 0.6;
                const body = new THREE.Mesh(new THREE.BoxGeometry(pWidth, pHeight - 2.4, pDepth), stoneMat);
                body.position.y = pHeight / 2;
                const top = new THREE.Mesh(new THREE.BoxGeometry(baseWidth, 1.2, pDepth + (isPedestrian ? 0.4 : 0.6)), darkStoneMat);
                top.position.y = pHeight - 0.6;
                grp.add(base, body, top);
                // Detail trim
                const trim = new THREE.Mesh(new THREE.BoxGeometry(pWidth + 0.3, 0.4, pDepth + 0.3), darkStoneMat);
                trim.position.y = pHeight / 2;
                grp.add(trim);
                return grp;
            };

            const leftPillar = createPillar();
            leftPillar.position.set(-currentGap / 2 - pWidth / 2, 0, 0);
            const rightPillar = createPillar();
            rightPillar.position.set(currentGap / 2 + pWidth / 2, 0, 0);
            gateGroup.add(leftPillar, rightPillar);

            // Arch Bridge connecting pillars
            const archThickness = isPedestrian ? 1.5 : 3;
            const archWidth = currentGap + pWidth * 2;
            const archOffset = isPedestrian ? 0 : -0.5; // Keep flush if small

            const lintel = new THREE.Mesh(new THREE.BoxGeometry(archWidth, archThickness, pDepth + archOffset), stoneMat);
            lintel.position.set(0, pHeight + archThickness / 2 + archOffset, 0);
            gateGroup.add(lintel);

            // Carved inner arch (Torus half inside lintel)
            const archRadius = currentGap / 2;
            const archInner = new THREE.Mesh(
                new THREE.TorusGeometry(archRadius, isPedestrian ? 0.6 : 1.2, 16, 24, Math.PI),
                stoneMat
            );
            archInner.position.set(0, pHeight - (isPedestrian ? 0.5 : 1), 0);
            gateGroup.add(archInner);

            // Crest / Name Plate at the top
            const crestWidth = isPedestrian ? 5 : 10;
            const crestHeight = isPedestrian ? 1.5 : 3;
            const crest = new THREE.Mesh(new THREE.BoxGeometry(crestWidth, crestHeight, pDepth), darkStoneMat);
            crest.position.set(0, pHeight + archThickness + (isPedestrian ? 0.5 : 1), 0);

            // Golden shield/emblem
            const crestRadius = isPedestrian ? 1 : 2;
            const crestDetail = new THREE.Mesh(new THREE.CylinderGeometry(crestRadius, crestRadius, pDepth + 0.2, 16), goldMat);
            crestDetail.rotation.x = Math.PI / 2;
            crestDetail.position.set(0, pHeight + archThickness + (isPedestrian ? 0.75 : 1.5), 0);
            gateGroup.add(crest, crestDetail);

            // Lanterns on pillars
            const lanternGeo = new THREE.BoxGeometry(0.8, 1.5, 0.8);
            const lanternMat = new THREE.MeshStandardMaterial({ color: 0xffdd88, emissive: 0xffaa00, emissiveIntensity: 2.5 });
            const lampL = new THREE.Mesh(lanternGeo, lanternMat);
            lampL.position.set(-currentGap / 2 - pWidth / 2, pHeight / 2 + (isPedestrian ? 1 : 2), pDepth / 2 + 0.3);
            const lampR = new THREE.Mesh(lanternGeo, lanternMat);
            lampR.position.set(currentGap / 2 + pWidth / 2, pHeight / 2 + (isPedestrian ? 1 : 2), pDepth / 2 + 0.3);
            gateGroup.add(lampL, lampR);

            // True Point lights for warm lighting
            const lightL = new THREE.PointLight(0xffaa00, 2.5, 30);
            lightL.position.copy(lampL.position);
            const lightR = new THREE.PointLight(0xffaa00, 2.5, 30);
            lightR.position.copy(lampR.position);
            gateGroup.add(lightL, lightR);

            // Iron Gates (Swung Open)
            const createIronDoor = (width, height) => {
                const door = new THREE.Group();
                const frameGeo = new THREE.BoxGeometry(width, 0.3, 0.3);

                const botFrame = new THREE.Mesh(frameGeo, ironMat);
                botFrame.position.set(width / 2, 0.8, 0);
                const midFrame = new THREE.Mesh(frameGeo, ironMat);
                midFrame.position.set(width / 2, height / 2, 0);
                const topFrame = new THREE.Mesh(frameGeo, ironMat);
                topFrame.position.set(width / 2, height, 0);
                door.add(botFrame, midFrame, topFrame);

                const barSpacing = 0.6;
                const bars = Math.floor(width / barSpacing);
                for (let i = 0; i <= bars; i++) {
                    const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, height + 1.2), ironMat);
                    bar.position.set(i * barSpacing, height / 2 + 0.4, 0);
                    // Gold spikes
                    const spike = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.4, 4), goldMat);
                    spike.position.set(i * barSpacing, height + 1.2 + 0.2, 0);
                    door.add(bar, spike);
                }

                // Arch top detail
                const archDeco = new THREE.Mesh(new THREE.TorusGeometry(width / 2, 0.12, 6, 16, Math.PI), ironMat);
                archDeco.position.set(width / 2, height, 0);
                door.add(archDeco);

                return door;
            };

            const doorWidth = currentGap / 2 - 0.2;
            const doorHeight = isPedestrian ? 4.5 : 6.5;

            const leftDoor = createIronDoor(doorWidth, doorHeight);
            leftDoor.position.set(-currentGap / 2, 0, 0);

            const rightDoor = createIronDoor(doorWidth, doorHeight);
            rightDoor.position.set(currentGap / 2, 0, 0);
            rightDoor.rotation.y = Math.PI;

            gateGroup.add(leftDoor, rightDoor);

            gateGroup.position.set(x, 0, z);
            gateGroup.rotation.y = rotY;

            // Register doors for animation update (initially closed)
            const gateWorldPos = new THREE.Vector3(x, 0, z);
            this.autoDoors.push({
                door: leftDoor,
                centerPos: gateWorldPos,
                closedRot: 0,
                openRot: -Math.PI / 2.5,
                triggerDistance: isPedestrian ? 8 : 20 // Smaller trigger for pedestrian gate
            });
            this.autoDoors.push({
                door: rightDoor,
                centerPos: gateWorldPos,
                closedRot: Math.PI,
                openRot: Math.PI + Math.PI / 2.5,
                triggerDistance: isPedestrian ? 8 : 20
            });

            // Add shadows and colliders
            gateGroup.traverse(c => {
                if (c.isMesh) {
                    c.castShadow = true;
                    c.receiveShadow = true;
                    c.userData = { type: 'Main Gate', label: isPedestrian ? '行人小门' : '大门' };
                    // We only add static walls/pillars to collision, NOT the swinging doors
                    if (c.geometry.type === 'BoxGeometry' && c.geometry.parameters.width >= 2) {
                        this.buildings.push(c);
                    }
                }
            });

            fenceGroup.add(gateGroup);
        };

        // Entrances at boundaries
        buildSmallIronGate(0, -bound, 0);          // North (Opposite side - Small Iron Gate)
        buildEuropeanGate(0, bound, Math.PI);      // South (Main Gate - No changes)

        this.scene.add(fenceGroup);

        // Add fence to buildings array for collision detection
        // Note: Adding a complex group with many children to collision might be slow.
        // For optimization, we can just add an invisible bounding box, but for now we add the pillars.
        fenceGroup.children.forEach(child => {
            child.userData = { type: 'Community Fence', label: '小区围栏' };
            this.buildings.push(child);
        });
    }
}
