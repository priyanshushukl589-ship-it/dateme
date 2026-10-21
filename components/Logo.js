import { HeartIcon } from './icons';

export default function Logo({ size = 'md', light = false }) {
  return (
    <span className={`logo logo-${size}${light ? ' light' : ''}`}>
      <span className="logo-mark">
        <HeartIcon fill="currentColor" />
      </span>
      DateMe
    </span>
  );
}
