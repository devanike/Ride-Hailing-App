import { CloudinaryFolder, CloudinaryUploadResponse, ImageCompressOptions } from '@/types/upload';
import * as ImageManipulator from 'expo-image-manipulator';

/**
 * Upload Service
 * Handles image uploads to Cloudinary
 * 
 * SETUP INSTRUCTIONS:
 * 1. Go to https://cloudinary.com and create a free account
 * 2. Get your Cloud Name from the Dashboard
 * 3. Go to Settings > Upload > Upload Presets
 * 4. Create a new unsigned upload preset
 * 5. Set the folder structure and transformations
 * 6. Add the Cloud Name and Upload Preset to .env file
 */

const CLOUDINARY_CLOUD_NAME = process.env.EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME;
const CLOUDINARY_UPLOAD_PRESET = process.env.EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

/**
 * Compress an image to reduce file size
 * @param imageUri - URI of the image to compress
 * @param options - Compression options
 * @returns URI of compressed image
 * 
 * @example
 * const compressedUri = await compressImage('file://path/to/image.jpg');
 */
export const compressImage = async (
  imageUri: string,
  options: ImageCompressOptions = {}
): Promise<string> => {
  try {
    const {
      maxWidth = 1200,
      maxHeight = 1200,
      quality = 0.8,
    } = options;

    const manipulatedImage = await ImageManipulator.manipulateAsync(
      imageUri,
      [
        {
          resize: {
            width: maxWidth,
            height: maxHeight,
          },
        },
      ],
      {
        compress: quality,
        format: ImageManipulator.SaveFormat.JPEG,
      }
    );

    return manipulatedImage.uri;
  } catch (error: any) {
    console.error('Error compressing image:', error);
    throw new Error('Failed to compress image');
  }
};

/**
 * Upload an image to Cloudinary
 * @param imageUri - URI of the image to upload
 * @param folder - Cloudinary folder to upload to
 * @returns Secure URL of uploaded image
 * 
 * @example
 * const url = await uploadImage('file://path/to/image.jpg', 'profile_photos');
 */
export const uploadImage = async (
  imageUri: string,
  folder: CloudinaryFolder
): Promise<string> => {
  try {
    // First, compress the image
    const compressedUri = await compressImage(imageUri);

    // Create form data
    const formData = new FormData();
    
    // @ts-ignore - FormData with file works in React Native
    formData.append('file', {
      uri: compressedUri,
      type: 'image/jpeg',
      name: `${folder}_${Date.now()}.jpg`,
    });
    
    formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET!);
    formData.append('folder', folder);

    // Upload to Cloudinary
    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
      {
        method: 'POST',
        body: formData,
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );

    if (!response.ok) {
      throw new Error('Upload failed');
    }

    const data: CloudinaryUploadResponse = await response.json();
    return data.secure_url;
  } catch (error: any) {
    console.error('Error uploading image:', error);
    throw new Error('Failed to upload image');
  }
};

/**
 * Upload multiple images to Cloudinary
 * @param imageArray - Array of image URIs
 * @param folder - Cloudinary folder to upload to
 * @returns Array of secure URLs
 * 
 * @example
 * const urls = await uploadMultipleImages([uri1, uri2, uri3], 'vehicle_photos');
 */
export const uploadMultipleImages = async (
  imageArray: string[],
  folder: CloudinaryFolder
): Promise<string[]> => {
  try {
    const uploadPromises = imageArray.map((uri) => uploadImage(uri, folder));
    const urls = await Promise.all(uploadPromises);
    return urls;
  } catch (error: any) {
    console.error('Error uploading multiple images:', error);
    throw new Error('Failed to upload images');
  }
};

/**
 * Delete an image from Cloudinary
 * @param publicId - Public ID of the image to delete
 * 
 * Note: This requires server-side implementation as it needs API Secret
 * For now, images will remain in Cloudinary (free tier: 25GB storage)
 * 
 * @example
 * await deleteImage('profile_photos/image123');
 */
export const deleteImage = async (publicId: string): Promise<void> => {
  try {
    // TODO: Implement server-side deletion
    // This requires Cloudinary API Secret which should not be exposed in client
    console.warn('Image deletion requires server-side implementation');
    
    // For production, create a Cloud Function or API endpoint that:
    // 1. Receives the publicId
    // 2. Uses the Cloudinary SDK with API Secret
    // 3. Calls cloudinary.uploader.destroy(publicId)
  } catch (error: any) {
    console.error('Error deleting image:', error);
    throw new Error('Failed to delete image');
  }
};

export default {
  compressImage,
  uploadImage,
  uploadMultipleImages,
  deleteImage,
};