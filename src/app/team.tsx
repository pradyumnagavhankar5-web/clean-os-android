import { SafeAreaView } from 'react-native-safe-area-context';
import TeamScreen from '../cloud/screens/TeamScreen';
export default function TeamRoute() {
  return <SafeAreaView edges={['bottom', 'left', 'right']} style={{ flex: 1 }}><TeamScreen /></SafeAreaView>;
}
