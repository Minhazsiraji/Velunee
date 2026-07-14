import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { FormField } from '@/components/form-field';
import { OptionPicker } from '@/components/option-picker';
import { PrimaryButton } from '@/components/primary-button';
import { analyzeImage } from '@/features/vision/api';
import { useChatStore } from '@/stores/chat-store';
import { colors } from '@/theme/colors';

const MODES = [
  { value: 'selfie', label: 'How do I look?' },
  { value: 'outfit', label: 'What to wear' },
] as const;

type PickerMode = (typeof MODES)[number]['value'];

type AllowedMime = 'image/jpeg' | 'image/png' | 'image/webp';

interface PickedImage {
  uri: string;
  base64: string;
  mimeType: AllowedMime;
}

function normalizeMime(mime?: string | null): AllowedMime {
  if (mime === 'image/png') return 'image/png';
  if (mime === 'image/webp') return 'image/webp';
  return 'image/jpeg';
}

export default function VisionScreen(): React.JSX.Element {
  const router = useRouter();
  const { conversationId, setConversationId, addMessage } = useChatStore();
  const [mode, setMode] = useState<PickerMode>('selfie');
  const [image, setImage] = useState<PickedImage | null>(null);
  const [prompt, setPrompt] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function pickFrom(source: 'camera' | 'library'): Promise<void> {
    setError(null);
    try {
      const permission =
        source === 'camera'
          ? await ImagePicker.requestCameraPermissionsAsync()
          : await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permission.granted) {
        setError(
          `Please allow access to your ${source === 'camera' ? 'camera' : 'photos'} to continue.`,
        );
        return;
      }

      const picked =
        source === 'camera'
          ? await ImagePicker.launchCameraAsync({ base64: true, quality: 0.5 })
          : await ImagePicker.launchImageLibraryAsync({
              base64: true,
              quality: 0.5,
            });

      const asset = picked.assets?.[0];
      const base64 = asset?.base64;
      if (picked.canceled || !asset || !base64) return;

      setImage({
        uri: asset.uri,
        base64,
        mimeType: normalizeMime(asset.mimeType),
      });
      setResult(null);
    } catch {
      setError('Could not open the image. Please try again.');
    }
  }

  async function handleAnalyze(): Promise<void> {
    if (!image || isAnalyzing) return;
    setIsAnalyzing(true);
    setError(null);
    setResult(null);
    try {
      const response = await analyzeImage({
        conversationId,
        imageBase64: image.base64,
        mimeType: image.mimeType,
        mode,
        prompt: prompt.trim() || undefined,
      });

      setConversationId(response.conversationId);
      addMessage(response.userMessage);
      addMessage(response.message);
      setResult(response.text);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Analysis failed. Please try again.');
    } finally {
      setIsAnalyzing(false);
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Go back"
          hitSlop={12}
          onPress={() => router.back()}
        >
          <Ionicons name="chevron-back" size={26} color={colors.text} />
        </Pressable>
        <Text style={styles.headerTitle}>Ask about a photo</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <OptionPicker
          label="WHAT DO YOU WANT?"
          options={[...MODES]}
          value={mode}
          onChange={setMode}
        />

        <Pressable
          accessibilityRole="button"
          onPress={() => void pickFrom('library')}
          style={styles.imageBox}
        >
          {image ? (
            <Image source={{ uri: image.uri }} style={styles.preview} />
          ) : (
            <View style={styles.imagePlaceholder}>
              <Ionicons name="image-outline" size={40} color={colors.textMuted} />
              <Text style={styles.placeholderText}>Tap to choose a photo</Text>
            </View>
          )}
        </Pressable>

        <View style={styles.pickerRow}>
          <PrimaryButton
            label="Camera"
            variant="outline"
            icon="camera-outline"
            onPress={() => void pickFrom('camera')}
            style={styles.pickerButton}
          />
          <PrimaryButton
            label="Gallery"
            variant="outline"
            icon="images-outline"
            onPress={() => void pickFrom('library')}
            style={styles.pickerButton}
          />
        </View>

        <FormField
          label="ANYTHING SPECIFIC? (OPTIONAL)"
          value={prompt}
          onChangeText={setPrompt}
          placeholder={
            mode === 'outfit'
              ? 'e.g. for a job interview tomorrow'
              : 'e.g. is this good for a party?'
          }
          maxLength={2000}
        />

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <PrimaryButton
          label="Ask Velunee"
          onPress={() => void handleAnalyze()}
          isLoading={isAnalyzing}
          disabled={!image}
          style={styles.analyze}
        />

        {result ? (
          <View style={styles.resultCard}>
            <Text style={styles.resultTitle}>Velunee says</Text>
            <Text style={styles.resultText}>{result}</Text>
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  headerTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '700',
  },
  headerSpacer: {
    width: 26,
  },
  container: {
    paddingHorizontal: 20,
    paddingBottom: 48,
  },
  imageBox: {
    marginTop: 20,
    height: 260,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  preview: {
    width: '100%',
    height: '100%',
  },
  imagePlaceholder: {
    alignItems: 'center',
  },
  placeholderText: {
    marginTop: 10,
    color: colors.textMuted,
    fontSize: 14,
  },
  pickerRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 14,
  },
  pickerButton: {
    flex: 1,
  },
  error: {
    marginTop: 16,
    color: colors.danger,
    fontSize: 14,
    lineHeight: 20,
  },
  analyze: {
    marginTop: 20,
  },
  resultCard: {
    marginTop: 22,
    padding: 18,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  resultTitle: {
    color: colors.primaryLight,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.2,
  },
  resultText: {
    marginTop: 10,
    color: colors.text,
    fontSize: 16,
    lineHeight: 24,
  },
});
