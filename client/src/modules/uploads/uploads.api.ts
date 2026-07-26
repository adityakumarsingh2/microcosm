import { apiRequest } from "../../shared/api/api-client";

export type Asset = {
  id: string;
  userId: string;
  workspaceId?: string | null;
  publicId: string;
  url: string;
  format: string;
  width: number;
  height: number;
  bytes: number;
  originalFilename: string;
  createdAt: string;
};

type UploadResponse = {
  success: true;
  data: Asset;
};

export async function uploadImageFile(file: File, workspaceId?: string): Promise<Asset> {
  const formData = new FormData();
  formData.append("image", file);
  if (workspaceId) {
    formData.append("workspaceId", workspaceId);
  }

  const res = await apiRequest<UploadResponse>("/uploads/images", {
    method: "POST",
    body: formData,
  });

  return res.data;
}
