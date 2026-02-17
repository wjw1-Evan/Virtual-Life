import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
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
        this.createParticles();
        this.addUrbanProps();
    }

    update(deltaTime, time) {
        // Update animation mixers
        this.mixers.forEach(mixer => mixer.update(deltaTime));

        // Update particles
        this.updateParticles(deltaTime);

        // Update day/night materials
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
            // SOUTH: Residential
            { name: 'My Home', type: 'house', x: -15, z: 50, label: '我的家' },
            { name: 'Neighbor A', type: 'house', x: 15, z: 50, label: '邻居 A' },
            { name: 'Neighbor B', type: 'house', x: -15, z: 80, label: '邻居 B' },
            { name: 'Neighbor C', type: 'house', x: 15, z: 80, label: '邻居 C' },
            { name: 'Apartment Alpha', type: 'house', x: -40, z: 70, scale: 1.5, label: '白鹭公寓' },
            { name: 'Apartment Beta', type: 'house', x: 40, z: 70, scale: 1.5, label: '香颂公馆' },

            // NORTH: Commercial
            { name: 'Supermarket', type: 'store', x: -60, z: -60, scale: 1.5, label: '悦生活超市', neonColor: 0x4CAF50 },
            { name: 'Bakery', type: 'store', x: -40, z: -60, label: '麦香工坊' },
            { name: 'Cafe', type: 'store', x: 0, z: -40, label: '漫时咖啡' },
            { name: 'Pizza Place', type: 'store', x: 0, z: -60, label: '意风披萨' },
            { name: 'Gym', type: 'store', x: -30, z: -40, label: '力美健身' },
            { name: 'Cinema', type: 'store', x: 0, z: -120, scale: 2, label: '星空影城' },

            // EAST: Business
            { name: 'Office A', type: 'office', x: 100, z: 10, label: '环球中心 A' },
            { name: 'Office B', type: 'office', x: 100, z: 40, label: '环球中心 B' },
            { name: 'Bank', type: 'office', x: 80, z: 0, label: '建设银行' },
            { name: 'Skyscraper A', type: 'office', x: 140, z: 0, scale: 3, label: '天际大厦' },

            // WEST: Services
            { name: 'Hospital', type: 'office', x: -100, z: 0, scale: 1.5, label: '第一人民医院' },
            { name: 'Police Station', type: 'office', x: -100, z: 30, label: '公安局' },
            { name: 'Fire Station', type: 'store', x: -80, z: 30, label: '消防中心' },

            // Landmarks
            { name: 'Lighthouse', type: 'office', x: 180, z: 180, scale: 2, label: '观海灯塔' }
        ];

        zones.forEach(zone => {
            const group = new THREE.Group();
            group.position.set(zone.x, 0, zone.z);
            this.scene.add(group);

            // 1. Immediate Visual (Placeholder)
            const pSize = 10 * (zone.scale || 1);
            const placeholder = new THREE.Mesh(
                new THREE.BoxGeometry(pSize, pSize, pSize),
                new THREE.MeshStandardMaterial({ color: 0x555555, wireframe: true, transparent: true, opacity: 0.3 })
            );
            placeholder.position.y = pSize / 2;
            group.add(placeholder);

            let modelPath = 'assets/models/office.glb';
            if (zone.type === 'house') modelPath = 'assets/models/house.glb';
            if (zone.type === 'store') modelPath = 'assets/models/store.glb';

            // 1. Define Color Palettes
            const palettes = {
                house: [0xfdfd96, 0xaec6cf, 0xffb7ce, 0x77dd77, 0xffd1dc, 0xcfcfff], // Pastel neighborhood
                store: [0xff4d4d, 0x4da6ff, 0xffa31a, 0x9966ff, 0x00cc99], // Vibrant commercial
                office: [0x333333, 0x4d4d4d, 0x1a1a1a, 0x003366, 0x2d5a27] // Professional tones
            };

            const typePalette = palettes[zone.type] || palettes.office;
            const wallColor = typePalette[Math.floor(Math.random() * typePalette.length)];
            const roofColor = 0x333333; // Default dark roof

            assetLoader.loadModel(modelPath).then(model => {
                console.log(`World: Loaded ${zone.name}`);
                group.remove(placeholder);

                // Increase scale significantly
                const baseScale = zone.type === 'house' ? 25 : 20;
                const s = (zone.scale || 1) * baseScale;
                model.scale.set(s, s, s);
                model.position.y = 0.2;
                group.add(model);

                model.traverse(child => {
                    if (child.isMesh) {
                        child.castShadow = true;
                        child.receiveShadow = true;

                        // Apply Color Enrichment
                        if (child.material) {
                            child.material = child.material.clone();
                            child.material.side = THREE.DoubleSide;

                            // Identifying mesh parts by name if possible, or just applying base color
                            const name = child.name.toLowerCase();
                            const isWall = name.includes('wall') || name.includes('body') || name.includes('base') || name.includes('structure');
                            const isRoof = name.includes('roof') || name.includes('top');
                            const isWindow = name.includes('window') || name.includes('glass');

                            if (isWindow) {
                                child.material.color.setHex(0xAADDFF);
                                child.material.emissive.setHex(0x224466);
                                child.material.transparent = true;
                                child.material.opacity = 0.8;
                            } else if (isWall) {
                                child.material.color.setHex(wallColor);
                            } else if (isRoof) {
                                child.material.color.setHex(roofColor);
                            } else if (zone.type === 'house') {
                                // For houses, if it's not a specified part, use wall color
                                child.material.color.setHex(wallColor);
                                if (name.includes('trim')) child.material.color.lerp(new THREE.Color(0xffffff), 0.3);
                            } else {
                                // Default fallback: tint towards wall color
                                child.material.color.lerp(new THREE.Color(wallColor), 0.3);
                            }
                        }

                        child.userData = { type: zone.name, label: zone.label };
                        this.buildings.push(child);
                    }
                });
            }).catch(err => {
                console.error(`World: Load failed for ${zone.name}`, err);
                placeholder.material.wireframe = false;
                placeholder.material.opacity = 1;
                placeholder.material.color.setHex(0x888888);
            });

            // Label
            if (zone.label) {
                const label = this.createLabel(zone.label);
                label.position.y = (zone.scale || 1) * 15;
                group.add(label);
            }

            // Neon fallback or decoration
            if (zone.neonColor) {
                const neonMat = new THREE.MeshStandardMaterial({
                    color: zone.neonColor,
                    emissive: zone.neonColor,
                    emissiveIntensity: 1,
                    toneMapped: false
                });
                this.neonMaterials.push(neonMat);
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
        const spriteMat = new THREE.SpriteMaterial({ map: texture, transparent: true });
        const sprite = new THREE.Sprite(spriteMat);
        sprite.scale.set(10 * (canvas.width / canvas.height), 10, 1);
        return sprite;
    }

    createTrees() {
        for (let i = 0; i < 200; i++) {
            const x = (Math.random() - 0.5) * 400;
            const z = (Math.random() - 0.5) * 400;

            if (Math.abs(x % 60) < 10 || Math.abs(z % 60) < 10) continue;
            if (Math.abs(x) < 40 && Math.abs(z) < 40) continue;

            const scale = 1.0 + Math.random() * 0.8;
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
        const roadGeo = new THREE.PlaneGeometry(roadWidth, 1000);
        const roadMat = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.9 });

        for (let x = -180; x <= 180; x += 60) {
            const road = new THREE.Mesh(roadGeo, roadMat);
            road.rotation.x = -Math.PI / 2;
            road.position.set(x, 0.05, 0);
            road.receiveShadow = true;
            this.scene.add(road);
        }

        const roadGeoZ = new THREE.PlaneGeometry(1000, roadWidth);
        for (let z = -180; z <= 180; z += 60) {
            const road = new THREE.Mesh(roadGeoZ, roadMat);
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

        for (let x = -180; x <= 180; x += 60) {
            for (let z = -180; z <= 180; z += 60) {
                const offsets = [[-6, -6], [6, 6]];
                offsets.forEach(off => {
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

    createParticles() {
        // Simplified particle logic
    }

    updateParticles(deltaTime) {
        // No-op for now
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
        // Hydrants, bins, etc.
    }
}
