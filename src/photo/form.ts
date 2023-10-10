import { ExifData } from 'ts-exif-parser';
import { Photo, PhotoDbInsert, PhotoExif } from '.';
import {
  convertTimestampToNaivePostgresString,
  convertTimestampWithOffsetToPostgresString,
} from '@/utility/date';
import { getOffsetFromExif } from '@/utility/exif';
import { toFixedNumber } from '@/utility/number';
import { convertStringToArray } from '@/utility/string';
import { generateNanoid } from '@/utility/nanoid';

export type PhotoFormData = Record<keyof PhotoDbInsert, string>;

type FormMeta = {
  label: string
  note?: string
  required?: boolean
  readOnly?: boolean
  hideIfEmpty?: boolean
  hideTemporarily?: boolean
  loadingMessage?: string
  checkbox?: boolean
};

const FORM_METADATA: Record<keyof PhotoFormData, FormMeta> = {
  title: { label: 'title' },
  tags: { label: 'tags', note: 'comma-separated values' },
  id: { label: 'id', readOnly: true, hideIfEmpty: true },
  // eslint-disable-next-line max-len
  blurData: { label: 'blur data', readOnly: true, required: true, loadingMessage: 'Generating blur data ...' },
  url: { label: 'url', readOnly: true },
  extension: { label: 'extension', readOnly: true },
  aspectRatio: { label: 'aspect ratio', readOnly: true },
  make: { label: 'camera make' },
  model: { label: 'camera model' },
  focalLength: { label: 'focal length' },
  focalLengthIn35MmFormat: { label: 'focal length 35mm-equivalent' },
  fNumber: { label: 'aperture' },
  iso: { label: 'ISO' },
  exposureTime: { label: 'exposure time' },
  exposureCompensation: { label: 'exposure compensation' },
  locationName: { label: 'location name', hideTemporarily: true },
  latitude: { label: 'latitude' },
  longitude: { label: 'longitude' },
  filmSimulation: { label: 'film simulation', hideTemporarily: true },
  priorityOrder: { label: 'priority order' },
  takenAt: { label: 'taken at' },
  takenAtNaive: { label: 'taken at (naive)' },
  hidden: { label: 'hidden', checkbox: true },
};

export const FORM_METADATA_ENTRIES =
  (Object.entries(FORM_METADATA) as [keyof PhotoFormData, FormMeta][])
    .filter(([_, meta]) => !meta.hideTemporarily);

export const convertPhotoToFormData = (
  photo: Photo,
): PhotoFormData => {
  const valueForKey = (key: keyof Photo, value: any) => {
    switch (key) {
    case 'tags':
      return value?.join ? value.join(', ') : value;
    case 'takenAt':
      return value?.toISOString ? value.toISOString() : value;
    case 'hidden':
      return value ? 'true' : 'false';
    default:
      return value !== undefined && value !== null
        ? value.toString()
        : undefined;
    }
  };
  return Object.entries(photo).reduce((photoForm, [key, value]) => ({
    ...photoForm,
    [key]: valueForKey(key as keyof Photo, value),
  }), {} as PhotoFormData);
};

export const convertExifToFormData = (
  data: ExifData
): Record<keyof PhotoExif, string | undefined> => ({
  aspectRatio: (
    (data.imageSize?.width ?? 3.0) /
    (data.imageSize?.height ?? 2.0)
  ).toString(),
  make: data.tags?.Make,
  model: data.tags?.Model,
  focalLength: data.tags?.FocalLength?.toString(),
  focalLengthIn35MmFormat: data.tags?.FocalLengthIn35mmFormat?.toString(),
  fNumber: data.tags?.FNumber?.toString(),
  iso: data.tags?.ISO?.toString(),
  exposureTime: data.tags?.ExposureTime?.toString(),
  exposureCompensation: data.tags?.ExposureCompensation?.toString(),
  latitude: data.tags?.GPSLatitude?.toString(),
  longitude: data.tags?.GPSLongitude?.toString(),
  filmSimulation: undefined,
  takenAt: convertTimestampWithOffsetToPostgresString(
    data.tags?.DateTimeOriginal,
    getOffsetFromExif(data),
  ),
  takenAtNaive: convertTimestampToNaivePostgresString(
    data.tags?.DateTimeOriginal,
  ),
});

export const convertFormDataToPhoto = (
  formData: FormData,
  generateId?: boolean,
): PhotoDbInsert => {
  const photoForm = Object.fromEntries(formData) as PhotoFormData;
  
  // Remove Server Action ID
  Object.keys(photoForm).forEach(key => {
    if (key.startsWith('$ACTION_ID_')) {
      delete (photoForm as any)[key];
    }
  });

  return {
    ...photoForm,
    ...(generateId && !photoForm.id) && { id: generateNanoid() },
    // convert form strings to arrays
    tags: convertStringToArray(photoForm.tags),
    // Convert form strings to numbers
    aspectRatio: toFixedNumber(parseFloat(photoForm.aspectRatio), 6),
    focalLength: photoForm.focalLength
      ? parseInt(photoForm.focalLength)
      : undefined,
    focalLengthIn35MmFormat: photoForm.focalLengthIn35MmFormat
      ? parseInt(photoForm.focalLengthIn35MmFormat)
      : undefined,
    fNumber: photoForm.fNumber
      ? parseFloat(photoForm.fNumber)
      : undefined,
    latitude: photoForm.latitude
      ? parseFloat(photoForm.latitude)
      : undefined,
    longitude: photoForm.longitude
      ? parseFloat(photoForm.longitude)
      : undefined,
    iso: photoForm.iso
      ? parseInt(photoForm.iso)
      : undefined,
    exposureTime: photoForm.exposureTime
      ? parseFloat(photoForm.exposureTime)
      : undefined,
    exposureCompensation: photoForm.exposureCompensation
      ? parseFloat(photoForm.exposureCompensation)
      : undefined,
    priorityOrder: photoForm.priorityOrder
      ? parseFloat(photoForm.priorityOrder)
      : undefined,
    hidden: photoForm.hidden === 'true',
  };
};
