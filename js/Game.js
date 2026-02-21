import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';
import { World } from './World.js';
import { Character } from './Character.js';
import { DigitalTwinEngine } from './DigitalTwin.js';
import { Car } from './Car.js';

export class Game {
    constructor() {
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x87CEEB); // Sky Blue Background for brightness
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.shadowMap.enabled = true;
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.2;
        this.renderer.outputColorSpace = THREE.SRGBColorSpace;
        document.body.appendChild(this.renderer.domElement);

        this.clock = new THREE.Clock();

        // Lighting
        this.ambientLight = new THREE.AmbientLight(0xffffff, 0.8); // Neutral white ambient
        this.scene.add(this.ambientLight);

        // Hemisphere Light for natural sky/ground bounce
        this.hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 1.2);
        this.scene.add(this.hemiLight);

        this.directionalLight = new THREE.DirectionalLight(0xffffff, 2.0);
        this.directionalLight.position.set(50, 100, 50);
        this.directionalLight.castShadow = true;
        this.directionalLight.shadow.camera.near = 0.1;
        this.directionalLight.shadow.camera.far = 1000;
        this.directionalLight.shadow.camera.left = -500;
        this.directionalLight.shadow.camera.right = 500;
        this.directionalLight.shadow.camera.top = 500;
        this.directionalLight.shadow.camera.bottom = -500;
        this.directionalLight.shadow.mapSize.width = 4096; // Higher res shadows
        this.directionalLight.shadow.mapSize.height = 4096;
        this.scene.add(this.directionalLight);

        // Sun Mesh (Visual representation)
        const sunGeo = new THREE.SphereGeometry(15, 32, 32);
        const sunMat = new THREE.MeshBasicMaterial({ color: 0xFFFACD, toneMapped: false }); // Pale golden
        this.sunMesh = new THREE.Mesh(sunGeo, sunMat);
        this.scene.add(this.sunMesh);
        this.scene.fog = new THREE.FogExp2(0xcceefb, 0.001); // Light blue atmospheric fog
        this.buildings = [];
        this.npcs = [];
        this.init();
    }

    init() {
        // Scene setup (moved from constructor)
        // this.setupScene(); // Not explicitly defined, but implied by existing scene setup
        // this.setupCamera(); // Not explicitly defined, but implied by existing camera setup
        // this.setupLights(); // Not explicitly defined, but implied by existing light setup

        // Core Components (moved from constructor)
        this.world = new World(this.scene);
        this.buildings = this.world.buildings; // Link buildings for interaction reference

        this.character = new Character(this.scene, this.camera);
        // Start near home
        this.character.mesh.position.set(-15, 0, -15);
        // this.updateCamera(); // This method is not defined in the original code, keeping it commented as per instruction

        this.digitalTwin = new DigitalTwinEngine(this.scene, this.camera);
        this.digitalTwin.init(this.buildings);

        // Spawn Car
        this.car = new Car(this.scene, -10, 0, -20);
        this.isDriving = false;

        // Spawn NPCs
        import('./Character.js').then(module => {
            const npcPositions = [];
            const spacing = 40;
            const roadGridSize = 100;
            const offset = 12; // Sidewalk distance
            const mapBound = 200; // Limits to exactly a 2 or 3 block radius

            // Collect valid spots around roads (sidewalks)
            for (let x = -mapBound; x <= mapBound; x += roadGridSize) {
                for (let z = -mapBound; z <= mapBound; z += spacing) {
                    if (Math.abs(z % roadGridSize) > 15 && Math.random() > 0.5) {
                        npcPositions.push({ x: x + (Math.random() > 0.5 ? offset : -offset), z: z });
                    }
                }
            }
            // Shuffle and pick 30
            npcPositions.sort(() => 0.5 - Math.random());

            for (let i = 0; i < 30 && i < npcPositions.length; i++) {
                const pos = npcPositions[i];
                this.npcs.push(new module.NPC(this.scene, pos.x, pos.z, i));
            }
        });

        // Camera setup (TPS initial perspective)
        this.camera.position.set(-15, 15, 10); // Elevated and behind start pos

        // Controls (moved from constructor)
        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
        this.controls.minDistance = 5;
        this.controls.maxDistance = 500;
        this.controls.maxPolarAngle = Math.PI / 2 - 0.1; // Prevent going below ground

        this.fpsControls = new PointerLockControls(this.camera, document.body);

        // Game State (these remain in constructor as they are state variables)
        this.gameTime = 8 * 60; // Start at 8:00 AM (in minutes)
        this.day = 1;
        this.timeSpeed = 2; // Slower passage of time (was 10)
        this.isFirstPerson = false;

        this.loadGame();

        // Event Listeners
        window.addEventListener('resize', this.onWindowResize.bind(this));
        window.addEventListener('interaction', this.handleInteraction.bind(this));
        window.addEventListener('itemUsed', (e) => this.showMessage(e.detail.message));

        window.addEventListener('keydown', (e) => {
            const key = e.key.toLowerCase();
            if (key === 'v') { // Toggle camera view
                this.toggleCameraView();
            }
            if (key === '1') {
                this.character.stats.money += 100;
                this.showMessage("作弊: 金钱 +$100");
            }
            if (key === '2') {
                this.character.stats.hunger = 100;
                this.character.stats.energy = 100;
                this.character.stats.health = 100;
                this.character.stats.hygiene = 100;
                this.character.stats.stress = 0;
                this.showMessage("作弊: 状态全满");
            }
            if (key === '4') {
                this.gameTime = 12 * 60; // Noon
                this.showMessage("时间控制: 已切换至白天");
            }
            if (key === '5') {
                this.gameTime = 0 * 60; // Midnight
                this.showMessage("时间控制: 已切换至黑夜");
            }
            if (key === 't') {
                const active = this.digitalTwin.toggle();
                this.showMessage(active ? "数字孪生引擎: 启动" : "数字孪生引擎: 关闭");
            }
            if (key === 'f' && this.isDriving) { // Exit car
                this.toggleDriving();
            }
        });

        // Pass keyboard events to car if driving
        window.addEventListener('keydown', (e) => {
            if (this.isDriving && this.car) {
                const key = e.key.toLowerCase();
                if (this.car.keys.hasOwnProperty(key)) this.car.keys[key] = true;
            }
        });
        window.addEventListener('keyup', (e) => {
            if (this.isDriving && this.car) {
                const key = e.key.toLowerCase();
                if (this.car.keys.hasOwnProperty(key)) this.car.keys[key] = false;
            }
        });

        // Unlock FPS controls on escape (built-in, but we need to sync state)
        this.fpsControls.addEventListener('unlock', () => {
            if (this.isFirstPerson) {
                // If we unlocked via ESC, maybe we should switch back to TP?
                // Or just show pause menu? For now, let's switch back to TP for simplicity if user escapes.
                this.isFirstPerson = false;
                this.fpsControls.unlock(); // Ensure
                this.controls.enabled = true;
                this.character.mesh.visible = true; // Show character
                this.showMessage("第三人称视角");
                // Reset camera position relative to char
                this.controls.object.position.set(0, 10, 20).add(this.character.mesh.position);
            }
        });

        // Flashlight (attached to camera)
        this.flashlight = new THREE.SpotLight(0xffffff, 1); // Intensity 2 at night?
        this.flashlight.position.set(0.5, -0.5, 0); // Handheld position offset
        this.flashlight.target.position.set(0, 0, -5);
        this.camera.add(this.flashlight);
        this.camera.add(this.flashlight.target);
        this.scene.add(this.camera); // Ensure camera is in scene for light to work

        // Auto-save every 10 seconds
        setInterval(this.saveGame.bind(this), 10000);
    }

    updateLighting(time) {
        // time: 0-1440
        // Day: 360(6am) - 1080(6pm)
        let sunIntensity = 0;
        let moonIntensity = 0;

        // Calculate Sun Position
        // Noon (720) = Top (0, 100, 0)
        // Sunrise (360) = East (-100, 0, 0)
        // Sunset (1080) = West (100, 0, 0)

        let angle = 0;
        const radius = 200; // Distance of sun from center

        if (time >= 360 && time <= 1080) {
            // Day
            // Map 360-1080 to -PI/2 to PI/2
            const percent = (time - 360) / 720;
            angle = (percent * Math.PI) - Math.PI / 2;

            // Calculate position
            const x = Math.sin(angle) * radius;
            const y = Math.cos(angle) * radius;
            const z = 20; // Slight offset

            this.sunMesh.visible = true;
            this.sunMesh.position.set(x, y, z);
            this.directionalLight.position.set(x, y, z);

            if (time < 480) sunIntensity = (time - 360) / 120; // Sunrise ramp
            else if (time > 960) sunIntensity = 1 - (time - 960) / 120; // Sunset ramp
            else sunIntensity = 1;

        } else {
            // Night
            this.sunMesh.visible = false;
            moonIntensity = 0.3;
            // Position moon opposite to sun? Or just static night light
            this.directionalLight.position.set(50, 100, 50); // Static moon pos
        }

        const isNight = moonIntensity > 0 || sunIntensity < 0.1;

        // Directional Light (Sun/Moon)
        if (isNight) {
            this.directionalLight.color.setHex(0xaaaaaa); // Moon color
            this.directionalLight.intensity = 0.4; // Night Light
            this.ambientLight.color.setHex(0x222255); // Night Ambient
            this.ambientLight.intensity = 0.8;
            this.scene.background = new THREE.Color(0x000022);
            if (this.scene.fog) this.scene.fog.color.setHex(0x000022);
        } else {
            this.directionalLight.color.setHex(0xffffff);
            this.directionalLight.intensity = sunIntensity * 2.0;
            this.ambientLight.color.setHex(0x404040);
            this.ambientLight.intensity = Math.max(0.8, sunIntensity * 1.5);

            // Sky Color Interpolation
            const dayColor = new THREE.Color(0x87CEEB);
            const dawnColor = new THREE.Color(0xFF4500);
            let skyColor = dayColor;

            if (sunIntensity < 1) {
                skyColor = dawnColor.clone().lerp(dayColor, sunIntensity);
            }
            this.scene.background = skyColor;
            if (this.scene.fog) this.scene.fog.color.copy(skyColor);
        }

        // Flashlight
        this.flashlight.intensity = isNight ? 2 : 0;

        // Sync Material Updates (StreetLights, Neons)
        if (this.world) this.world.updateMaterials(time);
    }

    saveGame() {
        const saveData = {
            gameTime: this.gameTime,
            day: this.day,
            stats: this.character.stats,
            inventory: this.character.inventory,
            position: {
                x: this.character.mesh.position.x,
                y: this.character.mesh.position.y,
                z: this.character.mesh.position.z
            }
        };
        localStorage.setItem('virtualLifeSave', JSON.stringify(saveData));
        // console.log('Game Saved');
        // this.showMessage('游戏已保存'); // Spammy
    }

    loadGame() {
        const saveString = localStorage.getItem('virtualLifeSave');
        if (saveString) {
            const saveData = JSON.parse(saveString);
            this.gameTime = saveData.gameTime;
            this.day = saveData.day;
            if (saveData.stats) {
                this.character.stats = saveData.stats;
            }
            if (saveData.inventory) {
                this.character.inventory = saveData.inventory;
            }
            if (saveData.position) {
                this.character.mesh.position.set(saveData.position.x, saveData.position.y, saveData.position.z);
            }
            console.log('Game Loaded');
        }
    }

    start() {
        this.animate();
    }

    onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    toggleCameraView() {
        if (this.isFirstPerson) {
            // Switch to Third Person
            this.isFirstPerson = false;
            this.fpsControls.unlock();
            this.controls.enabled = true;
            this.character.mesh.visible = true;
            // Reset camera position relative to char
            this.controls.object.position.set(0, 15, 25).add(this.character.mesh.position);
            this.showMessage("第三人称视角");
        } else {
            // Switch to First Person
            this.isFirstPerson = true;
            this.controls.enabled = false; // Disable orbit
            this.fpsControls.lock(); // Lock mouse
            this.character.mesh.visible = false; // Hide character (we are the character)

            // Move camera to head position
            this.camera.position.copy(this.character.mesh.position).add(new THREE.Vector3(0, 1.7, 0));
            this.showMessage("第一人称视角 (WASD 移动, 鼠标观察)");
        }
    }

    toggleDriving() {
        if (this.isDriving) {
            // Exit Car
            this.isDriving = false;
            this.car.exit();
            this.character.mesh.visible = true;
            this.character.movementEnabled = true;
            this.character.mesh.position.copy(this.car.mesh.position).add(new THREE.Vector3(3, 0, 0)); // Spawn next to car
            this.showMessage("已下车 (按 E 重新驾驶)");
        } else {
            // Enter Car
            this.isDriving = true;
            this.car.enter();
            this.character.mesh.visible = false;
            this.character.movementEnabled = false;
            this.isFirstPerson = false; // Force TP for driving
            if (this.fpsControls.isLocked) this.fpsControls.unlock();
            this.controls.enabled = true;
            this.showMessage("正在驾驶 (WASD 控制, F 下车)");
        }
    }

    showMessage(text) {
        const msg = document.getElementById('game-message');
        msg.innerText = text;
        msg.classList.remove('hidden');

        // Reset animation
        msg.style.animation = 'none';
        msg.offsetHeight; /* trigger reflow */
        msg.style.animation = 'fadeOut 3s forwards';

        setTimeout(() => {
            msg.classList.add('hidden');
        }, 3000);
    }

    handleInteraction(e) {
        const type = e.detail.type;
        const character = this.character;

        if (type === 'Home') {
            // Sleep
            character.stats.energy = 100;
            this.gameTime = 8 * 60; // Wake up at 8 AM next day
            this.day++;
            this.showMessage("睡了个好觉，精力恢复了！");
        } else if (type === 'Car') {
            this.toggleDriving();
        } else if (type === 'Desk') {
            // Write Code (Work)
            if (character.stats.energy >= 20) {
                character.stats.energy -= 20;
                character.stats.hunger -= 15;
                character.stats.money += 100; // Programmers earn more!
                this.gameTime += 2 * 60; // 2 hours of coding
                this.showMessage("重构了一下代码... 金钱 +$100");
            } else {
                this.showMessage("脑子瓦特了！需要休息。");
            }
        } else if (type === 'Office') {
            this.showMessage("进入办公室找到你的工位。");
        } else if (type === 'Shop') {
            // Buy Food
            if (character.stats.money >= 10) {
                character.stats.money -= 10;
                character.inventory.push({ name: 'Apple', type: 'food', value: 20 });
                this.showMessage("买了一个苹果！按 I 食用。");
                console.log("Inventory:", character.inventory);
            } else {
                this.showMessage("钱不够！");
            }
        } else if (type === 'Restaurant') {
            // Fancy Meal
            if (character.stats.money >= 50) {
                character.stats.money -= 50;
                character.stats.hunger = 100;
                character.stats.energy = Math.min(100, character.stats.energy + 20);
                this.showMessage("豪华晚餐，真香！ (饥饿度满，精力 +20)");
            } else {
                this.showMessage("太贵了！ ($50)");
            }
        } else if (type === 'Park') {
            // Relax
            character.stats.energy = Math.min(100, character.stats.energy + 10);
            this.gameTime += 30; // 30 mins
            this.showMessage("在公园放松了一下... 精力 +10");
        } else if (type === 'Shower') {
            character.stats.hygiene = 100;
            character.stats.energy = Math.min(100, character.stats.energy + 5);
            character.stats.stress = Math.max(0, character.stats.stress - 20);
            this.gameTime += 15; // 15 mins
            this.showMessage("洗了个热水澡，真舒服！ (清洁度满，压力 -20)");
        } else if (type === 'Hospital') {
            character.stats.energy = 100;
            character.stats.hunger = Math.min(100, character.stats.hunger + 20);
            character.stats.money -= 100;
            this.showMessage("在医院接受治疗。健康恢复！ (-$100)");
        } else if (type === 'Gym') {
            if (character.stats.energy >= 30) {
                character.stats.energy -= 30;
                character.stats.hunger -= 20;
                this.showMessage("锻炼身体！感觉强壮了！ (-精力)");
            } else {
                this.showMessage("太累了，练不动！");
            }
        } else if (type === 'Library') {
            this.gameTime += 60;
            this.showMessage("读了一本关于 JavaScript 的书。知识 +1");
        } else if (type === 'Cafe') {
            if (character.stats.money >= 15) {
                character.stats.money -= 15;
                character.stats.hunger = Math.min(100, character.stats.hunger + 30);
                character.stats.energy = Math.min(100, character.stats.energy + 10);
                this.showMessage("享受了一杯咖啡和牛角包。 (-$15)");
            } else {
                this.showMessage("咖啡太贵了！需要 $15。");
            }
        } else if (type === 'Cinema') {
            if (character.stats.money >= 30) {
                character.stats.money -= 30;
                this.gameTime += 120; // 2 hours
                this.showMessage("看了一场精彩的电影！开心！ (-$30)");
            } else {
                this.showMessage("票价 $30。");
            }
        } else if (type === 'School') {
            this.gameTime += 60;
            this.showMessage("上了一堂课。学习中... (+经验)");
        } else if (type === 'Bank') {
            this.showMessage(`当前余额: $${character.stats.money}。 (安全可靠)`);
        } else if (type === 'Supermarket') {
            if (character.stats.money >= 20) {
                character.stats.money -= 20;
                character.inventory.push({ name: 'Grocery Bag', type: 'food', value: 50 });
                this.showMessage("在超市大采购！获得食品包 (价值 50)。");
            } else { this.showMessage("钱不够买杂货！ ($20)"); }
        } else if (type === 'Bakery') {
            if (character.stats.money >= 5) {
                character.stats.money -= 5;
                character.stats.hunger = Math.min(100, character.stats.hunger + 10);
                this.showMessage("买了新鲜面包！ 真香。 (-$5, 饥饿 +10)");
            } else { this.showMessage("面包 $5 一个。"); }
        } else if (type === 'Ice Cream Shop') {
            if (character.stats.money >= 3) {
                character.stats.money -= 3;
                character.stats.hunger += 5;
                character.stats.energy += 2;
                this.showMessage("冰淇淋！开心！ (-$3)");
            } else { this.showMessage("钱不够。"); }
        } else if (type === 'Pizza Place') {
            if (character.stats.money >= 15) {
                character.stats.money -= 15;
                character.stats.hunger = Math.min(100, character.stats.hunger + 40);
                this.showMessage("吃了披萨！ (-$15)");
            } else { this.showMessage("披萨 $15。"); }
        } else if (type === 'Burger Joint') {
            if (character.stats.money >= 10) {
                character.stats.money -= 10;
                character.stats.hunger = Math.min(100, character.stats.hunger + 30);
                this.showMessage("汉堡真好吃！ (-$10)");
            } else { this.showMessage("汉堡 $10。"); }
        } else if (type === 'Sushi Bar') {
            if (character.stats.money >= 30) {
                character.stats.money -= 30;
                character.stats.hunger = Math.min(100, character.stats.hunger + 25);
                character.stats.energy += 5;
                this.showMessage("精致的寿司。 (-$30)");
            } else { this.showMessage("寿司很贵。 ($30)"); }
        } else if (type === 'Bar') {
            if (character.stats.money >= 20) {
                character.stats.money -= 20;
                character.stats.energy -= 10;
                this.showMessage("喝了一杯。有点晕... (-$20, -精力)");
            } else { this.showMessage("酒水 $20。"); }
        } else if (type === 'Club') {
            if (character.stats.money >= 50) {
                character.stats.money -= 50;
                character.stats.energy -= 20;
                this.showMessage("蹦迪一整晚！好嗨哟！ (-$50, -精力)");
            } else { this.showMessage("入场费 $50。"); }
        } else if (type === 'Pharmacy') {
            if (character.stats.money >= 20) {
                character.stats.money -= 20;
                this.showMessage("买了维生素。 感觉健康了！ (-$20)");
            } else { this.showMessage("药品 $20。"); }
        } else if (type === 'Police Station') {
            this.showMessage("警察局: 这里的治安很好。");
        } else if (type === 'Fire Station') {
            this.showMessage("消防局: 随时待命！");
        } else if (type === 'Post Office') {
            this.showMessage("邮局: 没有你的信件。");
        } else if (type === 'Mechanic') {
            this.showMessage("修车店!");
        } else if (type === 'Gas Station') {
            if (character.stats.money >= 20) {
                character.stats.money -= 20;
                this.showMessage("加满油了！ (-$20)");
            } else { this.showMessage("没钱加油。"); }
        } else if (type === 'Barber Shop') {
            if (character.stats.money >= 15) {
                character.stats.money -= 15;
                this.showMessage("剪了个帅气的发型！ (-$15)");
            } else { this.showMessage("理发 $15。"); }
        } else if (type === 'Pet Store') {
            this.showMessage("好多可爱的猫猫狗狗！ (云吸猫)");
        } else if (type === 'Bookstore') {
            character.stats.money -= 10;
            this.gameTime += 30;
            this.showMessage("买了一本书。 (-$10)");
        } else if (type === 'Tech Store') {
            if (character.stats.money >= 500) {
                character.stats.money -= 500;
                this.showMessage("买了新电脑组建！ (-$500)");
            } else { this.showMessage("电子产品好贵... 看一眼。"); }
        } else if (type === 'Toy Store') {
            if (character.stats.money >= 20) {
                character.stats.money -= 20;
                this.showMessage("买了个玩具模型。 (-$20)");
            }
        } else if (type === 'Clothing Store') {
            if (character.stats.money >= 40) {
                character.stats.money -= 40;
                this.showMessage("买了新衣服！ (-$40)");
            } else { this.showMessage("衣服 $40。"); }
        } else if (type === 'Jewelry Store') {
            if (character.stats.money >= 1000) {
                this.showMessage("买不起... 太闪了！");
            } else { this.showMessage("看看就好。"); }
        } else if (type === 'Florist') {
            if (character.stats.money >= 10) {
                character.stats.money -= 10;
                this.showMessage("买了束花。 (-$10)");
            }
        } else if (type === 'Arcade') {
            if (character.stats.money >= 5) {
                character.stats.money -= 5;
                this.showMessage("玩了一局街机！ 快乐！ (-$5)");
            }
        } else if (type === 'Casino') {
            if (character.stats.money >= 100) {
                const win = Math.random() > 0.5;
                if (win) {
                    const winAmount = Math.floor(Math.random() * 200);
                    character.stats.money += winAmount;
                    this.showMessage(`赌赢了！！！ (+$${winAmount})`);
                } else {
                    character.stats.money -= 50;
                    this.showMessage("输了... (-$50)");
                }
            } else { this.showMessage("没钱别来赌！ (需 $100)"); }
        } else if (type === 'Museum' || type === 'Art Gallery') {
            this.gameTime += 60;
            this.showMessage("接受艺术熏陶... (时间流逝)");
        } else if (type === 'Stadium') {
            this.showMessage("这里正在举办比赛！");
        } else if (type === 'University') {
            this.gameTime += 120;
            character.stats.money -= 200; // Tuition?
            this.showMessage("进修课程。 (-$200, +知识)");
        } else if (type === 'Church') {
            this.showMessage("内心获得了平静。");
        } else if (type === 'Hotel') {
            if (character.stats.money >= 100) {
                character.stats.money -= 100;
                character.stats.energy = 100;
                this.gameTime = 8 * 60;
                this.day++;
                this.showMessage("在豪华酒店住了一晚。 精力全满！ (-$100)");
            } else { this.showMessage("住不起酒店。"); }
        } else if (type === 'Shop') {
            // ... existing Shop logic ...
            if (character.stats.money >= 10) {
                character.stats.money -= 10;
                character.inventory.push({ name: 'Apple', type: 'food', value: 20 });
                this.showMessage("买了一个苹果！按 I 食用。");
            } else {
                this.showMessage("钱不够！");
            }
        }
    }

    updateTime(deltaTime) {
        this.gameTime += deltaTime * this.timeSpeed;

        if (this.gameTime >= 24 * 60) {
            this.gameTime = 0;
            this.day++;
        }

        // Update UI
        const hours = Math.floor(this.gameTime / 60);
        const minutes = Math.floor(this.gameTime % 60);
        document.getElementById('time').innerText = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
        document.getElementById('day-counter').innerText = this.day;
    }

    updateLighting(gameTime) {
        const hours = gameTime / 60;

        // Calculate day progress (0 = midnight, 12 = noon, 24 = midnight)
        let progress = hours / 24;

        // Sun elevation (smooth sine wave, peaking at noon)
        // Adjust formula so 6am is 0 (horizon), 12pm is 1 (zenith), 18pm is 0
        const sunAngle = (hours - 6) / 12 * Math.PI;

        // Push sun far away so it doesn't clip with buildings
        const sunDist = 800;
        this.sunMesh.position.set(
            Math.cos(sunAngle) * sunDist,
            Math.max(-50, Math.sin(sunAngle) * sunDist), // Don't go too far below horizon
            -sunDist * 0.5 // Offset slightly to cast diagonal shadows
        );

        // Make light follow the physical sun mesh
        this.directionalLight.position.copy(this.sunMesh.position);

        // Colors
        const skyNight = new THREE.Color(0x050510);
        const skyDawn = new THREE.Color(0xffaa55);
        const skyDay = new THREE.Color(0x87CEEB);

        const lightNight = new THREE.Color(0x223355);
        const lightDawn = new THREE.Color(0xffbb77);
        const lightDay = new THREE.Color(0xffffff);

        let currentSky = new THREE.Color();
        let currentLight = new THREE.Color();
        let currentIntensity = 0;

        // Blending logic based on time
        if (hours >= 5 && hours < 8) {
            // Dawn transition
            const t = (hours - 5) / 3;
            currentSky.lerpColors(skyNight, skyDawn, t).lerp(skyDay, Math.max(0, t - 0.5) * 2);
            currentLight.lerpColors(lightNight, lightDawn, t).lerp(lightDay, Math.max(0, t - 0.5) * 2);
            currentIntensity = 0.5 + t * 2.0;
        } else if (hours >= 8 && hours < 17) {
            // Full Day
            currentSky.copy(skyDay);
            currentLight.copy(lightDay);
            currentIntensity = 2.5;
        } else if (hours >= 17 && hours < 20) {
            // Dusk transition
            const t = (hours - 17) / 3;
            currentSky.lerpColors(skyDay, skyDawn, t).lerp(skyNight, Math.max(0, t - 0.5) * 2);
            currentLight.lerpColors(lightDay, lightDawn, t).lerp(lightNight, Math.max(0, t - 0.5) * 2);
            currentIntensity = 2.5 - t * 2.0;
        } else {
            // Night
            currentSky.copy(skyNight);
            currentLight.copy(lightNight);
            currentIntensity = 0.3;
        }

        // Apply colors
        this.scene.background = currentSky;
        this.scene.fog.color = currentSky;

        this.directionalLight.color = currentLight;
        this.directionalLight.intensity = currentIntensity;
        // Keep ambient light slightly dimmer than main light
        this.ambientLight.intensity = Math.max(0.2, currentIntensity * 0.4);
    }

    animate() {
        requestAnimationFrame(this.animate.bind(this));

        const deltaTime = this.clock.getDelta();

        this.updateTime(deltaTime);
        this.updateLighting(this.gameTime); // New Lighting Control
        if (this.world.update) this.world.update(deltaTime, this.gameTime, this.character ? this.character.mesh.position : null);

        const interactables = [...this.world.buildings];
        if (this.car) interactables.push(this.car.mesh);

        this.character.update(deltaTime, interactables);
        if (this.car) this.car.update(deltaTime, this.world.buildings);

        if (this.isDriving && this.car) {
            // Car Driving: Camera follows car
            const carPos = this.car.mesh.position;
            const targetPos = carPos.clone().add(new THREE.Vector3(0, 2, 0));
            this.controls.target.copy(targetPos);

            // Camera position relative to car
            const offset = new THREE.Vector3(0, 8, -15);
            offset.applyQuaternion(this.car.mesh.quaternion);
            this.camera.position.copy(carPos).add(offset);

            this.controls.update();
        } else if (this.isFirstPerson) {
            // FPS: Camera follows character position (offset to head)
            this.camera.position.copy(this.character.mesh.position).add(new THREE.Vector3(0, 1.7, 0));
            // Rotation is handled by PointerLockControls
        } else {
            // TPS: Camera looks at character head
            const targetPos = this.character.mesh.position.clone().add(new THREE.Vector3(0, 1.8, 0));
            this.controls.target.copy(targetPos);
            this.controls.update(); // Only update OrbitControls when active
        }

        if (this.digitalTwin) this.digitalTwin.update(deltaTime, this.gameTime);

        this.renderer.render(this.scene, this.camera);
    }
}
