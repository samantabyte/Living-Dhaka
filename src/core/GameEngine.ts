import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import { useGameStore } from '../state/gameStore';
import type { Quality, Vec2 } from '../types';
import { locations, roadLoop, distance } from '../world/locations';
import { sendPosition } from '../multiplayer/client';
import { AssetLibrary } from '../assets/AssetLibrary';
import { stepDriveSpeed } from '../vehicle/vehicleDynamics';

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
  private assets = new AssetLibrary();
  private driveSpeed = 0;
  private steerInput = 0;
  private stuckTime = 0;

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
    await this.buildScene();
    this.addListeners();
    this.resize();
    this.animate(performance.now());
  }

  private async buildScene() {
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
    this.buildRoads(); this.buildCity(); await Promise.all([this.buildDetailedCity(), this.buildCar()]); this.buildMarker(); this.buildRain(); this.buildTraffic();
  }

  private road(x: number, z: number, width: number, length: number, rotation = 0) {
    const sidewalk = new THREE.Mesh(new THREE.BoxGeometry(width + 5, 0.22, length + 5), new THREE.MeshStandardMaterial({ color: 0xaaa69b, roughness: 0.94 }));
    sidewalk.position.set(x, 0.02, z); sidewalk.rotation.y = rotation; sidewalk.receiveShadow = true; this.scene.add(sidewalk);
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, 0.08, length), new THREE.MeshStandardMaterial({ color: 0x242a2c, roughness: 0.82, metalness: 0.05 }));
    mesh.position.set(x, 0.16, z); mesh.rotation.y = rotation; mesh.receiveShadow = true; this.scene.add(mesh);
    const dashMat = new THREE.MeshBasicMaterial({ color: 0xe9d68a });
    const alongZ = length >= width;
    const count = Math.floor((alongZ ? length : width) / 16);
    for (let i = 0; i < count; i++) {
      const dash = new THREE.Mesh(new THREE.BoxGeometry(alongZ ? 0.35 : 6, 0.02, alongZ ? 6 : 0.35), dashMat);
      dash.position.set(x + (alongZ ? 0 : -width / 2 + 8 + i * 16), 0.23, z + (alongZ ? -length / 2 + 8 + i * 16 : 0));
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
    for (let gx = -280; gx <= 280; gx += 32) for (let gz = -280; gz <= 280; gz += 32) {
      const nearRoad = Math.abs(gx) < 28 || Math.abs(gz) < 27 || Math.abs(gz + 190) < 22 || Math.abs(gz - 195) < 22 || Math.abs(gx + 225) < 22 || Math.abs(gx - 225) < 22;
      if (nearRoad || Math.random() < 0.12) continue;
      const h = 10 + Math.random() * (Math.abs(gx) < 170 && gz < 30 ? 52 : 24);
      const facade = this.makeFacadeMaterial(colors[Math.floor(Math.random() * colors.length)], Math.ceil(h / 5));
      const roof = new THREE.MeshStandardMaterial({ color: 0x3d4948, roughness: 0.9 });
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(22 + Math.random() * 5, h, 22 + Math.random() * 5), [facade, facade, roof, roof, facade, facade]);
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

  private makeFacadeMaterial(color: number, floors: number) {
    const canvas = document.createElement('canvas'); canvas.width = 128; canvas.height = 256;
    const context = canvas.getContext('2d')!; context.fillStyle = `#${color.toString(16).padStart(6, '0')}`; context.fillRect(0, 0, canvas.width, canvas.height);
    const rows = Math.max(2, Math.min(10, floors));
    for (let row = 0; row < rows; row++) for (let column = 0; column < 3; column++) {
      const lit = (row + column) % 4 === 0; context.fillStyle = lit ? '#d9c58a' : '#20343e';
      context.fillRect(10 + column * 40, 12 + row * (232 / rows), 25, Math.max(8, 14 - rows * 0.25));
    }
    const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace;
    return new THREE.MeshStandardMaterial({ color: 0xffffff, map: texture, roughness: 0.78, metalness: 0.04 });
  }

  private async buildDetailedCity() {
    const placements = [
      ['publicos-hospital.glb', 160, 135, 34, 0], ['publicos-universidade.glb', -145, -85, 38, Math.PI / 2],
      ['comercial-shopping.glb', 135, -135, 36, -Math.PI / 2], ['comercial-hotel.glb', 105, 210, 30, Math.PI],
      ['industrial-oficina.glb', 210, -75, 28, -Math.PI / 2], ['comercial-mercado.glb', -170, 45, 25, Math.PI / 2],
      ['comercial-restaurante.glb', 70, 48, 24, Math.PI], ['comercial-loja_esquina.glb', -75, 70, 24, 0],
      ['residencial-predio_alto.glb', 78, -80, 28, 0], ['residencial-predio_apartamentos.glb', -90, -145, 30, Math.PI],
      ['publicos-escola.glb', -165, 120, 30, Math.PI / 2], ['residencial-casas_geminadas.glb', 175, 55, 28, -Math.PI / 2],
    ] as const;
    await Promise.all(placements.map(async ([name, x, z, size, rotation]) => {
      const model = await this.assets.normalized(name, size); model.position.x += x; model.position.z += z; model.rotation.y += rotation; this.scene.add(model);
    }));
    const propPlacements: Array<[string, number, number, number]> = [];
    for (let z = -240; z <= 240; z += 42) { propPlacements.push(['mobiliario-poste_luz.glb', -19, z, 7], ['mobiliario-poste_luz.glb', 19, z, 7]); }
    for (let x = -245; x <= 245; x += 50) { propPlacements.push(['vegetacao-ipe_amarelo.glb', x, 35, 9], ['vegetacao-ipe_amarelo.glb', x, -35, 9]); }
    propPlacements.push(['mobiliario-ponto_onibus.glb', 27, -112, 9], ['mobiliario-semaforo.glb', 20, 20, 7], ['mobiliario-banco_praca.glb', -150, 175, 6]);
    await Promise.all(propPlacements.map(async ([name, x, z, size]) => { const model = await this.assets.normalized(name, size); model.position.x += x; model.position.z += z; this.scene.add(model); }));
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

  private async buildCar() {
    try { this.carMesh = await this.assets.normalized('veiculos-carro.glb', 4.6, true); }
    catch (error) { console.warn('CC0 car model failed to load; using fallback.', error); this.carMesh = this.makeCar(0x13a89e); }
    this.scene.add(this.carMesh);
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
    const throttle = this.keys.has('KeyW') || this.keys.has('ArrowUp') ? 1 : this.keys.has('KeyS') || this.keys.has('ArrowDown') ? -0.7 : 0;
    const steer = this.keys.has('KeyA') || this.keys.has('ArrowLeft') ? 1 : this.keys.has('KeyD') || this.keys.has('ArrowRight') ? -1 : 0;
    const fuelFactor = state.career.fuel > 0 ? 1 : 0;
    const rainGrip = state.weather === 'rain' ? 0.82 : 1;
    const position = this.carBody.translation(); const onRoad = this.isOnRoad(position.x, position.z);
    this.driveSpeed = stepDriveSpeed(this.driveSpeed, { throttle, handbrake: this.keys.has('Space'), dt, onRoad, engineLevel: state.career.engineLevel, brakeLevel: state.career.brakeLevel, hasFuel: fuelFactor > 0 });
    this.steerInput = THREE.MathUtils.lerp(this.steerInput, steer, 1 - Math.pow(0.0002, dt));
    const speedRatio = Math.min(1, Math.abs(this.driveSpeed) / 8);
    const steeringRate = this.steerInput * (0.42 + speedRatio * 0.75) * Math.sign(this.driveSpeed || 1) * rainGrip;
    const grip = onRoad ? rainGrip : 0.68;
    const desiredX = forward.x * this.driveSpeed, desiredZ = forward.z * this.driveSpeed;
    this.carBody.setLinvel({ x: THREE.MathUtils.lerp(velocity.x, desiredX, grip), y: velocity.y, z: THREE.MathUtils.lerp(velocity.z, desiredZ, grip) }, true);
    this.carBody.setAngvel({ x: 0, y: steeringRate, z: 0 }, true);
    this.world.step();
    const actual = this.carBody.linvel(); const planar = Math.hypot(actual.x, actual.z);
    if (throttle > 0 && Math.abs(this.driveSpeed) > 2 && planar < Math.max(1.2, Math.abs(this.driveSpeed) * 0.22)) this.stuckTime += dt; else this.stuckTime = 0;
    if (this.stuckTime > 2.2) { this.recoverToRoad(); this.stuckTime = 0; }
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
    if (!this.carBody || Math.hypot(this.carBody.linvel().x, this.carBody.linvel().z) > 5) return;
    this.recoverToRoad();
  }

  private isOnRoad(x: number, z: number) {
    return Math.abs(x) < 20 || Math.abs(z) < 19 || Math.abs(z + 190) < 16 || Math.abs(z - 195) < 16 || Math.abs(x + 225) < 16 || Math.abs(x - 225) < 16 || (Math.abs(z - 65) < 13 && x > 15 && x < 225) || (Math.abs(z + 80) < 13 && x > -225 && x < -35);
  }

  private recoverToRoad() {
    const p = this.carBody.translation();
    const candidates = [
      { x: 0, z: THREE.MathUtils.clamp(p.z, -270, 270), yaw: 0 }, { x: THREE.MathUtils.clamp(p.x, -270, 270), z: 0, yaw: Math.PI / 2 },
      { x: THREE.MathUtils.clamp(p.x, -250, 250), z: -190, yaw: Math.PI / 2 }, { x: THREE.MathUtils.clamp(p.x, -250, 250), z: 195, yaw: Math.PI / 2 },
      { x: -225, z: THREE.MathUtils.clamp(p.z, -205, 205), yaw: 0 }, { x: 225, z: THREE.MathUtils.clamp(p.z, -205, 205), yaw: 0 },
    ];
    const nearest = candidates.sort((a, b) => Math.hypot(a.x - p.x, a.z - p.z) - Math.hypot(b.x - p.x, b.z - p.z))[0];
    const half = nearest.yaw / 2; this.carBody.setTranslation({ x: nearest.x, y: 1.45, z: nearest.z }, true); this.carBody.setRotation({ x: 0, y: Math.sin(half), z: 0, w: Math.cos(half) }, true); this.carBody.setLinvel({ x: 0, y: 0, z: 0 }, true); this.carBody.setAngvel({ x: 0, y: 0, z: 0 }, true); this.driveSpeed = 0;
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
