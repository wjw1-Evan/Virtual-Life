import * as THREE from 'three';

export class World {
    constructor(scene) {
        this.scene = scene;
        this.buildings = [];
        this.neonMaterials = []; // Store neon materials for global update

        this.createGround();
        this.createBuildings();
        this.createTrees();
        this.createEnvironment();
        this.createStreetLights();
        this.createParticles();
    }

    createGround() {
        const geometry = new THREE.PlaneGeometry(400, 400); // 400x400
        const material = new THREE.MeshStandardMaterial({ color: 0x999999 });
        const ground = new THREE.Mesh(geometry, material);
        ground.rotation.x = -Math.PI / 2;
        ground.receiveShadow = true;
        this.scene.add(ground);
    }

    createBuildings() {
        // Define zones (Total 30+ items)
        const zones = [
            // Original (Custom methods kept for Home/Office as they are enterable)
            { name: 'Home', type: 'house', label: '家', x: -20, z: -20 },
            { name: 'Shower', type: 'shower', label: '淋浴', x: -16.5, z: -23.5 }, // Inside House
            { name: 'Office', type: 'office', label: '办公室', x: 20, z: -20 },
            { name: 'Desk', type: 'desk', label: '工位', x: 23, z: -23 },

            // Food & Drink (Stores)
            { name: 'Supermarket', type: 'generic', style: 'store', color: 0x00FF00, label: '超市', x: -60, z: -60, scale: 1.5, neonColor: 0x00FF00 },
            { name: 'Restaurant', type: 'generic', style: 'store', color: 0xFF4500, label: '餐厅', x: -20, z: 20, neonColor: 0xFFAA00 },
            { name: 'Cafe', type: 'generic', style: 'store', color: 0x8B4513, label: '咖啡馆', x: 0, z: -40, awningColor: 0xF5DEB3, neonColor: 0xFFD700 },
            { name: 'Bakery', type: 'generic', style: 'store', color: 0xFFD700, label: '面包房', x: -40, z: -60, awningColor: 0xFFFFFF, neonColor: 0xFFA500 },
            { name: 'Ice Cream Shop', type: 'generic', style: 'store', color: 0xFF69B4, label: '冰淇淋', x: -20, z: -60, awningColor: 0xFF00FF, neonColor: 0xFF1493 },
            { name: 'Pizza Place', type: 'generic', style: 'store', color: 0xFF4500, label: '披萨店', x: 0, z: -60, awningColor: 0x008000, neonColor: 0xFF0000 },
            { name: 'Burger Joint', type: 'generic', style: 'store', color: 0x8B4513, label: '汉堡店', x: 20, z: -60, awningColor: 0xFFFF00, neonColor: 0xFFFF00 },
            { name: 'Sushi Bar', type: 'generic', style: 'store', color: 0xFFFFFF, label: '寿司店', x: 40, z: -60, awningColor: 0x000000, neonColor: 0xFFFFFF },
            { name: 'Bar', type: 'generic', style: 'store', color: 0x4B0082, label: '酒吧', x: 60, z: -60, awningColor: 0x800080, neonColor: 0x8A2BE2 },
            { name: 'Club', type: 'generic', style: 'modern', color: 0x111111, label: '夜店', emissive: 0xFF00FF, x: 80, z: -60, neonColor: 0xFF00FF },

            // Services
            { name: 'Hospital', type: 'generic', style: 'modern', color: 0xFFFFFF, label: '医院', mark: 'helipad', x: -80, z: 80, scale: 1.5, neonColor: 0xFF0000 },
            { name: 'Pharmacy', type: 'generic', style: 'store', color: 0xFFFFFF, label: '药店', mark: '+', x: -60, z: 80, neonColor: 0x00FF00 },
            { name: 'Police Station', type: 'generic', style: 'office', color: 0x0000FF, label: '警察局', x: -40, z: 80, neonColor: 0x0000FF },
            { name: 'Fire Station', type: 'generic', style: 'industrial', color: 0xFF0000, label: '消防局', x: -20, z: 80, neonColor: 0xFF4500 },
            { name: 'Post Office', type: 'generic', style: 'office', color: 0x006400, label: '邮局', x: 0, z: 80 },
            { name: 'Bank', type: 'generic', style: 'classic', color: 0xAAAAAA, label: '银行', x: 40, z: -40 },
            { name: 'Mechanic', type: 'generic', style: 'industrial', color: 0x808080, label: '修车厂', x: 20, z: 80, neonColor: 0xFFA500 },
            { name: 'Gas Station', type: 'generic', style: 'gas', color: 0xFFA500, label: '加油站', x: 40, z: 80, neonColor: 0xFF0000 },
            { name: 'Barber Shop', type: 'generic', style: 'store', color: 0xFFFFFF, label: '理发店', striped: true, x: 60, z: 80, awningColor: 0xFF0000, neonColor: 0x0000FF },
            { name: 'Pet Store', type: 'generic', style: 'store', color: 0xA52A2A, label: '宠物店', x: 80, z: 80, neonColor: 0xD2691E },

            // Entertainment
            { name: 'Park', type: 'generic', style: 'park', label: '公园', x: 30, z: 30 },
            { name: 'Gym', type: 'generic', style: 'industrial', color: 0x555555, label: '健身房', x: 40, z: 0, neonColor: 0x00FFFF },
            { name: 'Cinema', type: 'generic', style: 'cinema', color: 0x222222, label: '电影院', x: 40, z: 40, neonColor: 0xFFd700 }, // Gold Neon
            { name: 'Arcade', type: 'generic', style: 'store', color: 0x00FFFF, label: '游戏厅', emissive: 0x0000FF, x: 60, z: 40, neonColor: 0xFF00FF },
            { name: 'Casino', type: 'generic', style: 'modern', color: 0xFFD700, label: '赌场', emissive: 0xFF0000, x: 80, z: 40, neonColor: 0xFF0000 },
            { name: 'Museum', type: 'generic', style: 'classic', color: 0xF5F5DC, label: '博物馆', x: 60, z: 0 },
            { name: 'Art Gallery', type: 'generic', style: 'modern', color: 0xFFFFFF, label: '画廊', x: 80, z: 0 },
            { name: 'Stadium', type: 'generic', style: 'industrial', color: 0xC0C0C0, label: '体育馆', scale: 2, x: 100, z: 0 },

            // Shopping & Other
            { name: 'Shop', type: 'generic', style: 'store', color: 0xF5DEB3, label: '商店', x: 0, z: 20 }, // General Store
            { name: 'Clothing Store', type: 'generic', style: 'store', color: 0xFFC0CB, label: '服装店', x: -60, z: 20 },
            { name: 'Tech Store', type: 'generic', style: 'modern', color: 0x4682B4, label: '电子店', x: -80, z: 20 },
            { name: 'Bookstore', type: 'generic', style: 'store', color: 0x8B4513, label: '书店', x: -80, z: 0 },
            { name: 'Toy Store', type: 'generic', style: 'store', color: 0xFFFF00, label: '玩具店', x: -80, z: -20 },
            { name: 'Jewelry Store', type: 'generic', style: 'store', color: 0x00FFFF, label: '珠宝店', shiny: true, x: -80, z: -40 },
            { name: 'Florist', type: 'generic', style: 'store', color: 0x00FF00, label: '花店', x: -60, z: -40 },

            // Education / Cultural
            { name: 'School', type: 'generic', style: 'classic', color: 0xB22222, label: '学校', x: -40, z: 40 },
            { name: 'University', type: 'generic', style: 'classic', color: 0x800000, label: '大学', scale: 1.5, x: -80, z: 40 },
            { name: 'Library', type: 'generic', style: 'classic', color: 0xF5F5DC, label: '图书馆', x: -40, z: 0 },
            { name: 'Church', type: 'generic', style: 'church', color: 0xFFFFFF, label: '教堂', x: -80, z: 60 },
            { name: 'Hotel', type: 'generic', style: 'modern', color: 0x4B0082, label: '酒店', scale: 1.2, x: 100, z: 60 },

            // Landmarks (Phase 14)
            { name: 'Pyramid', type: 'generic', style: 'pyramid', color: 0xD2B48C, label: '金字塔', x: -140, z: -140, scale: 3 },
            { name: 'Eiffel Tower', type: 'generic', style: 'tower', color: 0x8B4513, label: '埃菲尔铁塔', x: 140, z: 140, scale: 2 },
            { name: 'Ferris Wheel', type: 'generic', style: 'wheel', color: 0xFF0000, label: '摩天轮', x: 100, z: 100, scale: 2 },
            { name: 'Airport', type: 'generic', style: 'airport', color: 0xCCCCCC, label: '机场', x: -150, z: 150, scale: 4 },
            { name: 'Castle', type: 'generic', style: 'castle', color: 0x808080, label: '城堡', x: 150, z: -150, scale: 2 },
            { name: 'Skyscraper A', type: 'generic', style: 'modern', color: 0x223344, label: '摩天大楼 A', x: 120, z: -20, scale: 2.5 },
            { name: 'Skyscraper B', type: 'generic', style: 'modern', color: 0x334455, label: '摩天大楼 B', x: 140, z: -40, scale: 3 },
            { name: 'Skyscraper C', type: 'generic', style: 'modern', color: 0x445566, label: '摩天大楼 C', x: 160, z: -60, scale: 2.2 },
            { name: 'Factory', type: 'generic', style: 'industrial', color: 0x555555, label: '化工厂', x: -120, z: 100, scale: 1.5 },
            { name: 'Power Plant', type: 'generic', style: 'industrial', color: 0x444444, label: '发电厂', x: -160, z: 100, scale: 1.8 },
            { name: 'Warehouse', type: 'generic', style: 'store', color: 0x666666, label: '仓库', x: -100, z: 120 },
            { name: 'Concert Hall', type: 'generic', style: 'modern', color: 0x9932CC, label: '音乐厅', x: 80, z: 20, scale: 1.2 },
            { name: 'Convention Center', type: 'generic', style: 'modern', color: 0x4682B4, label: '会展中心', x: 100, z: 20, scale: 2 },
            { name: 'Observatory', type: 'generic', style: 'industrial', color: 0xFFFFFF, label: '天文台', x: -160, z: -40 },
            { name: 'Lighthouse', type: 'generic', style: 'tower', color: 0xFFFFFF, label: '灯塔', striped: true, x: 180, z: 180 },
            { name: 'Bridge', type: 'generic', style: 'bridge', color: 0xA52A2A, label: '金门大桥', x: 0, z: 150, scale: 3 },
            { name: 'Pagoda', type: 'generic', style: 'pagoda', color: 0x8B0000, label: '五重塔', x: -100, z: -100 },
            { name: 'Windmill', type: 'generic', style: 'windmill', color: 0xFFFFFF, label: '风车', x: -180, z: -80 },
            { name: 'Statue', type: 'generic', style: 'statue', color: 0xC0C0C0, label: '自由女神', x: 180, z: -100 },
            { name: 'Rocket', type: 'generic', style: 'rocket', color: 0xFFFFFF, label: '火箭基地', x: -180, z: 180 }
        ];

        zones.forEach(zone => {
            let buildingGroup;
            // Existing custom methods
            if (zone.type === 'house') buildingGroup = this.createHouse();
            else if (zone.type === 'office') buildingGroup = this.createOffice();
            else if (zone.type === 'desk') buildingGroup = this.createDesk();
            else if (zone.type === 'shower') buildingGroup = this.createShower();
            // New generic factory for the rest
            else buildingGroup = this.createGenericBuilding(zone);

            if (buildingGroup) {
                buildingGroup.position.set(zone.x, 0, zone.z);
                buildingGroup.userData = { type: zone.name }; // Metadata for interaction

                // Add Label
                if (zone.label) {
                    const labelSprite = this.createLabel(zone.label);
                    // Position label above building. Need to estimate height.
                    // Default height is ~6-10. Let's put it at 10-15.
                    // Generic buildings have height in config, custom ones vary.
                    let height = 12;
                    if (zone.scale) height += zone.scale * 4;
                    if (zone.type === 'desk') height = 5;
                    // Adjust for specific styles that might be taller
                    if (zone.style === 'modern') height += 5;
                    if (zone.style === 'church') height += 8;

                    labelSprite.position.set(0, height, 0);
                    buildingGroup.add(labelSprite);
                }

                // Add userData to children for raycasting
                buildingGroup.traverse((child) => {
                    if (child.isMesh) {
                        child.userData = { type: zone.name };
                    }
                });

                this.scene.add(buildingGroup);
                this.buildings.push(buildingGroup);
            }
        });

        this.createTrees(); // Increased range needed
        this.createEnvironment();
    }

    createLabel(text) {
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.width = 256;
        canvas.height = 128; // Rectangular for text

        // Text Outline for readability
        context.font = "Bold 50px Arial";
        context.textAlign = "center";
        context.textBaseline = "middle";

        // Stroke (Black Border)
        context.strokeStyle = 'black';
        context.lineWidth = 6;
        context.strokeText(text, canvas.width / 2, canvas.height / 2);

        // Fill (White Text)
        context.fillStyle = "white";
        context.fillText(text, canvas.width / 2, canvas.height / 2);

        const texture = new THREE.CanvasTexture(canvas);
        const material = new THREE.SpriteMaterial({ map: texture });
        const sprite = new THREE.Sprite(material);

        // Scale sprite (keep aspect ratio)
        sprite.scale.set(12, 6, 1);

        return sprite;
    }

    createGenericBuilding(config) {
        const group = new THREE.Group();
        const scale = config.scale || 1;

        // Material Setup
        const matParams = { color: config.color || 0xAAAAAA };
        if (config.emissive) matParams.emissive = config.emissive;
        if (config.shiny) { matParams.metalness = 0.8; matParams.roughness = 0.2; }
        const baseMat = config.shiny ? new THREE.MeshStandardMaterial(matParams) : new THREE.MeshLambertMaterial(matParams);

        const style = config.style || 'modern';

        if (style === 'store') {
            // STORE: Box with Glass Window + Awning
            const width = 10 * scale;
            const height = 6 * scale;
            const depth = 10 * scale;

            const base = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), baseMat);
            base.position.y = height / 2;
            base.castShadow = true;
            group.add(base);

            // Glass Window
            const glass = new THREE.Mesh(new THREE.PlaneGeometry(width - 2, height - 2), new THREE.MeshStandardMaterial({ color: 0x88CCFF, roughness: 0.1, metalness: 0.9 }));
            glass.position.set(0, height / 2, depth / 2 + 0.1);
            group.add(glass);

            // Awning
            const awningColor = config.awningColor || 0xFF0000;
            const awning = new THREE.Mesh(new THREE.BoxGeometry(width, 0.5, 3), new THREE.MeshStandardMaterial({ color: awningColor }));
            awning.position.set(0, height - 1.5, depth / 2 + 1.5);
            awning.rotation.x = 0.5;
            group.add(awning);

        } else if (style === 'modern') {
            // MODERN: Tall Glass Tower
            const width = 10 * scale;
            const height = 14 * scale;
            const depth = 10 * scale;

            const base = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), baseMat);
            base.position.y = height / 2;
            base.castShadow = true;
            group.add(base);

            // Vertical Glass Strips
            const glassMat = new THREE.MeshStandardMaterial({ color: 0xADD8E6, emissive: 0x111111 });
            for (let i = -1; i <= 1; i += 2) {
                const strip = new THREE.Mesh(new THREE.BoxGeometry(2, height, depth + 0.1), glassMat);
                strip.position.set(i * 3, height / 2, 0);
                group.add(strip);
            }
            if (config.mark === 'helipad') {
                // Helipad
                const hGeo = new THREE.CircleGeometry(4, 32);
                const hMat = new THREE.MeshBasicMaterial({ color: 0xFF0000 });
                const h = new THREE.Mesh(hGeo, hMat);
                h.rotation.x = -Math.PI / 2;
                h.position.set(0, height + 0.1, 0);
                group.add(h);
                const hText = new THREE.Mesh(new THREE.BoxGeometry(4, 0.2, 1), new THREE.MeshBasicMaterial({ color: 0xffffff }));
                hText.position.set(0, height + 0.2, 0);
                group.add(hText);
                const hText2 = new THREE.Mesh(new THREE.BoxGeometry(1, 0.2, 4), new THREE.MeshBasicMaterial({ color: 0xffffff }));
                hText2.position.set(0, height + 0.2, 0);
                group.add(hText2);
            }

        } else if (style === 'classic') {
            // CLASSIC: Pillars, Steps, Pediment
            const width = 12 * scale;
            const height = 8 * scale;
            const depth = 10 * scale;

            // Main Body
            const base = new THREE.Mesh(new THREE.BoxGeometry(width - 2, height, depth - 2), baseMat);
            base.position.set(0, height / 2, 0);
            base.castShadow = true;
            group.add(base);

            // Pillars
            const pillarGeo = new THREE.CylinderGeometry(0.5, 0.5, height);
            const pillarMat = new THREE.MeshStandardMaterial({ color: 0xFFFFFF });
            for (let x = -4; x <= 4; x += 2) {
                const pillar = new THREE.Mesh(pillarGeo, pillarMat);
                pillar.position.set(x * scale, height / 2, depth / 2);
                group.add(pillar);
            }

            // Steps
            const steps = new THREE.Mesh(new THREE.BoxGeometry(width, 1, depth + 2), new THREE.MeshStandardMaterial({ color: 0x888888 }));
            steps.position.set(0, 0.5, 0);
            group.add(steps);

            // Roof (Triangular Pediment)
            const roofGeo = new THREE.ConeGeometry(8 * scale, 4 * scale, 4);
            const roof = new THREE.Mesh(roofGeo, baseMat);
            roof.position.set(0, height + 2 * scale, 0);
            roof.rotation.y = Math.PI / 4;
            group.add(roof);

        } else if (style === 'industrial') {
            // INDUSTRIAL: Flat, Vents, Pipes
            const width = 12 * scale;
            const height = 8 * scale;
            const depth = 12 * scale;

            const base = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), baseMat);
            base.position.y = height / 2;
            base.castShadow = true;
            group.add(base);

            // Vents
            for (let i = 0; i < 3; i++) {
                const vent = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 1), new THREE.MeshStandardMaterial({ color: 0x333333 }));
                vent.position.set((i - 1) * 3, height + 0.5, 0);
                group.add(vent);
            }

        } else if (style === 'gas') {
            // GAS STATION: Canopy + Pumps
            const canopyGeo = new THREE.BoxGeometry(16, 1, 10);
            const canopy = new THREE.Mesh(canopyGeo, baseMat);
            canopy.position.y = 6;
            group.add(canopy);

            const poleMat = new THREE.MeshStandardMaterial({ color: 0x555555 });
            const p1 = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 6), poleMat);
            p1.position.set(-6, 3, 0);
            group.add(p1);
            const p2 = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 6), poleMat);
            p2.position.set(6, 3, 0);
            group.add(p2);

            // Pumps
            const pumpGeo = new THREE.BoxGeometry(2, 3, 1);
            const pumpMat = new THREE.MeshStandardMaterial({ color: 0xFF0000 });
            const pump1 = new THREE.Mesh(pumpGeo, pumpMat);
            pump1.position.set(-3, 1.5, 0);
            group.add(pump1);
            const pump2 = new THREE.Mesh(pumpGeo, pumpMat);
            pump2.position.set(3, 1.5, 0);
            group.add(pump2);

        } else if (style === 'park') {
            // PARK: Grass + Fountain
            const grass = new THREE.Mesh(new THREE.CylinderGeometry(15, 15, 0.5, 32), new THREE.MeshStandardMaterial({ color: 0x228b22 }));
            grass.position.y = 0.25;
            grass.receiveShadow = true;
            group.add(grass);

            // Fountain
            const fBase = new THREE.Mesh(new THREE.CylinderGeometry(4, 4, 1), new THREE.MeshStandardMaterial({ color: 0xDDDDDD }));
            fBase.position.y = 0.75;
            group.add(fBase);
            const water = new THREE.Mesh(new THREE.CylinderGeometry(3.5, 3.5, 0.8), new THREE.MeshStandardMaterial({ color: 0x00FFFF }));
            water.position.y = 1;
            group.add(water);
            const spout = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 2), new THREE.MeshStandardMaterial({ color: 0xDDDDDD }));
            spout.position.y = 1.5;
            group.add(spout);

        } else if (style === 'church') {
            // CHURCH
            const width = 10;
            const height = 8;
            const depth = 14;

            const base = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), baseMat);
            base.position.y = height / 2;
            group.add(base);

            // Steep Roof
            const roofGeo = new THREE.ConeGeometry(8, 8, 4);
            const roof = new THREE.Mesh(roofGeo, new THREE.MeshStandardMaterial({ color: 0x333333 }));
            roof.position.set(0, height + 4, 0);
            roof.rotation.y = Math.PI / 4;
            group.add(roof);

            // Cross
            const cV = new THREE.Mesh(new THREE.BoxGeometry(0.5, 4, 0.5), new THREE.MeshStandardMaterial({ color: 0xFFD700 }));
            cV.position.set(0, height + 9, 0);
            group.add(cV);
            const cH = new THREE.Mesh(new THREE.BoxGeometry(2, 0.5, 0.5), new THREE.MeshStandardMaterial({ color: 0xFFD700 }));
            cH.position.set(0, height + 9, 0);
            group.add(cH);

        } else if (style === 'cinema') {
            // CINEMA
            const width = 14; const height = 10; const depth = 14;
            const base = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), baseMat);
            base.position.y = height / 2;
            group.add(base);

            // Marquee
            const marquee = new THREE.Mesh(new THREE.BoxGeometry(12, 3, 1), new THREE.MeshStandardMaterial({ color: 0xFFFF00, emissive: 0xAA8800 }));
            marquee.position.set(0, 8, 7.5);
            group.add(marquee);

            config.label = "🔥 " + config.label + " 🔥";

        } else if (style === 'pyramid') {
            const geo = new THREE.ConeGeometry(10 * scale, 15 * scale, 4);
            const mesh = new THREE.Mesh(geo, baseMat);
            mesh.position.y = (15 * scale) / 2;
            group.add(mesh);

        } else if (style === 'tower') { // Eiffel / Lighthouse
            const h = 20 * scale;
            const geo = new THREE.CylinderGeometry(1 * scale, 6 * scale, h, 4);
            const mesh = new THREE.Mesh(geo, baseMat);
            mesh.position.y = h / 2;
            group.add(mesh);
            if (config.striped) {
                const stripe = new THREE.Mesh(new THREE.CylinderGeometry(1.05 * scale, 6.05 * scale, h / 5, 4), new THREE.MeshBasicMaterial({ color: 0xFF0000 }));
                stripe.position.y = h / 2;
                group.add(stripe);
            }

        } else if (style === 'wheel') { // Ferris Wheel
            const h = 15 * scale;
            // Stand
            const stand1 = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 2, h / 1.5), new THREE.MeshStandardMaterial({ color: 0x888888 }));
            stand1.position.set(-2, h / 3, 0); stand1.rotation.z = -0.2;
            group.add(stand1);
            const stand2 = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 2, h / 1.5), new THREE.MeshStandardMaterial({ color: 0x888888 }));
            stand2.position.set(2, h / 3, 0); stand2.rotation.z = 0.2;
            group.add(stand2);

            // Wheel
            const wheelGeo = new THREE.TorusGeometry(h / 2.5, 0.5, 8, 16);
            const wheel = new THREE.Mesh(wheelGeo, new THREE.MeshStandardMaterial({ color: config.color }));
            wheel.position.y = h / 1.5;
            wheel.rotation.y = Math.PI / 2;
            group.add(wheel);

        } else if (style === 'airport') {
            const tower = new THREE.Mesh(new THREE.CylinderGeometry(2, 2, 10), baseMat);
            tower.position.set(-10, 5, 0);
            group.add(tower);
            const top = new THREE.Mesh(new THREE.CylinderGeometry(4, 3, 3), new THREE.MeshStandardMaterial({ color: 0x333333 }));
            top.position.set(-10, 11, 0);
            group.add(top);

            // Terminal
            const term = new THREE.Mesh(new THREE.BoxGeometry(20, 4, 10), baseMat);
            term.position.set(5, 2, 0);
            group.add(term);

        } else if (style === 'castle') {
            // Walls
            const w1 = new THREE.Mesh(new THREE.BoxGeometry(16, 6, 2), baseMat); w1.position.z = -8; w1.position.y = 3; group.add(w1);
            const w2 = new THREE.Mesh(new THREE.BoxGeometry(16, 6, 2), baseMat); w2.position.z = 8; w2.position.y = 3; group.add(w2);
            const w3 = new THREE.Mesh(new THREE.BoxGeometry(2, 6, 16), baseMat); w3.position.x = -8; w3.position.y = 3; group.add(w3);
            const w4 = new THREE.Mesh(new THREE.BoxGeometry(2, 6, 16), baseMat); w4.position.x = 8; w4.position.y = 3; group.add(w4);
            // Towers
            const tGeo = new THREE.CylinderGeometry(1.5, 1.5, 10);
            [[-8, -8], [8, -8], [-8, 8], [8, 8]].forEach(p => {
                const t = new THREE.Mesh(tGeo, baseMat);
                t.position.set(p[0], 5, p[1]);
                group.add(t);
            });

        } else if (style === 'bridge') {
            // Simple suspension bridge segment
            const deck = new THREE.Mesh(new THREE.BoxGeometry(20 * scale, 1, 6), new THREE.MeshStandardMaterial({ color: 0x333333 }));
            deck.position.y = 0.5;
            group.add(deck);
            const tower = new THREE.Mesh(new THREE.BoxGeometry(2, 10 * scale, 2), baseMat);
            tower.position.y = 5 * scale;
            group.add(tower);

        } else if (style === 'pagoda') {
            const h = 2;
            for (let i = 0; i < 5; i++) {
                const roof = new THREE.Mesh(new THREE.ConeGeometry(5 - i * 0.8, 2, 4), baseMat);
                roof.position.y = h + i * 2.5;
                roof.rotation.y = Math.PI / 4;
                group.add(roof);
            }
        } else if (style === 'windmill') {
            const body = new THREE.Mesh(new THREE.CylinderGeometry(1, 2, 8), baseMat);
            body.position.y = 4;
            group.add(body);
            const bladeGeo = new THREE.BoxGeometry(8, 0.5, 0.1);
            const blades = new THREE.Group();
            blades.add(new THREE.Mesh(bladeGeo, new THREE.MeshStandardMaterial({ color: 0xFFFFFF })));
            const b2 = new THREE.Mesh(bladeGeo, new THREE.MeshStandardMaterial({ color: 0xFFFFFF }));
            b2.rotation.z = Math.PI / 2;
            blades.add(b2);
            blades.position.set(0, 7, 1);
            // Animation hack: save ref?
            group.add(blades);

        } else if (style === 'statue') {
            const ped = new THREE.Mesh(new THREE.BoxGeometry(2, 4, 2), new THREE.MeshStandardMaterial({ color: 0x888888 }));
            ped.position.y = 2;
            group.add(ped);
            const fig = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 4), baseMat);
            fig.position.y = 6;
            group.add(fig);
            const arm = new THREE.Mesh(new THREE.BoxGeometry(0.2, 2, 0.2), baseMat);
            arm.position.set(0.5, 7, 0); arm.rotation.z = -0.5;
            group.add(arm);

        } else if (style === 'rocket') {
            const body = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 10), baseMat);
            body.position.y = 5;
            group.add(body);
            const nose = new THREE.Mesh(new THREE.ConeGeometry(1, 2, 32), new THREE.MeshStandardMaterial({ color: 0xFF0000 }));
            nose.position.y = 11;
            group.add(nose);

        } else {
            // Fallback (Office style but simpler)
            const width = 10 * scale;
            const height = 8 * scale;
            const depth = 10 * scale;
            const base = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), baseMat);
            base.position.y = height / 2;
            group.add(base);
        }

        // Details like Cross/Mark from config (if not handled by style)
        if (config.mark === '+') {
            const m1 = new THREE.Mesh(new THREE.BoxGeometry(1, 3, 0.5), new THREE.MeshBasicMaterial({ color: 0xff0000 }));
            m1.position.set(0, 8, 5.1); // Assumes generic height
            if (style === 'store') m1.position.set(0, 8, 5.1); // Adjust for store
            group.add(m1);
            const m2 = new THREE.Mesh(new THREE.BoxGeometry(3, 1, 0.5), new THREE.MeshBasicMaterial({ color: 0xff0000 }));
            m2.position.set(0, 8, 5.1);
            group.add(m2);
        }

        // 3. Neon Lights (New Feature)
        if (config.neonColor) {
            const neonMat = new THREE.MeshStandardMaterial({
                color: config.neonColor,
                emissive: config.neonColor,
                emissiveIntensity: 1, // Controlled by updateMaterials
                toneMapped: false
            });
            this.neonMaterials.push(neonMat);

            let nW = 10 * scale, nH = 8 * scale, nD = 10 * scale;

            // Recalculate dimensions based on style (Approx. logic matching above)
            if (style === 'modern' || style === 'club' || style === 'casino') {
                nW = 10 * scale; nH = 14 * scale; nD = 10 * scale;
                // Vertical Neons on corners
                for (let x = -1; x <= 1; x += 2) {
                    for (let z = -1; z <= 1; z += 2) {
                        const strip = new THREE.Mesh(new THREE.BoxGeometry(0.2, nH, 0.2), neonMat);
                        strip.position.set(x * (nW / 2 + 0.1), nH / 2, z * (nD / 2 + 0.1));
                        group.add(strip);
                    }
                }
                // Top Ring
                const ring = new THREE.Mesh(new THREE.BoxGeometry(nW + 0.5, 0.2, nD + 0.5), neonMat);
                ring.position.y = nH - 0.5;
                group.add(ring);

                if (style === 'casino') {
                    // Extra bling for casino
                    const ring2 = new THREE.Mesh(new THREE.BoxGeometry(nW + 1.5, 0.2, nD + 1.5), neonMat);
                    ring2.position.y = nH - 2.5;
                    group.add(ring2);
                }

            } else if (style === 'store' || style === 'arcade' || style === 'cinema' || style === 'bar') {
                nW = 10 * scale; nH = 6 * scale; nD = 10 * scale;
                if (style === 'cinema') { nW = 14; nH = 10; nD = 14; } // Cinema override

                // Roof outline
                const outline = new THREE.Mesh(new THREE.BoxGeometry(nW + 0.2, 0.2, nD + 0.2), neonMat);
                outline.position.y = nH;
                group.add(outline);

                // Frame window
                if (style !== 'cinema') {
                    const frameTop = new THREE.Mesh(new THREE.BoxGeometry(nW, 0.2, 0.2), neonMat);
                    frameTop.position.set(0, nH - 2, nD / 2 + 0.1);
                    group.add(frameTop);
                }
            } else {
                // Fallback: Simple top outline
                const outline = new THREE.Mesh(new THREE.BoxGeometry(nW + 0.2, 0.2, nD + 0.2), neonMat);
                outline.position.y = nH;
                group.add(outline);
            }
        }

        return group;
    }

    // ... createHouse, createOffice, etc (Keep existing methods)

    // Update createTrees to cover more area
    createTrees() {
        // More Logic: Trees in blocks, not on roads
        for (let i = 0; i < 400; i++) {
            const x = (Math.random() - 0.5) * 380;
            const z = (Math.random() - 0.5) * 380;

            // Avoid roads (Roads are at multiples of 60, width 10 -> +/- 5)
            // Original roads at 0, +/-60, +/-120, +/-180.
            let onRoad = false;
            if (Math.abs(x % 60) < 8 || Math.abs(z % 60) < 8) onRoad = true;
            if (Math.abs(x) < 30 && Math.abs(z) < 30) onRoad = true; // Clear spawn

            if (!onRoad) {
                const type = Math.random();
                if (type < 0.4) this.createOak(x, z);
                else if (type < 0.8) this.createPine(x, z);
                else this.createBush(x, z);
            }
        }
    }

    createOak(x, z) {
        const scale = 0.8 + Math.random() * 0.4;
        const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.5 * scale, 0.7 * scale, 3 * scale), new THREE.MeshStandardMaterial({ color: 0x8B4513 }));
        trunk.position.set(x, 1.5 * scale, z);
        trunk.castShadow = true;
        this.scene.add(trunk);

        const leaves = new THREE.Mesh(new THREE.DodecahedronGeometry(2 * scale), new THREE.MeshStandardMaterial({ color: 0x228B22 }));
        leaves.position.set(x, 4 * scale, z);
        leaves.castShadow = true;
        this.scene.add(leaves);
    }

    createPine(x, z) {
        const scale = 0.8 + Math.random() * 0.4;
        const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.3 * scale, 0.5 * scale, 2 * scale), new THREE.MeshStandardMaterial({ color: 0x8B4513 }));
        trunk.position.set(x, 1 * scale, z);
        this.scene.add(trunk);

        const leaves = new THREE.Mesh(new THREE.ConeGeometry(2 * scale, 5 * scale, 8), new THREE.MeshStandardMaterial({ color: 0x006400 }));
        leaves.position.set(x, 3.5 * scale, z);
        leaves.castShadow = true;
        this.scene.add(leaves);
    }

    createBush(x, z) {
        const scale = 0.5 + Math.random() * 0.5;
        const bush = new THREE.Mesh(new THREE.SphereGeometry(1 * scale, 8, 8), new THREE.MeshStandardMaterial({ color: 0x32CD32 }));
        bush.position.set(x, 0.5 * scale, z);
        this.scene.add(bush);
    }

    createRoads() {
        const roadWidth = 10;
        const roadGeo = new THREE.PlaneGeometry(roadWidth, 400);
        const roadMat = new THREE.MeshStandardMaterial({ color: 0x333333, roughness: 0.8 });

        // Grid Roads
        for (let x = -180; x <= 180; x += 60) {
            const road = new THREE.Mesh(roadGeo, roadMat);
            road.rotation.x = -Math.PI / 2;
            road.position.set(x, 0.02, 0); // Slightly above ground
            road.receiveShadow = true;
            this.scene.add(road);

            // Road Markings (Dashed Line)
            const lineGeo = new THREE.PlaneGeometry(0.5, 400);
            const lineMat = new THREE.MeshBasicMaterial({ color: 0xFFFFFF });
            const line = new THREE.Mesh(lineGeo, lineMat);
            line.rotation.x = -Math.PI / 2;
            line.position.set(x, 0.03, 0);
            this.scene.add(line);
        }

        const roadGeoZ = new THREE.PlaneGeometry(400, roadWidth);
        for (let z = -180; z <= 180; z += 60) {
            const road = new THREE.Mesh(roadGeoZ, roadMat);
            road.rotation.x = -Math.PI / 2;
            road.position.set(0, 0.02, z);
            road.receiveShadow = true;
            this.scene.add(road);

            // Road Markings
            const lineGeo = new THREE.PlaneGeometry(400, 0.5);
            const lineMat = new THREE.MeshBasicMaterial({ color: 0xFFFFFF });
            const line = new THREE.Mesh(lineGeo, lineMat);
            line.rotation.x = -Math.PI / 2;
            line.position.set(0, 0.03, z);
            this.scene.add(line);
        }

        // Sidewalks at intersections/along roads could be added here
        // For now, simpler implementation is assumed sufficient or handled by broad ground logic
    }

    createShower() {
        const group = new THREE.Group();
        // Invisible trigger volume for interaction
        const mesh = new THREE.Mesh(
            new THREE.BoxGeometry(2, 2, 2),
            new THREE.MeshBasicMaterial({ visible: false })
        );
        mesh.position.y = 1;
        group.add(mesh);
        return group;
    }

    createHouse() {
        const group = new THREE.Group();
        const wallMat = new THREE.MeshStandardMaterial({ color: 0x8B4513 }); // Brown

        // Floor
        const floor = new THREE.Mesh(new THREE.BoxGeometry(10, 0.2, 10), new THREE.MeshStandardMaterial({ color: 0xdeb887 })); // Wood
        floor.position.y = 0.1;
        floor.receiveShadow = true;
        group.add(floor);

        // Walls
        const backWall = new THREE.Mesh(new THREE.BoxGeometry(10, 8, 0.5), wallMat);
        backWall.position.set(0, 4, -4.75);
        backWall.castShadow = true;
        backWall.receiveShadow = true;
        group.add(backWall);

        const leftWall = new THREE.Mesh(new THREE.BoxGeometry(0.5, 8, 10), wallMat);
        leftWall.position.set(-4.75, 4, 0);
        leftWall.castShadow = true;
        leftWall.receiveShadow = true;
        group.add(leftWall);

        const rightWall = new THREE.Mesh(new THREE.BoxGeometry(0.5, 8, 10), wallMat);
        rightWall.position.set(4.75, 4, 0);
        rightWall.castShadow = true;
        rightWall.receiveShadow = true;
        group.add(rightWall);

        // Front Walls (Door Gap)
        const frontLeft = new THREE.Mesh(new THREE.BoxGeometry(3.5, 8, 0.5), wallMat);
        frontLeft.position.set(-3.25, 4, 4.75);
        frontLeft.castShadow = true;
        group.add(frontLeft);

        const frontRight = new THREE.Mesh(new THREE.BoxGeometry(3.5, 8, 0.5), wallMat);
        frontRight.position.set(3.25, 4, 4.75);
        frontRight.castShadow = true;
        group.add(frontRight);

        const doorHeader = new THREE.Mesh(new THREE.BoxGeometry(3, 2, 0.5), wallMat);
        doorHeader.position.set(0, 7, 4.75);
        doorHeader.castShadow = true;
        group.add(doorHeader);

        // Roof
        const roofGeo = new THREE.ConeGeometry(9, 4, 4);
        const roofMat = new THREE.MeshStandardMaterial({ color: 0xA52A2A }); // Dark Red
        const roof = new THREE.Mesh(roofGeo, roofMat);
        roof.position.y = 10;
        roof.rotation.y = Math.PI / 4;
        roof.castShadow = true;
        group.add(roof);

        // Interior: Bed
        const bedFrame = new THREE.Mesh(new THREE.BoxGeometry(3, 1, 5), new THREE.MeshStandardMaterial({ color: 0x555555 }));
        bedFrame.position.set(0, 0.6, -2);
        group.add(bedFrame);

        const mattress = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.5, 4.8), new THREE.MeshStandardMaterial({ color: 0xFFFFFF }));
        mattress.position.set(0, 1.1, -2);
        group.add(mattress);

        const pillow = new THREE.Mesh(new THREE.BoxGeometry(2, 0.3, 1), new THREE.MeshStandardMaterial({ color: 0xEEEEEE }));
        pillow.position.set(0, 1.4, -4);
        group.add(pillow);

        // Shower Stall (Visual)
        const shower = new THREE.Group();
        shower.position.set(3.5, 0, -3.5); // Corner

        const sBase = new THREE.Mesh(new THREE.BoxGeometry(2, 0.1, 2), new THREE.MeshStandardMaterial({ color: 0xFFFFFF }));
        sBase.position.y = 0.05;
        shower.add(sBase);

        const sGlass = new THREE.Mesh(new THREE.BoxGeometry(0.1, 2.5, 2), new THREE.MeshStandardMaterial({
            color: 0x88CCFF, transparent: true, opacity: 0.3
        }));
        sGlass.position.set(-1, 1.25, 0);
        shower.add(sGlass);

        const sGlassFront = new THREE.Mesh(new THREE.BoxGeometry(2, 2.5, 0.1), new THREE.MeshStandardMaterial({
            color: 0x88CCFF, transparent: true, opacity: 0.3
        }));
        sGlassFront.position.set(0, 1.25, 1);
        shower.add(sGlassFront);

        const sHead = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.2, 8), new THREE.MeshStandardMaterial({ color: 0x888888 }));
        sHead.position.set(0, 2.2, 0);
        sHead.rotation.x = Math.PI;
        shower.add(sHead);

        // Add water drip for effect?
        // Maybe later.

        group.add(shower);

        return group;
    }

    createOffice() {
        const group = new THREE.Group();
        const wallMat = new THREE.MeshPhysicalMaterial({
            color: 0x888888,
            roughness: 0.2,
            metalness: 0.5
        });

        // Floor (Lobby)
        const floor = new THREE.Mesh(new THREE.BoxGeometry(12, 0.2, 12), new THREE.MeshStandardMaterial({ color: 0x333333 }));
        floor.position.y = 0.1;
        group.add(floor);

        // Lobby Walls (Bottom 6 units)
        // Back
        const backWall = new THREE.Mesh(new THREE.BoxGeometry(12, 6, 0.5), wallMat);
        backWall.position.set(0, 3, -5.75);
        backWall.castShadow = true;
        group.add(backWall);

        // Left
        const leftWall = new THREE.Mesh(new THREE.BoxGeometry(0.5, 6, 12), wallMat);
        leftWall.position.set(-5.75, 3, 0);
        leftWall.castShadow = true;
        group.add(leftWall);

        // Right
        const rightWall = new THREE.Mesh(new THREE.BoxGeometry(0.5, 6, 12), wallMat);
        rightWall.position.set(5.75, 3, 0);
        rightWall.castShadow = true;
        group.add(rightWall);

        // Front (Glass Doorway)
        const frontLeft = new THREE.Mesh(new THREE.BoxGeometry(4, 6, 0.5), wallMat);
        frontLeft.position.set(-4, 3, 5.75);
        group.add(frontLeft);

        const frontRight = new THREE.Mesh(new THREE.BoxGeometry(4, 6, 0.5), wallMat);
        frontRight.position.set(4, 3, 5.75);
        group.add(frontRight);

        const doorHeader = new THREE.Mesh(new THREE.BoxGeometry(4, 2, 0.5), wallMat);
        doorHeader.position.set(0, 5, 5.75);
        group.add(doorHeader);

        // Upper Tower (Solid for now, starts above lobby)
        const towerGeo = new THREE.BoxGeometry(12, 14, 12);
        const towerMat = new THREE.MeshStandardMaterial({ color: 0xAAAAAA }); // Lighter Grey
        const tower = new THREE.Mesh(towerGeo, towerMat);
        tower.position.y = 13; // 6 + 7
        tower.castShadow = true;
        group.add(tower);

        // Windows for Tower
        const windowGeo = new THREE.PlaneGeometry(1, 1);
        const windowMat = new THREE.MeshBasicMaterial({ color: 0x87CEEB });

        // Add some windows to tower
        for (let i = 0; i < 4; i++) { // Sides
            for (let y = 8; y < 19; y += 3) { // Floors (relative to ground)
                for (let x = -4; x <= 4; x += 3) {
                    // Need to adjust logic to place on tower surface
                    // Since tower is separate mesh, we can add windows to `tower` object or calculate global pos.
                    // Easier to add to `group` with offset.

                    // Front Face of Tower
                    const win = new THREE.Mesh(windowGeo, windowMat);
                    win.position.set(x, y, 6.01);
                    group.add(win);

                    const winBack = win.clone();
                    winBack.position.set(x, y, -6.01);
                    winBack.rotation.y = Math.PI;
                    group.add(winBack);

                    const winLeft = win.clone();
                    winLeft.position.set(-6.01, y, x);
                    winLeft.rotation.y = -Math.PI / 2;
                    group.add(winLeft);

                    const winRight = win.clone();
                    winRight.position.set(6.01, y, x);
                    winRight.rotation.y = Math.PI / 2;
                    group.add(winRight);
                }
            }
        }

        // Interior Light
        const lobbyLight = new THREE.PointLight(0xffffff, 0.8, 10);
        lobbyLight.position.set(0, 5, 0);
        group.add(lobbyLight);

        return group;
    }

    createShop() {
        const group = new THREE.Group();

        // Main Building
        const mainGeo = new THREE.BoxGeometry(12, 6, 8);
        const mainMat = new THREE.MeshStandardMaterial({ color: 0xF5DEB3 }); // Wheat
        const main = new THREE.Mesh(mainGeo, mainMat);
        main.position.y = 3;
        main.castShadow = true;
        main.receiveShadow = true;
        group.add(main);

        // Awning (Green stripes)
        const awningGeo = new THREE.BoxGeometry(12, 0.5, 3);
        const awningMat = new THREE.MeshStandardMaterial({ color: 0x006400 }); // Dark Green
        const awning = new THREE.Mesh(awningGeo, awningMat);
        awning.position.set(0, 5, 4.5);
        awning.rotation.x = 0.5;
        group.add(awning);

        // Sign
        const signGeo = new THREE.BoxGeometry(4, 1, 0.2);
        const signMat = new THREE.MeshStandardMaterial({ color: 0xFFD700 }); // Gold
        const sign = new THREE.Mesh(signGeo, signMat);
        sign.position.set(0, 7, 0); // On top
        group.add(sign);

        return group;
    }

    createDesk() {
        const group = new THREE.Group();

        // Table
        const tableGeo = new THREE.BoxGeometry(4, 2, 2);
        const tableMat = new THREE.MeshStandardMaterial({ color: 0x8B4513 });
        const table = new THREE.Mesh(tableGeo, tableMat);
        table.position.y = 1;
        table.castShadow = true;
        group.add(table);

        // Monitor
        const monitorGeo = new THREE.BoxGeometry(1.5, 1, 0.1);
        const monitorMat = new THREE.MeshStandardMaterial({ color: 0x000000 });
        const monitor = new THREE.Mesh(monitorGeo, monitorMat);
        monitor.position.set(0, 2.5, -0.5);
        group.add(monitor);

        // Screen
        const screenGeo = new THREE.PlaneGeometry(1.4, 0.9);
        const screenMat = new THREE.MeshBasicMaterial({ color: 0x0000ff }); // Blue screen code
        const screen = new THREE.Mesh(screenGeo, screenMat);
        screen.position.set(0, 2.5, -0.44);
        group.add(screen);

        // Chair
        const chairGroup = new THREE.Group();
        const chairSeat = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.2, 1.5), new THREE.MeshStandardMaterial({ color: 0x333333 }));
        chairSeat.position.y = 1;
        chairGroup.add(chairSeat);

        const chairBack = new THREE.Mesh(new THREE.BoxGeometry(1.5, 2, 0.2), new THREE.MeshStandardMaterial({ color: 0x333333 }));
        chairBack.position.set(0, 2, 0.65);
        chairGroup.add(chairBack);

        const chairLeg = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 1), new THREE.MeshStandardMaterial({ color: 0x111111 }));
        chairLeg.position.y = 0.5;
        chairGroup.add(chairLeg);

        const chairBase = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 0.1), new THREE.MeshStandardMaterial({ color: 0x111111 }));
        chairBase.position.y = 0;
        chairGroup.add(chairBase);

        chairGroup.position.set(0, 0, 1.5);
        chairGroup.rotation.y = Math.PI; // Face desk
        group.add(chairGroup);

        return group;
    }

    createRestaurant() {
        const group = new THREE.Group();

        // Floor
        const floorGeo = new THREE.BoxGeometry(10, 0.5, 10);
        const floorMat = new THREE.MeshStandardMaterial({ color: 0x555555 });
        const floor = new THREE.Mesh(floorGeo, floorMat);
        floor.position.y = 0.25;
        group.add(floor);

        // Glass Walls
        const glassGeo = new THREE.BoxGeometry(9.5, 5, 9.5);
        const glassMat = new THREE.MeshPhysicalMaterial({
            color: 0x88ccff,
            transmission: 0.9,
            opacity: 0.5,
            transparent: true,
            roughness: 0,
            metalness: 0
        });
        const glass = new THREE.Mesh(glassGeo, glassMat);
        glass.position.y = 2.5;
        group.add(glass);

        // Roof
        const roofGeo = new THREE.CylinderGeometry(6, 6, 1, 32);
        const roofMat = new THREE.MeshStandardMaterial({ color: 0xFF4500 });
        const roof = new THREE.Mesh(roofGeo, roofMat);
        roof.position.y = 5.5;
        group.add(roof);

        return group;
    }

    createPark() {
        const group = new THREE.Group();

        // Grass Base
        const grassGeo = new THREE.CylinderGeometry(15, 15, 0.5, 32);
        const grassMat = new THREE.MeshStandardMaterial({ color: 0x228b22 });
        const grass = new THREE.Mesh(grassGeo, grassMat);
        grass.position.y = 0.25;
        grass.receiveShadow = true;
        group.add(grass);

        // Bench
        const benchGeo = new THREE.BoxGeometry(4, 1, 1.5);
        const benchMat = new THREE.MeshStandardMaterial({ color: 0x8B4513 });
        const bench = new THREE.Mesh(benchGeo, benchMat);
        bench.position.set(0, 0.75, 0);
        bench.castShadow = true;
        group.add(bench);

        // Park Trees (Simple ones local to park group)
        for (let i = 0; i < 5; i++) {
            const treeGeo = new THREE.ConeGeometry(1, 3, 8);
            const treeMat = new THREE.MeshStandardMaterial({ color: 0x006400 });
            const tree = new THREE.Mesh(treeGeo, treeMat);

            const angle = (i / 5) * Math.PI * 2;
            const radius = 10;
            tree.position.set(Math.cos(angle) * radius, 1.5, Math.sin(angle) * radius);
            tree.castShadow = true;
            group.add(tree);
        }

        return group;
    }

    createHospital() {
        const group = new THREE.Group();
        // White Building with Red Cross
        const baseGeo = new THREE.BoxGeometry(14, 10, 10);
        const baseMat = new THREE.MeshStandardMaterial({ color: 0xFFFFFF });
        const base = new THREE.Mesh(baseGeo, baseMat);
        base.position.y = 5;
        base.castShadow = true;
        group.add(base);

        // Red Cross
        const crossV = new THREE.Mesh(new THREE.BoxGeometry(2, 6, 0.5), new THREE.MeshBasicMaterial({ color: 0xFF0000 }));
        crossV.position.set(0, 7, 5.1);
        group.add(crossV);
        const crossH = new THREE.Mesh(new THREE.BoxGeometry(6, 2, 0.5), new THREE.MeshBasicMaterial({ color: 0xFF0000 }));
        crossH.position.set(0, 7, 5.1);
        group.add(crossH);

        return group;
    }

    createGym() {
        const group = new THREE.Group();
        // Industrial Look
        const baseGeo = new THREE.BoxGeometry(16, 8, 12);
        const baseMat = new THREE.MeshStandardMaterial({ color: 0x555555, roughness: 0.8 });
        const base = new THREE.Mesh(baseGeo, baseMat);
        base.position.y = 4;
        base.castShadow = true;
        group.add(base);

        // Large Windows
        const winGeo = new THREE.PlaneGeometry(12, 4);
        const winMat = new THREE.MeshStandardMaterial({ color: 0x88ccff, roughness: 0.1 });
        const win = new THREE.Mesh(winGeo, winMat);
        win.position.set(0, 4, 6.1);
        group.add(win);

        return group;
    }

    createLibrary() {
        const group = new THREE.Group();
        // Classical Columns
        const baseGeo = new THREE.BoxGeometry(14, 8, 10);
        const baseMat = new THREE.MeshStandardMaterial({ color: 0xF5F5DC }); // Beige
        const base = new THREE.Mesh(baseGeo, baseMat);
        base.position.y = 4;
        group.add(base);

        // Columns
        const colGeo = new THREE.CylinderGeometry(0.5, 0.5, 8);
        const colMat = new THREE.MeshStandardMaterial({ color: 0xFFFFFF });
        for (let i = -5; i <= 5; i += 2.5) {
            const col = new THREE.Mesh(colGeo, colMat);
            col.position.set(i, 4, 5.5);
            group.add(col);
        }

        return group;
    }

    createTrees() {
        // Optimization: Use InstancedMesh
        const count = 400;

        // 1. Oak Trees
        const oakTrunkGeo = new THREE.CylinderGeometry(0.5, 0.7, 3);
        const oakTrunkMat = new THREE.MeshStandardMaterial({ color: 0x8B4513 });
        const oakLeavesGeo = new THREE.DodecahedronGeometry(2);
        const oakLeavesMat = new THREE.MeshStandardMaterial({ color: 0x228B22 });

        const oakTrunkMesh = new THREE.InstancedMesh(oakTrunkGeo, oakTrunkMat, count);
        const oakLeavesMesh = new THREE.InstancedMesh(oakLeavesGeo, oakLeavesMat, count);
        oakTrunkMesh.castShadow = true; oakTrunkMesh.receiveShadow = true;
        oakLeavesMesh.castShadow = true; oakLeavesMesh.receiveShadow = true;

        // 2. Pine Trees
        const pineTrunkGeo = new THREE.CylinderGeometry(0.3, 0.5, 2);
        const pineLeavesGeo = new THREE.ConeGeometry(2, 5, 8);
        const pineLeavesMat = new THREE.MeshStandardMaterial({ color: 0x006400 });

        const pineTrunkMesh = new THREE.InstancedMesh(pineTrunkGeo, oakTrunkMat, count);
        const pineLeavesMesh = new THREE.InstancedMesh(pineLeavesGeo, pineLeavesMat, count);
        pineTrunkMesh.castShadow = true;
        pineLeavesMesh.castShadow = true;

        // 3. Bushes
        const bushGeo = new THREE.SphereGeometry(1, 8, 8);
        const bushMat = new THREE.MeshStandardMaterial({ color: 0x32CD32 });
        const bushMesh = new THREE.InstancedMesh(bushGeo, bushMat, count);

        const dummy = new THREE.Object3D();
        let oakIdx = 0, pineIdx = 0, bushIdx = 0;

        for (let i = 0; i < count; i++) {
            const x = (Math.random() - 0.5) * 380;
            const z = (Math.random() - 0.5) * 380;

            // Avoid roads/buildings
            if ((Math.abs(x % 60) < 8 || Math.abs(z % 60) < 8) || (Math.abs(x) < 30 && Math.abs(z) < 30)) {
                // Place far away if invalid
                dummy.position.set(0, -100, 0);
                dummy.updateMatrix();
                // Waste an index but keep simple
                oakTrunkMesh.setMatrixAt(oakIdx++, dummy.matrix);
                oakLeavesMesh.setMatrixAt(oakIdx - 1, dummy.matrix);
                pineTrunkMesh.setMatrixAt(pineIdx++, dummy.matrix);
                pineLeavesMesh.setMatrixAt(pineIdx - 1, dummy.matrix);
                bushMesh.setMatrixAt(bushIdx++, dummy.matrix);
                continue;
            }

            const type = Math.random();
            const scale = 0.8 + Math.random() * 0.5;

            if (type < 0.4) {
                // Oak
                dummy.scale.set(scale, scale, scale);
                dummy.position.set(x, 1.5 * scale, z);
                dummy.updateMatrix();
                oakTrunkMesh.setMatrixAt(oakIdx, dummy.matrix);

                dummy.position.set(x, 4 * scale, z);
                dummy.updateMatrix();
                oakLeavesMesh.setMatrixAt(oakIdx++, dummy.matrix);
            } else if (type < 0.8) {
                // Pine
                dummy.scale.set(scale, scale, scale);
                dummy.position.set(x, 1 * scale, z);
                dummy.updateMatrix();
                pineTrunkMesh.setMatrixAt(pineIdx, dummy.matrix);

                dummy.position.set(x, 3.5 * scale, z);
                dummy.updateMatrix();
                pineLeavesMesh.setMatrixAt(pineIdx++, dummy.matrix);
            } else {
                // Bush
                dummy.scale.set(scale, scale, scale);
                dummy.position.set(x, 0.5 * scale, z);
                dummy.updateMatrix();
                bushMesh.setMatrixAt(bushIdx++, dummy.matrix);
            }
        }

        this.scene.add(oakTrunkMesh);
        this.scene.add(oakLeavesMesh);
        this.scene.add(pineTrunkMesh);
        this.scene.add(pineLeavesMesh);
        this.scene.add(bushMesh);
    }

    // Kept empty methods to avoid errors if called elsewhere, but logic moved to createTrees
    createOak(x, z) { }
    createPine(x, z) { }
    createBush(x, z) { }

    createCafe() {
        const group = new THREE.Group();
        // Cozy brown building
        const baseGeo = new THREE.BoxGeometry(8, 6, 8);
        const baseMat = new THREE.MeshStandardMaterial({ color: 0x6F4E37 }); // Coffee color
        const base = new THREE.Mesh(baseGeo, baseMat);
        base.position.y = 3;
        group.add(base);

        // Outdoor Umbrella
        const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 4), new THREE.MeshStandardMaterial({ color: 0x333333 }));
        pole.position.set(3, 2, 6);
        group.add(pole);
        const umbrella = new THREE.Mesh(new THREE.ConeGeometry(2.5, 1, 8), new THREE.MeshStandardMaterial({ color: 0xFFFFFF }));
        umbrella.position.set(3, 4, 6);
        group.add(umbrella);

        return group;
    }

    createCinema() {
        const group = new THREE.Group();
        // Boxy dark building
        const baseGeo = new THREE.BoxGeometry(14, 10, 14);
        const baseMat = new THREE.MeshStandardMaterial({ color: 0x222222 });
        const base = new THREE.Mesh(baseGeo, baseMat);
        base.position.y = 5;
        group.add(base);

        // Marquee
        const marqueeGeo = new THREE.BoxGeometry(12, 2, 1);
        const marqueeMat = new THREE.MeshStandardMaterial({ color: 0xFFFF00, emissive: 0x555500 });
        const marquee = new THREE.Mesh(marqueeGeo, marqueeMat);
        marquee.position.set(0, 8, 7.5);
        group.add(marquee);

        return group;
    }

    createSchool() {
        const group = new THREE.Group();
        // Brick texture (simulated with color)
        const baseGeo = new THREE.BoxGeometry(16, 8, 10);
        const baseMat = new THREE.MeshStandardMaterial({ color: 0xB22222 }); // Firebrick
        const base = new THREE.Mesh(baseGeo, baseMat);
        base.position.y = 4;
        group.add(base);

        // Clock Tower
        const towerGeo = new THREE.BoxGeometry(4, 12, 4);
        const tower = new THREE.Mesh(towerGeo, baseMat);
        tower.position.set(0, 6, 0);
        group.add(tower);

        // Clock Face
        const clockGeo = new THREE.CircleGeometry(1.5, 32);
        const clockMat = new THREE.MeshBasicMaterial({ color: 0xFFFFFF });
        const clock = new THREE.Mesh(clockGeo, clockMat);
        clock.position.set(0, 10, 2.1);
        group.add(clock);

        return group;
    }

    createBank() {
        const group = new THREE.Group();
        // Massive stone building
        const baseGeo = new THREE.BoxGeometry(12, 12, 12);
        const baseMat = new THREE.MeshStandardMaterial({ color: 0xAAAAAA }); // Grey Stone
        const base = new THREE.Mesh(baseGeo, baseMat);
        base.position.y = 6;
        group.add(base);

        // Gold $ Sign
        const signGeo = new THREE.BoxGeometry(2, 4, 0.5);
        const signMat = new THREE.MeshStandardMaterial({ color: 0xFFD700, metalness: 0.8, roughness: 0.2 });
        const sign = new THREE.Mesh(signGeo, signMat);
        sign.position.set(0, 8, 6.1);
        group.add(sign);

        return group;
    }

    createEnvironment() {
        this.createRoads();
        // createStreetLights called in constructor now or here? 
        // We moved it to constructor in previous step but we are replacing this method.
        // Let's keep it clean.
    }

    createRoads() {
        // ... (Keep existing simple plane logic, it's cheap enough)
        const roadWidth = 10;
        const roadGeo = new THREE.PlaneGeometry(roadWidth, 400);
        const roadMat = new THREE.MeshStandardMaterial({ color: 0x333333, roughness: 0.8 });

        // Grid Roads
        for (let x = -180; x <= 180; x += 60) {
            const road = new THREE.Mesh(roadGeo, roadMat);
            road.rotation.x = -Math.PI / 2;
            road.position.set(x, 0.02, 0);
            road.receiveShadow = true;
            this.scene.add(road);

            const lineGeo = new THREE.PlaneGeometry(0.5, 400);
            const lineMat = new THREE.MeshBasicMaterial({ color: 0xFFFFFF });
            const line = new THREE.Mesh(lineGeo, lineMat);
            line.rotation.x = -Math.PI / 2;
            line.position.set(x, 0.03, 0);
            this.scene.add(line);
        }

        const roadGeoZ = new THREE.PlaneGeometry(400, roadWidth);
        for (let z = -180; z <= 180; z += 60) {
            const road = new THREE.Mesh(roadGeoZ, roadMat);
            road.rotation.x = -Math.PI / 2;
            road.position.set(0, 0.02, z);
            road.receiveShadow = true;
            this.scene.add(road);

            const lineGeo = new THREE.PlaneGeometry(400, 0.5);
            const lineMat = new THREE.MeshBasicMaterial({ color: 0xFFFFFF });
            const line = new THREE.Mesh(lineGeo, lineMat);
            line.rotation.x = -Math.PI / 2;
            line.position.set(0, 0.03, z);
            this.scene.add(line);
        }
    }

    createStreetLights() {
        this.streetLights = []; // Stores meshes for emissive toggle

        // InstancedMesh candidates for poles? Maybe simple mesh cloning is fine for 50 items.
        // Optimization: Single Geometry/Material reuse
        const poleGeo = new THREE.CylinderGeometry(0.2, 0.2, 8);
        const poleMat = new THREE.MeshStandardMaterial({ color: 0x222222 });
        const armGeo = new THREE.BoxGeometry(2, 0.2, 0.2);
        const bulbGeo = new THREE.BoxGeometry(0.5, 0.2, 0.5);
        const bulbMat = new THREE.MeshStandardMaterial({ color: 0xFFFF00, emissive: 0x000000 });

        const group = new THREE.Group(); // Add all to one group

        for (let x = -180; x <= 180; x += 60) {
            for (let z = -180; z <= 180; z += 60) {
                const offsets = [[-6, -6], [6, 6], [-6, 6], [6, -6]];
                offsets.forEach(off => {
                    // Pole
                    const pole = new THREE.Mesh(poleGeo, poleMat);
                    pole.position.set(x + off[0], 4, z + off[1]);
                    group.add(pole);

                    // Arm
                    const arm = new THREE.Mesh(armGeo, poleMat);
                    arm.position.set(x + off[0] + (off[0] > 0 ? -1 : 1), 8, z + off[1]);
                    group.add(arm);

                    // Bulb Mesh (No PointLight!)
                    const bulb = new THREE.Mesh(bulbGeo, bulbMat.clone()); // Clone mat to control emissive individually? No, batch control is better.
                    // Actually, we want to toggle ALL lights at once. So shared material is BETTER.
                    bulb.position.set(x + off[0] + (off[0] > 0 ? -1 : 1), 7.8, z + off[1]);
                    group.add(bulb);
                });
            }
        }
        this.scene.add(group);

        // Store reference to the SHARED material to toggle it
        this.streetLightMat = bulbMat;
    }

    createParticles() {
        this.particles = [];
        // Reduced counts for performance
        this.buildings.forEach(b => {
            if (b.userData.type === 'Park') {
                this.addFountainEmitter(b.position.x, 1.5, b.position.z);
            } else if (b.userData.type === 'Factory' || b.userData.type === 'Power Plant') {
                this.addSmokeEmitter(b.position.x, 15, b.position.z);
            }
        });
    }

    addFountainEmitter(x, y, z) {
        // Reuse geometry?
        const geo = new THREE.BoxGeometry(0.2, 0.2, 0.2);
        const mat = new THREE.MeshBasicMaterial({ color: 0x00FFFF });

        for (let i = 0; i < 10; i++) { // Reduced from 40
            const mesh = new THREE.Mesh(geo, mat);
            mesh.position.set(x, y, z);
            this.scene.add(mesh);
            this.particles.push({
                mesh: mesh,
                initialPos: { x, y, z },
                vel: { x: (Math.random() - 0.5) * 0.2, y: 0.3 + Math.random() * 0.2, z: (Math.random() - 0.5) * 0.2 },
                life: Math.random(),
                type: 'water'
            });
        }
    }

    addSmokeEmitter(x, y, z) {
        const geo = new THREE.SphereGeometry(0.5, 4, 4); // Low poly
        const mat = new THREE.MeshBasicMaterial({ color: 0xAAAAAA, transparent: true, opacity: 0.3 });

        for (let i = 0; i < 5; i++) { // Reduced from 20
            const mesh = new THREE.Mesh(geo, mat);
            mesh.position.set(x, y, z);
            this.scene.add(mesh);
            this.particles.push({
                mesh: mesh,
                initialPos: { x, y, z },
                vel: { x: (Math.random() - 0.5) * 0.1, y: 0.2, z: (Math.random() - 0.5) * 0.1 },
                life: Math.random(),
                type: 'smoke'
            });
        }
    }

    updateParticles(deltaTime) {
        if (!this.particles) return;
        this.particles.forEach(p => {
            p.life -= deltaTime;
            if (p.life <= 0) {
                p.life = 1 + Math.random();
                p.mesh.position.set(p.initialPos.x, p.initialPos.y, p.initialPos.z);
                if (p.type === 'water') {
                    p.vel.y = 0.3 + Math.random() * 0.2;
                    p.mesh.position.x = p.initialPos.x + (Math.random() - 0.5);
                    p.mesh.position.z = p.initialPos.z + (Math.random() - 0.5);
                }
                if (p.type === 'smoke') {
                    p.mesh.position.x = p.initialPos.x + (Math.random() - 0.5) * 2;
                    p.mesh.position.z = p.initialPos.z + (Math.random() - 0.5) * 2;
                }
            } else {
                p.mesh.position.x += p.vel.x * deltaTime * 10;
                p.mesh.position.y += p.vel.y * deltaTime * 10;
                p.mesh.position.z += p.vel.z * deltaTime * 10;
                if (p.type === 'water') p.vel.y -= 0.01;
            }
        });
    }

    updateMaterials(time) {
        // time is in minutes (0 - 1440)
        // Sync with Game.js: Night is < 6am (360) or > 6pm (1080)
        const isNight = (time < 360 || time > 1080);

        // Toggle Street Lights via Shared Material
        if (this.streetLightMat) {
            this.streetLightMat.emissive.setHex(isNight ? 0xFFFF00 : 0x000000);
        }

        // Update Neon Lights
        if (this.neonMaterials) {
            // Pulsating effect for neons
            const pulse = 1 + Math.sin(time * 0.1) * 0.3;
            const intensity = isNight ? 1.5 * pulse : 0.1;

            this.neonMaterials.forEach(mat => {
                mat.emissiveIntensity = intensity;
            });
        }
    }


}
