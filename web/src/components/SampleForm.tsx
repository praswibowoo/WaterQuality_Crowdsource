import { useState, FormEvent, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useGeolocation } from '../hooks/useGeolocation';
import { useOfflineStore } from '../stores/offlineStore';
import { samplesApi } from '../api/samples';
import { useOfflineSubmission } from '../hooks/useOfflineSubmission';
import MapPicker from './MapPicker';
import { MEASUREMENT_FIELDS } from '../utils/measurements';
import MetadataPicker from './MetadataPicker';
import { WATER_BODY_TYPES, LAND_USE_TYPES } from '../utils/metadata';

// Photo compression — uses Web Worker when available, falls back to inline Canvas
let compressionWorker: Worker | null = null;

try {
  compressionWorker = new Worker('/workers/image-compressor.worker.js');
} catch {
  // Web Worker not available, use inline compression
}

async function compressImageInWorker(file: File, maxWidth: number = 1920): Promise<File> {
  if (!compressionWorker) {
    return compressImageInline(file, maxWidth);
  }

  try {
    const imageBitmap = await createImageBitmap(file);
    const compressedBlob = await new Promise<Blob | null>((resolve) => {
      const handler = (e: MessageEvent) => {
        compressionWorker!.removeEventListener('message', handler);
        if (e.data.fallback) {
          resolve(null);
        } else {
          resolve(e.data.blob);
        }
      };
      compressionWorker!.addEventListener('message', handler);
      compressionWorker!.postMessage({ imageBitmap, maxWidth, format: file.type, quality: 0.85 });
    });

    imageBitmap.close();

    if (compressedBlob) {
      return new File([compressedBlob], file.name, { type: file.type });
    }
  } catch {
    // Worker compression failed, fall back to inline
  }

  return compressImageInline(file, maxWidth);
}

async function compressImageInline(file: File, maxWidth: number = 1920): Promise<File> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let { width, height } = img;

        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d')!;
        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(new File([blob], file.name, { type: file.type }));
            } else {
              resolve(file);
            }
          },
          file.type,
          0.85
        );
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  });
}

// Color-coded accuracy thresholds
const getAccuracyColor = (accuracy: number | null): string => {
  if (accuracy === null) return 'gray';
  if (accuracy <= 10) return 'green';
  if (accuracy <= 30) return 'yellow';
  return 'red';
};

const getAccuracyLabel = (accuracy: number | null): string => {
  if (accuracy === null) return 'Unknown';
  if (accuracy <= 10) return 'High';
  if (accuracy <= 30) return 'Medium';
  return 'Low';
};

interface FormData {
  authorName: string;
  ph: string;
  temperature: string;
  conductivity: string;
  salinity: string;
  nitrate: string;
  calcium: string;
  potassium: string;
  sodium: string;
  waterBodyType: string;
  landUse: string;
  gpsAccuracy: string;
  notes: string;
  latitude: string;
  longitude: string;
  address: string;
}

interface FormErrors {
  [key: string]: string;
}

interface PhotoPreview {
  file: File;
  preview: string;
}

export default function SampleForm() {
  const [formData, setFormData] = useState<FormData>({
    authorName: '',
    ph: '',
    temperature: '',
    conductivity: '',
    salinity: '',
    nitrate: '',
    calcium: '',
    potassium: '',
    sodium: '',
    waterBodyType: '',
    landUse: '',
    gpsAccuracy: '',
    notes: '',
    latitude: '',
    longitude: '',
    address: '',
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitServerId, setSubmitServerId] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [photos, setPhotos] = useState<PhotoPreview[]>([]);
  const [uploadProgress, setUploadProgress] = useState(false);
  const [offlinePhotoAlert, setOfflinePhotoAlert] = useState(false);
  const [offlineAlert, setOfflineAlert] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [showAccuracyInfo, setShowAccuracyInfo] = useState(false);
  const [exifWarning, setExifWarning] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { latitude, longitude, accuracy, error: geoError, isLoading: geoLoading, requestLocation, startTracking, stopTracking } = useGeolocation();
  const isOnline = useOfflineStore((s) => s.isOnline);
  const { submit: offlineSubmit } = useOfflineSubmission();

  // User's current GPS position for MapPicker
  const userPosition = latitude && longitude ? [latitude, longitude] as [number, number] : null;

  // Start GPS tracking on mount, stop on unmount
  useEffect(() => {
    startTracking();
    return () => stopTracking();
  }, [startTracking, stopTracking]);

  // Sync formData when geolocation updates
  useEffect(() => {
    if (latitude && longitude) {
      setFormData((prev) => ({
        ...prev,
        latitude: prev.latitude || latitude.toString(),
        longitude: prev.longitude || longitude.toString(),
      }));
    }
  }, [latitude, longitude]);

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.authorName.trim()) {
      newErrors.authorName = 'Name is required';
    } else if (formData.authorName.trim().length < 2) {
      newErrors.authorName = 'Name must be at least 2 characters';
    }

    if (!formData.latitude || !formData.longitude) {
      newErrors.location = 'Location is required. Please select a location on the map.';
    } else {
      const lat = parseFloat(formData.latitude);
      const lng = parseFloat(formData.longitude);
      if (lat < -90 || lat > 90) {
        newErrors.latitude = 'Latitude must be between -90 and 90';
      }
      if (lng < -180 || lng > 180) {
        newErrors.longitude = 'Longitude must be between -180 and 180';
      }
    }

    // Optional field validation using MEASUREMENT_FIELDS ranges
    const fieldKeys = ['ph', 'temperature', 'conductivity', 'salinity', 'nitrate', 'calcium', 'potassium', 'sodium'] as const;
    for (const key of fieldKeys) {
      const field = MEASUREMENT_FIELDS[key];
      const value = formData[key];
      if (value) {
        const numValue = parseFloat(value);
        if (isNaN(numValue) || numValue < field.min || numValue > field.max) {
          const unitStr = field.unit ? ` ${field.unit}` : '';
          newErrors[key] = `${field.label} must be between ${field.min} and ${field.max.toLocaleString()}${unitStr}`;
        }
      }
    }

    // Required metadata fields
    if (!formData.waterBodyType) {
      newErrors.waterBodyType = 'Water body type is required';
    }
    if (!formData.landUse) {
      newErrors.landUse = 'Land use is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    if (!validateForm()) {
      return;
    }

    // Block submission if offline with photos
    const hasPhotos = photos.length > 0;
    if (!isOnline && hasPhotos) {
      setOfflinePhotoAlert(true);
      setIsSubmitting(false);
      return;
    }

    setIsSubmitting(true);

    const sampleData = {
      authorName: formData.authorName.trim(),
      location: {
        latitude: parseFloat(formData.latitude),
        longitude: parseFloat(formData.longitude),
        address: formData.address || undefined,
      },
      ph: formData.ph ? parseFloat(formData.ph) : undefined,
      temperature: formData.temperature ? parseFloat(formData.temperature) : undefined,
      conductivity: formData.conductivity ? parseFloat(formData.conductivity) : undefined,
      salinity: formData.salinity ? parseFloat(formData.salinity) : undefined,
      nitrate: formData.nitrate ? parseFloat(formData.nitrate) : undefined,
      calcium: formData.calcium ? parseFloat(formData.calcium) : undefined,
      potassium: formData.potassium ? parseFloat(formData.potassium) : undefined,
      sodium: formData.sodium ? parseFloat(formData.sodium) : undefined,
      waterBodyType: formData.waterBodyType || '',
      landUse: formData.landUse || '',
      gpsAccuracy: formData.gpsAccuracy ? parseFloat(formData.gpsAccuracy) : undefined,
      notes: formData.notes || undefined,
    };

    try {
      const result = await offlineSubmit(sampleData);

      if (!result.success) {
        setSubmitError(result.error || 'Submission failed');
        return;
      }

      // Upload photos if online submission succeeded with server ID
      if (!result.offline && hasPhotos && result.serverId) {
        setUploadProgress(true);
        try {
          const files = photos.map((p) => p.file);
          const compressedFiles = await Promise.all(
            files.map((file) => compressImageInWorker(file))
          );
          await samplesApi.uploadPhotos(result.serverId, compressedFiles);
        } catch (photoError) {
          console.error('Photo upload failed (data was saved):', photoError);
          setSubmitError('Sample submitted but photos could not be uploaded. You can add them later.');
          return;
        }
      }

      if (result.offline) {
        setOfflineAlert(true);
      }

      setSubmitSuccess(true);
      if (result.serverId) {
        setSubmitServerId(result.serverId);
      }
      // Reset form
      setFormData({
        authorName: '',
        ph: '',
        temperature: '',
        conductivity: '',
        salinity: '',
        nitrate: '',
        calcium: '',
        potassium: '',
        sodium: '',
        waterBodyType: '',
        landUse: '',
        gpsAccuracy: '',
        notes: '',
        latitude: '',
        longitude: '',
        address: '',
      });
      setPhotos([]);
      setExifWarning(false);
      // Clear success message after 8 seconds
      setTimeout(() => {
        setSubmitSuccess(false);
        setSubmitServerId(null);
      }, 8000);
    } catch (error) {
      console.error('Submission error:', error);
      setSubmitError('An unexpected error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
      setUploadProgress(false);
    }
  };

  const handleInputChange = (field: keyof FormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear error when user types
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const handleLocationSelect = (lat: number, lng: number, address?: string) => {
    setFormData((prev) => ({
      ...prev,
      latitude: lat.toString(),
      longitude: lng.toString(),
      address: address || prev.address,
    }));
    // Clear location error
    if (errors.location) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors.location;
        return newErrors;
      });
    }
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

      const newPhotos: PhotoPreview[] = [];
    const currentCount = photos.length;
    const rejected: string[] = [];

    for (let i = 0; i < files.length; i++) {
      if (currentCount + newPhotos.length >= 5) {
        rejected.push(`"${files[i].name}" — max 5 photos`);
        continue;
      }

      const file = files[i];
      // Validate file type
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
        rejected.push(`"${file.name}" — must be JPEG, PNG, or WebP`);
        continue;
      }
      // Validate file size (5MB max)
      if (file.size > 5 * 1024 * 1024) {
        rejected.push(`"${file.name}" — exceeds 5MB limit`);
        continue;
      }

      newPhotos.push({
        file,
        preview: URL.createObjectURL(file),
      });
    }

    if (rejected.length > 0) {
      setPhotoError(rejected.join('. '));
      setTimeout(() => setPhotoError(null), 5000);
    }

    setPhotos((prev) => [...prev, ...newPhotos].slice(0, 5));

    const hasAnyPhotos = photos.length > 0 || newPhotos.length > 0;
    setExifWarning(hasAnyPhotos);

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removePhoto = (index: number) => {
    setPhotos((prev) => {
      const newPhotos = [...prev];
      URL.revokeObjectURL(newPhotos[index].preview);
      newPhotos.splice(index, 1);
      if (newPhotos.length === 0) {
        setExifWarning(false);
      }
      return newPhotos;
    });
  };

  return (
    <div className="sample-form-container">
      <div className="card">
        <h2 className="card-title">Submit Water Sample</h2>

        {offlinePhotoAlert && (
          <div className="offline-photo-alert" role="alert">
            <strong>Cannot submit with photos while offline</strong>
            <p style={{ marginTop: '8px' }}>
              Photos cannot be uploaded without an internet connection.
            </p>
            <p style={{ margin: '8px 0' }}>Options:</p>
            <ul style={{ margin: '0 0 12px 20px' }}>
              <li>Remove photos and submit data only</li>
              <li>Wait until you have connectivity, then submit with photos</li>
            </ul>
            <button
              onClick={() => setOfflinePhotoAlert(false)}
              className="offline-photo-btn"
            >
              Got it
            </button>
          </div>
        )}

        {offlineAlert && (
          <div className="offline-alert" role="alert">
            <strong>📡 Saved offline</strong>
            <p>Your sample data has been saved and will be synced when you reconnect.</p>
            <button
              onClick={() => setOfflineAlert(false)}
              className="offline-photo-btn"
            >
              Got it
            </button>
          </div>
        )}

        {submitSuccess && (
          <div className="success-banner">
            ✓ Sample submitted successfully!
            {submitServerId && <Link to={`/sample/${submitServerId}`} className="success-link"> View details →</Link>}
          </div>
        )}

        {submitError && (
          <div className="error-banner">
            {submitError}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* Author Name */}
          <div className="input-group">
            <label htmlFor="authorName">Your Name *</label>
            <input
              type="text"
              id="authorName"
              value={formData.authorName}
              onChange={(e) => handleInputChange('authorName', e.target.value)}
              placeholder="Enter your name"
              className={errors.authorName ? 'error' : ''}
              disabled={isSubmitting}
            />
            {errors.authorName && <span className="error-message">{errors.authorName}</span>}
          </div>

          {/* Location Section */}
          <div className="input-group">
            <div className="location-header">
              <label>Location *</label>
              <button
                type="button"
                className="btn-ghost btn-sm"
                onClick={requestLocation}
                disabled={geoLoading}
              >
                {geoLoading ? '📡 Locating...' : '📍 Use Current Location'}
              </button>
              {accuracy !== null && (
                <span
                  className={`accuracy-badge accuracy-${getAccuracyColor(accuracy)}`}
                  onClick={() => setShowAccuracyInfo(true)}
                  style={{ cursor: 'pointer' }}
                >
                  {getAccuracyLabel(accuracy)} ({Math.round(accuracy)}m)
                </span>
              )}
            </div>

            {(errors.location || errors.latitude || errors.longitude) && (
              <span className="error-message">
                {errors.location || errors.latitude || errors.longitude}
              </span>
            )}

            {geoError && (
              <div className="geo-error">{geoError}</div>
            )}

            <MapPicker
              latitude={formData.latitude ? parseFloat(formData.latitude) : undefined}
              longitude={formData.longitude ? parseFloat(formData.longitude) : undefined}
              onLocationSelect={handleLocationSelect}
              initialPosition={userPosition}
            />

            {/* Hidden inputs for lat/lng */}
            <input type="hidden" name="latitude" value={formData.latitude} />
            <input type="hidden" name="longitude" value={formData.longitude} />

            {/* Address (optional) */}
            <input
              type="text"
              id="address"
              value={formData.address}
              onChange={(e) => handleInputChange('address', e.target.value)}
              placeholder="Address (optional)"
              className="address-input"
              disabled={isSubmitting}
            />
          </div>

          {/* 🌡️ Common Measurements - Temperature (shared by all meters) */}
          <div className="measurement-section">
            <h3 className="section-title">🌡️ Common Measurements</h3>
            <div className="input-row input-row-2 mb-md">
              <div className="input-group">
                <label htmlFor="temperature">Temperature ({MEASUREMENT_FIELDS.temperature.unit})</label>
                <input
                  type="number"
                  id="temperature"
                  value={formData.temperature}
                  onChange={(e) => handleInputChange('temperature', e.target.value)}
                  placeholder="e.g., 25"
                  step={MEASUREMENT_FIELDS.temperature.step}
                  min={MEASUREMENT_FIELDS.temperature.min}
                  max={MEASUREMENT_FIELDS.temperature.max}
                  className={errors.temperature ? 'error' : ''}
                  disabled={isSubmitting}
                />
                {errors.temperature && <span className="error-message">{errors.temperature}</span>}
              </div>
            </div>
          </div>

          {/* 🔬 pH Meter (pH-11/22/33) */}
          <div className="measurement-section">
            <h3 className="section-title">🔬 pH Meter ({MEASUREMENT_FIELDS.ph.laquatwin})</h3>
            <div className="input-row input-row-2 mb-md">
              <div className="input-group">
                <label htmlFor="ph">pH Level</label>
                <input
                  type="number"
                  id="ph"
                  value={formData.ph}
                  onChange={(e) => handleInputChange('ph', e.target.value)}
                  placeholder="0-14"
                  step={MEASUREMENT_FIELDS.ph.step}
                  min={MEASUREMENT_FIELDS.ph.min}
                  max={MEASUREMENT_FIELDS.ph.max}
                  className={errors.ph ? 'error' : ''}
                  disabled={isSubmitting}
                />
                {errors.ph && <span className="error-message">{errors.ph}</span>}
              </div>
            </div>
          </div>

          {/* ⚡ Conductivity Meter (EC-22/33) */}
          <div className="measurement-section">
            <h3 className="section-title">⚡ Conductivity Meter ({MEASUREMENT_FIELDS.conductivity.laquatwin})</h3>
            <div className="input-row input-row-2 mb-md">
              <div className="input-group">
                <label htmlFor="conductivity">Conductivity ({MEASUREMENT_FIELDS.conductivity.unit})</label>
                <input
                  type="number"
                  id="conductivity"
                  value={formData.conductivity}
                  onChange={(e) => handleInputChange('conductivity', e.target.value)}
                  placeholder="e.g., 500"
                  step={MEASUREMENT_FIELDS.conductivity.step}
                  min={MEASUREMENT_FIELDS.conductivity.min}
                  max={MEASUREMENT_FIELDS.conductivity.max}
                  className={errors.conductivity ? 'error' : ''}
                  disabled={isSubmitting}
                />
                {errors.conductivity && <span className="error-message">{errors.conductivity}</span>}
              </div>
            </div>
          </div>

          {/* 🔬 Ion-Selective Electrodes (ISE) */}
          <div className="measurement-section">
            <h3 className="section-title">🔬 Ion-Selective Electrodes (ISE)</h3>
            <div className="input-row input-row-2 mb-md">
              <div className="input-group">
                <label htmlFor="nitrate">Nitrate ({MEASUREMENT_FIELDS.nitrate.unit})</label>
                <input
                  type="number"
                  id="nitrate"
                  value={formData.nitrate}
                  onChange={(e) => handleInputChange('nitrate', e.target.value)}
                  placeholder="e.g., 2.5"
                  step={MEASUREMENT_FIELDS.nitrate.step}
                  min={MEASUREMENT_FIELDS.nitrate.min}
                  max={MEASUREMENT_FIELDS.nitrate.max}
                  className={errors.nitrate ? 'error' : ''}
                  disabled={isSubmitting}
                />
                {errors.nitrate && <span className="error-message">{errors.nitrate}</span>}
              </div>
              <div className="input-group">
                <label htmlFor="calcium">Calcium ({MEASUREMENT_FIELDS.calcium.unit})</label>
                <input
                  type="number"
                  id="calcium"
                  value={formData.calcium}
                  onChange={(e) => handleInputChange('calcium', e.target.value)}
                  placeholder="e.g., 120"
                  step={MEASUREMENT_FIELDS.calcium.step}
                  min={MEASUREMENT_FIELDS.calcium.min}
                  max={MEASUREMENT_FIELDS.calcium.max}
                  className={errors.calcium ? 'error' : ''}
                  disabled={isSubmitting}
                />
                {errors.calcium && <span className="error-message">{errors.calcium}</span>}
              </div>
            </div>
            <div className="input-row input-row-2 mb-md">
              <div className="input-group">
                <label htmlFor="potassium">Potassium ({MEASUREMENT_FIELDS.potassium.unit})</label>
                <input
                  type="number"
                  id="potassium"
                  value={formData.potassium}
                  onChange={(e) => handleInputChange('potassium', e.target.value)}
                  placeholder="e.g., 65"
                  step={MEASUREMENT_FIELDS.potassium.step}
                  min={MEASUREMENT_FIELDS.potassium.min}
                  max={MEASUREMENT_FIELDS.potassium.max}
                  className={errors.potassium ? 'error' : ''}
                  disabled={isSubmitting}
                />
                {errors.potassium && <span className="error-message">{errors.potassium}</span>}
              </div>
              <div className="input-group">
                <label htmlFor="sodium">Sodium ({MEASUREMENT_FIELDS.sodium.unit})</label>
                <input
                  type="number"
                  id="sodium"
                  value={formData.sodium}
                  onChange={(e) => handleInputChange('sodium', e.target.value)}
                  placeholder="e.g., 4500"
                  step={MEASUREMENT_FIELDS.sodium.step}
                  min={MEASUREMENT_FIELDS.sodium.min}
                  max={MEASUREMENT_FIELDS.sodium.max}
                  className={errors.sodium ? 'error' : ''}
                  disabled={isSubmitting}
                />
                {errors.sodium && <span className="error-message">{errors.sodium}</span>}
              </div>
            </div>
          </div>

          {/* 🧂 Salinity Meter (Salt-11/22) */}
          <div className="measurement-section">
            <h3 className="section-title">🧂 Salinity Meter ({MEASUREMENT_FIELDS.salinity.laquatwin})</h3>
            <div className="input-row input-row-2 mb-md">
              <div className="input-group">
                <label htmlFor="salinity">Salinity ({MEASUREMENT_FIELDS.salinity.unit})</label>
                <input
                  type="number"
                  id="salinity"
                  value={formData.salinity}
                  onChange={(e) => handleInputChange('salinity', e.target.value)}
                  placeholder="e.g., 35"
                  step={MEASUREMENT_FIELDS.salinity.step}
                  min={MEASUREMENT_FIELDS.salinity.min}
                  max={MEASUREMENT_FIELDS.salinity.max}
                  className={errors.salinity ? 'error' : ''}
                  disabled={isSubmitting}
                />
                {errors.salinity && <span className="error-message">{errors.salinity}</span>}
              </div>
            </div>
          </div>

          {/* 💧 Water Body */}
          <div className="measurement-section">
            <h3 className="section-title">💧 Water Body</h3>
            <MetadataPicker
              title="Water Body Type"
              categories={WATER_BODY_TYPES}
              value={formData.waterBodyType}
              onChange={(v) => handleInputChange('waterBodyType', v)}
              required
              error={errors.waterBodyType}
            />
            {errors.waterBodyType && <span className="error-message">{errors.waterBodyType}</span>}
          </div>

          {/* 🏞️ Land Use */}
          <div className="measurement-section">
            <h3 className="section-title">🏞️ Surrounding Land Use</h3>
            <MetadataPicker
              title="Surrounding Land Use"
              categories={LAND_USE_TYPES}
              value={formData.landUse}
              onChange={(v) => handleInputChange('landUse', v)}
              required
              error={errors.landUse}
            />
            {errors.landUse && <span className="error-message">{errors.landUse}</span>}
          </div>

          {/* 📷 Photo Upload */}
          <div className="input-group">
            <label>Photos (optional, max 5)</label>
            <div className="photo-upload-area">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                capture="environment"
                onChange={handlePhotoChange}
                disabled={isSubmitting || photos.length >= 5}
                className="photo-input"
              />
              {photos.length === 0 && (
                <div className="photo-upload-placeholder">
                  <span className="photo-icon">📷</span>
                  <span>Tap to add photos</span>
                </div>
              )}
              {photos.length > 0 && (
                <div className="photo-preview-grid">
                  {photos.map((photo, index) => (
                    <div key={index} className="photo-preview-item">
                      <img src={photo.preview} alt={`Preview ${index + 1}`} />
                      <button
                        type="button"
                        className="photo-remove-btn"
                        onClick={() => removePhoto(index)}
                        disabled={isSubmitting}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                  {photos.length < 5 && (
                    <div className="photo-add-more">
                      <span>+</span>
                      <span>Add more</span>
                    </div>
                  )}
                </div>
              )}
            </div>
            <small className="photo-hint">
              JPEG, PNG, WebP up to 5MB each
              {uploadProgress && ' - Uploading...'}
            </small>
            {exifWarning && (
              <div className="exif-warning">
                ⚠️ These photos may not have GPS location data embedded. Location verification may not be possible from the images.
              </div>
            )}
            {photoError && (
              <div className="photo-error">
                {photoError}
              </div>
            )}
          </div>

          {/* Notes */}
          <div className="input-group">
            <label htmlFor="notes">Notes</label>
            <textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => handleInputChange('notes', e.target.value)}
              placeholder="Additional observations about the water source..."
              rows={3}
              disabled={isSubmitting}
            />
          </div>

          {/* Submit Button */}
          <div className="form-actions">
            <button
              type="submit"
              className="btn-primary btn-submit"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <span className="spinner" style={{ width: '1rem', height: '1rem' }} />
                  Submitting...
                </>
              ) : (
                'Submit Sample'
              )}
            </button>
          </div>
        </form>
      </div>

      {/* GPS Accuracy Info Modal */}
      {showAccuracyInfo && (
        <div className="modal-overlay" onClick={() => setShowAccuracyInfo(false)}>
          <div className="accuracy-modal" onClick={(e) => e.stopPropagation()}>
            <h3>📍 GPS Accuracy</h3>
            <p className="accuracy-value">
              {getAccuracyLabel(accuracy)} ({accuracy !== null ? `${Math.round(accuracy)}m` : 'N/A'})
            </p>
            <p>GPS accuracy indicates how precise your location is. A smaller number means higher accuracy.</p>
            <ul>
              <li>🟢 ≤10m: Excellent — suitable for precise mapping</li>
              <li>🟡 10-30m: Moderate — generally acceptable</li>
              <li>🔴 &gt;30m: Poor — consider moving to a more open area</li>
            </ul>
            <button className="btn-primary" onClick={() => setShowAccuracyInfo(false)}>
              Got it
            </button>
          </div>
        </div>
      )}

      <style>{`
        .sample-form-container {
          max-width: 600px;
          margin: 0 auto;
        }

        .card-title {
          font-size: 1.5rem;
          margin-bottom: var(--spacing-lg);
          color: var(--color-text);
        }

        .location-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: var(--spacing-xs);
          flex-wrap: wrap;
          gap: var(--spacing-xs);
        }

        .btn-sm {
          padding: var(--spacing-xs) var(--spacing-sm);
          font-size: 0.875rem;
        }

        .geo-error {
          background-color: #fef3c7;
          color: #92400e;
          padding: var(--spacing-sm);
          border-radius: var(--radius-md);
          font-size: 0.875rem;
          margin-bottom: var(--spacing-sm);
        }

        .address-input {
          margin-top: var(--spacing-sm);
        }

        .success-banner {
          background-color: #dcfce7;
          color: #166534;
          padding: var(--spacing-md);
          border-radius: var(--radius-md);
          margin-bottom: var(--spacing-md);
          font-weight: 500;
        }

        .success-link {
          color: var(--color-primary);
          font-weight: 600;
          text-decoration: underline;
          margin-left: var(--spacing-sm);
        }

        .error-banner {
          background-color: #fee2e2;
          color: #991b1b;
          padding: var(--spacing-md);
          border-radius: var(--radius-md);
          margin-bottom: var(--spacing-md);
          font-weight: 500;
        }

        .btn-submit {
          width: 100%;
          padding: var(--spacing-md);
          font-size: 1rem;
        }

        .mb-md {
          margin-bottom: var(--spacing-md);
        }

        .accuracy-badge {
          font-size: 0.75rem;
          padding: 0.25rem 0.5rem;
          border-radius: var(--radius-full);
          font-weight: 500;
        }

        .accuracy-green {
          background-color: #dcfce7;
          color: #166534;
        }

        .accuracy-yellow {
          background-color: #fef3c7;
          color: #92400e;
        }

        .accuracy-red {
          background-color: #fee2e2;
          color: #991b1b;
        }

        .accuracy-gray {
          background-color: #f3f4f6;
          color: #6b7280;
        }

        .measurement-section {
          margin-bottom: var(--spacing-lg);
        }

        .section-title {
          font-size: 1rem;
          font-weight: 600;
          color: var(--color-text);
          margin-bottom: var(--spacing-sm);
          padding-bottom: var(--spacing-xs);
          border-bottom: 1px solid #e5e7eb;
        }

        @media (max-width: 480px) {
          .input-row-2 {
            grid-template-columns: 1fr;
          }
        }

        /* Photo Upload Styles */
        .photo-upload-area {
          position: relative;
          border: 2px dashed var(--color-border);
          border-radius: var(--radius-lg);
          padding: var(--spacing-lg);
          text-align: center;
          transition: border-color var(--transition-fast);
          cursor: pointer;
        }

        .photo-upload-area:hover {
          border-color: var(--color-primary);
        }

        .photo-input {
          position: absolute;
          inset: 0;
          opacity: 0;
          cursor: pointer;
        }

        .photo-upload-placeholder {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: var(--spacing-xs);
          color: var(--color-text-muted);
        }

        .photo-icon {
          font-size: 2rem;
        }

        .photo-preview-grid {
          display: grid;
          grid-template-columns: repeat(5, 1fr);
          gap: var(--spacing-sm);
        }

        .photo-preview-item {
          position: relative;
          aspect-ratio: 1;
          border-radius: var(--radius-md);
          overflow: hidden;
        }

        .photo-preview-item img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .photo-remove-btn {
          position: absolute;
          top: -6px;
          right: -6px;
          width: 28px;
          height: 28px;
          border-radius: 50%;
          background-color: rgba(0, 0, 0, 0.7);
          color: white;
          border: none;
          cursor: pointer;
          font-size: 1rem;
          line-height: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 2;
        }

        .photo-add-more {
          aspect-ratio: 1;
          border: 2px dashed var(--color-border);
          border-radius: var(--radius-md);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          color: var(--color-text-muted);
          font-size: 0.75rem;
          cursor: pointer;
          transition: border-color var(--transition-fast);
          min-height: 80px;
        }

        .photo-add-more:hover {
          border-color: var(--color-primary);
        }

        .photo-add-more span:first-child {
          font-size: 1.5rem;
        }

        .photo-hint {
          display: block;
          color: var(--color-text-muted);
          font-size: 0.75rem;
          margin-top: var(--spacing-xs);
        }

        @media (max-width: 480px) {
          .photo-preview-grid {
            grid-template-columns: repeat(3, 1fr);
          }
        }

        .offline-photo-alert {
          background: #fff3cd;
          border: 1px solid #ffc107;
          border-radius: 8px;
          padding: 16px;
          margin-bottom: 16px;
        }

        .offline-alert {
          background: #dbeafe;
          border: 1px solid #3b82f6;
          border-radius: 8px;
          padding: 16px;
          margin-bottom: 16px;
        }

        .offline-photo-btn {
          padding: 8px 16px;
          background: #ffc107;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-size: 0.875rem;
          font-weight: 500;
        }

        .offline-photo-btn:hover {
          background: #e6a800;
        }

        /* Modal Overlay */
        .modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: var(--spacing-md);
        }

        .accuracy-modal {
          background: white;
          border-radius: var(--radius-lg);
          padding: var(--spacing-lg);
          max-width: 400px;
          width: 100%;
          box-shadow: 0 4px 24px rgba(0, 0, 0, 0.15);
        }

        .accuracy-modal h3 {
          font-size: 1.125rem;
          margin-bottom: var(--spacing-sm);
        }

        .accuracy-modal .accuracy-value {
          font-size: 1.25rem;
          font-weight: 600;
          color: var(--color-primary);
          margin-bottom: var(--spacing-sm);
        }

        .accuracy-modal p {
          font-size: 0.875rem;
          color: var(--color-text-muted);
          margin-bottom: var(--spacing-sm);
          line-height: 1.5;
        }

        .accuracy-modal ul {
          list-style: none;
          padding: 0;
          margin: 0 0 var(--spacing-md) 0;
        }

        .accuracy-modal ul li {
          font-size: 0.8125rem;
          padding: var(--spacing-xs) 0;
          color: var(--color-text);
          line-height: 1.4;
        }

        .accuracy-modal .btn-primary {
          width: 100%;
          padding: var(--spacing-sm) var(--spacing-md);
          font-size: 0.9375rem;
        }

        /* EXIF Warning */
        .exif-warning {
          background: #fef3c7;
          border: 1px solid #fbbf24;
          border-radius: var(--radius-md);
          padding: var(--spacing-sm) var(--spacing-md);
          margin-top: var(--spacing-sm);
          font-size: 0.8125rem;
          color: #92400e;
          line-height: 1.4;
        }

        .photo-error {
          background: #fee2e2;
          border: 1px solid #f87171;
          border-radius: var(--radius-md);
          padding: var(--spacing-sm) var(--spacing-md);
          margin-top: var(--spacing-sm);
          font-size: 0.8125rem;
          color: #991b1b;
          line-height: 1.4;
        }
      `}</style>
    </div>
  );
}