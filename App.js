import React, { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, View, Platform, Text, TouchableOpacity, PanResponder } from 'react-native';
import { useFonts, Poppins_400Regular, Poppins_600SemiBold } from '@expo-google-fonts/poppins';
import { Camera, CameraView } from 'expo-camera';
import { GLView } from 'expo-gl';
import { Renderer } from 'expo-three';
import * as THREE from 'three';

export default function App() {
  const [hasPermission, setHasPermission] = useState(null);
  const [step, setStep] = useState(1);
  const [selectedShape, setSelectedShape] = useState(null); // currently only 'circle'
  const [selectedColor] = useState('#E8D2A6');
  const [selectedHeightInch, setSelectedHeightInch] = useState(null); // 3|6|8|9|12
  const animationRef = useRef(null);
  const threeRef = useRef({ renderer: null, scene: null, camera: null, mesh: null, sponge: null, icing: null, icingAnim: null });
  const [fontsLoaded] = useFonts({ Poppins_400Regular, Poppins_600SemiBold });
  const [cameraReady, setCameraReady] = useState(false);
  const rotationRef = useRef({ x: 0, y: 0 });
  const panStateRef = useRef({ startRotationY: 0, startRotationX: 0 });
  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 4 || Math.abs(g.dy) > 4, // ignore taps and tiny moves
      onPanResponderGrant: () => {
        panStateRef.current.startRotationY = rotationRef.current.y;
        panStateRef.current.startRotationX = rotationRef.current.x;
      },
      onPanResponderMove: (_, g) => {
        // Full 360 control: horizontal -> Y, vertical -> X
        rotationRef.current.y = panStateRef.current.startRotationY + g.dx * 0.01;
        rotationRef.current.x = panStateRef.current.startRotationX + g.dy * 0.01;
      },
    })
  ).current;

  useEffect(() => {
    (async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === 'granted');
    })();
    // Ensure fresh start state on load
    setSelectedShape(null);
    setStep(1);
    setSelectedHeightInch(null);
  }, []);

  // Fallback: if cameraReady never fires on some devices, enable after short delay
  useEffect(() => {
    if (hasPermission && !cameraReady) {
      const id = setTimeout(() => setCameraReady(true), 1200);
      return () => clearTimeout(id);
    }
  }, [hasPermission, cameraReady]);

  const createSpongeTexture = useCallback(() => {
    // Disable DataTexture on Expo Go to avoid EXGL pixelStorei warnings.
    return null;
  }, []);

  const buildCakeGeometry = useCallback(() => {
    // circle base only
    return new THREE.CylinderGeometry(1.1, 1.1, 0.5, 48);
  }, []);

  const createCakeMesh = useCallback((shape, spongeTexture, color) => {
    const geometry = buildCakeGeometry();
    const material = spongeTexture
      ? new THREE.MeshStandardMaterial({ map: spongeTexture, color, roughness: 0.9, metalness: 0.0 })
      : new THREE.MeshStandardMaterial({ color, roughness: 0.9, metalness: 0.0 });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(0, 0, 0);
    const baseScale = 0.35;
    const heightScale = selectedHeightInch ? (selectedHeightInch / 6) : 1; // 6" is baseline
    mesh.scale.set(baseScale, baseScale * heightScale, baseScale);
    return mesh;
  }, [buildCakeGeometry, selectedHeightInch]);

  const onContextCreate = useCallback(async (gl) => {
    const { drawingBufferWidth: width, drawingBufferHeight: height } = gl;

    const renderer = new Renderer({ gl });
    renderer.setSize(width, height);
    renderer.setClearColor(0x000000, 0); // transparent
    gl.clearColor(0, 0, 0, 0);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(70, width / height, 0.01, 1000);
    camera.position.z = 2;
    const ambient = new THREE.AmbientLight(0xffffff, 1.0);
    scene.add(ambient);
    const dir = new THREE.DirectionalLight(0xffffff, 0.8);
    dir.position.set(3, 4, 5);
    scene.add(dir);

    const sponge = createSpongeTexture();
    let mesh = null;
    if (selectedShape) {
      mesh = createCakeMesh(selectedShape, sponge, selectedColor);
      scene.add(mesh);
    }

    threeRef.current = { renderer, scene, camera, mesh, sponge, icing: null, icingAnim: null };

    const renderLoop = () => {
      const { renderer: r, scene: s, camera: c, mesh: m } = threeRef.current;
      if (!r || !s || !c) return;
      if (m) {
        m.rotation.y = rotationRef.current.y;
        m.rotation.x = rotationRef.current.x;
      }
      // icing animation
      const state = threeRef.current.icingAnim;
      const icing = threeRef.current.icing;
      if (state && icing && m) {
        state.t += 0.02; // progress
        // drop from top
        icing.position.y = THREE.MathUtils.lerp(2.0, 0.3, Math.min(1, state.t));
        // spread over the cake: increase radius and flatten height
        const spread = Math.min(1, Math.max(0, state.t - 0.4) / 0.6);
        const baseScale = 0.35;
        const heightScale = selectedHeightInch ? (selectedHeightInch / 6) : 1;
        icing.scale.set(baseScale * (0.2 + spread * 1.1), baseScale * 0.1, baseScale * (0.2 + spread * 1.1));
        // gradually tint cake color
        const target = new THREE.Color(state.colorHex);
        const current = m.material.color.clone();
        current.lerp(target, 0.08);
        m.material.color.copy(current);
        if (state.t >= 1.2) {
          // end animation
          s.remove(icing);
          threeRef.current.icing = null;
          threeRef.current.icingAnim = null;
        }
      }
      r.render(s, c);
      gl.endFrameEXP();
      animationRef.current = requestAnimationFrame(renderLoop);
    };

    renderLoop();
  }, [createCakeMesh, createSpongeTexture, selectedShape, selectedColor]);

  // When user selects after GL has initialized, rebuild the mesh
  useEffect(() => {
    const { scene, mesh, sponge } = threeRef.current;
    if (!scene || !selectedShape) return;
    if (mesh) {
      scene.remove(mesh);
    }
    const newMesh = createCakeMesh(selectedShape, sponge, selectedColor);
    scene.add(newMesh);
    threeRef.current.mesh = newMesh;
  }, [selectedShape, selectedColor, selectedHeightInch, createCakeMesh]);

  // Trigger color icing animation
  const startIcingAnimation = useCallback((hex) => {
    // TEMP: Apply color instantly to avoid device-specific GL issues with overlays
    const { mesh, scene, icing } = threeRef.current;
    if (icing && scene) {
      scene.remove(icing);
      threeRef.current.icing = null;
      threeRef.current.icingAnim = null;
    }
    if (mesh) {
      mesh.material.color = new THREE.Color(hex);
      mesh.material.needsUpdate = true;
    }
  }, []);

  useEffect(() => {
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      const { renderer } = threeRef.current;
      if (renderer && renderer.dispose) {
        renderer.dispose();
      }
    };
  }, []);

  if (!fontsLoaded || hasPermission === null) {
    return <View style={styles.loading} />;
  }

  if (hasPermission === false) {
    return <View style={styles.center}><View style={styles.permission} /></View>;
  }

  return (
    <View style={styles.container}>
      <CameraView
        style={StyleSheet.absoluteFill}
        active={true}
        facing="back"
        onCameraReady={() => setCameraReady(true)}
        ratio={Platform.OS === 'ios' ? '16:9' : undefined}
      />
      {cameraReady && (
        <GLView style={[StyleSheet.absoluteFill, { backgroundColor: 'transparent' }]} pointerEvents="none" onContextCreate={onContextCreate} />
      )}
      {selectedShape && (
        <View style={[StyleSheet.absoluteFill, { backgroundColor: 'transparent' }]} {...panResponder.panHandlers} />
      )}

      {/* Step panel: Step 1 choose base, Step 2 height */}
      <View style={styles.promptWrap}>
        <View style={styles.promptCard}>
          <Text style={styles.stepLabel}>Step {step} of 3</Text>
          {step === 1 && (
            <>
              <Text style={styles.promptTitle}>Choose base</Text>
              <View style={styles.optionsRow}>
                <TouchableOpacity style={[styles.optionBtn, selectedShape==='circle' && styles.optionActive]} onPress={() => { setSelectedShape('circle'); setStep(2); }}>
                  <Text style={styles.optionText}>Circle</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.optionBtn} onPress={() => { setSelectedShape(null); rotationRef.current={x:0,y:0}; setSelectedHeightInch(null); }}>
                  <Text style={styles.optionText}>Reset</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.footerRow}>
                <TouchableOpacity style={[styles.nextBtn, !selectedShape && styles.nextDisabled]} disabled={!selectedShape} onPress={() => setStep(2)}>
                  <Text style={styles.nextText}>Next</Text>
                </TouchableOpacity>
              </View>
            </>
          )}
          {step === 2 && (
            <>
              <Text style={styles.promptTitle}>How tall?</Text>
              <View style={styles.optionsRow}>
                {[3,6,8,9,12].map(h => (
                  <TouchableOpacity key={h} style={[styles.optionBtn, selectedHeightInch===h && styles.optionActive]} onPress={() => setSelectedHeightInch(h)}>
                    <Text style={styles.optionText}>{h}"</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <View style={styles.footerRow}>
                <TouchableOpacity style={[styles.nextBtn, !selectedHeightInch && styles.nextDisabled]} disabled={!selectedHeightInch} onPress={() => setStep(3)}>
                  <Text style={styles.nextText}>Next</Text>
                </TouchableOpacity>
              </View>
            </>
          )}

          {step === 3 && (
            <>
              <Text style={styles.promptTitle}>Base color</Text>
              <View style={styles.optionsRow}>
                {['#E8D2A6','#E1BEE7','#F87171','#FBBF24','#34D399','#60A5FA','#FFFFFF'].map(c => (
                  <TouchableOpacity key={c} onPress={() => startIcingAnimation(c)}>
                    <View style={[styles.colorSwatch, { backgroundColor: c, borderColor: '#9C27B0' }]} />
                  </TouchableOpacity>
                ))}
              </View>
              <View style={styles.footerRow}>
                <TouchableOpacity style={styles.nextBtn} onPress={() => setStep(2)}>
                  <Text style={styles.nextText}>Back</Text>
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  loading: {
    flex: 1,
    backgroundColor: '#000',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#000',
  },
  permission: {
    width: 160,
    height: 160,
    borderRadius: 12,
    backgroundColor: '#111',
  },
  promptWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    padding: 16,
  },
  promptCard: {
    backgroundColor: 'rgba(18,18,18,0.92)',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)'
  },
  stepLabel: {
    color: '#BBBBBB',
    fontSize: 12,
    marginBottom: 6,
    textAlign: 'center',
    fontFamily: 'Poppins_400Regular'
  },
  promptTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    marginBottom: 12,
    textAlign: 'center',
    fontFamily: 'Poppins_600SemiBold'
  },
  optionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 8,
  },
  optionBtn: {
    backgroundColor: '#9C27B0',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 8,
    flexGrow: 1,
    alignItems: 'center'
  },
  optionActive: {
    backgroundColor: '#7B1FA2'
  },
  optionText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: 'Poppins_600SemiBold'
  },
  colorSwatch: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    marginBottom: 8
  },
  footerRow: {
    marginTop: 8,
    flexDirection: 'row',
    justifyContent: 'flex-end'
  },
  nextBtn: {
    backgroundColor: '#9C27B0',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10
  },
  nextDisabled: {
    opacity: 0.5
  },
  nextText: { color: '#fff', fontFamily: 'Poppins_600SemiBold' },
  backWrap: { position: 'absolute', top: 22, left: 16, zIndex: 20 },
  backBtn: { backgroundColor: 'rgba(18,18,18,0.92)', borderRadius: 12, paddingVertical: 8, paddingHorizontal: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  backText: { color: '#fff', fontFamily: 'Poppins_600SemiBold' }
});
