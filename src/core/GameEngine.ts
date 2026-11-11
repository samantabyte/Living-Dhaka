import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import { useGameStore } from '../state/gameStore';
import type { Quality, Vec2 } from '../types';
import { locations, roadLoop, distance } from '../world/locations';
import { sendPosition } from '../multiplayer/client';

interface TrafficCar { mesh: THREE.Group; segment: number; progress: number; speed: number; offset: number }

export class GameEngine {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(62, 1, 0.1, 1200);
  private world!: RAPIER.World;
  private carBody!: RAPIER.RigidBody;
  private carMesh = new THREE.Group();
  private keys = new Set<string>();
  private animationId = 0;
  private lastTime = performance.now();
  private accumulator = 0;
  private telemetryTimer = 0;
  private metricTimer = 0;
  private cameraMode = 0;
  private marker = new THREE.Group();
  private routeLine = new THREE.Line();
  private rain = new THREE.Points();
  private traffic: TrafficCar[] = [];
  private disposed = false;
  private resizeObserver: ResizeObserver;
  private quality: Quality;
  private previousSpeed = 0;
  private sun = new THREE.DirectionalLight(0xffefd1, 2.4);
  private clockMinutes = 8 * 60;

  constructor(private canvas: HTMLCanvasElement) {
    this.quality = useGameStore.getState().career.settings.quality;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: this.quality !== 'low', powerPreference: 'high-performance' });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(canvas.parentElement ?? canvas);
  }

  async start() {
    await RAPIER.init();
    this.world = new RAPIER.World({ x: 0, y: -9.81, z: 0 });
    this.buildScene();
    this.addListeners();
    this.resize();
    this.animate(performance.now());
  }

  private buildScene() {
    this.scene.background = new THREE.Color(0x9bc7d2);
    this.scene.fog = new THREE.Fog(0x9bc7d2, 180, 620);
    this.sun.position.set(-100, 180, 80);
    this.sun.castShadow = this.quality !== 'low';
    this.sun.shadow.mapSize.set(this.quality === 'high' ? 2048 : 1024, this.quality === 'high' ? 2048 : 1024);
    this.sun.shadow.camera.left = -180; this.sun.shadow.camera.right = 180; this.sun.shadow.camera.top = 180; this.sun.shadow.camera.bottom = -180;
    this.scene.add(this.sun, new THREE.HemisphereLight(0xb8ddff, 0x334426, 1.8));

    const ground = new THREE.Mesh(new THREE.PlaneGeometry(900, 900), new THREE.MeshStandardMaterial({ color: 0x4b6b48, roughness: 0.95 }));
    ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; this.scene.add(ground);
    this.world.createCollider(RAPIER.ColliderDesc.cuboid(450, 0.1, 450).setTranslation(0, -0.1, 0));
    this.buildRoads(); this.buildCity(); this.buildCar(); this.buildMarker(); this.buildRain(); this.buildTraffic();
  }

  private road(x: number, z: number, width: number, length: number, rotation = 0) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, 0.08, length), new THREE.MeshStandardMaterial({ color: 0x242a2c, roughness: 0.82, metalness: 0.05 }));
    mesh.position.set(x, 0.04, z); mesh.rotation.y = rotation; mesh.receiveShadow = true; this.scene.add(mesh);
    const dashMat = new THREE.MeshBasicMaterial({ color: 0xe9d68a });
    const alongZ = length >= width;
    const count = Math.floor((alongZ ? length : width) / 16);
    for (let i = 0; i < count; i++) {
      const dash = new THREE.Mesh(new THREE.BoxGeometry(alongZ ? 0.35 : 6, 0.02, alongZ ? 6 : 0.35), dashMat);
      dash.position.set(x + (alongZ ? 0 : -width / 2 + 8 + i * 16), 0.1, z + (alongZ ? -length / 2 + 8 + i * 16 : 0));
      this.scene.add(dash);
    }
  }

  private buildRoads() {
    this.road(0, 0, 32, 560); this.road(0, 0, 560, 30); this.road(0, -190, 520, 22); this.road(0, 195, 520, 22);
    this.road(-225, 2, 22, 410); this.road(225, 2, 22, 410); this.road(120, 65, 210, 18); this.road(-130, -80, 190, 18);
    const flyover = new THREE.Mesh(new THREE.BoxGeometry(18, 1.2, 170), new THREE.MeshStandardMaterial({ color: 0x41494a, roughness: 0.8 }));
    flyover.position.set(7, 4.5, -70); flyover.rotation.x = -0.015; flyover.receiveShadow = true; this.scene.add(flyover);
    for (let z = -145; z <= 10; z += 38) { const p = new THREE.Mesh(new THREE.BoxGeometry(3, 8, 3), new THREE.MeshStandardMaterial({ color: 0x777b78 })); p.position.set(7, 0, z); this.scene.add(p); }
  }

  private buildCity() {
    const colors = [0xd5b997, 0xc76e57, 0x7b9aa6, 0xe1d3ac, 0x879577, 0xa998b7];
    const buildingMat = colors.map(color => new THREE.MeshStandardMaterial({ color, roughness: 0.82 }));
    for (let gx = -280; gx <= 280; gx += 32) for (let gz = -280; gz <= 280; gz += 32) {
      const nearRoad = Math.abs(gx) < 28 || Math.abs(gz) < 27 || Math.abs(gz + 190) < 22 || Math.abs(gz - 195) < 22 || Math.abs(gx + 225) < 22 || Math.abs(gx - 225) < 22;
      if (nearRoad || Math.random() < 0.12) continue;
      const h = 10 + Math.random() * (Math.abs(gx) < 170 && gz < 30 ? 52 : 24);
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(22 + Math.random() * 5, h, 22 + Math.random() * 5), buildingMat[Math.floor(Math.random() * buildingMat.length)]);
      mesh.position.set(gx + (Math.random() - 0.5) * 5, h / 2, gz + (Math.random() - 0.5) * 5); mesh.castShadow = this.quality === 'high'; mesh.receiveShadow = true; this.scene.add(mesh);
      this.world.createCollider(RAPIER.ColliderDesc.cuboid(12, h / 2, 12).setTranslation(mesh.position.x, h / 2, mesh.position.z));
      if (Math.random() < 0.28) this.addSign(mesh.position.x, Math.min(h + 2, 14), mesh.position.z + 12.2, ['নগর', 'ঢাকা ক্যাফে', 'শাপলা', 'CITY MART'][Math.floor(Math.random() * 4)]);
    }
    for (const node of locations) {
      const color = node.kind === 'service' ? 0x49d17d : 0xf1b94b;
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.45, 4, 8), new THREE.MeshStandardMaterial({ color }));
      post.position.set(node.x, 2, node.z); this.scene.add(post);
    }
    const water = new THREE.Mesh(new THREE.PlaneGeometry(80, 48), new THREE.MeshStandardMaterial({ color: 0x286f85, roughness: 0.28, metalness: 0.2 }));
    water.rotation.x = -Math.PI / 2; water.position.set(-160, 0.12, 145); this.scene.add(water);
  }

  private addSign(x: number, y: number, z: number, text: string) {
    const canvas = document.createElement('canvas'); canvas.width = 256; canvas.height = 64;
    const context = canvas.getContext('2d')!; context.fillStyle = '#0b4f4a'; context.fillRect(0, 0, 256, 64); context.fillStyle = '#f4e9c7'; context.font = 'bold 28px sans-serif'; context.textAlign = 'center'; context.fillText(text, 128, 42);
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(canvas) })); sprite.position.set(x, y, z); sprite.scale.set(12, 3, 1); this.scene.add(sprite);
  }

  private makeCar(color: number) {
    const group = new THREE.Group();
    const body = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.75, 4.6), new THREE.MeshStandardMaterial({ color, metalness: 0.35, roughness: 0.28 }));
    body.position.y = 0.8; body.castShadow = true; group.add(body);
    const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.7, 2.4), new THREE.MeshStandardMaterial({ color: 0x173342, metalness: 0.4, roughness: 0.18 })); cabin.position.set(0, 1.45, -0.25); group.add(cabin);
    const wheelMat = new THREE.MeshStandardMaterial({ color: 0x111315, roughness: 0.9 });
    for (const x of [-1.12, 1.12]) for (const z of [-1.45, 1.45]) { const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.46, 0.46, 0.32, 16), wheelMat); wheel.rotation.z = Math.PI / 2; wheel.position.set(x, 0.46, z); group.add(wheel); }
    return group;
  }

  private buildCar() {
    this.carMesh = this.makeCar(0x13a89e); this.scene.add(this.carMesh);
    this.carBody = this.world.createRigidBody(RAPIER.RigidBodyDesc.dynamic().setTranslation(0, 1.2, 35).setLinearDamping(0.7).setAngularDamping(4));
    this.carBody.setEnabledRotations(false, true, false, true);
    this.world.createCollider(RAPIER.ColliderDesc.cuboid(1.05, 0.55, 2.2).setFriction(1.15).setRestitution(0.05).setMass(1100), this.carBody);
  }

  private buildMarker() {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(5, 0.45, 10, 32), new THREE.MeshBasicMaterial({ color: 0xf7c64f })); ring.rotation.x = Math.PI / 2;
    const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 1.5, 18, 12, 1, true), new THREE.MeshBasicMaterial({ color: 0xf7c64f, transparent: true, opacity: 0.2, side: THREE.DoubleSide })); beam.position.y = 9;
    this.marker.add(ring, beam); this.marker.visible = false; this.scene.add(this.marker);
    this.routeLine = new THREE.Line(new THREE.BufferGeometry(), new THREE.LineBasicMaterial({ color: 0x60e6d5, transparent: true, opacity: 0.8 })); this.scene.add(this.routeLine);
  }

  private buildRain() {
    const count = this.quality === 'low' ? 450 : this.quality === 'high' ? 1800 : 900;
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) { positions[i * 3] = (Math.random() - 0.5) * 180; positions[i * 3 + 1] = Math.random() * 70; positions[i * 3 + 2] = (Math.random() - 0.5) * 180; }
    const geometry = new THREE.BufferGeometry(); geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.rain = new THREE.Points(geometry, new THREE.PointsMaterial({ color: 0xb9dced, size: 0.22, transparent: true, opacity: 0.72 })); this.rain.visible = false; this.scene.add(this.rain);
  }

  private buildTraffic() {
    const count = this.quality === 'low' ? 8 : this.quality === 'high' ? 24 : 16;
    for (let i = 0; i < count; i++) { const mesh = this.makeCar([0xe1a23c, 0xc64f4b, 0x5677a4, 0xe5e0cf][i % 4]); mesh.scale.setScalar(0.82); this.scene.add(mesh); this.traffic.push({ mesh, segment: i % 4, progress: (i * 0.23) % 1, speed: 9 + (i % 4), offset: i % 2 ? 5 : -5 }); }
  }

  private addListeners() {
    window.addEventListener('keydown', this.onKeyDown); window.addEventListener('keyup', this.onKeyUp);
  }

  private onKeyDown = (event: KeyboardEvent) => {
    this.keys.add(event.code);
    if (event.repeat) return;
    if (event.code === 'Escape') useGameStore.getState().setPaused(!useGameStore.getState().paused);
    if (event.code === 'KeyC') this.cameraMode = (this.cameraMode + 1) % 2;
    if (event.code === 'KeyM') useGameStore.getState().toggleMap();
    if (event.code === 'KeyR') this.recover();
    if (event.code === 'F2') useGameStore.getState().setWeather(useGameStore.getState().weather === 'rain' ? 'clear' : 'rain');
  };
  private onKeyUp = (event: KeyboardEvent) => this.keys.delete(event.code);

  private fixedUpdate(dt: number) {
    const state = useGameStore.getState();
    if (state.paused || state.screen !== 'game') return;
    const rotation = this.carBody.rotation();
    const yaw = new THREE.Euler().setFromQuaternion(new THREE.Quaternion(rotation.x, rotation.y, rotation.z, rotation.w), 'YXZ').y;
    const forward = new THREE.Vector3(Math.sin(yaw), 0, Math.cos(yaw));
    const velocity = this.carBody.linvel();
    const forwardSpeed = velocity.x * forward.x + velocity.z * forward.z;
    const throttle = this.keys.has('KeyW') || this.keys.has('ArrowUp') ? 1 : this.keys.has('KeyS') || this.keys.has('ArrowDown') ? -0.7 : 0;
    const steer = this.keys.has('KeyA') || this.keys.has('ArrowLeft') ? 1 : this.keys.has('KeyD') || this.keys.has('ArrowRight') ? -1 : 0;
    const fuelFactor = state.career.fuel > 0 ? 1 : 0;
    const rainGrip = state.weather === 'rain' ? 0.82 : 1;
    const engine = 5400 * (1 + state.career.engineLevel * 0.15) * fuelFactor;
    if (throttle) this.carBody.addForce({ x: forward.x * throttle * engine, y: 0, z: forward.z * throttle * engine }, true);
    const steerStrength = Math.min(1, Math.abs(forwardSpeed) / 3) * 1550 * rainGrip;
    if (steer && Math.abs(forwardSpeed) > 0.5) this.carBody.addTorque({ x: 0, y: steer * steerStrength * Math.sign(forwardSpeed), z: 0 }, true);
    const lateral = new THREE.Vector3(velocity.x, 0, velocity.z).sub(forward.clone().multiplyScalar(forwardSpeed));
    this.carBody.addForce({ x: -lateral.x * 2300 * rainGrip, y: 0, z: -lateral.z * 2300 * rainGrip }, true);
    if (this.keys.has('Space')) this.carBody.addForce({ x: -velocity.x * 2600, y: 0, z: -velocity.z * 2600 }, true);
    const maxSpeed = 29 + state.career.engineLevel * 3;
    const planar = Math.hypot(velocity.x, velocity.z);
    if (planar > maxSpeed) this.carBody.setLinvel({ x: velocity.x * maxSpeed / planar, y: velocity.y, z: velocity.z * maxSpeed / planar }, true);
    this.world.step();
    this.metricTimer += dt;
    if (this.metricTimer >= 1) {
      const harsh = Math.abs(planar - this.previousSpeed) > 7 ? 1 : 0;
      const metrics = state.metrics;
      state.updateMetrics({ elapsedSeconds: metrics.elapsedSeconds + this.metricTimer, drivenKm: metrics.drivenKm + planar * this.metricTimer / 1000, harshEvents: metrics.harshEvents + harsh });
      if (planar > 1 && state.career.fuel > 0) {
        const career = { ...state.career, fuel: Math.max(0, state.career.fuel - planar * 0.0018) }; useGameStore.setState({ career });
      }
      this.previousSpeed = planar; this.metricTimer = 0;
    }
  }

  private updateRide() {
    const state = useGameStore.getState(); const target = this.getTarget();
    if (!target) { this.marker.visible = false; this.routeLine.visible = false; return; }
    this.marker.visible = true; this.routeLine.visible = true; this.marker.position.set(target.x, 0.5, target.z); this.marker.rotation.y += 0.008;
    const position = this.carBody.translation(); const d = distance({ x: position.x, z: position.z }, target);
    const points = [new THREE.Vector3(position.x, 0.35, position.z), new THREE.Vector3(target.x, 0.35, target.z)]; this.routeLine.geometry.dispose(); this.routeLine.geometry = new THREE.BufferGeometry().setFromPoints(points);
    if (state.rideState === 'accepted') state.advanceRide('approachingPickup');
    if (state.rideState === 'approachingPickup' && d < 10 && useGameStore.getState().speed < 12) { state.advanceRide('waitingForBoarding'); setTimeout(() => { if (useGameStore.getState().rideState === 'waitingForBoarding') useGameStore.getState().advanceRide('inTransit'); }, 1800); }
    if (state.rideState === 'inTransit' && d < 11 && useGameStore.getState().speed < 12) { state.advanceRide('arrived'); setTimeout(() => useGameStore.getState().finishRide(), 700); }
  }

  private getTarget(): Vec2 | null {
    const state = useGameStore.getState(); if (!state.offer) return null;
    if (['accepted', 'approachingPickup', 'waitingForBoarding'].includes(state.rideState)) return state.offer.pickup;
    if (['inTransit', 'arrived'].includes(state.rideState)) return state.offer.destination;
    return null;
  }

  private updateTraffic(dt: number) {
    for (const car of this.traffic) {
      const a = roadLoop[car.segment], b = roadLoop[car.segment + 1]; const length = distance(a, b);
      car.progress += car.speed * dt / length; if (car.progress >= 1) { car.progress -= 1; car.segment = (car.segment + 1) % (roadLoop.length - 1); }
      const nextA = roadLoop[car.segment], nextB = roadLoop[car.segment + 1]; const dx = nextB.x - nextA.x, dz = nextB.z - nextA.z, l = Math.hypot(dx, dz);
      car.mesh.position.set(nextA.x + dx * car.progress + (-dz / l) * car.offset, 0, nextA.z + dz * car.progress + (dx / l) * car.offset);
      car.mesh.rotation.y = Math.atan2(dx, dz);
    }
  }

  private updateRain(dt: number) {
    const raining = useGameStore.getState().weather === 'rain'; this.rain.visible = raining;
    if (!raining) return;
    const pos = this.rain.geometry.attributes.position as THREE.BufferAttribute; const car = this.carBody.translation();
    for (let i = 0; i < pos.count; i++) { let y = pos.getY(i) - 34 * dt; if (y < 0) y += 70; pos.setY(i, y); }
    pos.needsUpdate = true; this.rain.position.set(car.x, 0, car.z);
  }

  private animate = (time: number) => {
    if (this.disposed) return;
    const dt = Math.min(0.05, (time - this.lastTime) / 1000); this.lastTime = time; this.accumulator += dt;
    while (this.accumulator >= 1 / 60) { this.fixedUpdate(1 / 60); this.accumulator -= 1 / 60; }
    const p = this.carBody.translation(), r = this.carBody.rotation(); this.carMesh.position.set(p.x, p.y - 0.55, p.z); this.carMesh.quaternion.set(r.x, r.y, r.z, r.w);
    this.updateRide(); this.updateTraffic(dt); this.updateRain(dt); this.updateCamera(dt); this.updateEnvironment(dt);
    this.telemetryTimer += dt; if (this.telemetryTimer > 0.12) { const v = this.carBody.linvel(); const speed = Math.hypot(v.x, v.z) * 3.6; const target = this.getTarget(); useGameStore.getState().setTelemetry(speed, p.x, p.z, target ? distance({ x: p.x, z: p.z }, target) : 0); sendPosition(p.x, p.z, speed); this.telemetryTimer = 0; }
    this.renderer.render(this.scene, this.camera); this.animationId = requestAnimationFrame(this.animate);
  };

  private updateCamera(dt: number) {
    const p = this.carMesh.position; const forward = new THREE.Vector3(0, 0, 1).applyQuaternion(this.carMesh.quaternion);
    const target = this.cameraMode === 0 ? p.clone().add(forward.clone().multiplyScalar(-9)).add(new THREE.Vector3(0, 5.2, 0)) : p.clone().add(forward.clone().multiplyScalar(0.7)).add(new THREE.Vector3(0, 1.65, 0));
    const reduced = useGameStore.getState().career.settings.reducedShake; this.camera.position.lerp(target, 1 - Math.pow(reduced ? 0.002 : 0.0005, dt));
    this.camera.lookAt(p.clone().add(forward.clone().multiplyScalar(8)).add(new THREE.Vector3(0, 1, 0)));
  }

  private updateEnvironment(dt: number) {
    this.clockMinutes = (this.clockMinutes + dt * 1.8) % 1440; const angle = (this.clockMinutes / 1440) * Math.PI * 2 - Math.PI / 2;
    const daylight = THREE.MathUtils.clamp(Math.sin(angle) * 0.8 + 0.35, 0.08, 1); this.sun.intensity = 2.5 * daylight; this.sun.position.set(Math.cos(angle) * 180, Math.max(18, Math.sin(angle) * 180), 80);
    const rain = useGameStore.getState().weather === 'rain'; const sky = new THREE.Color(rain ? 0x617681 : daylight < 0.3 ? 0x101a35 : 0x9bc7d2); this.scene.background = sky; if (this.scene.fog) this.scene.fog.color.copy(sky);
  }

  private recover() {
    if (!this.carBody || Math.hypot(this.carBody.linvel().x, this.carBody.linvel().z) > 4) return;
    const p = this.carBody.translation(); this.carBody.setTranslation({ x: p.x, y: 1.5, z: p.z }, true); this.carBody.setRotation({ x: 0, y: 0, z: 0, w: 1 }, true); this.carBody.setLinvel({ x: 0, y: 0, z: 0 }, true); this.carBody.setAngvel({ x: 0, y: 0, z: 0 }, true);
  }

  private resize() {
    const parent = this.canvas.parentElement; const width = parent?.clientWidth ?? window.innerWidth, height = parent?.clientHeight ?? window.innerHeight;
    this.camera.aspect = width / Math.max(height, 1); this.camera.updateProjectionMatrix(); this.renderer.setPixelRatio(Math.min(devicePixelRatio, this.quality === 'high' ? 1.75 : this.quality === 'medium' ? 1.25 : 1)); this.renderer.setSize(width, height, false);
  }

  dispose() {
    this.disposed = true; cancelAnimationFrame(this.animationId); this.resizeObserver.disconnect(); window.removeEventListener('keydown', this.onKeyDown); window.removeEventListener('keyup', this.onKeyUp);
    this.scene.traverse(object => { if (object instanceof THREE.Mesh || object instanceof THREE.Points || object instanceof THREE.Line) { object.geometry?.dispose(); const material = object.material; if (Array.isArray(material)) material.forEach(m => m.dispose()); else material?.dispose(); } }); this.renderer.dispose();
  }
}
