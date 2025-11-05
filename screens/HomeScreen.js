import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

export default function HomeScreen({ navigation }) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>AR Cake Customizer</Text>
      <Text style={styles.subtitle}>Design your cake and view it in AR</Text>
      <TouchableOpacity style={styles.button} onPress={() => navigation.navigate('Customize') }>
        <Text style={styles.buttonText}>Get Started</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#121212', alignItems: 'center', justifyContent: 'center', padding: 24 },
  title: { color: '#FFFFFF', fontSize: 28, marginBottom: 8, fontFamily: 'Poppins_600SemiBold' },
  subtitle: { color: '#E1BEE7', fontSize: 16, marginBottom: 24, fontFamily: 'Poppins_400Regular' },
  button: { backgroundColor: '#9C27B0', paddingVertical: 14, paddingHorizontal: 24, borderRadius: 12 },
  buttonText: { color: '#FFFFFF', fontSize: 16, fontFamily: 'Poppins_600SemiBold' },
});
