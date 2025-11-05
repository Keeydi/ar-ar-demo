import React, { useCallback, useRef, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { GLView } from 'expo-gl';
import { Renderer } from 'expo-three';
import * as THREE from 'three';

export default function CakePreview({ shape='circle', color='#E1BEE7' }) {
  const anim = useRef(null);
  const three = useRef({ renderer: null, scene: null, camera: null, mesh: null });

  const onContextCreate = useCallback((gl) => {
    const { drawingBufferWidth: width, drawingBufferHeight: height } = gl;
    const renderer = new Renderer({ gl });
    renderer.setSize(width, height);
    renderer.setClearColor('#121212', 1);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(70, width / height, 0.01, 1000);
    camera.position.z = 2;

    const ambient = new THREE.AmbientLight(0xffffff, 1.1);
    scene.add(ambient);

    // Build a stepped base with side decorations and richer animations
    const group = new THREE.Group();

    const tiers = [];
    const steps = 3;
    const baseHeight = 0.22;
    const baseRadius = shape==='square' ? 0.9 : 0.9;

    for (let i = 0; i < steps; i++) {
      const t = i / (steps - 1);
      const height = baseHeight * (shape==='triangle' ? 1.2 : 1);
      const topRadius = shape==='triangle' ? baseRadius * (1 - 0.25 * (i + 1)) : baseRadius * (1 - 0.2 * i);
      const bottomRadius = topRadius + (shape==='triangle' ? 0.05 : 0.03);

      let geometry;
      if (shape==='square') {
        const size = topRadius * 2;
        geometry = new THREE.BoxGeometry(size, height, size);
      } else if (shape==='triangle') {
        geometry = new THREE.ConeGeometry(topRadius, height * 1.1, 3);
      } else if (shape==='heart') {
        geometry = new THREE.SphereGeometry(topRadius, 24, 16);
      } else {
        geometry = new THREE.CylinderGeometry(topRadius, bottomRadius, height, 48);
      }

      const material = new THREE.MeshStandardMaterial({ color, roughness: 0.8, metalness: 0.05 });
      const tier = new THREE.Mesh(geometry, material);
      tier.position.y = -0.33 + i * (baseHeight + 0.02);
      tier.castShadow = false;
      tier.receiveShadow = false;
      group.add(tier);
      tiers.push(tier);

      // Add side decorations around each tier (small spheres as pearls)
      if (shape !== 'heart') {
        const ringCount = 16 + i * 4;
        const ringRadius = (shape==='square') ? topRadius * 1.05 : topRadius * 1.02;
        const decoMaterial = new THREE.MeshStandardMaterial({ color: '#ffffff', metalness: 0.6, roughness: 0.2 });
        for (let j = 0; j < ringCount; j++) {
          const theta = (j / ringCount) * Math.PI * 2;
          const sphere = new THREE.Mesh(new THREE.SphereGeometry(0.02, 12, 10), decoMaterial);
          const x = ringRadius * Math.cos(theta);
          const z = ringRadius * Math.sin(theta);
          sphere.position.set(x, tier.position.y + height * 0.35, z);
          group.add(sphere);
        }
      }
    }

    // A ribbon torus on the middle tier for extra detail
    if (shape !== 'triangle') {
      const torus = new THREE.Mesh(
        new THREE.TorusGeometry(0.45, 0.03, 12, 64),
        new THREE.MeshStandardMaterial({ color: '#FFD54F', metalness: 0.4, roughness: 0.3 })
      );
      torus.position.y = -0.33 + 1 * (baseHeight + 0.02) + baseHeight * 0.1;
      group.add(torus);
    }

    scene.add(group);

    three.current = { renderer, scene, camera, mesh: group, tiers };

    const loop = () => {
      const { renderer: r, scene: s, camera: c, mesh: m, tiers: ts } = three.current;
      if (!r || !s || !c || !m) return;
      // Idle rotation
      m.rotation.y += 0.015;
      const t = performance.now() * 0.001;
      // Alternate tier wobble for a lively look
      if (ts && ts.length) {
        ts.forEach((tier, idx) => {
          tier.rotation.y = Math.sin(t * (0.8 + idx * 0.2)) * 0.05 * (idx % 2 === 0 ? 1 : -1);
          tier.scale.x = 1 + Math.sin(t * (1 + idx * 0.3)) * 0.01;
          tier.scale.z = 1 + Math.cos(t * (1.1 + idx * 0.25)) * 0.01;
        });
      }
      r.render(s, c);
      gl.endFrameEXP();
      anim.current = requestAnimationFrame(loop);
    };
    loop();
  }, [shape, color]);

  useEffect(() => () => { if (anim.current) cancelAnimationFrame(anim.current); }, []);

  return (
    <View style={styles.container}>
      <GLView style={StyleSheet.absoluteFill} onContextCreate={onContextCreate} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { height: 220, borderRadius: 12, overflow: 'hidden' },
});


