import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { useTranslation } from 'react-i18next';
import { SUPPORTED_LANGS } from '../config/languages';

export function LanguageSelector() {
  const { t, i18n } = useTranslation('common');

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{t('language')}</Text>
      <Picker
        selectedValue={i18n.language}
        onValueChange={(lang: string) => i18n.changeLanguage(lang)}
        style={styles.picker}
        mode="dialog"
      >
        {SUPPORTED_LANGS.map((l) => (
          <Picker.Item key={l.code} label={`${l.flag} ${l.label}`} value={l.code} />
        ))}
      </Picker>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginVertical: 12 },
  label: { fontSize: 16, marginBottom: 8, fontWeight: '600' },
  picker: { width: '100%', height: 50, borderWidth: 1, borderColor: '#ccc', borderRadius: 8 },
});