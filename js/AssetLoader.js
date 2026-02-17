import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';

export class AssetLoader {
    constructor() {
        this.loader = new GLTFLoader();
        const dracoLoader = new DRACOLoader();
        dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.6/');
        this.loader.setDRACOLoader(dracoLoader);

        this.promiseCache = new Map();
    }

    /**
     * Loads the full GLTF result, cached.
     */
    async loadGLTF(url) {
        if (this.promiseCache.has(url)) {
            return await this.promiseCache.get(url);
        }

        const promise = new Promise((resolve, reject) => {
            this.loader.load(url, (gltf) => {
                resolve(gltf);
            }, undefined, reject);
        });

        this.promiseCache.set(url, promise);
        return await promise;
    }

    /**
     * Loads just the scene clone, cached.
     */
    async loadModel(url) {
        const gltf = await this.loadGLTF(url);
        return gltf.scene.clone();
    }
}

export const assetLoader = new AssetLoader();
