/**
 * 이미지 리사이즈 및 압축 유틸리티
 */

interface ResizeOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number; // 0-1
  format?: "image/jpeg" | "image/webp" | "image/png";
}

const defaultOptions: ResizeOptions = {
  maxWidth: 400,
  maxHeight: 400,
  quality: 0.8,
  format: "image/webp",
};

/**
 * 이미지 파일을 리사이즈하고 압축합니다.
 */
export async function resizeAndCompressImage(
  file: File,
  options: ResizeOptions = {}
): Promise<File> {
  const { maxWidth, maxHeight, quality, format } = { ...defaultOptions, ...options };

  return new Promise((resolve, reject) => {
    const img = new Image();
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");

    if (!ctx) {
      reject(new Error("Canvas context not available"));
      return;
    }

    img.onload = () => {
      // 원본 비율 유지하면서 리사이즈
      let { width, height } = img;
      
      if (width > maxWidth! || height > maxHeight!) {
        const ratio = Math.min(maxWidth! / width, maxHeight! / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }

      canvas.width = width;
      canvas.height = height;

      // 고품질 리샘플링
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error("Failed to compress image"));
            return;
          }

          // Blob을 File로 변환
          const extension = format === "image/webp" ? "webp" : format === "image/png" ? "png" : "jpg";
          const compressedFile = new File([blob], `image.${extension}`, {
            type: format,
            lastModified: Date.now(),
          });

          console.log(
            `Image resized: ${img.width}x${img.height} → ${width}x${height}, ` +
            `Size: ${(file.size / 1024).toFixed(1)}KB → ${(compressedFile.size / 1024).toFixed(1)}KB`
          );

          resolve(compressedFile);
        },
        format,
        quality
      );
    };

    img.onerror = () => {
      reject(new Error("Failed to load image"));
    };

    // 파일을 이미지로 로드
    const reader = new FileReader();
    reader.onload = (e) => {
      img.src = e.target?.result as string;
    };
    reader.onerror = () => {
      reject(new Error("Failed to read file"));
    };
    reader.readAsDataURL(file);
  });
}
