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

    const geometry = shape==='square' ? new THREE.BoxGeometry(1,1,1)
      : shape==='triangle' ? new THREE.ConeGeometry(0.8, 1.2, 3)
      : shape==='heart' ? new THREE.SphereGeometry(0.9, 16, 16)
      : new THREE.CylinderGeometry(0.9, 0.7, 0.6, 48);
    const material = new THREE.MeshStandardMaterial({ color });
    const mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);

    three.current = { renderer, scene, camera, mesh };

    const loop = () => {
      const { renderer: r, scene: s, camera: c, mesh: m } = three.current;
      if (!r || !s || !c || !m) return;
      m.rotation.y += 0.02;
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


