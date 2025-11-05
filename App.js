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
  const [selectedFillingColor, setSelectedFillingColor] = useState(null);
  const [selectedToppings, setSelectedToppings] = useState([]); // ['Sprinkles','Peanuts','Cream']
  const animationRef = useRef(null);
  const threeRef = useRef({ renderer: null, scene: null, camera: null, mesh: null, sponge: null, icing: null, icingAnim: null, fillingGroup: null, toppingsGroup: null });
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

  // Step 5: create toppings attached to cake top
  const applyToppings = useCallback((opts) => {
    const state = threeRef.current;
    const { mesh } = state;
    if (!mesh) return;
    if (state.toppingsGroup) {
      mesh.remove(state.toppingsGroup);
      state.toppingsGroup = null;
    }
    const group = new THREE.Group();
    const topYLocal = 0.25 + 0.015;

    const addSprinkles = (color) => {
      const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.85 });
      for (let i = 0; i < 70; i++) {
        const r = Math.random() * 1.0;
        const theta = Math.random() * Math.PI * 2;
        const x = Math.cos(theta) * r;
        const z = Math.sin(theta) * r;
        const geom = new THREE.BoxGeometry(0.02, 0.08, 0.02);
        const m = new THREE.Mesh(geom, mat);
        m.position.set(x, topYLocal + 0.02, z);
        m.rotation.set(Math.random()*Math.PI, Math.random()*Math.PI, Math.random()*Math.PI);
        group.add(m);
      }
    };

    const addNuts = (color) => {
      const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.9 });
      for (let i = 0; i < 28; i++) {
        const r = Math.random() * 0.9;
        const theta = Math.random() * Math.PI * 2;
        const x = Math.cos(theta) * r;
        const z = Math.sin(theta) * r;
        const s = 0.05 + Math.random() * 0.03;
        const peanut = new THREE.SphereGeometry(s, 10, 10);
        const m = new THREE.Mesh(peanut, mat);
        m.position.set(x, topYLocal + 0.01, z);
        group.add(m);
      }
    };

    const addCreamRing = (color) => {
      const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.9 });
      const dollops = 12;
      const radiusLocal = 0.95;
      for (let i = 0; i < dollops; i++) {
        const angle = (i / dollops) * Math.PI * 2;
        const x = Math.cos(angle) * radiusLocal;
        const z = Math.sin(angle) * radiusLocal;
        const s = 0.1;
        const geo = new THREE.SphereGeometry(s, 12, 12);
        const m = new THREE.Mesh(geo, mat);
        m.position.set(x, topYLocal + 0.05, z);
        group.add(m);
      }
    };

    // Map 15 toppings to simple generators
    const gens = {
      'Sprinkles': () => addSprinkles('#FF69B4'),
      'Rainbow Sprinkles': () => { ['#EF4444','#F59E0B','#10B981','#3B82F6','#A855F7'].forEach(addSprinkles); },
      'Peanuts': () => addNuts('#C4A484'),
      'Almonds': () => addNuts('#E6C9A8'),
      'Choco Chips': () => addNuts('#5B3A29'),
      'Cream': () => addCreamRing('#FFFFFF'),
      'Whipped Cream': () => addCreamRing('#F8FAFC'),
      'Berries': () => { addNuts('#DC2626'); addNuts('#7C3AED'); },
      'Cherry': () => addNuts('#FF1F1F'),
      'Gummy': () => addSprinkles('#22D3EE'),
      'Caramel Bits': () => addNuts('#B45309'),
      'Sugar Pearls': () => addNuts('#E5E7EB'),
      'Gold Leaf': () => addNuts('#D4AF37'),
      'Cookie Crumbs': () => addSprinkles('#6B7280'),
      'Oreo': () => addSprinkles('#111827')
    };

    opts.forEach(o => { if (gens[o]) gens[o](); });

    mesh.add(group);
    state.toppingsGroup = group;
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

    threeRef.current = { renderer, scene, camera, mesh, sponge, icing: null, icingAnim: null, fillingGroup: null, toppingsGroup: null };

    const renderLoop = () => {
      const { renderer: r, scene: s, camera: c, mesh: m } = threeRef.current;
      if (!r || !s || !c) return;
      if (m) {
        m.rotation.y = rotationRef.current.y;
        m.rotation.x = rotationRef.current.x;
      }
      // animation disabled for stability in Expo Go
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
    if (selectedFillingColor) {
      // Reattach filling to the new mesh
      applyTopFilling(selectedFillingColor);
    }
    if (selectedToppings.length) {
      applyToppings(selectedToppings);
    }
  }, [selectedShape, selectedColor, selectedHeightInch, selectedFillingColor, selectedToppings, createCakeMesh, applyTopFilling]);

  // Trigger color icing animation
  const startIcingAnimation = useCallback((hex) => {
    // Apply instantly (animation disabled for device stability)
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

  // Step 4: create/replace top filling with simple drips
  const applyTopFilling = useCallback((hex) => {
    const state = threeRef.current;
    const { mesh, fillingGroup } = state;
    if (!mesh) return;
    // Remove previous from the mesh
    if (fillingGroup) {
      mesh.remove(fillingGroup);
      state.fillingGroup = null;
    }

    const group = new THREE.Group();
    // Positions and sizes are in the cake's local units (pre-scale)
    const topYLocal = 0.25 + 0.01; // cylinder half-height (0.5/2) + offset

    // Top disc exactly the cake radius (radius ~ 1.1)
    const discGeom = new THREE.CylinderGeometry(1.1, 1.1, 0.03, 64);
    const mat = new THREE.MeshStandardMaterial({ color: hex, roughness: 0.85, metalness: 0.0 });
    const disc = new THREE.Mesh(discGeom, mat);
    disc.position.set(0, topYLocal, 0);
    group.add(disc);

    // Drips around the rim using local coordinates (rounded, tapered cylinders)
    const dripMat = new THREE.MeshStandardMaterial({ color: hex, roughness: 0.9, metalness: 0.0 });
    const dripCount = 14;
    for (let i = 0; i < dripCount; i++) {
      const angle = (i / dripCount) * Math.PI * 2 + (Math.random() * 0.2 - 0.1);
      const lenLocal = 0.14 + Math.random() * 0.26; // 0.14–0.40 down the side
      const rTop = 0.04 + Math.random() * 0.02;    // slightly wider at top
      const rBottom = rTop * 0.6;                  // tapered toward bottom
      const cyl = new THREE.CylinderGeometry(rTop, rBottom, lenLocal, 12);
      const drip = new THREE.Mesh(cyl, dripMat);
      const radiusLocal = 1.095; // at the exact rim, slightly inside disc
      const x = Math.cos(angle) * radiusLocal;
      const z = Math.sin(angle) * radiusLocal;
      drip.position.set(x, topYLocal - lenLocal / 2, z);
      // Orient so the drip normal points outward; rotate 90deg to align axis vertically already
      drip.lookAt(0, topYLocal - lenLocal / 2, 0);
      group.add(drip);
    }

    // Attach as a child so it follows rotation/scale with the cake
    mesh.add(group);
    state.fillingGroup = group;
    setSelectedFillingColor(hex);
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
          <Text style={styles.stepLabel}>Step {step} of 5</Text>
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
                <TouchableOpacity style={styles.nextBtn} onPress={() => setStep(4)}>
                  <Text style={styles.nextText}>Next</Text>
                </TouchableOpacity>
              </View>
            </>
          )}

          {step === 4 && (
            <>
              <Text style={styles.promptTitle}>Top filling</Text>
              <View style={styles.optionsRow}>
                {['#7DD3FC','#FDA4AF','#FDE047','#86EFAC','#A78BFA','#FFFFFF'].map(c => (
                  <TouchableOpacity key={c} onPress={() => applyTopFilling(c)}>
                    <View style={[styles.colorSwatch, { backgroundColor: c, borderColor: selectedFillingColor===c ? '#9C27B0' : '#333' }]} />
                  </TouchableOpacity>
                ))}
              </View>
              <View style={styles.footerRow}>
                <TouchableOpacity style={styles.nextBtn} onPress={() => setStep(5)}>
                  <Text style={styles.nextText}>Next</Text>
                </TouchableOpacity>
              </View>
            </>
          )}

          {step === 5 && (
            <>
              <Text style={styles.promptTitle}>Toppings</Text>
              <View style={styles.optionsRow}>
                {['Sprinkles','Rainbow Sprinkles','Peanuts','Almonds','Choco Chips','Cream','Whipped Cream','Berries','Cherry','Gummy','Caramel Bits','Sugar Pearls','Gold Leaf','Cookie Crumbs','Oreo'].map(t => {
                  const active = selectedToppings.includes(t);
                  return (
                    <TouchableOpacity key={t} style={[styles.optionBtn, active && styles.optionActive]} onPress={() => {
                      setSelectedToppings(prev => {
                        let next = prev;
                        if (active) {
                          next = prev.filter(x=>x!==t);
                        } else if (prev.length < 2) {
                          next = [...prev, t];
                        } else {
                          // keep most recent one; replace the first
                          next = [prev[1], t];
                        }
                        applyToppings(next);
                        return next;
                      });
                    }}>
                      <Text style={styles.optionText}>{t}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              <View style={styles.footerRow}>
                <TouchableOpacity style={styles.nextBtn} onPress={() => setStep(4)}>
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
