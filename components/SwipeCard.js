'use client';

import { forwardRef, useImperativeHandle, useRef, useState } from 'react';
import { MapPinIcon, MoreIcon } from './icons';

// A draggable profile card. Drag right = like, left = pass, up = super like.
// Tap the left/right half of the photo to flip through photos.
// The parent can also trigger a swipe with ref.current.swipe('like' | 'pass' | 'super').
const SwipeCard = forwardRef(function SwipeCard({ person, onSwipe, onMenu }, ref) {
  const [drag, setDrag] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [exit, setExit] = useState(null);
  const [idx, setIdx] = useState(0);
  const start = useRef(null);
  const moved = useRef(false);
  const photos = person.photos || [];

  function fling(dir) {
    if (exit) return;
    setExit(dir);
    setTimeout(() => onSwipe(dir), 300);
  }

  useImperativeHandle(ref, () => ({ swipe: fling }));

  function down(e) {
    if (exit) return;
    if (e.target.closest('[data-nodrag]')) return;
    start.current = { x: e.clientX, y: e.clientY };
    moved.current = false;
    setDragging(true);
    e.currentTarget.setPointerCapture(e.pointerId);
  }

  function move(e) {
    if (!start.current) return;
    const dx = e.clientX - start.current.x;
    const dy = e.clientY - start.current.y;
    if (Math.abs(dx) > 6 || Math.abs(dy) > 6) moved.current = true;
    setDrag({ x: dx, y: dy });
  }

  function up(e) {
    if (!start.current) return;
    const { x, y } = drag;
    start.current = null;
    setDragging(false);

    if (!moved.current) {
      const rect = e.currentTarget.getBoundingClientRect();
      const leftHalf = e.clientX - rect.left < rect.width / 2;
      setIdx((i) => (leftHalf ? Math.max(0, i - 1) : Math.min(photos.length - 1, i + 1)));
      setDrag({ x: 0, y: 0 });
      return;
    }
    if (x > 110) fling('like');
    else if (x < -110) fling('pass');
    else if (y < -130) fling('super');
    else setDrag({ x: 0, y: 0 });
  }

  let transform = `translate(${drag.x}px, ${drag.y}px) rotate(${drag.x / 18}deg)`;
  if (exit === 'like') transform = 'translate(140%, -10%) rotate(22deg)';
  if (exit === 'pass') transform = 'translate(-140%, -10%) rotate(-22deg)';
  if (exit === 'super') transform = 'translate(0, -140%) scale(0.9)';

  const clamp = (v) => Math.min(1, Math.max(0, v));
  const verticalWins = Math.abs(drag.y) > Math.abs(drag.x);
  const likeOpacity = exit === 'like' ? 1 : verticalWins ? 0 : clamp(drag.x / 100);
  const passOpacity = exit === 'pass' ? 1 : verticalWins ? 0 : clamp(-drag.x / 100);
  const superOpacity = exit === 'super' ? 1 : verticalWins ? clamp(-drag.y / 120) : 0;

  const distanceText =
    person.distance_km == null
      ? person.city
      : person.distance_km < 1
        ? 'Less than 1 km away'
        : `${person.distance_km} km away`;

  return (
    <div
      className="swipe-card"
      style={{ transform, transition: dragging ? 'none' : 'transform 0.3s ease' }}
      onPointerDown={down}
      onPointerMove={move}
      onPointerUp={up}
      onPointerCancel={up}
    >
      {photos.length > 1 && (
        <div className="photo-bars">
          {photos.map((_, i) => (
            <span key={i} className={i === idx ? 'on' : ''} />
          ))}
        </div>
      )}

      {photos.length > 0 ? (
        <img className="card-photo" src={photos[idx]} alt={person.name} draggable={false} />
      ) : (
        <div className="card-photo placeholder">{person.name?.[0]}</div>
      )}

      <button className="card-more" data-nodrag onClick={onMenu} aria-label="Report or block">
        <MoreIcon size="1.3em" />
      </button>

      <div className="stamp stamp-like" style={{ opacity: likeOpacity }}>LIKE</div>
      <div className="stamp stamp-pass" style={{ opacity: passOpacity }}>NOPE</div>
      <div className="stamp stamp-super" style={{ opacity: superOpacity }}>SUPER LIKE</div>

      <div className="card-info">
        <h2>
          {person.name} <span>{person.age}</span>
        </h2>
        {distanceText && (
          <p className="card-loc">
            <MapPinIcon size="1em" /> {distanceText}
          </p>
        )}
        {person.bio && <p className="card-bio">{person.bio}</p>}
        {person.interests?.length > 0 && (
          <div className="card-chips">
            {person.interests.slice(0, 6).map((t) => (
              <span key={t}>{t}</span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
});

export default SwipeCard;
