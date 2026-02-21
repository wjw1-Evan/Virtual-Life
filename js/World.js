import * as THREE from 'three';
import { assetLoader } from './AssetLoader.js';

export class World {
    constructor(scene) {
        this.scene = scene;
        this.buildings = [];
        this.neonMaterials = [];
        this.mixers = [];
        this.particles = [];
        this.streetLightMat = null;

        this.init();
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
            { name: 'My Home', type: 'house', cellX: 0, cellZ: 0, label: '我的家' }, // Keeping the player home as a base
            { name: 'Tower A', type: 'skyscraper', cellX: 0, cellZ: -1, label: '锦绣华庭 A座', height: 40 },
            { name: 'Tower B', type: 'skyscraper', cellX: -1, cellZ: 0, label: '锦绣华庭 B座', height: 55 },
            { name: 'Grand Plaza', type: 'skyscraper_commercial', cellX: 1, cellZ: 0, label: '环球中心', height: 80 },
            { name: 'Tower C', type: 'skyscraper', cellX: 1, cellZ: -1, label: '锦绣华庭 C座', height: 45 },
            { name: 'Community Park', type: 'park_amenity', cellX: 0, cellZ: 1, label: '中央公园' }
        ];

        const palettes = {
            house: [0xfdfd96, 0xaec6cf, 0xffb7ce, 0x77dd77, 0xffd1dc, 0xcfcfff]
        };

        zones.forEach(zone => {
            const roadSpacing = 100;
            const roadWidth = 10;

            // Calculate center of the grid cell
            // cellX = 0 -> block between X=0 and X=100 -> center X = 50
            // cellX = -1 -> block between X=0 and X=-100 -> center X = -50
            const blockCenterX = zone.cellX >= 0 ? zone.cellX * roadSpacing + roadSpacing / 2 : zone.cellX * roadSpacing + roadSpacing / 2;
            const blockCenterZ = zone.cellZ >= 0 ? zone.cellZ * roadSpacing + roadSpacing / 2 : zone.cellZ * roadSpacing + roadSpacing / 2;

            // Place exactly in the center of the block grid
            let finalX = blockCenterX;
            let finalZ = blockCenterZ;
            let finalRotation = 0; // Face South by default

            // Optionally adjust rotation based on block position to face nearest road
            if (Math.abs(blockCenterX) > Math.abs(blockCenterZ)) {
                finalRotation = blockCenterX > 0 ? -Math.PI / 2 : Math.PI / 2;
            } else {
                finalRotation = blockCenterZ > 0 ? 0 : Math.PI;
            }

            const group = new THREE.Group();
            group.position.set(finalX, 0, finalZ);
            group.rotation.y = finalRotation;
            this.scene.add(group);

            if (zone.name === 'My Home') {
                this.createModernHouse(group);
            } else if (zone.type === 'skyscraper') {
                this.createSkyscraper(group, zone.height || 40, 0x333333);
            } else if (zone.type === 'skyscraper_commercial') {
                this.createSkyscraper(group, zone.height || 80, 0x112233, true);
            } else if (zone.type === 'park_amenity') {
                this.createSmallPark(group);
            }

            if (zone.label) {
                const label = this.createLabel(zone.label);
                label.position.set(0, (zone.height || 10) + 5, 0);
                group.add(label);
            }

            this.createLandscaping(group);
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
        const grass = new THREE.Mesh(new THREE.CircleGeometry(25, 32), new THREE.MeshStandardMaterial({ color: 0x44aa44 }));
        grass.rotation.x = -Math.PI / 2;
        grass.position.y = 0.1;
        group.add(grass);

        // Central sculpture
        const sc = new THREE.Mesh(new THREE.TorusKnotGeometry(3, 0.8, 64, 16), new THREE.MeshStandardMaterial({ color: 0xcccccc, metalness: 1, roughness: 0.1 }));
        sc.position.y = 8;
        group.add(sc);

        const base = new THREE.Mesh(new THREE.BoxGeometry(6, 4, 6), new THREE.MeshStandardMaterial({ color: 0x333333 }));
        base.position.y = 2;
        group.add(base);

        // Benches
        for (let i = 0; i < 8; i++) {
            const angle = (i / 8) * Math.PI * 2;
            const bench = this.createBench();
            bench.position.set(Math.cos(angle) * 18, 0, Math.sin(angle) * 18);
            bench.rotation.y = -angle + Math.PI / 2;
            group.add(bench);
        }

        // Water Fountain
        const fountainBase = new THREE.Mesh(new THREE.CylinderGeometry(6, 6, 0.6, 32), new THREE.MeshStandardMaterial({ color: 0x888888 }));
        fountainBase.position.y = 0.3;
        const water = new THREE.Mesh(new THREE.CircleGeometry(5.8, 32), new THREE.MeshStandardMaterial({ color: 0x44ccff, transparent: true, opacity: 0.8, roughness: 0 }));
        water.rotation.x = -Math.PI / 2;
        water.position.y = 0.7;
        group.add(fountainBase, water);

        const nozzle = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.5, 2), new THREE.MeshStandardMaterial({ color: 0xaaaaaa }));
        nozzle.position.y = 1.5;
        group.add(nozzle);
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

    createModernHouse(group) {
        // Floor
        const floorGeo = new THREE.BoxGeometry(16, 0.4, 16);
        const floorMat = new THREE.MeshStandardMaterial({ color: 0xcccccc, roughness: 0.2 });
        const floor = new THREE.Mesh(floorGeo, floorMat);
        floor.position.y = 0.2;
        floor.receiveShadow = true;
        group.add(floor);

        // Roof
        const roofGeo = new THREE.BoxGeometry(18, 0.5, 18);
        const roofMat = new THREE.MeshStandardMaterial({ color: 0x222222 });
        const roof = new THREE.Mesh(roofGeo, roofMat);
        roof.position.y = 5.25;
        roof.castShadow = true;
        group.add(roof);

        // Walls (Glass and concrete)
        const wallMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9 });
        const glassMat = new THREE.MeshStandardMaterial({ color: 0x88ccff, transparent: true, opacity: 0.3, roughness: 0.1 });

        // Back Wall
        const backWall = new THREE.Mesh(new THREE.BoxGeometry(16, 5, 0.5), wallMat);
        backWall.position.set(0, 2.7, -7.75);
        backWall.castShadow = true;
        group.add(backWall);

        // Side Wall
        const sideWall = new THREE.Mesh(new THREE.BoxGeometry(0.5, 5, 16), wallMat);
        sideWall.position.set(-7.75, 2.7, 0);
        sideWall.castShadow = true;
        group.add(sideWall);

        // Front Glass Wall
        const frontGlass = new THREE.Mesh(new THREE.BoxGeometry(16, 5, 0.2), glassMat);
        frontGlass.position.set(0, 2.7, 7.9);
        group.add(frontGlass);

        // Other Side Glass Wall
        const rightGlass = new THREE.Mesh(new THREE.BoxGeometry(0.2, 5, 16), glassMat);
        rightGlass.position.set(7.9, 2.7, 0);
        group.add(rightGlass);

        // Interactive Furniture
        // 1. Bed
        const bedGrp = new THREE.Group();
        bedGrp.position.set(-5, 0.4, -5);
        const bedFrame = new THREE.Mesh(new THREE.BoxGeometry(3, 0.5, 5), new THREE.MeshStandardMaterial({ color: 0x5c4033 }));
        bedFrame.position.y = 0.25;
        const mattress = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.4, 4.8), new THREE.MeshStandardMaterial({ color: 0xffffff }));
        mattress.position.y = 0.7;
        bedGrp.add(bedFrame, mattress);
        bedGrp.userData = { type: 'Bed', action: '睡觉' };
        this.buildings.push(bedGrp);
        group.add(bedGrp);

        // 2. Sofa
        const sofaGrp = new THREE.Group();
        sofaGrp.position.set(3, 0.4, -5);
        const sofaBase = new THREE.Mesh(new THREE.BoxGeometry(4, 0.6, 2), new THREE.MeshStandardMaterial({ color: 0x333333 }));
        sofaBase.position.y = 0.3;
        const sofaBack = new THREE.Mesh(new THREE.BoxGeometry(4, 1.2, 0.5), new THREE.MeshStandardMaterial({ color: 0x333333 }));
        sofaBack.position.set(0, 0.9, -0.75);
        sofaGrp.add(sofaBase, sofaBack);
        sofaGrp.userData = { type: 'Sofa', action: '休息' };
        this.buildings.push(sofaGrp);
        group.add(sofaGrp);

        // 3. Kitchen Table
        const kitchenGrp = new THREE.Group();
        kitchenGrp.position.set(3, 0.4, 3);
        const tableTop = new THREE.Mesh(new THREE.BoxGeometry(3, 0.2, 2), new THREE.MeshStandardMaterial({ color: 0xdddddd }));
        tableTop.position.y = 1.2;
        const legMat = new THREE.MeshStandardMaterial({ color: 0x111111 });
        const lgA = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 1.2), legMat); lgA.position.set(-1.3, 0.6, -0.8);
        const lgB = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 1.2), legMat); lgB.position.set(1.3, 0.6, -0.8);
        const lgC = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 1.2), legMat); lgC.position.set(-1.3, 0.6, 0.8);
        const lgD = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 1.2), legMat); lgD.position.set(1.3, 0.6, 0.8);
        kitchenGrp.add(tableTop, lgA, lgB, lgC, lgD);
        kitchenGrp.userData = { type: 'Kitchen', action: '吃饭' };
        this.buildings.push(kitchenGrp);
        group.add(kitchenGrp);

        // 4. Desk (Work)
        const deskGrp = new THREE.Group();
        deskGrp.position.set(-5, 0.4, 3);
        const deskTop = new THREE.Mesh(new THREE.BoxGeometry(2, 0.1, 4), new THREE.MeshStandardMaterial({ color: 0x8b5a2b }));
        deskTop.position.y = 1.0;
        const dgA = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 1.0), legMat); dgA.position.set(-0.8, 0.5, -1.8);
        const dgB = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 1.0), legMat); dgB.position.set(0.8, 0.5, -1.8);
        const dgC = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 1.0), legMat); dgC.position.set(-0.8, 0.5, 1.8);
        const dgD = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 1.0), legMat); dgD.position.set(0.8, 0.5, 1.8);
        deskGrp.add(deskTop, dgA, dgB, dgC, dgD);
        deskGrp.userData = { type: 'Desk', action: '工作' };
        this.buildings.push(deskGrp);
        group.add(deskGrp);

        // Add walls dynamically to buildings for collision
        [backWall, sideWall, frontGlass, rightGlass].forEach(w => {
            w.userData = { type: 'Wall', label: '墙壁' };
            this.buildings.push(w);
        });
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
        const lakeRadius = 45;
        const lakeCenter = new THREE.Vector3(150, 0, 150);

        // Water
        const waterGeo = new THREE.CircleGeometry(lakeRadius, 32);
        const waterMat = new THREE.MeshStandardMaterial({
            color: 0x1e90ff,
            transparent: true,
            opacity: 0.8,
            roughness: 0.1,
            metalness: 0.4
        });
        const water = new THREE.Mesh(waterGeo, waterMat);
        water.rotation.x = -Math.PI / 2;
        water.position.y = 0.1;
        lakeGroup.add(water);

        // Shoreline / Pebbles / Sand area around it
        const shoreGeo = new THREE.RingGeometry(lakeRadius, lakeRadius + 6, 32);
        const shoreMat = new THREE.MeshStandardMaterial({
            color: 0xc2b280, // Sand color
            roughness: 1.0
        });
        const shore = new THREE.Mesh(shoreGeo, shoreMat);
        shore.rotation.x = -Math.PI / 2;
        shore.position.y = 0.05;
        lakeGroup.add(shore);

        lakeGroup.position.copy(lakeCenter);
        this.scene.add(lakeGroup);

        this.lakeInfo = { pos: lakeCenter, radius: lakeRadius };

        // Add a label
        const label = this.createLabel('心愿湖 (Lake)');
        label.position.set(lakeCenter.x, 15, lakeCenter.z);
        this.scene.add(label);
    }

    createRoads() {
        const roadWidth = 10;
        const roadMat = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.9 });
        const roadGridSize = 100; // Matching the building spacing
        const gridBound = 200; // Limits to exactly a 2 or 3 block radius

        for (let x = -gridBound; x <= gridBound; x += roadGridSize) {
            const road = new THREE.Mesh(new THREE.PlaneGeometry(roadWidth, gridBound * 2), roadMat);
            road.rotation.x = -Math.PI / 2;
            road.position.set(x, 0.05, 0);
            road.receiveShadow = true;
            this.scene.add(road);
        }
        for (let z = -gridBound; z <= gridBound; z += roadGridSize) {
            const road = new THREE.Mesh(new THREE.PlaneGeometry(gridBound * 2, roadWidth), roadMat);
            road.rotation.x = -Math.PI / 2;
            road.position.set(0, 0.05, z);
            road.receiveShadow = true;
            this.scene.add(road);
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
        // Place an electronic bulletin board near the Grand Plaza entrance
        this.createElectricBoard(75, 80, -Math.PI / 4);

        // Smart Delivery Locker near Tower A
        this.createDeliveryLocker(-40, 0, 15);

        // Garbage Sorting Station
        this.createGarbageStation(-40, 0, -15);
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

        // Boom Barrier (Lever)
        const barrierBase = new THREE.Mesh(new THREE.BoxGeometry(1, 4, 1), new THREE.MeshStandardMaterial({ color: 0xffaa00 }));
        barrierBase.position.set(8, 2, bound);
        gateGroup.add(barrierBase);

        const lever = new THREE.Mesh(new THREE.BoxGeometry(12, 0.3, 0.3), new THREE.MeshStandardMaterial({ color: 0xffffff }));
        lever.position.set(2, 3.5, bound);
        gateGroup.add(lever);

        // Large community name board
        const wall = new THREE.Mesh(new THREE.BoxGeometry(10, 6, 2), new THREE.MeshStandardMaterial({ color: 0x333333 }));
        wall.position.set(-15, 3, bound);
        gateGroup.add(wall);

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

    createFence(group, width, depth) {
        const fenceGroup = new THREE.Group();
        const postGeo = new THREE.BoxGeometry(0.2, 1.2, 0.2);
        const railGeo = new THREE.BoxGeometry(width, 0.1, 0.1);
        const fenceMat = new THREE.MeshStandardMaterial({ color: 0x5c4033, roughness: 1.0 });

        // Simple perimeter fence with gap for entrance
        const positions = [
            { x: 0, z: -depth / 2, rot: 0 }, // Back
            { x: -width / 2, z: 0, rot: Math.PI / 2 }, // Left
            { x: width / 2, z: 0, rot: Math.PI / 2 }, // Right
            { x: -width / 4 - 1, z: depth / 2, rot: 0 }, // Front Left
            { x: width / 4 + 1, z: depth / 2, rot: 0 }, // Front Right
        ];

        positions.forEach(pos => {
            const railTop = new THREE.Mesh(railGeo, fenceMat);
            const railMid = new THREE.Mesh(railGeo, fenceMat);

            // Adjust rail length for front segments
            if (pos.z === depth / 2) {
                railTop.scale.x = 0.5;
                railMid.scale.x = 0.5;
            }

            railTop.position.set(pos.x, 0.9, pos.z);
            railMid.position.set(pos.x, 0.5, pos.z);
            railTop.rotation.y = pos.rot;
            railMid.rotation.y = pos.rot;
            fenceGroup.add(railTop, railMid);
        });

        // Add posts at corners
        const corners = [
            { x: -width / 2, z: -depth / 2 },
            { x: width / 2, z: -depth / 2 },
            { x: -width / 2, z: depth / 2 },
            { x: width / 2, z: depth / 2 },
            { x: -1.5, z: depth / 2 }, // Gate post L
            { x: 1.5, z: depth / 2 }   // Gate post R
        ];

        corners.forEach(c => {
            const post = new THREE.Mesh(postGeo, fenceMat);
            post.position.set(c.x, 0.6, c.z);
            fenceGroup.add(post);
        });

        group.add(fenceGroup);

        // Add a Mailbox
        const mbPost = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 1.2), fenceMat);
        mbPost.position.set(2, 0.6, depth / 2 + 0.5);
        const mbBox = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.3, 0.5), new THREE.MeshStandardMaterial({ color: 0x444444 }));
        mbBox.position.set(2, 1.2, depth / 2 + 0.5);
        group.add(mbPost, mbBox);
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
            const angle = Math.atan2(dx, dz); // Note: Three.js rotation Y is usually atan2(x, z)

            const maxSegmentLength = 10;
            const segments = Math.ceil(length / maxSegmentLength);
            const segmentLength = length / segments;

            for (let i = 0; i < segments; i++) {
                // Determine center of this segment
                const fraction = (i + 0.5) / segments;
                const cx = startX + dx * fraction;
                const cz = startZ + dz * fraction;

                const panel = createPanel(segmentLength);
                panel.position.set(cx, 0, cz);
                panel.rotation.y = angle + Math.PI / 2;
                fenceGroup.add(panel);

                // Add a pillar at the start of the segment
                const px = startX + dx * (i / segments);
                const pz = startZ + dz * (i / segments);
                const pillar = new THREE.Mesh(pillarGeo, pillarMat);
                pillar.position.set(px, pillarHeight / 2, pz);
                pillar.castShadow = true;
                pillar.receiveShadow = true;
                fenceGroup.add(pillar);
            }
            // Add final pillar at the end
            const endPillar = new THREE.Mesh(pillarGeo, pillarMat);
            endPillar.position.set(endX, pillarHeight / 2, endZ);
            endPillar.castShadow = true;
            endPillar.receiveShadow = true;
            fenceGroup.add(endPillar);
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
