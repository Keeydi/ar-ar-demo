import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

const COLORS = ['#E1BEE7','#F87171','#34D399','#60A5FA','#FBBF24','#FFFFFF'];

export default function ColorPicker({ value, onChange }) {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>Color</Text>
      <View style={styles.row}>
        {COLORS.map(c => (
          <TouchableOpacity key={c} onPress={() => onChange(c)}>
            <View style={[styles.swatch, { backgroundColor: c, borderColor: value===c ? '#9C27B0' : '#333' }]} />
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: 12 },
  label: { color: '#FFFFFF', marginBottom: 8, fontFamily: 'Poppins_600SemiBold' },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  swatch: { width: 36, height: 36, borderRadius: 18, marginRight: 10, marginBottom: 10, borderWidth: 2 },
});
