"use client";
import type * as T from "three";
import { useEffect, useRef } from "react";
import { HERO_PARTY, type HeroModel } from "@/core/hero-models";

/**
 * Real-time 3D hero stage (WebGL, three.js): physically based sky at golden hour, image-based
 * lighting, soft shadows, displaced terrain, mountains, sun dust and the hero party.
 *
 * Swappable assets:
 *  - Characters: /public/hero/<job>.glb (see core/hero-models.ts). Idle animations play if present.
 *  - Background: NEXT_PUBLIC_HERO_HDRI_URL = a 4K .hdr photo (e.g. a CC0 HDRI). Replaces the sky.
 */
const HDRI = process.env.NEXT_PUBLIC_HERO_HDRI_URL;

export function HeroStage3D({ className = "", party = HERO_PARTY }: { className?: string; party?: HeroModel[] }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = ref.current;
    if (!host) return;
    let disposed = false;
    let cleanup = () => {};

    (async () => {
      const THREE = await import("three");
      const { Sky } = await import("three/examples/jsm/objects/Sky.js");
      const { GLTFLoader } = await import("three/examples/jsm/loaders/GLTFLoader.js");
      if (disposed) return;

      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 0.55;
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      host.appendChild(renderer.domElement);
      renderer.domElement.style.cssText = "width:100%;height:100%;display:block";

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 4000);
      const target = new THREE.Vector3(0, 1.25, 0);

      // ── Sky + sun ─────────────────────────────────────────────
      const sun = new THREE.Vector3();
      const sunElevation = 9, sunAzimuth = 205;
      const sky = new Sky();
      sky.scale.setScalar(3000);
      const u = sky.material.uniforms;
      u.turbidity.value = 6; u.rayleigh.value = 2.2; u.mieCoefficient.value = 0.006; u.mieDirectionalG.value = 0.86;
      sun.setFromSphericalCoords(1, THREE.MathUtils.degToRad(90 - sunElevation), THREE.MathUtils.degToRad(sunAzimuth));
      u.sunPosition.value.copy(sun);
      scene.add(sky);

      const pmrem = new THREE.PMREMGenerator(renderer);
      const envScene = new THREE.Scene();
      const envSky = new Sky(); envSky.scale.setScalar(3000);
      Object.assign(envSky.material.uniforms, sky.material.uniforms);
      envScene.add(envSky);
      scene.environment = pmrem.fromScene(envScene, 0.02).texture;
      scene.fog = new THREE.FogExp2(new THREE.Color("#d7b49a"), 0.0016);

      if (HDRI) {
        const { HDRLoader } = await import("three/examples/jsm/loaders/HDRLoader.js");
        new HDRLoader().load(HDRI, (tex) => {
          tex.mapping = THREE.EquirectangularReflectionMapping;
          scene.background = tex; scene.environment = tex; sky.visible = false;
          scene.fog = new THREE.FogExp2(new THREE.Color("#9aa3ad"), 0.006);
        });
      }

      const key = new THREE.DirectionalLight("#ffd2a1", 3.2);
      key.position.copy(sun).multiplyScalar(40).setY(14);
      key.castShadow = true;
      key.shadow.mapSize.set(2048, 2048);
      key.shadow.camera.left = -8; key.shadow.camera.right = 8; key.shadow.camera.top = 8; key.shadow.camera.bottom = -8;
      key.shadow.bias = -0.0004; key.shadow.normalBias = 0.02; key.shadow.radius = 4;
      scene.add(key);
      const rim = new THREE.DirectionalLight("#8fb4ff", 1.4); rim.position.set(-6, 5, -8); scene.add(rim);
      scene.add(new THREE.HemisphereLight("#ffd9b0", "#2a2f22", 0.35));

      // ── Terrain ───────────────────────────────────────────────
      const noise = (x: number, z: number) =>
        Math.sin(x * 0.21) * Math.cos(z * 0.17) * 0.9 + Math.sin(x * 0.63 + z * 0.41) * 0.25 + Math.sin(x * 1.7 - z * 1.3) * 0.06;
      const ground = new THREE.PlaneGeometry(900, 900, 300, 300);
      ground.rotateX(-Math.PI / 2);
      const pos = ground.attributes.position as T.BufferAttribute;
      const colors: number[] = [];
      const grass = new THREE.Color("#3f5a24"), dry = new THREE.Color("#6f7a3a"), rock = new THREE.Color("#6d655a");
      for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i), z = pos.getZ(i);
        const d = Math.hypot(x, z);
        const plateau = Math.max(0, 1 - d / 5); // flat stage where the party stands
        const h = noise(x, z) * (1 - plateau) * Math.min(1, d / 12) * 1.6 + Math.max(0, d - 40) * 0.03;
        pos.setY(i, h);
        const c = grass.clone().lerp(dry, Math.min(1, Math.max(0, noise(x * 2, z * 2) * 0.5 + 0.5))).lerp(rock, plateau * 0.85);
        colors.push(c.r, c.g, c.b);
      }
      ground.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
      ground.computeVertexNormals();
      const groundMesh = new THREE.Mesh(ground, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95 }));
      groundMesh.receiveShadow = true;
      scene.add(groundMesh);

      // Distant mountain ranges
      // Distant ridgelines: rings of displaced terrain fading into the haze
      const ridge = (radius: number, base: number, amp: number, seed: number, color: string) => {
        const geo = new THREE.CylinderGeometry(radius, radius, 1, 512, 12, true);
        const rp = geo.attributes.position as T.BufferAttribute;
        for (let i = 0; i < rp.count; i++) {
          const x = rp.getX(i), z = rp.getZ(i), y = rp.getY(i) + 0.5; // 0 bottom .. 1 top
          const a = Math.atan2(z, x);
          const n = Math.abs(Math.sin(a * 3 + seed)) * 0.5 + Math.abs(Math.sin(a * 7.3 + seed * 2)) * 0.3 + Math.abs(Math.sin(a * 17.1 + seed * 3)) * 0.14 + Math.sin(a * 41 + seed) * 0.04;
          const h = base + n * amp;
          const yy = y * h - 2;
          const pull = 1 - y * 0.04; // slopes lean toward the viewer
          rp.setXYZ(i, x * pull, yy, z * pull);
        }
        geo.computeVertexNormals();
        const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color, roughness: 1, side: THREE.BackSide }));
        scene.add(m);
      };
      ridge(900, 20, 70, 1.3, "#7d86a0");
      ridge(520, 8, 26, 4.1, "#56624f");
      // Rocks around the stage
      const rockMat = new THREE.MeshStandardMaterial({ color: "#7b7468", roughness: 0.9, flatShading: true });
      for (let k = 0; k < 40; k++) {
        const a = k * 2.399, r = 5.5 + (k * 7.3) % 18;
        const s = 0.15 + ((k * 13) % 10) / 14;
        const rk = new THREE.Mesh(new THREE.DodecahedronGeometry(s, 0), rockMat);
        rk.position.set(Math.cos(a) * r, noise(Math.cos(a) * r, Math.sin(a) * r) * 0.6 + s * 0.3, Math.sin(a) * r);
        rk.rotation.set(k, k * 2, k * 3);
        rk.scale.y = 0.6;
        rk.castShadow = rk.receiveShadow = true;
        scene.add(rk);
      }
      // Stone platform
      const plat = new THREE.Mesh(new THREE.CylinderGeometry(3.6, 3.9, 0.35, 48), new THREE.MeshStandardMaterial({ color: "#8b8378", roughness: 0.8, metalness: 0.05 }));
      plat.position.y = 0.05; plat.receiveShadow = plat.castShadow = true;
      scene.add(plat);

      // Sunlit dust
      const dustGeo = new THREE.BufferGeometry();
      const dp = new Float32Array(600 * 3);
      for (let i = 0; i < 600; i++) { dp[i * 3] = (Math.random() - 0.5) * 16; dp[i * 3 + 1] = Math.random() * 5; dp[i * 3 + 2] = (Math.random() - 0.5) * 10; }
      dustGeo.setAttribute("position", new THREE.BufferAttribute(dp, 3));
      const dust = new THREE.Points(dustGeo, new THREE.PointsMaterial({ color: "#ffd9a8", size: 0.025, transparent: true, opacity: 0.7, depthWrite: false, blending: THREE.AdditiveBlending }));
      scene.add(dust);

      // ── Heroes ────────────────────────────────────────────────
      const mixers: T.AnimationMixer[] = [];
      const standIns: { g: T.Group; phase: number }[] = [];
      const loader = new GLTFLoader();
      const spacing = 1.25;

      const mat = (c: string, rough = 0.8, metal = 0) => new THREE.MeshStandardMaterial({ color: c, roughness: rough, metalness: metal });
      const standIn = (h: HeroModel) => {
        const g = new THREE.Group();
        const s = h.height / 1.8;
        const cloth = mat(h.colors.cloth, 0.85), trim = mat(h.colors.trim, 0.35, 0.8), skin = mat("#d9a888", 0.6), steel = mat("#c9ced6", 0.25, 1), wood = mat("#5b3b22", 0.7);
        const add = (geo: ConstructorParameters<typeof T.Mesh>[0], m: T.Material, x: number, y: number, z: number, rx = 0, rz = 0) => {
          const mesh = new THREE.Mesh(geo, m); mesh.position.set(x, y, z); mesh.rotation.set(rx, 0, rz); mesh.castShadow = mesh.receiveShadow = true; g.add(mesh); return mesh;
        };
        add(new THREE.CapsuleGeometry(0.075, 0.62, 6, 12), mat("#2b2a2e", 0.8), -0.1, 0.42, 0);
        add(new THREE.CapsuleGeometry(0.075, 0.62, 6, 12), mat("#2b2a2e", 0.8), 0.1, 0.42, 0);
        add(new THREE.CylinderGeometry(0.09, 0.1, 0.12, 12), mat("#3a2a1e", 0.7), -0.1, 0.06, 0.02);
        add(new THREE.CylinderGeometry(0.09, 0.1, 0.12, 12), mat("#3a2a1e", 0.7), 0.1, 0.06, 0.02);
        add(new THREE.CapsuleGeometry(0.2, 0.42, 8, 16), cloth, 0, 1.12, 0);
        add(new THREE.CylinderGeometry(0.24, 0.3, 0.42, 20, 1, true), cloth, 0, 0.78, 0); // tunic skirt
        add(new THREE.TorusGeometry(0.205, 0.03, 8, 24), trim, 0, 0.92, 0, Math.PI / 2); // belt
        add(new THREE.SphereGeometry(0.15, 24, 18), skin, 0, 1.6, 0.01);
        const hair = add(new THREE.SphereGeometry(0.158, 24, 18, 0, Math.PI * 2, 0, Math.PI * 0.55), mat(h.colors.hair, 0.55), 0, 1.62, -0.005);
        hair.rotation.x = -0.25;
        add(new THREE.CapsuleGeometry(0.055, 0.5, 6, 12), cloth, -0.27, 1.08, 0, 0, 0.12);
        add(new THREE.CapsuleGeometry(0.055, 0.5, 6, 12), cloth, 0.27, 1.08, 0.04, -0.15, -0.1);
        // cloak
        const cloak = add(new THREE.CylinderGeometry(0.26, 0.42, 1.15, 24, 1, true, Math.PI * 0.6, Math.PI * 0.8), mat(h.colors.cloth, 0.95), 0, 0.85, -0.02);
        (cloak.material as T.MeshStandardMaterial).side = THREE.DoubleSide;
        add(new THREE.SphereGeometry(0.045, 12, 12), trim, 0, 1.38, 0.17); // clasp
        // weapons
        if (h.weapon === "staff") {
          add(new THREE.CylinderGeometry(0.02, 0.025, 1.7, 10), wood, 0.36, 0.85, 0.12);
          const orb = add(new THREE.SphereGeometry(0.07, 20, 16), new THREE.MeshStandardMaterial({ color: "#7cc4ff", emissive: "#4aa8ff", emissiveIntensity: 2.5, roughness: 0.1 }), 0.36, 1.75, 0.12);
          orb.castShadow = false;
          const l = new THREE.PointLight("#5fb2ff", 1.2, 2.5); l.position.set(0.36, 1.75, 0.2); g.add(l);
        }
        if (h.weapon === "sword") {
          add(new THREE.BoxGeometry(0.06, 0.95, 0.012), steel, 0, 0.55, 0.3);
          add(new THREE.BoxGeometry(0.26, 0.04, 0.05), trim, 0, 1.03, 0.3);
          add(new THREE.CylinderGeometry(0.02, 0.02, 0.18, 8), mat("#2a1a12"), 0, 1.13, 0.3);
        }
        if (h.weapon === "axe-shield") {
          add(new THREE.CylinderGeometry(0.3, 0.3, 0.05, 32), mat("#5b3b22", 0.7), -0.36, 0.95, 0.12, Math.PI / 2, 0);
          add(new THREE.TorusGeometry(0.3, 0.025, 8, 32), steel, -0.36, 0.95, 0.15);
          add(new THREE.CylinderGeometry(0.022, 0.022, 1.0, 8), wood, 0.38, 0.62, 0.1);
          add(new THREE.BoxGeometry(0.28, 0.22, 0.02), steel, 0.48, 1.05, 0.1);
          add(new THREE.ConeGeometry(0.17, 0.42, 10, 1, false, 0, Math.PI), mat(h.colors.hair, 0.9), 0, 1.38, 0.13, Math.PI, 0); // beard
        }
        if (h.weapon === "bow") {
          add(new THREE.TorusGeometry(0.6, 0.015, 8, 40, Math.PI * 0.8), wood, -0.32, 1.0, 0.1, 0, Math.PI / 2 + Math.PI * 0.1);
          add(new THREE.CylinderGeometry(0.06, 0.05, 0.5, 12), mat("#5b3b22"), 0.12, 1.2, -0.2, 0.3, -0.4);
        }
        if (h.weapon === "daggers") add(new THREE.BoxGeometry(0.03, 0.3, 0.01), steel, 0.3, 0.75, 0.12);
        if (h.weapon === "crossbow") {
          add(new THREE.BoxGeometry(0.06, 0.06, 0.62), wood, 0.22, 1.0, 0.25);
          add(new THREE.TorusGeometry(0.22, 0.015, 8, 24, Math.PI), steel, 0.22, 1.0, 0.52, Math.PI / 2, 0);
        }
        g.scale.setScalar(s);
        return g;
      };

      party.forEach((h, i) => {
        const x = (i - (party.length - 1) / 2) * spacing;
        const z = -Math.abs(i - (party.length - 1) / 2) * 0.35;
        const place = (obj: T.Object3D) => { obj.position.set(x, 0.23, z); obj.rotation.y = -x * 0.12; scene.add(obj); };
        const fallback = () => { const g = standIn(h); place(g); standIns.push({ g, phase: i * 1.3 }); };
        if (!h.ready) return fallback();
        loader.load(h.file, (gltf) => {
          const m = gltf.scene;
          const box = new THREE.Box3().setFromObject(m);
          m.scale.setScalar(h.height / Math.max(0.01, box.max.y - box.min.y));
          m.traverse((o) => { const mesh = o as T.Mesh; if (mesh.isMesh) { mesh.castShadow = mesh.receiveShadow = true; } });
          place(m);
          if (gltf.animations.length) {
            const mixer = new THREE.AnimationMixer(m);
            const idle = gltf.animations.find((a) => /idle/i.test(a.name)) ?? gltf.animations[0];
            mixer.clipAction(idle).play();
            mixers.push(mixer);
          }
        }, undefined, fallback);
      });

      // ── Loop ──────────────────────────────────────────────────
      const mouse = { x: 0, y: 0 };
      const onMove = (e: PointerEvent) => { mouse.x = e.clientX / window.innerWidth - 0.5; mouse.y = e.clientY / window.innerHeight - 0.5; };
      window.addEventListener("pointermove", onMove, { passive: true });
      const resize = () => {
        const w = host.clientWidth, hgt = host.clientHeight;
        renderer.setSize(w, hgt, false);
        camera.aspect = w / hgt;
        camera.fov = w / hgt < 1 ? 46 : 30;
        camera.updateProjectionMatrix();
      };
      const ro = new ResizeObserver(resize); ro.observe(host); resize();

      const clock = new THREE.Clock();
      let raf = 0, visible = true, camX = 0, camY = 0;
      const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; });
      io.observe(host);
      const frame = () => {
        raf = requestAnimationFrame(frame);
        if (!visible) return;
        const dt = Math.min(clock.getDelta(), 0.05), t = clock.elapsedTime;
        camX += (mouse.x - camX) * 0.04; camY += (mouse.y - camY) * 0.04;
        const orbit = reduce ? 0 : Math.sin(t * 0.08) * 0.12;
        camera.position.set(Math.sin(orbit + camX * 0.35) * 8.6, 1.35 - camY * 0.4, Math.cos(orbit + camX * 0.35) * 8.6);
        camera.lookAt(target);
        mixers.forEach((m) => m.update(dt));
        if (!reduce) {
          standIns.forEach(({ g, phase }) => { g.position.y = 0.23 + Math.sin(t * 1.6 + phase) * 0.006; g.rotation.z = Math.sin(t * 0.8 + phase) * 0.012; });
          const p = dustGeo.attributes.position as T.BufferAttribute;
          for (let i = 0; i < p.count; i++) { let y = p.getY(i) + dt * 0.08; if (y > 5) y = 0; p.setY(i, y); p.setX(i, p.getX(i) + Math.sin(t + i) * dt * 0.02); }
          p.needsUpdate = true;
        }
        renderer.render(scene, camera);
      };
      frame();

      cleanup = () => {
        cancelAnimationFrame(raf); ro.disconnect(); io.disconnect();
        window.removeEventListener("pointermove", onMove);
        renderer.dispose(); pmrem.dispose();
        scene.traverse((o) => { const m = o as T.Mesh; if (m.geometry) m.geometry.dispose(); });
        renderer.domElement.remove();
      };
      if (disposed) cleanup();
    })();

    return () => { disposed = true; cleanup(); };
  }, [party]);

  return <div ref={ref} className={`overflow-hidden ${className || "relative"}`} aria-label="3D hero party" role="img" />;
}
