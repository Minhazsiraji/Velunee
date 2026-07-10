export interface SignedUploadRequest {
  userId: string;
  contentType: string;
  byteLength: number;
  purpose: 'private-advice' | 'community-post' | 'profile-photo';
}

export interface SignedUpload {
  objectKey: string;
  uploadUrl: string;
  expiresAt: string;
}

export interface StorageProvider {
  createSignedUpload(request: SignedUploadRequest): Promise<SignedUpload>;
  createSignedReadUrl(objectKey: string, expiresInSeconds: number): Promise<string>;
  deleteObject(objectKey: string): Promise<void>;
}
