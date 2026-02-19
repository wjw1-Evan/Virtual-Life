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
        this.createTrees();
        this.createRoads();
        this.createStreetLights();
        // this.createParticles(); // Placeholder
        this.addUrbanProps();
    }

    update(deltaTime, time) {
        this.mixers.forEach(mixer => mixer.update(deltaTime));
        this.updateMaterials(time);
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
            // Standardized City Grid: Each building has a unique slot along the roads
            // Format: x, z coordinates planned to avoid overlaps on the 100m road grid

            // Road X=0 (South/North Main St)
            { name: 'My Home', type: 'house', x: -20, z: 80, label: '我的家' },
            { name: 'Neighbor A', type: 'house', x: 20, z: 80, label: '邻居 A' },
            { name: 'Neighbor B', type: 'house', x: -20, z: 120, label: '邻居 B' },
            { name: 'Neighbor C', type: 'house', x: 20, z: 120, label: '邻居 C' },
            { name: 'Apartment Alpha', type: 'house', x: -20, z: 160, label: '白鹭公寓' },
            { name: 'Apartment Beta', type: 'house', x: 20, z: 160, label: '香颂公馆' },

            // Road Z=0 (East/West Main St)
            { name: 'Supermarket', type: 'store', x: -80, z: -20, label: '悦生活超市', neonColor: 0x4CAF50 },
            { name: 'Bakery', type: 'store', x: -40, z: -20, label: '麦香工坊' },
            { name: 'Cafe', type: 'store', x: 40, z: -20, label: '漫时咖啡' },
            { name: 'Pizza Place', type: 'store', x: 80, z: -20, label: '意风披萨' },
            { name: 'Gym', type: 'store', x: -80, z: 20, label: '力美健身' },

            // Business District (Road X=100)
            { name: 'Office A', type: 'office', x: 80, z: 40, label: '环球中心 A' },
            { name: 'Office B', type: 'office', x: 120, z: 40, label: '环球中心 B' },
            { name: 'Bank', type: 'office', x: 80, z: -40, label: '建设银行' },
            { name: 'Skyscraper A', type: 'office', x: 120, z: -40, label: '天际大厦' },

            // Medical & Services (Road X=-100)
            { name: 'Hospital', type: 'office', x: -120, z: 40, label: '第一人民医院' },
            { name: 'Police Station', type: 'office', x: -80, z: 40, label: '公安局' },
            { name: 'Fire Station', type: 'store', x: -120, z: -40, label: '消防中心' },
            { name: 'Cinema', type: 'office', x: -80, z: -40, label: '星空影城' },

            // Landmarks
            { name: 'Lighthouse', type: 'office', x: 180, z: 180, label: '观海灯塔' }
        ];

        const palettes = {
            house: [0xfdfd96, 0xaec6cf, 0xffb7ce, 0x77dd77, 0xffd1dc, 0xcfcfff],
            store: [0xff4d4d, 0x4da6ff, 0xffa31a, 0x9966ff, 0x00cc99],
            office: [0x333333, 0x4d4d4d, 0x1a1a1a, 0x003366, 0x2d5a27]
        };

        zones.forEach(zone => {
            const roadSpacing = 100;
            const roadWidth = 10;

            // Standardized Uniform Scale for all buildings (approx 8 floors)
            const uniformScale = 4.0;

            // Dynamic Offset: Half road + Half building width + safe buffer
            const buildingHalfWidth = uniformScale * 1.5;
            const dynamicSidewalkOffset = (roadWidth / 2) + buildingHalfWidth + 5;

            // Find nearest road
            const nearRoadX = Math.round(zone.x / roadSpacing) * roadSpacing;
            const nearRoadZ = Math.round(zone.z / roadSpacing) * roadSpacing;

            const distToX = Math.abs(zone.x - nearRoadX);
            const distToZ = Math.abs(zone.z - nearRoadZ);

            let finalX, finalZ, finalRotation;
            const subGrid = 40; // Strict secondary grid snapping

            if (distToX < distToZ) {
                // Align to North-South road (X is fixed offset, Z snaps to grid)
                finalX = nearRoadX + (zone.x > nearRoadX ? dynamicSidewalkOffset : -dynamicSidewalkOffset);
                finalZ = Math.round(zone.z / subGrid) * subGrid;
                finalRotation = zone.x > nearRoadX ? -Math.PI / 2 : Math.PI / 2;
            } else {
                // Align to East-West road (Z is fixed offset, X snaps to grid)
                finalZ = nearRoadZ + (zone.z > nearRoadZ ? dynamicSidewalkOffset : -dynamicSidewalkOffset);
                finalX = Math.round(zone.x / subGrid) * subGrid;
                finalRotation = zone.z > nearRoadZ ? 0 : Math.PI;
            }

            const group = new THREE.Group();
            group.position.set(finalX, 0, finalZ);
            group.rotation.y = finalRotation;
            this.scene.add(group);

            let modelPath = 'assets/models/commercial_building.glb';
            const typePalette = palettes[zone.type] || palettes.office;
            const wallColor = typePalette[Math.floor(Math.random() * typePalette.length)];

            assetLoader.loadGLTF(modelPath).then(gltf => {
                const model = gltf.scene.clone();

                // Unified Scale (No longer floor based for perfect consistency)
                const uniformScale = 4.0;

                // Handle Animations
                if (gltf.animations && gltf.animations.length > 0) {
                    const mixer = new THREE.AnimationMixer(model);
                    gltf.animations.forEach(clip => mixer.clipAction(clip).play());
                    this.mixers.push(mixer);
                }

                // Apply UNIFORM scale
                model.scale.set(uniformScale, uniformScale, uniformScale);
                model.rotation.y = 0;
                model.position.y = 0.15;
                group.add(model);

                // 1. Foundation Slab (Concrete base)
                const slabHeight = 0.3;
                const slabSize = uniformScale * 1.5; // Proportional to building width
                const slabGeo = new THREE.BoxGeometry(slabSize, slabHeight, slabSize);
                const slabMat = new THREE.MeshStandardMaterial({ color: 0x666666, roughness: 0.9 });
                const slab = new THREE.Mesh(slabGeo, slabMat);
                slab.position.y = slabHeight / 2;
                group.add(slab);

                // Residential zones get a courtyard feeling even with office models
                if (zone.type === 'house') {
                    const yardGeo = new THREE.BoxGeometry(slabSize + 8, 0.1, slabSize + 8);
                    const yardMat = new THREE.MeshStandardMaterial({ color: 0x3d5c1a, roughness: 1.0 });
                    const yard = new THREE.Mesh(yardGeo, yardMat);
                    yard.position.y = 0.05;
                    group.add(yard);
                    this.createFence(group, slabSize + 8, slabSize + 8);
                }

                model.traverse(child => {
                    if (child.isMesh) {
                        child.castShadow = true;
                        child.receiveShadow = true;

                        // Apply the commercial look but keep some original textures
                        if (child.material) {
                            child.material = child.material.clone();
                            child.material.transparent = false;
                            child.material.alphaTest = 0.5;

                            // Mix in some zone-based tinting for variety in the walls
                            const name = child.name.toLowerCase();
                            if (!name.includes('window') && !name.includes('glass')) {
                                const tint = new THREE.Color(wallColor).convertSRGBToLinear();
                                child.material.color.lerp(tint, 0.2);
                            }
                        }
                        child.userData = { type: zone.name, label: zone.label };
                        this.buildings.push(child);
                    }
                });
            });

            if (zone.label) {
                const label = this.createLabel(zone.label);
                label.position.y = (zone.scale || 1) * 15;
                group.add(label);
            }
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

    createTrees() {
        for (let i = 0; i < 200; i++) {
            const x = (Math.random() - 0.5) * 400;
            const z = (Math.random() - 0.5) * 400;
            if (Math.abs(x % 60) < 10 || Math.abs(z % 60) < 10) continue;
            if (Math.abs(x) < 40 && Math.abs(z) < 40) continue;

            const scale = 6.0 + Math.random() * 4.0;
            assetLoader.loadModel('assets/models/tree.glb').then(model => {
                model.position.set(x, 0, z);
                model.scale.set(scale, scale, scale);
                model.rotation.y = Math.random() * Math.PI * 2;
                this.scene.add(model);
            });
        }
    }

    createRoads() {
        const roadWidth = 10;
        const roadMat = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.9 });
        const roadGridSize = 100; // Matching the building spacing

        for (let x = -300; x <= 300; x += roadGridSize) {
            const road = new THREE.Mesh(new THREE.PlaneGeometry(roadWidth, 1000), roadMat);
            road.rotation.x = -Math.PI / 2;
            road.position.set(x, 0.05, 0);
            road.receiveShadow = true;
            this.scene.add(road);
        }
        for (let z = -300; z <= 300; z += roadGridSize) {
            const road = new THREE.Mesh(new THREE.PlaneGeometry(1000, roadWidth), roadMat);
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

        for (let x = -300; x <= 300; x += roadGridSize) {
            for (let z = -300; z <= 300; z += roadGridSize) {
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

    addUrbanProps() { }

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
}
