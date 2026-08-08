import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, SafeAreaView, ScrollView,
  Alert, StatusBar, Image
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { ArrowLeft, Camera, ChevronRight, Check } from 'lucide-react-native';
import { useThemeStore } from '../../store/themeStore';
import { getColors, spacing, fontSizes, radius, shadows } from '../../utils/theme';

const CHECKLIST_ITEMS = [
  { id: 'ac', label: 'My vehicle has working air conditioning' },
  { id: 'seatbelts', label: 'All seatbelts are functional' },
  { id: 'clean', label: 'My vehicle is clean and presentable' },
  { id: 'roadworthy', label: 'My vehicle is roadworthy and insured' },
  { id: 'phone', label: 'I have a phone mount for safe navigation' },
];

export default function DriverRegistrationScreen({ navigation }: any) {
  const { isDark } = useThemeStore();
  const colors = getColors(isDark);
  const styles = getStyles(colors);
  const [ghanaCardNumber, setGhanaCardNumber] = useState('');
  const [ghanaCardImage, setGhanaCardImage] = useState('');
  const [licenseNumber, setLicenseNumber] = useState('');
  const [licenseImage, setLicenseImage] = useState('');
  const [licenseExpiry, setLicenseExpiry] = useState('');
  const [checklist, setChecklist] = useState<Record<string, boolean>>({});
  const [profilePhoto, setProfilePhoto] = useState('');

  const allChecked = CHECKLIST_ITEMS.every(item => checklist[item.id]);

  const toggleCheck = (id: string) => {
    setChecklist(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const pickImage = async (setter: (uri: string) => void) => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      return Alert.alert('Permission needed', 'Please allow access to your photo library');
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.3,
      base64: true,
    });
    if (!result.canceled && result.assets[0]) {
      setter(`data:image/jpeg;base64,${result.assets[0].base64}`);
    }
  };

  const takePhoto = async (setter: (uri: string) => void) => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      return Alert.alert('Permission needed', 'Please allow camera access');
    }
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      quality: 0.3,
      base64: true,
    });
    if (!result.canceled && result.assets[0]) {
      setter(`data:image/jpeg;base64,${result.assets[0].base64}`);
    }
  };

  const showImageOptions = (setter: (uri: string) => void) => {
    Alert.alert('Upload Photo', 'Choose an option', [
      { text: 'Take Photo', onPress: () => takePhoto(setter) },
      { text: 'Choose from Library', onPress: () => pickImage(setter) },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const next = () => {
    if (!ghanaCardNumber) return Alert.alert('Required', 'Enter your Ghana Card number');
    if (!ghanaCardImage) return Alert.alert('Required', 'Upload your Ghana Card image');
    if (!licenseNumber) return Alert.alert('Required', 'Enter your license number');
    if (!licenseImage) return Alert.alert('Required', 'Upload your license image');
    if (!licenseExpiry) return Alert.alert('Required', 'Enter license expiry date');
    if (!profilePhoto) return Alert.alert('Required', 'Upload a clear photo of your face');
    if (!allChecked) return Alert.alert('Required', 'Please confirm all vehicle requirements');

    navigation.push('DriverVehicle', {
      ghana_card_number: ghanaCardNumber,
      ghana_card_image: ghanaCardImage,
      license_number: licenseNumber,
      license_image: licenseImage,
      license_expiry: licenseExpiry,
      vehicle_checklist: checklist,
      profile_photo: profilePhoto,
    });
  };

  const ImageUploadBox = ({
    label, image, onPress
  }: { label: string; image: string; onPress: () => void }) => (
    <TouchableOpacity style={styles.uploadBox} onPress={onPress} activeOpacity={0.8}>
      {image ? (
        <Image source={{ uri: image }} style={styles.uploadedImage} />
      ) : (
        <>
          <View style={styles.uploadIcon}>
            <Camera size={24} color={colors.textMuted} />
          </View>
          <Text style={styles.uploadLabel}>{label}</Text>
          <Text style={styles.uploadHint}>Tap to upload</Text>
        </>
      )}
      {image && (
        <View style={styles.uploadedBadge}>
          <Text style={styles.uploadedBadgeText}>✓ Uploaded</Text>
        </View>
      )}
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.navigate('Landing')}
        >
          <ArrowLeft size={22} color={colors.dark} />
        </TouchableOpacity>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: '50%' }]} />
        </View>
        <Text style={styles.stepText}>1 of 2</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Identity & License</Text>
        <Text style={styles.subtitle}>We need to verify your identity before you can drive</Text>

        <Text style={styles.sectionTitle}>Ghana Card</Text>
        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>Ghana Card Number</Text>
          <TextInput
            style={styles.input}
            placeholder="GHA-XXXXXXXXX-X"
            value={ghanaCardNumber}
            onChangeText={setGhanaCardNumber}
            autoCapitalize="characters"
            placeholderTextColor={colors.gray3}
          />
        </View>
        <ImageUploadBox
          label="Ghana Card Photo"
          image={ghanaCardImage}
          onPress={() => showImageOptions(setGhanaCardImage)}
        />

        <Text style={styles.sectionTitle}>Driver's License</Text>
        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>License Number</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. DL-XXXXXXXX"
            value={licenseNumber}
            onChangeText={setLicenseNumber}
            autoCapitalize="characters"
            placeholderTextColor={colors.gray3}
          />
        </View>
        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>Expiry Date</Text>
          <TextInput
            style={styles.input}
            placeholder="MM/YYYY"
            value={licenseExpiry}
            onChangeText={setLicenseExpiry}
            keyboardType="numbers-and-punctuation"
            placeholderTextColor={colors.gray3}
          />
        </View>
        <ImageUploadBox
          label="License Photo"
          image={licenseImage}
          onPress={() => showImageOptions(setLicenseImage)}
        />
        {/* Profile photo */}
        <Text style={styles.sectionTitle}>Your Photo</Text>
        <Text style={styles.checklistSubtitle}>
          Upload a clear photo of your face. Passengers will see this when matched with you.
        </Text>
        <ImageUploadBox
          label="Face Photo"
          image={profilePhoto}
          onPress={() => showImageOptions(setProfilePhoto)}
        />


        {/* Vehicle checklist */}
        <Text style={styles.sectionTitle}>Vehicle Requirements</Text>
        <Text style={styles.checklistSubtitle}>
          Confirm your vehicle meets Campus Chauffeur standards before continuing
        </Text>
        <View style={styles.checklistCard}>
          {CHECKLIST_ITEMS.map((item, index) => (
            <TouchableOpacity
              key={item.id}
              style={[
                styles.checklistItem,
                index < CHECKLIST_ITEMS.length - 1 && styles.checklistItemBorder
              ]}
              onPress={() => toggleCheck(item.id)}
              activeOpacity={0.7}
            >
              <View style={[
                styles.checkbox,
                checklist[item.id] && styles.checkboxChecked
              ]}>
                {checklist[item.id] && (
                  <Check size={14} color={colors.dark} strokeWidth={3} />
                )}
              </View>
              <Text style={[
                styles.checklistLabel,
                checklist[item.id] && styles.checklistLabelChecked
              ]}>
                {item.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {!allChecked && (
          <View style={styles.checklistWarning}>
            <Text style={styles.checklistWarningText}>
              All requirements must be confirmed to continue
            </Text>
          </View>
        )}

        <TouchableOpacity
          style={[styles.nextBtn, !allChecked && styles.nextBtnDisabled]}
          onPress={next}
          activeOpacity={0.9}
        >
          <Text style={styles.nextBtnText}>Continue</Text>
          <ChevronRight size={20} color={colors.dark} />
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const getStyles = (colors: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.white },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.md,
  },
  backBtn: {
    width: 40, height: 40,
    borderRadius: radius.md,
    backgroundColor: colors.gray,
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressBar: {
    flex: 1,
    height: 4,
    backgroundColor: colors.gray2,
    borderRadius: radius.full,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: radius.full,
  },
  stepText: {
    fontSize: fontSizes.xs,
    color: colors.textMuted,
    fontWeight: '600',
  },
  scroll: { padding: spacing.lg, paddingBottom: spacing.xxl },
  title: {
    fontSize: fontSizes.xl,
    fontWeight: '800',
    color: colors.dark,
    marginBottom: spacing.xs,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: fontSizes.sm,
    color: colors.textMuted,
    marginBottom: spacing.lg,
    lineHeight: 20,
  },
  sectionTitle: {
    fontSize: fontSizes.sm,
    fontWeight: '700',
    color: colors.dark,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
    marginTop: spacing.md,
  },
  inputContainer: { marginBottom: spacing.sm },
  inputLabel: {
    fontSize: fontSizes.xs,
    fontWeight: '600',
    color: colors.dark,
    marginBottom: spacing.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  input: {
    backgroundColor: colors.gray,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.gray2,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    fontSize: fontSizes.md,
    color: colors.dark,
  },
  uploadBox: {
    backgroundColor: colors.gray,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: colors.gray2,
    borderStyle: 'dashed',
    padding: spacing.lg,
    alignItems: 'center',
    marginBottom: spacing.md,
    minHeight: 120,
    justifyContent: 'center',
    overflow: 'hidden',
  },
  uploadIcon: {
    width: 48, height: 48,
    borderRadius: radius.full,
    backgroundColor: colors.gray2,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  uploadLabel: {
    fontSize: fontSizes.sm,
    fontWeight: '600',
    color: colors.dark,
    marginBottom: 4,
  },
  uploadHint: {
    fontSize: fontSizes.xs,
    color: colors.textMuted,
  },
  uploadedImage: {
    width: '100%',
    height: 150,
    borderRadius: radius.md,
  },
  uploadedBadge: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    backgroundColor: colors.success,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.full,
  },
  uploadedBadgeText: {
    fontSize: fontSizes.xs,
    fontWeight: '700',
    color: colors.white,
  },
  checklistSubtitle: {
    fontSize: fontSizes.xs,
    color: colors.textMuted,
    marginBottom: spacing.sm,
    lineHeight: 18,
  },
  checklistCard: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: colors.gray2,
    overflow: 'hidden',
    ...shadows.sm,
  },
  checklistItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    gap: spacing.md,
  },
  checklistItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.gray2,
  },
  checkbox: {
    width: 24, height: 24,
    borderRadius: radius.sm,
    borderWidth: 2,
    borderColor: colors.gray2,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.white,
  },
  checkboxChecked: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  checklistLabel: {
    flex: 1,
    fontSize: fontSizes.sm,
    color: colors.textMuted,
    lineHeight: 20,
  },
  checklistLabelChecked: {
    color: colors.dark,
    fontWeight: '500',
  },
  checklistWarning: {
    backgroundColor: 'rgba(244,67,54,0.08)',
    borderRadius: radius.md,
    padding: spacing.sm,
    marginTop: spacing.sm,
  },
  checklistWarningText: {
    fontSize: fontSizes.xs,
    color: colors.error,
    textAlign: 'center',
    fontWeight: '500',
  },
  nextBtn: {
    flexDirection: 'row',
    backgroundColor: colors.primary,
    padding: spacing.md,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.lg,
    ...shadows.md,
  },
  nextBtnDisabled: { opacity: 0.4 },
  nextBtnText: {
    fontSize: fontSizes.md,
    fontWeight: '700',
    color: colors.dark,
    marginRight: spacing.xs,
  },
});