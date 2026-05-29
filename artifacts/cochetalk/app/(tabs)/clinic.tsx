import { Feather } from '@expo/vector-icons';
import { useDiagnoseVehicle } from '@workspace/api-client-react';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useColors } from '@/hooks/useColors';

const QUICK_PROMPTS = [
  'My car makes a knocking sound when I accelerate',
  'Check engine light is on and the car feels sluggish',
  'AC blowing warm air even when set to cold',
  'Car vibrates at highway speed above 100km/h',
  'Steering pulls to the right when braking',
];

export default function ClinicScreen() {
  const colors = useColors();
  const [description, setDescription] = useState('');
  const [hasQueried, setHasQueried] = useState(false);

  const { mutate: diagnose, isPending, data: diagnosisData, error, reset } = useDiagnoseVehicle();

  const handleDiagnose = () => {
    if (!description.trim()) return;
    setHasQueried(true);
    diagnose({ data: { description: description.trim() } });
  };

  const handleClear = () => {
    setDescription('');
    setHasQueried(false);
    reset();
  };

  const handleQuickPrompt = (prompt: string) => {
    setDescription(prompt);
    setHasQueried(false);
    reset();
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Feather name="activity" size={18} color={colors.primary} />
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>AI Vehicle Clinic</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <View style={[styles.infoCard, { backgroundColor: colors.primary + '18', borderColor: colors.primary + '40' }]}>
          <View style={[styles.infoIconWrap, { backgroundColor: colors.primary + '30' }]}>
            <Feather name="cpu" size={22} color={colors.primary} />
          </View>
          <View style={styles.infoText}>
            <Text style={[styles.infoTitle, { color: colors.primary }]}>Powered by Gemini AI</Text>
            <Text style={[styles.infoDesc, { color: colors.foreground }]}>
              Describe your vehicle problem in plain language and get an instant diagnostic report tailored for Nigerian road conditions.
            </Text>
          </View>
        </View>

        <Text style={[styles.label, { color: colors.foreground }]}>Describe Your Vehicle Issue</Text>
        <View style={[styles.inputWrap, { backgroundColor: colors.muted, borderColor: colors.border }]}>
          <TextInput
            style={[styles.input, { color: colors.foreground }]}
            placeholder="e.g. My 2019 Toyota Camry makes a clunking noise when turning at low speed. The noise is worse when reversing..."
            placeholderTextColor={colors.mutedForeground}
            value={description}
            onChangeText={(text) => { setDescription(text); if (hasQueried) { setHasQueried(false); reset(); } }}
            multiline
            numberOfLines={5}
            textAlignVertical="top"
          />
          {description.length > 0 && (
            <TouchableOpacity style={styles.clearBtn} onPress={handleClear}>
              <Feather name="x-circle" size={16} color={colors.mutedForeground} />
            </TouchableOpacity>
          )}
        </View>
        <Text style={[styles.charCount, { color: colors.mutedForeground }]}>{description.length} / 1000 characters</Text>

        <TouchableOpacity
          style={[styles.diagnoseBtn, { backgroundColor: !description.trim() || isPending ? colors.muted : colors.primary }]}
          onPress={handleDiagnose}
          disabled={!description.trim() || isPending}
        >
          {isPending ? (
            <View style={styles.loadingRow}>
              <ActivityIndicator color={colors.primaryForeground} size="small" />
              <Text style={[styles.diagnoseBtnText, { color: colors.primaryForeground }]}>Analysing...</Text>
            </View>
          ) : (
            <View style={styles.loadingRow}>
              <Feather name="zap" size={16} color={!description.trim() ? colors.mutedForeground : colors.primaryForeground} />
              <Text style={[styles.diagnoseBtnText, { color: !description.trim() ? colors.mutedForeground : colors.primaryForeground }]}>Run Diagnosis</Text>
            </View>
          )}
        </TouchableOpacity>

        {!hasQueried && !isPending && (
          <>
            <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>Quick Examples</Text>
            <View style={styles.promptsContainer}>
              {QUICK_PROMPTS.map((prompt, i) => (
                <TouchableOpacity
                  key={i}
                  style={[styles.promptChip, { backgroundColor: colors.surfaceVariant, borderColor: colors.border }]}
                  onPress={() => handleQuickPrompt(prompt)}
                >
                  <Feather name="chevron-right" size={12} color={colors.primary} />
                  <Text style={[styles.promptText, { color: colors.foreground }]}>{prompt}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}

        {error && (
          <View style={[styles.errorCard, { backgroundColor: colors.destructive + '15', borderColor: colors.destructive + '44' }]}>
            <Feather name="alert-circle" size={18} color={colors.destructive} />
            <View style={styles.errorText}>
              <Text style={[styles.errorTitle, { color: colors.destructive }]}>Diagnosis Failed</Text>
              <Text style={[styles.errorDesc, { color: colors.foreground }]}>
                Could not reach the AI service. Please check your connection and try again.
              </Text>
            </View>
          </View>
        )}

        {diagnosisData && (
          <View style={[styles.resultCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.resultHeader}>
              <View style={[styles.resultIconWrap, { backgroundColor: colors.success + '22' }]}>
                <Feather name="check-circle" size={18} color={colors.success} />
              </View>
              <Text style={[styles.resultTitle, { color: colors.foreground }]}>Diagnosis Report</Text>
            </View>
            <View style={[styles.resultDivider, { backgroundColor: colors.border }]} />
            <Text style={[styles.resultText, { color: colors.foreground }]}>{diagnosisData.result}</Text>
            <View style={[styles.disclaimerBox, { backgroundColor: colors.warning + '15', borderColor: colors.warning + '44' }]}>
              <Feather name="alert-triangle" size={12} color={colors.warning} />
              <Text style={[styles.disclaimerText, { color: colors.warning }]}>
                This is an AI-generated assessment. Always have a qualified mechanic inspect your vehicle before undertaking repairs.
              </Text>
            </View>
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1 },
  headerTitle: { fontSize: 20, fontWeight: '700' },
  content: { paddingHorizontal: 16, paddingTop: 16 },
  infoCard: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, borderRadius: 12, borderWidth: 1, padding: 14, marginBottom: 20 },
  infoIconWrap: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  infoText: { flex: 1 },
  infoTitle: { fontSize: 13, fontWeight: '700', marginBottom: 4 },
  infoDesc: { fontSize: 13, lineHeight: 18 },
  label: { fontSize: 14, fontWeight: '600', marginBottom: 8 },
  inputWrap: { borderRadius: 12, borderWidth: 1, padding: 12, minHeight: 120 },
  input: { fontSize: 14, lineHeight: 20, flex: 1, minHeight: 100 },
  clearBtn: { alignSelf: 'flex-end', padding: 4 },
  charCount: { fontSize: 11, textAlign: 'right', marginTop: 4, marginBottom: 12 },
  diagnoseBtn: { borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginBottom: 20 },
  loadingRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  diagnoseBtnText: { fontSize: 16, fontWeight: '700' },
  sectionLabel: { fontSize: 13, fontWeight: '600', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 },
  promptsContainer: { gap: 8, marginBottom: 20 },
  promptChip: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 10, borderWidth: 1, padding: 12 },
  promptText: { flex: 1, fontSize: 13, lineHeight: 18 },
  errorCard: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, borderRadius: 12, borderWidth: 1, padding: 14, marginBottom: 16 },
  errorText: { flex: 1 },
  errorTitle: { fontSize: 14, fontWeight: '700', marginBottom: 4 },
  errorDesc: { fontSize: 13, lineHeight: 18 },
  resultCard: { borderRadius: 12, borderWidth: 1, overflow: 'hidden', marginBottom: 16 },
  resultHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14 },
  resultIconWrap: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  resultTitle: { fontSize: 16, fontWeight: '700' },
  resultDivider: { height: 1, marginHorizontal: 14 },
  resultText: { fontSize: 14, lineHeight: 22, padding: 14 },
  disclaimerBox: { flexDirection: 'row', alignItems: 'flex-start', gap: 6, borderTopWidth: 1, padding: 12 },
  disclaimerText: { flex: 1, fontSize: 11, lineHeight: 16 },
});
