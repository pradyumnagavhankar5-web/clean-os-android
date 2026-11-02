import { Image, StyleSheet } from 'react-native';
import { colors } from './index';

type BrandLogoProps = {
  size?: number;
  decorative?: boolean;
};

export function BrandLogo({ size = 48, decorative = false }: BrandLogoProps) {
  return (
    <Image
      source={require('../../assets/cleanos-icon.png')}
      resizeMode="contain"
      accessible={!decorative}
      accessibilityRole={decorative ? undefined : 'image'}
      accessibilityLabel={decorative ? undefined : 'CleanOS logo'}
      importantForAccessibility={decorative ? 'no' : 'auto'}
      style={[styles.logo, { width: size, height: size, borderRadius: size * 0.3 }]}
    />
  );
}

const styles = StyleSheet.create({
  logo: { backgroundColor: colors.navy, flexShrink: 0 },
});
