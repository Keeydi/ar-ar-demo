import React, { useCallback, useRef, useEffect } from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { GLView } from 'expo-gl';
import { Renderer } from 'expo-three';
import * as THREE from 'three';

export default function ARViewScreen({ route }) {
  const { shape, color } = route.params || { shape: 'circle', color: '#E1BEE7' };
  const anim = useRef(null);
  const three = useRef({ renderer: null, scene: null, camera: null, mesh: null });

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

    const geometry = shape==='square' ? new THREE.BoxGeometry(1,1,1)
      : shape==='triangle' ? new THREE.ConeGeometry(0.8, 1.2, 3)
      : shape==='heart' ? new THREE.SphereGeometry(0.9, 16, 16) // simple fallback
      : new THREE.CylinderGeometry(0.9, 0.9, 0.8, 32);
    const material = new THREE.MeshStandardMaterial({ color });
    const mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);

    three.current = { renderer, scene, camera, mesh };

    const loop = () => {
      const { renderer: r, scene: s, camera: c, mesh: m } = three.current;
      if (!r || !s || !c || !m) return;
      m.rotation.x += 0.01; m.rotation.y += 0.02;
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
