"use client";

import React, { useEffect, useRef } from "react";
import * as THREE from "three";
import { FBXLoader } from "three/examples/jsm/loaders/FBXLoader.js";

/* ═══════════════════════════════════════════
   SAMURAI 3D MODEL VIEWER
   - Removed loading spinner completely per request
   - Loaded base color textures for armor, helmet, katana, and clothing
   - High-intensity bright 3-point lighting setup
   - Prominent, large, and centered model framing
   ═══════════════════════════════════════════ */

const textureMaps: Record<string, string> = {
  Belt: "/models/uploads_files_2573236_texturen/texturen/Belt/DefaultMaterial_Base_Color.png",
  Char: "/models/uploads_files_2573236_texturen/texturen/Char/Material_Base_Color.png",
  Chestplate: "/models/uploads_files_2573236_texturen/texturen/Chestplate/Material.003_Base_Color.png",
  ChestplateDeko: "/models/uploads_files_2573236_texturen/texturen/ChestplateDeko/Material.004_Base_Color.png",
  Eye: "/models/uploads_files_2573236_texturen/texturen/Eye/Material.019_Base_Color.png",
  ForearmProtection: "/models/uploads_files_2573236_texturen/texturen/ForearmProtection/Material.005_Base_Color.png",
  Helmet: "/models/uploads_files_2573236_texturen/texturen/Helmet/Material.002_Base_Color.png",
  Helmetband: "/models/uploads_files_2573236_texturen/texturen/Helmetband/Material.007_Base_Color.png",
  Helmetdeko: "/models/uploads_files_2573236_texturen/texturen/Helmetdeko/Material.006_Base_Color.png",
  Horn: "/models/uploads_files_2573236_texturen/texturen/Horn/Material.008_Base_Color.png",
  Katana: "/models/uploads_files_2573236_texturen/texturen/Katana/Material.011_Base_Color.png",
  KatanaSaya: "/models/uploads_files_2573236_texturen/texturen/KatanaSaya/Material.010_Base_Color.png",
  LegProtection: "/models/uploads_files_2573236_texturen/texturen/LegProtection/Material.011_Base_Color.png",
  Neckprotection: "/models/uploads_files_2573236_texturen/texturen/Neckprotection/Material.012_Base_Color.png",
  Shin: "/models/uploads_files_2573236_texturen/texturen/Shin/Material.013_Base_Color.png",
  Shirt: "/models/uploads_files_2573236_texturen/texturen/Shirt/DefaultMaterial_Base_Color.png",
  Shoulderprotection: "/models/uploads_files_2573236_texturen/texturen/Shoulderprotection/Material.015_Base_Color.png",
  Trouser: "/models/uploads_files_2573236_texturen/texturen/Trouser/DefaultMaterial_Base_Color.png",
  Wakizashi: "/models/uploads_files_2573236_texturen/texturen/Wakizashi/Material.017_Base_Color.png",
  WakizashiSaya: "/models/uploads_files_2573236_texturen/texturen/WakizashiSaya/Material.018_Base_Color.png",
  leg: "/models/uploads_files_2573236_texturen/texturen/leg/Material.020_Base_Color.png",
};

export function Samurai3DViewer({ className = "" }: { className?: string }) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let animationFrameId: number;
    let renderer: THREE.WebGLRenderer;

    try {
      // 1. Scene
      const scene = new THREE.Scene();

      // 2. Camera setup — Framed closer & larger
      const width = container.clientWidth || 360;
      const height = container.clientHeight || 500;
      const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 1000);
      camera.position.set(0, 0.8, 2.2);

      // 3. WebGL Renderer
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.setSize(width, height);
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.3;
      container.appendChild(renderer.domElement);

      // 4. Bright Studio & Rim Lighting
      const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444455, 2.2);
      scene.add(hemiLight);

      // Key Light (Warm Sunlight / Studio Light)
      const keyLight = new THREE.DirectionalLight(0xfff5e6, 3.5);
      keyLight.position.set(5, 8, 5);
      keyLight.castShadow = true;
      scene.add(keyLight);

      // Gold Rim Light
      const goldRim = new THREE.DirectionalLight(0xb49b64, 2.5);
      goldRim.position.set(-5, 4, 3);
      scene.add(goldRim);

      // Front Ambient Fill
      const frontFill = new THREE.DirectionalLight(0xffffff, 2.0);
      frontFill.position.set(0, 2, 4);
      scene.add(frontFill);

      // Point Light near chest to illuminate gold/red details
      const pointLight = new THREE.PointLight(0xffd700, 1.8, 8);
      pointLight.position.set(0, 1.2, 1.5);
      scene.add(pointLight);

      // 5. Load Texture Maps
      const textureLoader = new THREE.TextureLoader();
      const loadedTextures: Record<string, THREE.Texture> = {};

      for (const [key, path] of Object.entries(textureMaps)) {
        try {
          const tex = textureLoader.load(path);
          tex.colorSpace = THREE.SRGBColorSpace;
          loadedTextures[key.toLowerCase()] = tex;
        } catch {}
      }

      // 6. Load FBX Model
      const loader = new FBXLoader();
      let samuraiModel: THREE.Group | null = null;

      loader.load(
        "/models/uploads_files_2573236_Samurai.fbx",
        (fbx) => {
          samuraiModel = fbx;

          // Auto-compute bounding box to center & scale prominently
          const box = new THREE.Box3().setFromObject(fbx);
          const center = box.getCenter(new THREE.Vector3());
          const size = box.getSize(new THREE.Vector3());

          const maxDim = Math.max(size.x, size.y, size.z);
          const scale = 3.6 / (maxDim || 1); // Significantly larger size
          fbx.scale.setScalar(scale);

          // Position model in frame
          fbx.position.x = -center.x * scale;
          fbx.position.y = -center.y * scale - 0.1;
          fbx.position.z = -center.z * scale;

          // Apply textures & materials to meshes
          fbx.traverse((child) => {
            if ((child as THREE.Mesh).isMesh) {
              const mesh = child as THREE.Mesh;
              mesh.castShadow = true;
              mesh.receiveShadow = true;

              const nameLower = mesh.name.toLowerCase();
              let matchedTex: THREE.Texture | null = null;

              for (const [key, tex] of Object.entries(loadedTextures)) {
                if (nameLower.includes(key) || key.includes(nameLower)) {
                  matchedTex = tex;
                  break;
                }
              }

              if (matchedTex) {
                mesh.material = new THREE.MeshStandardMaterial({
                  map: matchedTex,
                  roughness: 0.35,
                  metalness: 0.4,
                });
              } else {
                // High quality fallback materials based on mesh type
                const isKatana = nameLower.includes("katana") || nameLower.includes("blade");
                const isGold = nameLower.includes("deko") || nameLower.includes("horn") || nameLower.includes("eye");
                mesh.material = new THREE.MeshStandardMaterial({
                  color: isKatana ? 0xd0d8e0 : isGold ? 0xb49b64 : 0x8b1a1a,
                  roughness: isKatana ? 0.15 : 0.4,
                  metalness: isKatana ? 0.85 : isGold ? 0.7 : 0.2,
                });
              }
            }
          });

          scene.add(fbx);
        },
        undefined,
        (err) => {
          console.error("Error loading FBX Samurai model:", err);
        }
      );

      // 7. Interactive Mouse Tilt & Slow Ambient Rotation
      let mouseX = 0;
      let targetRotationY = 0;

      const handleMouseMove = (e: MouseEvent) => {
        const rect = container.getBoundingClientRect();
        const x = (e.clientX - rect.left) / rect.width - 0.5;
        mouseX = x * 0.8;
      };

      window.addEventListener("mousemove", handleMouseMove);

      // 8. Animation Loop
      const animate = () => {
        animationFrameId = requestAnimationFrame(animate);

        if (samuraiModel) {
          targetRotationY += 0.005;
          samuraiModel.rotation.y += (targetRotationY + mouseX - samuraiModel.rotation.y) * 0.05;
        }

        renderer.render(scene, camera);
      };

      animate();

      // Resize listener
      const handleResize = () => {
        if (!container) return;
        const w = container.clientWidth || 360;
        const h = container.clientHeight || 500;
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h);
      };

      window.addEventListener("resize", handleResize);

      return () => {
        window.removeEventListener("mousemove", handleMouseMove);
        window.removeEventListener("resize", handleResize);
        cancelAnimationFrame(animationFrameId);
        if (renderer.domElement && container.contains(renderer.domElement)) {
          container.removeChild(renderer.domElement);
        }
        renderer.dispose();
      };
    } catch (e) {
      console.error("WebGL setup error:", e);
    }
  }, []);

  return (
    <div className={`relative flex flex-col items-center justify-center ${className}`}>
      {/* WebGL Canvas Container — Large & Prominent */}
      <div
        ref={containerRef}
        className="w-[320px] sm:w-[420px] md:w-[500px] h-[480px] md:h-[580px] cursor-grab active:cursor-grabbing"
      />

      {/* Ground Ambient Shadow */}
      <div className="w-56 h-5 bg-[#b49b64]/20 rounded-[100%] blur-md -mt-8 pointer-events-none" />
    </div>
  );
}
