export interface ProfileLinkUpdateInput {
  title_override?: string;
  size?: "regular" | "large";
}

export function buildProfileLinkUpdateFormData(
  link: ProfileLinkUpdateInput,
  backgroundFile: File | null,
  backgroundRemoved: boolean,
): FormData {
  const formData = new FormData();
  formData.append("title_override", link.title_override?.trim() || "");
  formData.append("size", link.size || "regular");

  if (backgroundRemoved) {
    formData.append("bg_image", "");
  } else if (backgroundFile) {
    formData.append("bg_image", backgroundFile);
  }

  return formData;
}
