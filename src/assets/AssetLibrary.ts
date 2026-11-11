import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const ROOT = '/assets/cc0-city/';

export class AssetLibrary {
  private loader = new GLTFLoader();
  private cache = new Map<string, THREE.Group>();

  async load(name: string) {
    if (!this.cache.has(name)) {
      const gltf = await this.loader.loadAsync(`${ROOT}${name}`);
      gltf.scene.traverse(object => {
        if (object instanceof THREE.Mesh) {
          object.castShadow = true;
          object.receiveShadow = true;
          const materials = Array.isArray(object.material) ? object.material : [object.material];
          for (const material of materials) {
            if (material instanceof THREE.MeshStandardMaterial) {
              material.roughness = Math.min(0.88, material.roughness);
              material.envMapIntensity = 0.65;
            }
          }
        }
      });
      this.cache.set(name, gltf.scene);
    }
    return this.cache.get(name)!.clone(true);
  }

  async normalized(name: string, targetFootprint: number, facingPositiveZ = false) {
    const model = await this.load(name);
    const initial = new THREE.Box3().setFromObject(model);
    const size = initial.getSize(new THREE.Vector3());
    const footprint = Math.max(size.x, size.z, 0.001);
    const scale = targetFootprint / footprint;
    model.scale.setScalar(scale);
    if (facingPositiveZ) model.rotation.y = Math.PI;
    model.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(model);
    const center = box.getCenter(new THREE.Vector3());
    model.position.x -= center.x;
    model.position.z -= center.z;
    model.position.y -= box.min.y;
    return model;
  }
}
