export type CloudinaryFolder = 
  | 'profile_photos'
  | 'driver_licenses'
  | 'vehicle_registrations'
  | 'vehicle_photos'
  | 'report_evidence';

export interface CloudinaryUploadResponse {
  public_id: string;
  version: number;
  signature: string;
  width: number;
  height: number;
  format: string;
  resource_type: string;
  created_at: string;
  tags: string[];
  bytes: number;
  type: string;
  etag: string;
  placeholder: boolean;
  url: string;
  secure_url: string;
  access_mode: string;
  original_filename: string;
}

export interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

export interface ImageCompressOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
}

export interface UploadError {
  message: string;
  code?: string;
  details?: any;
}