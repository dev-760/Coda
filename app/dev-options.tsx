import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from '../src/components/ui/Icon';
import { COLORS, FONTS } from '../src/theme/theme';
import { useRouter } from 'expo-router';
import { useSettingsStore } from '../src/store/settingsStore';
import { useLogStore } from '../src/store/logStore';
import { ReportBuilder } from '../src/logging/ReportBuilder';

export default function DevOptionsScreen() {
  const router = useRouter();
  const settings = useSettingsStore();
  const logs = useLogStore(state => state.entries);
  const clearLogs = useLogStore(state => state.clearLogs);

  const handleExport = async () => {
    await ReportBuilder.exportReport();
  };

  return (
    <SafeAreaView style={s.container}>
      <View style={s.header}>
        <TouchableOpacity style={s.iconBtn} onPress={() => router.back()}><Icon name="chevron-back" size={24} color={COLORS.onSurface} /></TouchableOpacity>
        <View style={{ flex: 1, marginLeft: 8 }}>
          <Text style={s.hSub}>BENCH CALIBRATION // DEV</Text>
          <Text style={s.hTitle}>Developer Options</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 60 }}>
        {/* Global Settings */}
        <View style={s.section}>
          <Text style={s.sectionLabel}>GLOBAL BEHAVIOR</Text>
          <View style={s.card}>
            <View style={s.toggleRow}>
              <View>
                <Text style={s.toggleLabel}>VERBOSE LOGGING</Text>
                <Text style={s.toggleDesc}>Log trace and debug levels</Text>
              </View>
              <Switch value={settings.verboseLogging} onValueChange={settings.setVerboseLogging} trackColor={{ true: COLORS.secondary, false: COLORS.surfaceContainerHighest }} />
            </View>
          </View>
        </View>

        {/* Diagnostics */}
        <View style={s.section}>
          <Text style={s.sectionLabel}>DIAGNOSTICS & TELEMETRY</Text>
          <View style={s.card}>
            <TouchableOpacity style={s.actionBtn} onPress={handleExport}>
              <Icon name="share" size={18} color={COLORS.onSurface} />
              <Text style={s.actionBtnTxt}>EXPORT DIAGNOSTIC REPORT</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[s.actionBtn, { marginTop: 12, backgroundColor: COLORS.errorContainer }]} onPress={clearLogs}>
              <Icon name="trash" size={18} color={COLORS.error} />
              <Text style={[s.actionBtnTxt, { color: COLORS.error }]}>CLEAR LOCAL LOGS</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Log Preview */}
        <View style={s.section}>
          <Text style={s.sectionLabel}>LOG PREVIEW ({logs.length} ENTRIES)</Text>
          <View style={s.logBox}>
            {logs.slice(0, 20).map((l, i) => (
              <Text key={i} style={[s.logText, l.level === 'error' && { color: COLORS.error }, l.level === 'warn' && { color: COLORS.tertiary }]} numberOfLines={2}>
                [{new Date(l.timestamp).toISOString().split('T')[1].replace('Z', '')}] {l.tag}: {l.message}
              </Text>
            ))}
          </View>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.surface },
  header: { height: 64, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center' },
  iconBtn: { width: 44, height: 44, borderRadius: 4, backgroundColor: COLORS.surfaceContainerHigh, alignItems: 'center', justifyContent: 'center' },
  hSub: { fontFamily: FONTS.displayBold, fontSize: 9, color: COLORS.primary, textTransform: 'uppercase', letterSpacing: 1.2 },
  hTitle: { fontFamily: FONTS.display, fontSize: 18, color: COLORS.onSurface, textTransform: 'uppercase' },
  section: { marginHorizontal: 16, marginTop: 24 },
  sectionLabel: { fontFamily: FONTS.displayBold, fontSize: 11, color: COLORS.primary, textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 8 },
  card: { backgroundColor: COLORS.surfaceContainerLow, borderRadius: 12, padding: 16 },
  toggleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  toggleLabel: { fontFamily: FONTS.displayBold, fontSize: 12, color: COLORS.onSurface },
  toggleDesc: { fontFamily: FONTS.mono, fontSize: 11, color: COLORS.onSurfaceVariant, marginTop: 2 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: COLORS.surfaceContainerHighest, padding: 12, borderRadius: 8 },
  actionBtnTxt: { fontFamily: FONTS.displayBold, fontSize: 12, color: COLORS.onSurface },
  logBox: { backgroundColor: '#000', padding: 12, borderRadius: 8, height: 200 },
  logText: { fontFamily: FONTS.mono, fontSize: 9, color: COLORS.onSurfaceVariant, marginBottom: 4 },
});


