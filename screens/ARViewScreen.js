import React, { useCallback, useRef, useEffect } from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { GLView } from 'expo-gl';
import { Renderer } from 'expo-three';
import * as THREE from 'three';

export default function ARViewScreen({ route }) {
  const { shape, color } = route.params || { shape: 'circle', color: '#E1BEE7' };
  const anim = useRef(null);
  const three = useRef({ renderer: null, scene: null, camera: null, mesh: null, tiers: null, extras: null });

  const onContextCreate = useCallback((gl) => {
    const { drawingBufferWidth: width, drawingBufferHeight: height } = gl;
    const renderer = new Renderer({ gl });
    renderer.setSize(width, height);
    renderer.setClearColor('#000000', 0);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(70, width / height, 0.01, 1000);
    camera.position.z = 2;

    const light = new THREE.DirectionalLight(0xffffff, 1);
    light.position.set(1,1,1);
    scene.add(light);

    // Build stepped tiers and decorations similar to preview
    const group = new THREE.Group();
    const tiers = [];
    const steps = 3;
    const baseHeight = 0.24;
    const baseRadius = shape==='square' ? 0.95 : 0.95;

    for (let i = 0; i < steps; i++) {
      const height = baseHeight;
      const topRadius = baseRadius * (1 - 0.2 * i);
      const bottomRadius = topRadius + 0.03;
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
      tier.position.y = -0.36 + i * (baseHeight + 0.03);
      group.add(tier);
      tiers.push(tier);

      // Side pearls per tier
      if (shape !== 'heart') {
        const ringCount = 18 + i * 4;
        const ringRadius = (shape==='square') ? topRadius * 1.06 : topRadius * 1.03;
        const decoMaterial = new THREE.MeshStandardMaterial({ color: '#ffffff', metalness: 0.6, roughness: 0.25 });
        for (let j = 0; j < ringCount; j++) {
          const theta = (j / ringCount) * Math.PI * 2;
          const sphere = new THREE.Mesh(new THREE.SphereGeometry(0.022, 12, 10), decoMaterial);
          const x = ringRadius * Math.cos(theta);
          const z = ringRadius * Math.sin(theta);
          sphere.position.set(x, tier.position.y + height * 0.35, z);
          group.add(sphere);
        }
      }
    }

    // Extra ribbon
    const extras = new THREE.Group();
    const ribbon = new THREE.Mesh(
      new THREE.TorusGeometry(0.5, 0.03, 12, 64),
      new THREE.MeshStandardMaterial({ color: '#FFD54F', metalness: 0.45, roughness: 0.3 })
    );
    ribbon.position.y = -0.36 + 1 * (baseHeight + 0.03) + baseHeight * 0.1;
    extras.add(ribbon);

    group.add(extras);
    scene.add(group);

    three.current = { renderer, scene, camera, mesh: group, tiers, extras };

    const loop = () => {
      const { renderer: r, scene: s, camera: c, mesh: m, tiers: ts, extras: ex } = three.current;
      if (!r || !s || !c || !m) return;
      const t = performance.now() * 0.001;
      m.rotation.y += 0.015;
      if (ts && ts.length) {
        ts.forEach((tier, idx) => {
          tier.rotation.y = Math.sin(t * (0.9 + idx * 0.25)) * 0.06 * (idx % 2 === 0 ? 1 : -1);
        });
      }
      if (ex) {
        ex.rotation.y -= 0.02;
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
      <View style={styles.banner}><Text style={styles.bannerText}>Expo Go AR fallback (for full AR use Viro with Dev Client)</Text></View>
      <GLView style={StyleSheet.absoluteFill} onContextCreate={onContextCreate} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  banner: { position: 'absolute', top: 24, left: 16, right: 16, zIndex: 10, backgroundColor: '#9C27B0', padding: 8, borderRadius: 8 },
  bannerText: { color: '#fff', textAlign: 'center', fontFamily: 'Poppins_600SemiBold' },
});
