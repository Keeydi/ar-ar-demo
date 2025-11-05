import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import ShapeSelector from '../components/ShapeSelector';
import ColorPicker from '../components/ColorPicker';

export default function CustomizeScreen({ navigation }) {
  const [shape, setShape] = useState('circle');
  const [color, setColor] = useState('#E1BEE7');
  const [flavor, setFlavor] = useState('vanilla');

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Customize Cake</Text>
      <ShapeSelector value={shape} onChange={setShape} />
      <ColorPicker value={color} onChange={setColor} />

      <View style={{ height: 16 }} />
      <View style={styles.row}>
        {['vanilla','chocolate','strawberry'].map(f => (
          <TouchableOpacity key={f} style={[styles.chip, flavor===f && styles.chipActive]} onPress={() => setFlavor(f)}>
            <Text style={styles.chipText}>{f}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={{ height: 24 }} />
      <TouchableOpacity
        style={styles.button}
        onPress={() => navigation.navigate('ARView', { shape, color, flavor })}
      >
        <Text style={styles.buttonText}>View in AR</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#121212', padding: 16 },
  title: { color: '#FFFFFF', fontSize: 22, marginBottom: 12, textAlign: 'center', fontFamily: 'Poppins_600SemiBold' },
  row: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  chip: { backgroundColor: '#1E1E1E', paddingVertical: 10, paddingHorizontal: 14, borderRadius: 10, marginRight: 8, marginBottom: 8 },
  chipActive: { backgroundColor: '#9C27B0' },
  chipText: { color: '#FFFFFF', fontFamily: 'Poppins_400Regular' },
  button: { backgroundColor: '#9C27B0', paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  buttonText: { color: '#FFFFFF', fontSize: 16, fontFamily: 'Poppins_600SemiBold' },
});
