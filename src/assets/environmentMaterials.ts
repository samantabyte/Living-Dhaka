import * as THREE from 'three';
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';

const ROOT = `${import.meta.env.BASE_URL}assets/realistic-env/`;

function configure(texture: THREE.Texture, repeat: number, color = false) {
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(repeat, repeat);
  texture.anisotropy = 8;
  if (color) texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

async function material(loader: THREE.TextureLoader, prefix: string, repeat: number) {
  const [map, normalMap, roughnessMap] = await Promise.all([
    loader.loadAsync(`${ROOT}${prefix}_Color.jpg`), loader.loadAsync(`${ROOT}${prefix}_Normal.jpg`), loader.loadAsync(`${ROOT}${prefix}_Roughness.jpg`),
  ]);
  return new THREE.MeshStandardMaterial({
    map: configure(map, repeat, true), normalMap: configure(normalMap, repeat), roughnessMap: configure(roughnessMap, repeat),
    roughness: 0.92, metalness: 0.02, normalScale: new THREE.Vector2(0.55, 0.55),
  });
}

export async function loadEnvironmentMaterials(renderer: THREE.WebGLRenderer, scene: THREE.Scene) {
  const loader = new THREE.TextureLoader();
  const [asphalt, concrete, grass, hdr] = await Promise.all([
    material(loader, 'Asphalt', 3), material(loader, 'Concrete', 3), material(loader, 'Grass', 34),
    new RGBELoader().loadAsync(`${ROOT}urban_street_01_2k.hdr`),
  ]);
  hdr.mapping = THREE.EquirectangularReflectionMapping;
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromEquirectangular(hdr).texture;
  hdr.dispose(); pmrem.dispose();
  return { asphalt, concrete, grass };
}

