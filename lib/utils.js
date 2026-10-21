export const INTERESTS = [
  'Travel', 'Music', 'Movies', 'Foodie', 'Fitness', 'Gaming', 'Reading', 'Photography',
  'Cooking', 'Dancing', 'Hiking', 'Coffee', 'Art', 'Pets', 'Cricket', 'Football',
  'Yoga', 'Tech', 'Fashion', 'Writing', 'Cycling', 'Podcasts', 'Anime', 'Festivals',
];

export function ageFromBirthdate(iso) {
  if (!iso) return null;
  const b = new Date(iso + 'T00:00:00');
  if (Number.isNaN(b.getTime())) return null;
  const t = new Date();
  let age = t.getFullYear() - b.getFullYear();
  const m = t.getMonth() - b.getMonth();
  if (m < 0 || (m === 0 && t.getDate() < b.getDate())) age--;
  return age;
}

// Latest birthdate (as YYYY-MM-DD) that is still 18 or older today.
export function latestBirthdateFor18() {
  const d = new Date();
  d.setFullYear(d.getFullYear() - 18);
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
}

export function timeAgo(iso) {
  if (!iso) return '';
  const s = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 60) return 'now';
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d`;
  return new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
}

export function clockTime(iso) {
  return new Date(iso).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

// Shrinks a photo before upload (saves storage and data) and, because it is
// redrawn on a canvas, also removes hidden metadata such as GPS location.
export function resizeImage(file, max = 1080, quality = 0.85) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const scale = Math.min(1, max / Math.max(img.width, img.height));
      const w = Math.max(1, Math.round(img.width * scale));
      const h = Math.max(1, Math.round(img.height * scale));
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      canvas.getContext('2d').drawImage(img, 0, 0, w, h);
      URL.revokeObjectURL(url);
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error('Could not process this image.'))),
        'image/jpeg',
        quality
      );
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Could not read this image. Try a JPG or PNG.'));
    };
    img.src = url;
  });
}

// "https://xyz.supabase.co/storage/v1/object/public/photos/<uid>/<file>" -> "<uid>/<file>"
export function photoPathFromUrl(url) {
  const marker = '/photos/';
  const i = url.indexOf(marker);
  if (i === -1) return null;
  return decodeURIComponent(url.slice(i + marker.length).split('?')[0]);
}
