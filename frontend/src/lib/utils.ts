import { clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs) {
  return twMerge(clsx(inputs))
}

export function getImageUrl(path, options) {
  if (!path) return '';
  
  if (path.startsWith('http://') || path.startsWith('https://') || path.startsWith('data:')) {
    // If it is a Cloudinary URL, inject optimization parameters
    if (path.includes('res.cloudinary.com') && path.includes('/upload/')) {
      let transforms = 'f_auto,q_auto';
      if (options) {
        if (options.width) transforms += `,w_${options.width}`;
        if (options.height) transforms += `,h_${options.height}`;
        if (options.crop) transforms += `,c_${options.crop}`;
      }
      return path.replace('/upload/', `/upload/${transforms}/`);
    }
    return path;
  }
  const cleanPath = path.startsWith('/') ? path.slice(1) : path;
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
  const baseUrl = apiUrl.replace(/\/api\/?$/, '');
  return `${baseUrl}/${cleanPath}`;
}
