import { View, Image, StyleSheet } from 'react-native';
import { Colors } from '../constants/colors';

export default function AppHeader() {
  return (
    <View style={styles.header}>
      <Image
        source={require('../assets/logo-cropped.png')}
        style={styles.logo}
        resizeMode="contain"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 10,
  },
  logo: {
    width: 90,
    height: 26,
  },
});
