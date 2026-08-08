import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, SafeAreaView, ScrollView,
  Alert, ActivityIndicator, StatusBar, Image
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { ArrowLeft, ChevronRight, Camera } from 'lucide-react-native';
import { driverRegistrationAPI } from '../../services/api';
import { useThemeStore } from '../../store/themeStore';
import { getColors, spacing, fontSizes, radius, shadows } from '../../utils/theme';

export default function DriverVehicleScreen({ route, navigation }: any) {
  const { isDark } = useThemeStore();
  const colors = getColors(isDark);
  const styles = getStyles(colors);
  const docData = route.params;

  const [vehicleMake, setVehicleMake] = useState('');
  const [vehicleModel, setVehicleModel] = useState('');
  const [vehicleColor, setVehicleColor] = useState('');
  const [plateNumber, setPlateNumber] = useState('');
  const [frontImage, setFrontImage] = useState('');
  const [sideImage, setSideImage] = useState('');
  const [backImage, setBackImage] = useState('');
  const [loading, setLoading] = useState(false);

  const showImageOptions = (setter: (uri: string) => void) => {
    Alert.alert('Upload Photo', 'Choose an option', [
      {
        text: 'Take Photo', onPress: async () => {
          const { status } = await ImagePicker.requestCameraPermissionsAsync();
          if (status !== 'granted') return;
          const result = await ImagePicker.launchCameraAsync({
            allowsEditing: true, quality: 0.3, base64: true,
          });
          if (!result.canceled && result.assets[0]) {
            setter(`data:image/jpeg;base64,${result.assets[0].base64}`);
          }
        }
      },
      {
        text: 'Choose from Library', onPress: async () => {
          const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
          if (status !== 'granted') return;
          const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true, quality: 0.3, base64: true,
          });
          if (!result.canceled && result.assets[0]) {
            setter(`data:image/jpeg;base64,${result.assets[0].base64}`);
          }
        }
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const submit = async () => {
    if (!vehicleMake) return Alert.alert('Required', 'Enter vehicle make');
    if (!vehicleModel) return Alert.alert('Required', 'Enter vehicle model');
    if (!vehicleColor) return Alert.alert('Required', 'Enter vehicle color');
    if (!plateNumber) return Alert.alert('Required', 'Enter plate number');
    if (!frontImage) return Alert.alert('Required', 'Upload front photo of vehicle');
    if (!sideImage) return Alert.alert('Required', 'Upload side photo of vehicle');
    if (!backImage) return Alert.alert('Required', 'Upload back photo of vehicle');

    setLoading(true);
    try {
      await driverRegistrationAPI.submit({
        ...docData,
      vehicle_make: vehicleMake,
      vehicle_model: vehicleModel,
      vehicle_color: vehicleColor,
      plate_number: plateNumber,
      vehicle_front_image: frontImage,
      vehicle_side_image: sideImage,
      vehicle_back_image: backImage,
      vehicle_checklist: docData?.vehicle_checklist,
      profile_photo: docData?.profile_photo,
    });
      navigation.replace('DriverPending');
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.error || 'Could not submit registration');
    } finally {
      setLoading(false);
    }
  };

  const ImageUploadBox = ({
    label, image, onPress
  }: { label: string; image: string; onPress: () => void }) => (
    <TouchableOpacity style={styles.uploadBox} onPress={onPress} activeOpacity={0.8}>
      {image ? (
        <>
          <Image source={{ uri: image }} style={styles.uploadedImage} />
          <View style={styles.uploadedBadge}>
            <Text style={styles.uploadedBadgeText}>✓</Text>
          </View>
        </>
      ) : (
        <>
          <View style={styles.uploadIcon}>
            <Camera size={20} color={colors.textMuted} />
          </View>
          <Text style={styles.uploadLabel}>{label}</Text>
        </>
      )}
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <ArrowLeft size={22} color={colors.dark} />
        </TouchableOpacity>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: '100%' }]} />
        </View>
        <Text style={styles.stepText}>2 of 2</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Vehicle Information</Text>
        <Text style={styles.subtitle}>Tell us about the vehicle you'll be driving</Text>

        <Text style={styles.sectionTitle}>Vehicle Details</Text>
        <View style={styles.row}>
          <View style={[styles.inputContainer, { flex: 1 }]}>
            <Text style={styles.inputLabel}>Make</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Toyota"
              value={vehicleMake}
              onChangeText={setVehicleMake}
              placeholderTextColor={colors.gray3}
            />
          </View>
          <View style={[styles.inputContainer, { flex: 1 }]}>
            <Text style={styles.inputLabel}>Model</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Corolla"
              value={vehicleModel}
              onChangeText={setVehicleModel}
              placeholderTextColor={colors.gray3}
            />
          </View>
        </View>

        <View style={styles.row}>
          <View style={[styles.inputContainer, { flex: 1 }]}>
            <Text style={styles.inputLabel}>Color</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Silver"
              value={vehicleColor}
              onChangeText={setVehicleColor}
              placeholderTextColor={colors.gray3}
            />
          </View>
          <View style={[styles.inputContainer, { flex: 1 }]}>
            <Text style={styles.inputLabel}>Plate Number</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. GR-1234-20"
              value={plateNumber}
              onChangeText={setPlateNumber}
              autoCapitalize="characters"
              placeholderTextColor={colors.gray3}
            />
          </View>
        </View>

        <Text style={styles.sectionTitle}>Vehicle Photos</Text>
        <Text style={styles.photoHint}>Take clear photos of your vehicle from all angles</Text>
        <View style={styles.photosGrid}>
          <ImageUploadBox label="Front" image={frontImage} onPress={() => showImageOptions(setFrontImage)} />
          <ImageUploadBox label="Side" image={sideImage} onPress={() => showImageOptions(setSideImage)} />
          <ImageUploadBox label="Back" image={backImage} onPress={() => showImageOptions(setBackImage)} />
        </View>

        <TouchableOpacity
          style={[styles.submitBtn, loading && styles.submitBtnDisabled]}
          onPress={submit}
          disabled={loading}
          activeOpacity={0.9}
        >
          {loading
            ? <ActivityIndicator color={colors.dark} />
            : <>
                <Text style={styles.submitBtnText}>Submit for Approval</Text>
                <ChevronRight size={20} color={colors.dark} />
              </>
          }
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
    flex: 1, height: 4,
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
  row: { flexDirection: 'row', gap: spacing.sm },
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
    fontSize: fontSizes.sm,
    color: colors.dark,
  },
  photoHint: {
    fontSize: fontSizes.xs,
    color: colors.textMuted,
    marginBottom: spacing.md,
  },
  photosGrid: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  uploadBox: {
    flex: 1,
    backgroundColor: colors.gray,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: colors.gray2,
    borderStyle: 'dashed',
    height: 100,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  uploadIcon: {
    width: 36, height: 36,
    borderRadius: radius.full,
    backgroundColor: colors.gray2,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  uploadLabel: {
    fontSize: fontSizes.xs,
    fontWeight: '600',
    color: colors.textMuted,
  },
  uploadedImage: { width: '100%', height: '100%' },
  uploadedBadge: {
    position: 'absolute',
    top: 4, right: 4,
    width: 20, height: 20,
    borderRadius: radius.full,
    backgroundColor: colors.success,
    justifyContent: 'center',
    alignItems: 'center',
  },
  uploadedBadgeText: { fontSize: 10, fontWeight: '700', color: colors.white },
  submitBtn: {
    flexDirection: 'row',
    backgroundColor: colors.primary,
    padding: spacing.md,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.md,
  },
  submitBtnDisabled: { opacity: 0.5 },
  submitBtnText: {
    fontSize: fontSizes.md,
    fontWeight: '700',
    color: colors.dark,
    marginRight: spacing.xs,
  },
});