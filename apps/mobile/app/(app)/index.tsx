import { Redirect } from 'expo-router';

export default function AppIndex(): React.JSX.Element {
  return <Redirect href="./(tabs)/home" />;
}
