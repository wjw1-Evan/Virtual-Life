import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';

export class World {
    constructor(scene) {
        this.scene = scene;
        this.buildings = [];
        this.neonMaterials = []; // Store neon materials for global update
        this.mixers = []; // Store animation mixers

        this.createGround();
        this.createBuildings();
        this.createTrees();
        this.createEnvironment();
        this.createStreetLights();
        this.createParticles();
        this.addUrbanProps(); // Added more granular details
    }

    update(deltaTime) {
        // Update all animation mixers
        this.mixers.forEach(mixer => mixer.update(deltaTime));
    }



    // Procedural house creation is below in this file.

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
            // --- CENTER: PLAZA & Landmarks ---
            { name: 'Fountain Plaza', type: 'generic', style: 'classic', color: 0xFFFFFF, label: '喷泉广场', x: 0, z: 0, scale: 1 },
            { name: 'Bridge', type: 'generic', style: 'bridge', color: 0xA52A2A, label: '金门大桥', x: 0, z: 60, scale: 2 }, // Link to residential

            // --- NORTH: COMMERCIAL DISTRICT (Shops, Entertainment) ---
            { name: 'Shopping Mall', type: 'generic', style: 'modern', color: 0xFFD700, label: '购物中心', x: 0, z: -80, scale: 2.5 },
            { name: 'Gym', type: 'generic', style: 'store', color: 0x4169E1, label: '健身房', x: -30, z: -40, awningColor: 0x0000FF },
            { name: 'Club', type: 'generic', style: 'store', color: 0x111111, label: '夜店', x: 30, z: -40, neonColor: 0xFF00FF },
            { name: 'Cinema', type: 'generic', style: 'modern', color: 0x8A2BE2, label: '电影院', x: 0, z: -120, scale: 2 },

            // Food Street (North-West)
            { name: 'Restaurant', type: 'generic', style: 'store', color: 0xFFA07A, label: '西餐厅', x: -60, z: -40, awningColor: 0xFF4500 },
            { name: 'Cafe', type: 'generic', style: 'store', color: 0x8B4513, label: '咖啡馆', x: -60, z: -60, awningColor: 0xF5DEB3 },
            { name: 'Bakery', type: 'generic', style: 'store', color: 0xFFD700, label: '面包房', x: -80, z: -60, awningColor: 0xFFFFFF },
            { name: 'Pizza Place', type: 'generic', style: 'store', color: 0xFF4500, label: '披萨店', x: -80, z: -40, awningColor: 0x008000 },

            // Retail Street (North-East)
            { name: 'Supermarket', type: 'generic', style: 'store', color: 0x32CD32, label: '超市', x: 60, z: -40, awningColor: 0x006400 },
            { name: 'Clothing Store', type: 'generic', style: 'store', color: 0xFF69B4, label: '服装店', x: 60, z: -60, awningColor: 0xFFC0CB },
            { name: 'Electronics', type: 'generic', style: 'store', color: 0x00CED1, label: '电子产品', x: 80, z: -40, awningColor: 0x000080 },
            { name: 'Bookstore', type: 'generic', style: 'store', color: 0x8B0000, label: '书店', x: 80, z: -60, awningColor: 0xA52A2A },

            // --- SOUTH: RESIDENTIAL DISTRICT (Homes) ---
            { name: 'My Home', type: 'house', style: 'modern', label: '我的家', x: -15, z: 50 },
            { name: 'Neighbor A', type: 'house', style: 'modern', label: '邻居 A', x: 15, z: 50 },
            { name: 'Neighbor B', type: 'house', style: 'modern', label: '邻居 B', x: -15, z: 80 },
            { name: 'Neighbor C', type: 'house', style: 'modern', label: '邻居 C', x: 15, z: 80 },
            { name: 'Apartment A', type: 'generic', style: 'modern', color: 0xDDDDDD, label: '公寓 A', x: -40, z: 70, scale: 1.5 },
            { name: 'Apartment B', type: 'generic', style: 'modern', color: 0xDDDDDD, label: '公寓 B', x: 40, z: 70, scale: 1.5 },

            // --- EAST: BUSINESS DISTRICT (Offices, Gov) ---
            { name: 'Office A', type: 'office', style: 'modern', label: '写写字楼 A', x: 100, z: 10 },
            { name: 'Office B', type: 'office', style: 'modern', label: '写写字楼 B', x: 100, z: 40 },
            { name: 'Convention Center', type: 'generic', style: 'modern', color: 0x4682B4, label: '会展中心', x: 100, z: -30, scale: 2 },
            { name: 'Bank', type: 'generic', style: 'classic', color: 0xD3D3D3, label: '银行', x: 80, z: 0 },
            { name: 'Skyscraper A', type: 'generic', style: 'modern', color: 0x223344, label: '天际大厦', x: 140, z: 0, scale: 3 },

            // --- WEST: SERVICES & INDUSTRIAL ---
            { name: 'Hospital', type: 'generic', style: 'modern', color: 0xFFFFFF, label: '总医院', mark: 'helipad', x: -100, z: 0, scale: 1.5, neonColor: 0xFF0000 },
            { name: 'Police Station', type: 'generic', style: 'modern', color: 0x000080, label: '警察局', x: -100, z: 30 },
            { name: 'Fire Station', type: 'generic', style: 'store', color: 0xFF0000, label: '消防局', x: -80, z: 30 }, // Using store style for open garage feel? Or classic.
            { name: 'Factory', type: 'generic', style: 'industrial', color: 0x555555, label: '化工厂', x: -140, z: -20, scale: 1.5 },
            { name: 'Power Plant', type: 'generic', style: 'industrial', color: 0x444444, label: '发电厂', x: -160, z: 0, scale: 1.8 },

            // --- REMOTE / LANDMARKS ---
            { name: 'Lighthouse', type: 'generic', style: 'tower', color: 0xFFFFFF, label: '灯塔', striped: true, x: 180, z: 180 },
            { name: 'Rocket', type: 'generic', style: 'rocket', color: 0xFFFFFF, label: '火箭基地', x: -180, z: 180 },
            { name: 'Windmill', type: 'generic', style: 'windmill', color: 0xFFFFFF, label: '风车', x: -180, z: -150 }
        ];

        zones.forEach(zone => {
            let buildingGroup;
            // Existing custom methods
            if (zone.type === 'house') buildingGroup = this.createHouse(zone);
            else if (zone.type === 'office') buildingGroup = this.createOffice(zone);
            else if (zone.type === 'desk') buildingGroup = this.createDesk();
            else if (zone.type === 'shower') buildingGroup = this.createShower();
            // New generic factory for the rest
            else buildingGroup = this.createGenericBuilding(zone);

            if (buildingGroup) {
                buildingGroup.position.set(zone.x, 0, zone.z);

                // Randomize Rotation for "Organic" feel (except special ones)
                if (zone.type === 'house') {
                    buildingGroup.rotation.y = (Math.random() - 0.5) * 0.2; // Slight jitter
                }

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

    populateLobby(group, name, config) {
        // Interior Light
        const light = new THREE.PointLight(0xffffff, 1.2, 18);
        light.position.set(0, 5, 0);
        group.add(light);

        // --- COMMON: ELEVATOR (Visual) ---
        const elevatorGroup = new THREE.Group();
        elevatorGroup.position.set(0, 0, -4.8); // Back wall
        const door = new THREE.Mesh(new THREE.BoxGeometry(2, 2.5, 0.1), new THREE.MeshStandardMaterial({ color: 0x888888, metalness: 0.8 }));
        door.position.y = 1.25;
        elevatorGroup.add(door);
        const lLight = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.1, 0.1), new THREE.MeshBasicMaterial({ color: 0x00FF00 }));
        lLight.position.set(0, 2.8, 0);
        elevatorGroup.add(lLight);
        group.add(elevatorGroup);

        if (name === 'Hospital' || (config.label && config.label.includes('医院'))) {
            // Reception Desk
            const deskGroup = new THREE.Group();
            deskGroup.position.set(0, 0, -2.5);
            const desk = new THREE.Mesh(new THREE.BoxGeometry(4, 1.2, 1), new THREE.MeshStandardMaterial({ color: 0xFFFFFF }));
            desk.position.y = 0.6;
            deskGroup.add(desk);
            const cross = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 0.1), new THREE.MeshBasicMaterial({ color: 0xFF0000 }));
            cross.position.set(0, 0.6, 0.6);
            deskGroup.add(cross);

            deskGroup.userData = { type: 'Reception', action: '咨询/挂号' };
            this.buildings.push(deskGroup);
            group.add(deskGroup);

            // Waiting Area
            for (let x = -4; x <= 4; x += 2) {
                if (x === 0) continue;
                const chair = new THREE.Mesh(new THREE.BoxGeometry(1, 0.5, 1), new THREE.MeshStandardMaterial({ color: 0x4682B4 }));
                chair.position.set(x, 0.25, 2);
                chair.userData = { type: 'Waiting Chair', action: '等候叫号' };
                this.buildings.push(chair);
                group.add(chair);
            }

        } else if (name === 'Police Station' || (config.label && config.label.includes('警察'))) {
            // Reception
            const desk = new THREE.Mesh(new THREE.BoxGeometry(3, 1.2, 1), new THREE.MeshStandardMaterial({ color: 0x000080 }));
            desk.position.set(0, 0.6, -2.5);
            desk.userData = { type: 'Police Desk', action: '报案/登记' };
            this.buildings.push(desk);
            group.add(desk);

        } else if (name === 'Bank' || (config.label && config.label.includes('银行'))) {
            // Teller Windows
            const partition = new THREE.Mesh(new THREE.BoxGeometry(8, 2.5, 0.1), new THREE.MeshStandardMaterial({ color: 0x88CCFF, transparent: true, opacity: 0.3 }));
            partition.position.set(0, 1.25, -2);
            group.add(partition);
            const tellerCounter = new THREE.Mesh(new THREE.BoxGeometry(8, 1, 1), new THREE.MeshStandardMaterial({ color: 0xD3D3D3 }));
            tellerCounter.position.set(0, 0.5, -2.5);
            tellerCounter.userData = { type: 'Bank Counter', action: '办理业务' };
            this.buildings.push(tellerCounter);
            group.add(tellerCounter);

        } else if (name === 'Club' || (config.label && config.label.includes('夜店'))) {
            // Dance Floor & DJ
            const danceFloor = new THREE.Mesh(new THREE.BoxGeometry(6, 0.1, 6), new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.1 }));
            danceFloor.position.set(0, 0.05, 0);
            danceFloor.userData = { type: 'Dance Floor', action: '跳舞' };
            this.buildings.push(danceFloor);
            group.add(danceFloor);

            const dj = new THREE.Mesh(new THREE.BoxGeometry(2, 1.2, 1), new THREE.MeshStandardMaterial({ color: 0x111111, emissive: 0x550055 }));
            dj.position.set(0, 0.6, -3);
            dj.userData = { type: 'DJ Booth', action: '打碟' };
            this.buildings.push(dj);
            group.add(dj);

            const discoLight = new THREE.PointLight(0xFF00FF, 3, 12);
            discoLight.position.set(0, 5, 0);
            group.add(discoLight);

        } else if (name.includes('Hotel') || (config.label && config.label.includes('酒店'))) {
            // Lounge & Reception
            const sofa = new THREE.Mesh(new THREE.BoxGeometry(3, 0.6, 1.5), new THREE.MeshStandardMaterial({ color: 0x8B4513 }));
            sofa.position.set(-3, 0.3, 0);
            sofa.userData = { type: 'Lobby Sofa', action: '休息' };
            this.buildings.push(sofa);
            group.add(sofa);

            const desk = new THREE.Mesh(new THREE.BoxGeometry(3, 1.2, 1), new THREE.MeshStandardMaterial({ color: 0x333333 }));
            desk.position.set(0, 0.6, -3);
            desk.userData = { type: 'Check-in Desk', action: '办理入住' };
            this.buildings.push(desk);
            group.add(desk);

            // Decorative Plants
            const plantPot = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.4, 0.8), new THREE.MeshStandardMaterial({ color: 0x8B4513 }));
            plantPot.position.set(3, 0.4, 0);
            group.add(plantPot);
            const plant = new THREE.Mesh(new THREE.ConeGeometry(0.4, 1.5, 8), new THREE.MeshStandardMaterial({ color: 0x228B22 }));
            plant.position.set(3, 1.2, 0);
            group.add(plant);
        } else {
            // General Office Lobby
            const desk = new THREE.Mesh(new THREE.BoxGeometry(3, 1.2, 1), new THREE.MeshStandardMaterial({ color: 0x555555 }));
            desk.position.set(0, 0.6, -2);
            desk.userData = { type: 'Front Desk', action: '访客登记' };
            this.buildings.push(desk);
            group.add(desk);

            const plant1 = new THREE.Mesh(new THREE.ConeGeometry(0.5, 2, 8), new THREE.MeshStandardMaterial({ color: 0x228B22 }));
            plant1.position.set(-3, 1, 3);
            group.add(plant1);
            const plant2 = plant1.clone();
            plant2.position.set(3, 1, 3);
            group.add(plant2);
        }
    }

    populateStoreInterior(group, name, config) {
        // Add Interior Light
        const light = new THREE.PointLight(0xffaa00, 1.5, 10);
        light.position.set(0, 4, 0);
        group.add(light);

        // Counter (Generic for most stores)
        const counterMat = new THREE.MeshStandardMaterial({ color: 0xeeeeee });
        const counter = new THREE.Mesh(new THREE.BoxGeometry(3, 1.2, 1), counterMat);
        counter.position.set(-2, 0.6, -2);
        group.add(counter);

        // Register Counter
        const counterGroup = new THREE.Group();
        counterGroup.position.copy(counter.position);
        counterGroup.userData = { type: 'Counter', action: '结账/咨询' };
        this.buildings.push(counterGroup); // Allow interaction near counter

        if (name === 'Gym' || (config.label && config.label.includes('健身'))) {
            // Enhanced Gym
            const groundMat = new THREE.MeshStandardMaterial({ color: 0x111111 }); // Rubber floor
            const jimFloor = new THREE.Mesh(new THREE.BoxGeometry(11, 0.1, 11), groundMat);
            jimFloor.position.y = 0.05;
            group.add(jimFloor);

            // Treadmills
            for (let i = 0; i < 2; i++) {
                const treadmill = new THREE.Group();
                treadmill.position.set(2.5, 0, 1 + i * 3);
                treadmill.add(new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.2, 2.5), new THREE.MeshStandardMaterial({ color: 0x222222 })));
                const console = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.5, 0.2), new THREE.MeshStandardMaterial({ color: 0x444444 }));
                console.position.set(0, 0.75, 1.1); treadmill.add(console);
                treadmill.userData = { type: 'Treadmill', action: '基础训练 (跑步)' };
                this.buildings.push(treadmill); group.add(treadmill);
            }

            // Yoga Mats
            for (let i = 0; i < 2; i++) {
                const mat = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.05, 3), new THREE.MeshStandardMaterial({ color: i % 2 === 0 ? 0x9C27B0 : 0x03A9F4 }));
                mat.position.set(-3.5, 0.1, 1 + i * 3.5);
                mat.userData = { type: 'Yoga Mat', action: '拉伸/冥想' };
                this.buildings.push(mat); group.add(mat);
            }

            // Punching Bag
            const bagGroup = new THREE.Group(); bagGroup.position.set(-1, 0, 4);
            const chain = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 1.5), new THREE.MeshStandardMaterial({ color: 0x888888 }));
            chain.position.y = 3.5; bagGroup.add(chain);
            const bag = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 2), new THREE.MeshStandardMaterial({ color: 0x8B0000 }));
            bag.position.y = 2; bagGroup.add(bag);
            bagGroup.userData = { type: 'Punching Bag', action: '格斗训练' };
            this.buildings.push(bagGroup); group.add(bagGroup);

        } else if (config.label && config.label.includes('披萨')) {
            // Pizza Shop: Ovens & Prep
            group.add(new THREE.Mesh(new THREE.BoxGeometry(11, 0.1, 11), new THREE.MeshStandardMaterial({ color: 0xf5f5dc }))); // Beige floor

            // Stone Oven
            const oven = new THREE.Group(); oven.position.set(-4, 0, -3.5);
            const body = new THREE.Mesh(new THREE.BoxGeometry(3, 2.5, 3), new THREE.MeshStandardMaterial({ color: 0x8B4513 }));
            body.position.y = 1.25; oven.add(body);
            const hole = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.8, 0.5), new THREE.MeshBasicMaterial({ color: 0xFF4500 }));
            hole.position.set(0, 1.2, 1.3); oven.add(hole); // Glowing hole
            oven.userData = { type: 'Pizza Oven', action: '烘烤披萨' };
            this.buildings.push(oven); group.add(oven);

            // Prep Table
            const table = new THREE.Mesh(new THREE.BoxGeometry(4, 1.2, 2), new THREE.MeshStandardMaterial({ color: 0xFFFFFF }));
            table.position.set(0, 0.6, -3);
            const dough = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.05), new THREE.MeshStandardMaterial({ color: 0xFFFFE0 }));
            dough.position.set(0, 1.25, -3); group.add(dough);
            table.userData = { type: 'Prep Table', action: '制作面团' };
            this.buildings.push(table); group.add(table);

        } else if (name === 'Cinema' || (config.label && config.label.includes('电影'))) {
            // Cinema: Screen & Seats
            const screen = new THREE.Mesh(new THREE.PlaneGeometry(8, 4), new THREE.MeshBasicMaterial({ color: 0x000000 }));
            screen.position.set(0, 2.5, -5.5);
            group.add(screen);

            // Popcorn Stand
            const stand = new THREE.Mesh(new THREE.BoxGeometry(2, 1.2, 1), new THREE.MeshStandardMaterial({ color: 0xFFFF00 }));
            stand.position.set(3, 0.6, -2);
            stand.userData = { type: 'Popcorn Stand', action: '购买爆米花' };
            this.buildings.push(stand);
            group.add(stand);

            // Ticket Kiosk
            const kiosk = new THREE.Mesh(new THREE.BoxGeometry(0.8, 1.5, 0.5), new THREE.MeshStandardMaterial({ color: 0xFF0000 }));
            kiosk.position.set(-4, 0.75, 0);
            kiosk.userData = { type: 'Ticket Kiosk', action: '取票/购票' };
            this.buildings.push(kiosk);
            group.add(kiosk);

        } else if (config.label && (config.label.includes('服装') || config.label.includes('Clothing'))) {
            // Clothing Store: Racks
            for (let x = -3; x <= 3; x += 3) {
                const rack = new THREE.Group();
                rack.position.set(x, 0, 1);
                const rail = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 3), new THREE.MeshStandardMaterial({ color: 0x888888 }));
                rail.rotation.z = Math.PI / 2;
                rail.position.y = 1.5;
                rack.add(rail);
                const leg1 = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 1.5), new THREE.MeshStandardMaterial({ color: 0x888888 }));
                leg1.position.set(-1.4, 0.75, 0); rack.add(leg1);
                const leg2 = leg1.clone(); leg2.position.set(1.4, 0.75, 0); rack.add(leg2);

                rack.userData = { type: 'Clothes Rack', action: '试穿/购买' };
                this.buildings.push(rack);
                group.add(rack);
            }

        } else if (config.label && (config.label.includes('书店') || config.label.includes('Book'))) {
            // Bookstore: Rows of shelves
            for (let z = -3; z <= 3; z += 3) {
                const shelf = new THREE.Mesh(new THREE.BoxGeometry(8, 3, 0.5), new THREE.MeshStandardMaterial({ color: 0x5C4033 }));
                shelf.position.set(0, 1.5, z);
                shelf.userData = { type: 'Bookshelf', action: '阅读/买书' };
                this.buildings.push(shelf);
                group.add(shelf);
            }

        } else if (config.label && (
            config.label.includes('餐') || config.label.includes('店') || config.label.includes('Cafe') || config.label.includes('Bar') || config.label.includes('Coffee') ||
            config.label.includes('面包') || config.label.includes('冰淇淋') || config.label.includes('汉堡') || config.label.includes('寿司')
        )) {
            // Tables and Chairs with better spacing
            const tableMat = new THREE.MeshStandardMaterial({ color: 0x8B4513 });
            for (let x = -3; x <= 3; x += 6) {
                for (let z = -2; z <= 4; z += 3) {
                    const tableGroup = new THREE.Group();
                    tableGroup.position.set(x, 0, z);
                    const tableTop = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.8, 0.1, 16), tableMat);
                    tableTop.position.y = 1; tableGroup.add(tableTop);
                    const tableLeg = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 1, 8), new THREE.MeshStandardMaterial({ color: 0x000000 }));
                    tableLeg.position.y = 0.5; tableGroup.add(tableLeg);
                    tableGroup.userData = { type: 'Table', action: '用餐/休息' };
                    this.buildings.push(tableGroup);
                    group.add(tableGroup);
                }
            }
        } else if (config.label && (config.label.includes('超市') || config.label.includes('Store') || config.label.includes('Market'))) {
            // Improved Shelves
            for (let x = -3; x <= 3; x += 3) {
                const shelf = new THREE.Group();
                shelf.position.set(x, 0, -2);
                const frame = new THREE.Mesh(new THREE.BoxGeometry(1.2, 2.5, 4), new THREE.MeshStandardMaterial({ color: 0xe0e0e0 }));
                frame.position.y = 1.25; shelf.add(frame);
                for (let i = 0; i < 8; i++) {
                    const prod = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.25, 0.25), new THREE.MeshStandardMaterial({ color: Math.random() * 0xffffff }));
                    prod.position.set(0.4, 0.4 + i * 0.3, (Math.random() - 0.5) * 3); shelf.add(prod);
                }
                shelf.userData = { type: 'Shelf', action: '挑选商品' };
                this.buildings.push(shelf);
                group.add(shelf);
            }
        }
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
            // ENHANCED STORE: Hollow, accessible interior
            const width = 12 * scale;
            const height = 5 * scale;
            const depth = 12 * scale;
            const thickness = 0.5;

            // Materials
            const wallMat = baseMat;
            const floorMat = new THREE.MeshStandardMaterial({ color: 0xcccccc, roughness: 0.8 });
            const ceilingMat = new THREE.MeshStandardMaterial({ color: 0xdddddd });

            // Floor
            const floor = new THREE.Mesh(new THREE.BoxGeometry(width, 0.2, depth), floorMat);
            floor.position.y = 0.1;
            floor.receiveShadow = true;
            group.add(floor);

            // Ceiling
            const ceiling = new THREE.Mesh(new THREE.BoxGeometry(width, 0.2, depth), ceilingMat);
            ceiling.position.y = height;
            ceiling.castShadow = true;
            group.add(ceiling);

            // Walls
            // Back
            const backWall = new THREE.Mesh(new THREE.BoxGeometry(width, height, thickness), wallMat);
            backWall.position.set(0, height / 2, -depth / 2 + thickness / 2);
            backWall.castShadow = true;
            group.add(backWall);

            // Left
            const leftWall = new THREE.Mesh(new THREE.BoxGeometry(thickness, height, depth), wallMat);
            leftWall.position.set(-width / 2 + thickness / 2, height / 2, 0);
            leftWall.castShadow = true;
            group.add(leftWall);

            // Right
            const rightWall = new THREE.Mesh(new THREE.BoxGeometry(thickness, height, depth), wallMat);
            rightWall.position.set(width / 2 - thickness / 2, height / 2, 0);
            rightWall.castShadow = true;
            group.add(rightWall);

            // Front (Open Storefront with pillars)
            const pillarWidth = 1.0;
            const leftPillar = new THREE.Mesh(new THREE.BoxGeometry(pillarWidth, height, thickness), wallMat);
            leftPillar.position.set(-width / 2 + pillarWidth / 2, height / 2, depth / 2 - thickness / 2);
            group.add(leftPillar);

            const rightPillar = new THREE.Mesh(new THREE.BoxGeometry(pillarWidth, height, thickness), wallMat);
            rightPillar.position.set(width / 2 - pillarWidth / 2, height / 2, depth / 2 - thickness / 2);
            group.add(rightPillar);

            // Top Beam
            const topBeam = new THREE.Mesh(new THREE.BoxGeometry(width, 1, thickness), wallMat);
            topBeam.position.set(0, height - 0.5, depth / 2 - thickness / 2);
            group.add(topBeam);

            // Glass Windows (Large, transparent)
            const glassMat = new THREE.MeshStandardMaterial({ color: 0x88CCFF, transparent: true, opacity: 0.3, metalness: 0.9, roughness: 0.1 });
            const windowPane = new THREE.Mesh(new THREE.PlaneGeometry(width - pillarWidth * 2, height - 1), glassMat);
            windowPane.position.set(0, (height - 1) / 2, depth / 2);
            // Open door? No, just glass for now, maybe phantom.
            // Let's make it open: 2 panes with gap.
            // Left Pane
            const paneWidth = (width - pillarWidth * 2 - 2) / 2; // 2 unit door gap
            const leftPane = new THREE.Mesh(new THREE.BoxGeometry(paneWidth, height - 1, 0.1), glassMat);
            leftPane.position.set(-(width / 2 - pillarWidth - paneWidth / 2), (height - 1) / 2, depth / 2);
            group.add(leftPane);

            const rightPane = new THREE.Mesh(new THREE.BoxGeometry(paneWidth, height - 1, 0.1), glassMat);
            rightPane.position.set((width / 2 - pillarWidth - paneWidth / 2), (height - 1) / 2, depth / 2);
            group.add(rightPane);

            // Awning
            const awningColor = config.awningColor || 0xFF0000;
            const awning = new THREE.Mesh(new THREE.BoxGeometry(width, 0.5, 3), new THREE.MeshStandardMaterial({ color: awningColor, side: THREE.DoubleSide }));
            awning.position.set(0, height - 1.5, depth / 2 + 1.5);
            awning.rotation.x = 0.5; // Tilted down
            group.add(awning);

            // Signage
            // Use config.label or name
            // (Label is usually sprite above, but maybe a sign board on awning?)

            // Interior Population
            this.populateStoreInterior(group, config.name, config);

        } else if (style === 'modern') {
            // MODERN: Tall Tower with Accessible Lobby
            const width = 10 * scale;
            const lobbyHeight = 6;
            const towerHeight = (14 * scale) - lobbyHeight; // Remaining height
            const depth = 10 * scale;
            const thickness = 0.5;

            // --- LOBBY (Accessible) ---
            const lobbyMat = baseMat;
            const floorMat = new THREE.MeshStandardMaterial({ color: 0x333333, roughness: 0.5 });

            // Floor
            const floor = new THREE.Mesh(new THREE.BoxGeometry(width, 0.2, depth), floorMat);
            floor.position.y = 0.1;
            floor.receiveShadow = true;
            group.add(floor);

            // Ceiling (Base of Tower)
            const ceiling = new THREE.Mesh(new THREE.BoxGeometry(width, 0.5, depth), lobbyMat);
            ceiling.position.y = lobbyHeight;
            group.add(ceiling);

            // Walls (Back, Left, Right)
            const backWall = new THREE.Mesh(new THREE.BoxGeometry(width, lobbyHeight, thickness), lobbyMat);
            backWall.position.set(0, lobbyHeight / 2, -depth / 2 + thickness / 2);
            group.add(backWall);

            const leftWall = new THREE.Mesh(new THREE.BoxGeometry(thickness, lobbyHeight, depth), lobbyMat);
            leftWall.position.set(-width / 2 + thickness / 2, lobbyHeight / 2, 0);
            group.add(leftWall);

            const rightWall = new THREE.Mesh(new THREE.BoxGeometry(thickness, lobbyHeight, depth), lobbyMat);
            rightWall.position.set(width / 2 - thickness / 2, lobbyHeight / 2, 0);
            group.add(rightWall);

            // Front Columns (Open Logic)
            const colWidth = 1;
            const leftCol = new THREE.Mesh(new THREE.BoxGeometry(colWidth, lobbyHeight, thickness), lobbyMat);
            leftCol.position.set(-width / 2 + colWidth / 2, lobbyHeight / 2, depth / 2 - thickness / 2);
            group.add(leftCol);

            const rightCol = new THREE.Mesh(new THREE.BoxGeometry(colWidth, lobbyHeight, thickness), lobbyMat);
            rightCol.position.set(width / 2 - colWidth / 2, lobbyHeight / 2, depth / 2 - thickness / 2);
            group.add(rightCol);

            // Glass Wall (Back of Lobby or Panels)
            const glassMat = new THREE.MeshStandardMaterial({ color: 0xADD8E6, transparent: true, opacity: 0.4 });
            const glass = new THREE.Mesh(new THREE.BoxGeometry(width - 4, lobbyHeight, 0.1), glassMat);
            glass.position.set(0, lobbyHeight / 2, depth / 2 - thickness);
            // Actually let's make it OPEN for entry. Use phantom glass? 
            // Or just side windows.
            // Let's leave center open.

            // --- TOWER (Solid Top) ---
            const towerGeo = new THREE.BoxGeometry(width, towerHeight, depth);
            const tower = new THREE.Mesh(towerGeo, baseMat);
            tower.position.y = lobbyHeight + towerHeight / 2;
            tower.castShadow = true;
            group.add(tower);

            // Vertical Glass Strips on Tower
            const stripMat = new THREE.MeshStandardMaterial({ color: 0xADD8E6, emissive: 0x111111 });
            for (let i = -1; i <= 1; i += 2) {
                const strip = new THREE.Mesh(new THREE.BoxGeometry(2, towerHeight, depth + 0.2), stripMat);
                strip.position.set(i * 3, lobbyHeight + towerHeight / 2, 0);
                group.add(strip);
            }

            // Populate Lobby
            this.populateLobby(group, config.name, config);

            // Markings
            if (config.mark === 'helipad') {
                const hGeo = new THREE.CircleGeometry(4, 32);
                const hMat = new THREE.MeshBasicMaterial({ color: 0xFF0000 });
                const h = new THREE.Mesh(hGeo, hMat);
                h.rotation.x = -Math.PI / 2;
                h.position.set(0, lobbyHeight + towerHeight + 0.1, 0);
                group.add(h);
                // H text logic... (Skipping detail for brevity or keeping it?)
                // Keeping it is better visual.
                const hText = new THREE.Mesh(new THREE.BoxGeometry(4, 0.2, 1), new THREE.MeshBasicMaterial({ color: 0xffffff }));
                hText.position.set(0, lobbyHeight + towerHeight + 0.2, 0);
                group.add(hText);
                const hText2 = new THREE.Mesh(new THREE.BoxGeometry(1, 0.2, 4), new THREE.MeshBasicMaterial({ color: 0xffffff }));
                hText2.position.set(0, lobbyHeight + towerHeight + 0.2, 0);
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
    createHouse(config = {}) {
        const group = new THREE.Group();
        const name = config.name || '';

        // Procedural Variations
        let wallColor = 0xf5f5f5;
        let floorColor = 0x8d6e63;
        let roofColor = 0x424242;
        let hasBalcony = name.includes('B') || name.includes('My');
        let style = 'modern';

        if (name.includes('Neighbor A')) {
            wallColor = 0xFFF9C4; // Soft Yellow
            floorColor = 0x795548;
        } else if (name.includes('Neighbor B')) {
            wallColor = 0xE8F5E9; // Soft Green
            floorColor = 0x5D4037;
        } else if (name.includes('Neighbor C')) {
            wallColor = 0xFFFFFF; // Pure White
            floorColor = 0x3e2723;
        }

        // Materials (Bright & Realistic)
        const wallMat = new THREE.MeshStandardMaterial({
            color: wallColor,
            roughness: 0.8
        });
        const floorMat = new THREE.MeshStandardMaterial({
            color: floorColor,
            roughness: 0.6
        });
        const roofMat = new THREE.MeshStandardMaterial({
            color: roofColor,
            roughness: 0.9
        });
        const glassMat = new THREE.MeshStandardMaterial({
            color: 0x88ccff,
            transparent: true,
            opacity: 0.4,
            metalness: 0.9,
            roughness: 0.1
        });
        const frameMat = new THREE.MeshStandardMaterial({ color: 0x333333 });

        // Dimensions
        const width = 12;
        const depth = 12;
        const height = 4;
        const thickness = 0.3;

        // Concrete Base/Foundation to avoid "floating"
        const base = new THREE.Mesh(new THREE.BoxGeometry(width + 4, 0.2, depth + 4), new THREE.MeshStandardMaterial({ color: 0x999999 }));
        base.position.y = 0.1;
        group.add(base);

        // Floor
        const floor = new THREE.Mesh(new THREE.BoxGeometry(width, 0.2, depth), floorMat);
        floor.position.y = 0.2; // Slightly above base
        floor.receiveShadow = true;
        group.add(floor);

        // Ceiling/Roof
        const roofHeight = style === 'modern' ? 0.3 : 2;
        const roofGeo = style === 'modern' ?
            new THREE.BoxGeometry(width + 1, roofHeight, depth + 1) :
            new THREE.ConeGeometry(9, roofHeight, 4);

        const roof = new THREE.Mesh(roofGeo, roofMat);
        roof.position.y = height + (style === 'classic' ? roofHeight / 2 : 0);
        if (style === 'classic') roof.rotation.y = Math.PI / 4;
        roof.castShadow = true;
        group.add(roof);

        // Balcony logic
        if (hasBalcony) {
            const bMat = new THREE.MeshStandardMaterial({ color: 0x555555 });
            const bFloor = new THREE.Mesh(new THREE.BoxGeometry(width, 0.2, 3), floorMat);
            bFloor.position.set(0, height - 1, depth / 2 + 1.5);
            group.add(bFloor);
            const bRail = new THREE.Mesh(new THREE.BoxGeometry(width, 1, 0.1), bMat);
            bRail.position.set(0, height - 0.5, depth / 2 + 3);
            group.add(bRail);
        }

        // Walls
        // Back Wall (Solid)
        const backWall = new THREE.Mesh(new THREE.BoxGeometry(width, height, thickness), wallMat);
        backWall.position.set(0, height / 2, -depth / 2 + thickness / 2);
        backWall.castShadow = true;
        backWall.receiveShadow = true;
        group.add(backWall);

        // Right Wall (Solid)
        const rightWall = new THREE.Mesh(new THREE.BoxGeometry(thickness, height, depth), wallMat);
        rightWall.position.set(width / 2 - thickness / 2, height / 2, 0);
        rightWall.castShadow = true;
        rightWall.receiveShadow = true;
        group.add(rightWall);

        // Left Wall (With Large Window)
        // Split into parts to make window hole
        const windowWidth = 6;
        const windowHeight = 2.5;
        const leftWallZ1 = (depth - windowWidth) / 2; // Solid parts

        const leftWall1 = new THREE.Mesh(new THREE.BoxGeometry(thickness, height, (depth - windowWidth) / 2), wallMat);
        leftWall1.position.set(-width / 2 + thickness / 2, height / 2, -depth / 2 + (depth - windowWidth) / 4);
        leftWall1.castShadow = true;
        group.add(leftWall1);

        const leftWall2 = new THREE.Mesh(new THREE.BoxGeometry(thickness, height, (depth - windowWidth) / 2), wallMat);
        leftWall2.position.set(-width / 2 + thickness / 2, height / 2, depth / 2 - (depth - windowWidth) / 4);
        leftWall2.castShadow = true;
        group.add(leftWall2);

        // Window beams (Top/Bottom)
        const winTop = new THREE.Mesh(new THREE.BoxGeometry(thickness, (height - windowHeight) / 2, windowWidth), wallMat);
        winTop.position.set(-width / 2 + thickness / 2, height - (height - windowHeight) / 4, 0);
        group.add(winTop);

        const winBottom = new THREE.Mesh(new THREE.BoxGeometry(thickness, (height - windowHeight) / 2, windowWidth), wallMat);
        winBottom.position.set(-width / 2 + thickness / 2, (height - windowHeight) / 4, 0);
        group.add(winBottom);

        // Window Glass
        const glass = new THREE.Mesh(new THREE.BoxGeometry(0.1, windowHeight, windowWidth), glassMat);
        glass.position.set(-width / 2 + thickness / 2, height / 2, 0);
        group.add(glass);

        // Front Wall (With Door)
        const doorWidth = 2.5;
        const doorHeight = 3;

        // Left of door
        const frontLeft = new THREE.Mesh(new THREE.BoxGeometry(width / 2 - doorWidth / 2, height, thickness), wallMat);
        frontLeft.position.set(-(width / 2 + doorWidth / 2) / 2, height / 2, depth / 2 - thickness / 2);
        frontLeft.castShadow = true;
        group.add(frontLeft);

        // Right of door
        const frontRight = new THREE.Mesh(new THREE.BoxGeometry(width / 2 - doorWidth / 2, height, thickness), wallMat);
        frontRight.position.set((width / 2 + doorWidth / 2) / 2, height / 2, depth / 2 - thickness / 2);
        frontRight.castShadow = true;
        group.add(frontRight);

        // Top of door
        const doorHeader = new THREE.Mesh(new THREE.BoxGeometry(doorWidth, height - doorHeight, thickness), wallMat);
        doorHeader.position.set(0, height - (height - doorHeight) / 2, depth / 2 - thickness / 2);
        group.add(doorHeader);

        // Door (Openable look, but static for now)
        const door = new THREE.Mesh(new THREE.BoxGeometry(doorWidth, doorHeight, thickness - 0.05), new THREE.MeshStandardMaterial({ color: 0x5d4037 })); // Dark Wood
        door.position.set(0, doorHeight / 2, depth / 2 - thickness / 2);
        group.add(door);

        // Door Handle
        const handle = new THREE.Mesh(new THREE.SphereGeometry(0.1), new THREE.MeshStandardMaterial({ color: 0xFFD700, metalness: 1, roughness: 0.2 }));
        handle.position.set(0.8, doorHeight / 2, depth / 2 + 0.1);
        group.add(handle);


        // Interior Setup
        // Bed
        const bedFrame = new THREE.Mesh(new THREE.BoxGeometry(3, 0.8, 5), new THREE.MeshStandardMaterial({ color: 0x555555 }));
        bedFrame.position.set(-3, 0.5, -3);
        bedFrame.userData = { type: 'Bed', action: '睡觉 (恢复精力)' };
        this.buildings.push(bedFrame); // Register for interaction
        group.add(bedFrame);

        const mattress = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.4, 4.8), new THREE.MeshStandardMaterial({ color: 0xffffff }));
        mattress.position.set(-3, 1.0, -3);
        group.add(mattress);
        const pillow = new THREE.Mesh(new THREE.BoxGeometry(2, 0.3, 1), new THREE.MeshStandardMaterial({ color: 0xeeeeee }));
        pillow.position.set(-3, 1.3, -4.5);
        group.add(pillow);

        // Desk
        const deskGroup = new THREE.Group();
        deskGroup.position.set(3, 0, 3);
        const desk = new THREE.Mesh(new THREE.BoxGeometry(4, 0.1, 2), new THREE.MeshStandardMaterial({ color: 0x8d6e63 }));
        desk.position.y = 1.5;
        deskGroup.add(desk);
        const leg1 = new THREE.Mesh(new THREE.BoxGeometry(0.2, 1.5, 0.2), new THREE.MeshStandardMaterial({ color: 0x333333 }));
        leg1.position.set(-1.9, 0.75, 0.9);
        deskGroup.add(leg1);
        const leg2 = new THREE.Mesh(new THREE.BoxGeometry(0.2, 1.5, 0.2), new THREE.MeshStandardMaterial({ color: 0x333333 }));
        leg2.position.set(1.9, 0.75, 0.9);
        deskGroup.add(leg2);

        // Chair
        const chair = new THREE.Mesh(new THREE.BoxGeometry(1, 0.1, 1), new THREE.MeshStandardMaterial({ color: 0x333333 }));
        chair.position.set(0, 0.8, 1.5);
        deskGroup.add(chair);
        const chairBack = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 0.1), new THREE.MeshStandardMaterial({ color: 0x333333 }));
        chairBack.position.set(0, 1.3, 2);
        deskGroup.add(chairBack);

        // Laptop
        const laptopBase = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.05, 0.5), new THREE.MeshStandardMaterial({ color: 0xcccccc }));
        laptopBase.position.set(0, 1.55, 0);
        deskGroup.add(laptopBase);
        const laptopScreen = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.5, 0.05), new THREE.MeshStandardMaterial({ color: 0x111111 }));
        laptopScreen.position.set(0, 1.8, -0.25);
        laptopScreen.rotation.x = -0.2;
        deskGroup.add(laptopScreen);

        deskGroup.userData = { type: 'Desk', action: '工作 (赚钱)' };
        this.buildings.push(deskGroup); // Register interaction
        group.add(deskGroup);

        // Kitchen Area
        const kitchenGroup = new THREE.Group();
        kitchenGroup.position.set(-3, 0, 3);

        // Fridge
        const fridge = new THREE.Mesh(new THREE.BoxGeometry(1.5, 3, 1.5), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.2, metalness: 0.5 }));
        fridge.position.set(-1, 1.5, 1);
        kitchenGroup.add(fridge);

        // Counter
        const counter = new THREE.Mesh(new THREE.BoxGeometry(3, 1.5, 1.5), new THREE.MeshStandardMaterial({ color: 0xeeeeee }));
        counter.position.set(1.5, 0.75, 1);
        kitchenGroup.add(counter);

        // Stove
        const stove = new THREE.Mesh(new THREE.BoxGeometry(1.5, 1.6, 1.5), new THREE.MeshStandardMaterial({ color: 0x222222 }));
        stove.position.set(1.5, 0.75, 1); // Merge with counter visually? Or replace part.
        // Let's just put it on top? No, built-in.
        kitchenGroup.add(stove);

        kitchenGroup.userData = { type: 'Kitchen', action: '做饭/吃饭 (恢复饥饿)' };
        this.buildings.push(kitchenGroup);
        group.add(kitchenGroup);

        // Living Area
        const livingGroup = new THREE.Group();
        livingGroup.position.set(0, 0, 0);

        // Sofa
        const sofa = new THREE.Group();
        sofa.position.set(0, 0, 0); // Center room?
        const sofaBase = new THREE.Mesh(new THREE.BoxGeometry(4, 0.8, 1.5), new THREE.MeshStandardMaterial({ color: 0x8d6e63 })); // Leather
        sofaBase.position.y = 0.4;
        sofa.add(sofaBase);
        const sofaBack = new THREE.Mesh(new THREE.BoxGeometry(4, 1.5, 0.5), new THREE.MeshStandardMaterial({ color: 0x8d6e63 }));
        sofaBack.position.set(0, 0.75, -0.5);
        sofa.add(sofaBack);

        livingGroup.add(sofa);
        livingGroup.position.set(0, 0, 0); // Re-adjust
        // Move sofa to side
        sofa.position.set(0, 0, -1);

        // TV Stand & TV
        const tvStand = new THREE.Mesh(new THREE.BoxGeometry(3, 0.6, 1), new THREE.MeshStandardMaterial({ color: 0x444444 }));
        tvStand.position.set(0, 0.3, 2);
        livingGroup.add(tvStand);

        const tv = new THREE.Mesh(new THREE.BoxGeometry(2.5, 1.5, 0.1), new THREE.MeshStandardMaterial({ color: 0x000000, roughness: 0.1 }));
        tv.position.set(0, 1.4, 2);
        livingGroup.add(tv);

        sofa.userData = { type: 'Sofa', action: '看电视/休息 (恢复心情)' };
        this.buildings.push(sofa); // Interactive Sofa
        group.add(livingGroup);

        // Shower Stall (Visual) - Restored
        const shower = new THREE.Group();
        shower.position.set(3.5, 0.1, -3.5); // Corner

        const sBase = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.1, 2.5), new THREE.MeshStandardMaterial({ color: 0xFFFFFF }));
        sBase.position.y = 0.05;
        shower.add(sBase);

        const sGlass = new THREE.Mesh(new THREE.BoxGeometry(0.1, 2.5, 2.5), glassMat);
        sGlass.position.set(-1.25, 1.25, 0);
        shower.add(sGlass);

        const sGlassFront = new THREE.Mesh(new THREE.BoxGeometry(2.5, 2.5, 0.1), glassMat);
        sGlassFront.position.set(0, 1.25, 1.25);
        shower.add(sGlassFront);

        const sHead = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.2, 8), new THREE.MeshStandardMaterial({ color: 0x888888 }));
        sHead.position.set(0, 2.2, 0);
        sHead.rotation.x = Math.PI;
        shower.add(sHead);

        shower.userData = { type: 'Shower', action: '洗澡 (恢复卫生)' };
        this.buildings.push(shower);
        group.add(shower);

        // Creative Character Props (Uniqueness)
        if (name.includes('Neighbor A')) {
            // Gaming Theme
            const pcCase = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.6, 0.6), new THREE.MeshStandardMaterial({ color: 0x111111, emissive: 0x00ffff, emissiveIntensity: 0.5 }));
            pcCase.position.set(4, 1.8, 3.5);
            group.add(pcCase);
            const dualMonitor = new THREE.Mesh(new THREE.BoxGeometry(2, 0.6, 0.05), new THREE.MeshBasicMaterial({ color: 0x111111 }));
            dualMonitor.position.set(3, 1.8, 2.5);
            group.add(dualMonitor);
        } else if (name.includes('Neighbor B')) {
            // Garden/Plant Theme
            for (let i = 0; i < 4; i++) {
                const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.2, 0.4), new THREE.MeshStandardMaterial({ color: 0x8B4513 }));
                pot.position.set(-4 + i * 2, 0.2, 0);
                group.add(pot);
                const leaves = new THREE.Mesh(new THREE.SphereGeometry(0.4), new THREE.MeshStandardMaterial({ color: 0x2E7D32 }));
                leaves.position.set(-4 + i * 2, 0.6, 0);
                group.add(leaves);
            }
        } else if (name.includes('Neighbor C')) {
            // Minimalist / Art Theme
            const easel = new THREE.Group();
            easel.position.set(3, 0, -2);
            const frame = new THREE.Mesh(new THREE.BoxGeometry(1, 1.5, 0.1), new THREE.MeshStandardMaterial({ color: 0xffffff }));
            frame.position.y = 1.5;
            easel.add(frame);
            group.add(easel);
        }

        return group;
    }


    createOffice(config = {}) {
        const group = new THREE.Group();
        const heightScale = config.scale || 1;
        const floors = Math.floor(8 * heightScale);
        const glassColor = config.glassColor || 0x88ccff;

        const wallMat = new THREE.MeshPhysicalMaterial({
            color: config.color || 0x888888,
            roughness: 0.2,
            metalness: 0.5
        });

        // Building Height calculation
        const towerHeight = floors * 4;
        const lobbyHeight = 6;

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

        // Upper Tower
        const towerGeo = new THREE.BoxGeometry(12, towerHeight, 12);
        const towerMat = new THREE.MeshStandardMaterial({ color: config.color || 0xAAAAAA });
        const tower = new THREE.Mesh(towerGeo, towerMat);
        tower.position.y = lobbyHeight + towerHeight / 2;
        tower.castShadow = true;
        group.add(tower);

        // Windows for Tower
        const windowGeo = new THREE.PlaneGeometry(1.5, 2);
        const windowMat = new THREE.MeshBasicMaterial({ color: glassColor });

        // Add windows per floor
        for (let f = 0; f < floors; f++) {
            const h = lobbyHeight + 2 + (f * 4);
            if (h > lobbyHeight + towerHeight - 2) continue;

            for (let x = -4; x <= 4; x += 3) {
                // Front
                const win = new THREE.Mesh(windowGeo, windowMat);
                win.position.set(x, h, 6.01);
                group.add(win);
                // Back
                const winBack = win.clone();
                winBack.position.set(x, h, -6.01);
                winBack.rotation.y = Math.PI;
                group.add(winBack);
                // Sides
                const winLeft = win.clone();
                winLeft.position.set(-6.01, h, x);
                winLeft.rotation.y = -Math.PI / 2;
                group.add(winLeft);
                const winRight = win.clone();
                winRight.position.set(6.01, h, x);
                winRight.rotation.y = Math.PI / 2;
                group.add(winRight);
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


    addUrbanProps() {
        // Add random props around the map (along pseudo-sidewalks)
        const propCount = 60;
        for (let i = 0; i < propCount; i++) {
            const type = Math.random();
            const x = (Math.random() - 0.5) * 350;
            const z = (Math.random() - 0.5) * 350;

            // Avoid placing props inside buildings (crude check)
            if (Math.abs(x) < 30 && Math.abs(z) < 30) continue;

            if (type < 0.3) {
                // Fire Hydrant
                const hydrant = new THREE.Group();
                const body = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.8), new THREE.MeshStandardMaterial({ color: 0xFF0000 }));
                body.position.y = 0.4;
                hydrant.add(body);
                const cap = new THREE.Mesh(new THREE.SphereGeometry(0.22), new THREE.MeshStandardMaterial({ color: 0xFF0000 }));
                cap.position.y = 0.8;
                hydrant.add(cap);
                hydrant.position.set(x, 0, z);
                this.scene.add(hydrant);
            } else if (type < 0.6) {
                // Mailbox
                const mailbox = new THREE.Group();
                const post = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 1.2), new THREE.MeshStandardMaterial({ color: 0x333333 }));
                post.position.y = 0.6;
                mailbox.add(post);
                const box = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.4, 0.6), new THREE.MeshStandardMaterial({ color: 0x1976D2 }));
                box.position.y = 1.3;
                mailbox.add(box);
                mailbox.position.set(x, 0, z);
                this.scene.add(mailbox);
            } else {
                // Trash Can
                const bin = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.3, 1), new THREE.MeshStandardMaterial({ color: 0x444444 }));
                bin.position.set(x, 0.5, z);
                this.scene.add(bin);
            }
        }
    }
}
