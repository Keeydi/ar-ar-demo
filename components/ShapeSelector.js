import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

const SHAPES = ['circle','square','heart','triangle'];

export default function ShapeSelector({ value, onChange }) {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>Shape</Text>
      <View style={styles.row}>
        {SHAPES.map(s => (
          <TouchableOpacity key={s} style={[styles.chip, value===s && styles.active]} onPress={() => onChange(s)}>
            <Text style={styles.text}>{s}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: 12 },
  label: { color: '#FFFFFF', marginBottom: 8, fontFamily: 'Poppins_600SemiBold' },
  row: { flexDirection: 'row', flexWrap: 'wrap' },
  chip: { backgroundColor: '#1E1E1E', paddingVertical: 10, paddingHorizontal: 14, borderRadius: 10, marginRight: 8, marginBottom: 8 },
  active: { backgroundColor: '#9C27B0' },
  text: { color: '#FFFFFF', fontFamily: 'Poppins_400Regular' },
});
