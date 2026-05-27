import { clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs) {
  return twMerge(clsx(inputs))
}

export function getImageUrl(path) {
  if (!path) return '';
  if (path.startsWith('http://') || path.startsWith('https://') || path.startsWith('data:')) {
    return path;
  }
  const cleanPath = path.startsWith('/') ? path.slice(1) : path;
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
  const baseUrl = apiUrl.replace(/\/api\/?$/, '');
  return `${baseUrl}/${cleanPath}`;
}
