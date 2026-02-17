import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';

export class AssetLoader {
    constructor() {
        this.loader = new GLTFLoader();
        const dracoLoader = new DRACOLoader();
        dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.6/');
        this.loader.setDRACOLoader(dracoLoader);

        this.cache = new Map();
        this.promiseCache = new Map();
    }

    async loadModel(url) {
        if (this.cache.has(url)) {
            return this.cache.get(url).clone();
        }

        if (this.promiseCache.has(url)) {
            const gltf = await this.promiseCache.get(url);
            return gltf.scene.clone();
        }

        const promise = new Promise((resolve, reject) => {
            this.loader.load(url, (gltf) => {
                this.cache.set(url, gltf.scene);
                resolve(gltf);
            }, undefined, reject);
        });

        this.promiseCache.set(url, promise);
        const gltf = await promise;
        return gltf.scene.clone();
    }
}

export const assetLoader = new AssetLoader();
