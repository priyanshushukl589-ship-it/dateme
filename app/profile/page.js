'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import RequireAuth from '@/components/RequireAuth';
import { useAuth } from '@/components/AuthProvider';
import { supabase } from '@/lib/supabase';
import {
  INTERESTS,
  ageFromBirthdate,
  latestBirthdateFor18,
  photoPathFromUrl,
  resizeImage,
} from '@/lib/utils';
import { MapPinIcon, PlusIcon, XIcon } from '@/components/icons';

export default function ProfilePage() {
  return (
    <RequireAuth needProfile={false}>
      <ProfileForm />
    </RequireAuth>
  );
}

function ProfileForm() {
  const { user, profile, refreshProfile } = useAuth();
  const router = useRouter();
  const isNew = !profile;

  const [form, setForm] = useState({
    name: profile?.name || '',
    birthdate: profile?.birthdate || '',
    gender: profile?.gender || '',
    interested_in: profile?.interested_in || 'everyone',
    bio: profile?.bio || '',
    city: profile?.city || '',
    latitude: profile?.latitude ?? null,
    longitude: profile?.longitude ?? null,
    min_age: profile?.min_age ?? 18,
    max_age: profile?.max_age ?? 60,
    max_distance_km: profile?.max_distance_km ?? 100,
  });
  const [interests, setInterests] = useState(profile?.interests || []);
  const [photos, setPhotos] = useState(profile?.photos || []);
  const [uploading, setUploading] = useState(false);
  const [locating, setLocating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const removedPhotos = useRef([]);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  function toggleInterest(tag) {
    setInterests((list) => {
      if (list.includes(tag)) return list.filter((t) => t !== tag);
      if (list.length >= 8) return list;
      return [...list, tag];
    });
  }

  async function onPickFiles(e) {
    const files = Array.from(e.target.files || []);
    e.target.value = '';
    if (!files.length) return;
    setError('');
    const room = 6 - photos.length;
    if (room <= 0) return setError('You can add up to 6 photos.');

    setUploading(true);
    const urls = [];
    try {
      for (const file of files.slice(0, room)) {
        if (!file.type.startsWith('image/')) continue;
        const blob = await resizeImage(file);
        const path = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`;
        const { error: upErr } = await supabase.storage
          .from('photos')
          .upload(path, blob, { contentType: 'image/jpeg', cacheControl: '31536000' });
        if (upErr) throw upErr;
        urls.push(supabase.storage.from('photos').getPublicUrl(path).data.publicUrl);
      }
      setPhotos((p) => [...p, ...urls]);
    } catch (err) {
      if (urls.length) setPhotos((p) => [...p, ...urls]);
      setError(err.message || 'Photo upload failed.');
    } finally {
      setUploading(false);
    }
  }

  function removePhoto(url) {
    removedPhotos.current.push(url);
    setPhotos((p) => p.filter((u) => u !== url));
  }

  function makeMain(url) {
    setPhotos((p) => [url, ...p.filter((u) => u !== url)]);
  }

  function grabLocation() {
    if (!navigator.geolocation) return setError('Your browser does not support location.');
    setLocating(true);
    setError('');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        // rounded to ~1 km so your exact position is never stored
        setForm((f) => ({
          ...f,
          latitude: Math.round(pos.coords.latitude * 100) / 100,
          longitude: Math.round(pos.coords.longitude * 100) / 100,
        }));
        setLocating(false);
      },
      () => {
        setLocating(false);
        setError('Could not get your location. You can still type your city.');
      },
      { timeout: 10000 }
    );
  }

  async function save(e) {
    e.preventDefault();
    setError('');
    setSaved(false);

    const age = ageFromBirthdate(form.birthdate);
    if (!form.name.trim()) return setError('Please enter your first name.');
    if (!form.birthdate) return setError('Please enter your date of birth.');
    if (age === null || age < 18) return setError('DateMe is only for people 18 and older.');
    if (!form.gender) return setError('Please choose your gender.');
    if (photos.length < 1) return setError('Please add at least one photo.');
    if (Number(form.min_age) < 18) return setError('Minimum age must be 18 or more.');
    if (Number(form.min_age) > Number(form.max_age)) return setError('Minimum age cannot be higher than maximum age.');

    setSaving(true);
    const { error: err } = await supabase.from('profiles').upsert({
      id: user.id,
      name: form.name.trim(),
      birthdate: form.birthdate,
      gender: form.gender,
      interested_in: form.interested_in,
      bio: form.bio.trim(),
      interests,
      photos,
      city: form.city.trim(),
      latitude: form.latitude,
      longitude: form.longitude,
      min_age: Number(form.min_age),
      max_age: Number(form.max_age),
      max_distance_km: Number(form.max_distance_km),
    });
    setSaving(false);
    if (err) return setError(err.message);

    // now it is safe to delete photos the person removed
    if (removedPhotos.current.length) {
      const paths = removedPhotos.current.map(photoPathFromUrl).filter(Boolean);
      if (paths.length) await supabase.storage.from('photos').remove(paths);
      removedPhotos.current = [];
    }

    await refreshProfile();
    if (isNew) router.replace('/discover');
    else {
      setSaved(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  const slots = Array.from({ length: 6 });

  return (
    <form className="page" onSubmit={save}>
      <h1>{isNew ? 'Create your profile' : 'Your profile'}</h1>
      {isNew && <p className="muted">Tell people a little about you. You can change everything later.</p>}
      {saved && <p className="success">Profile saved ✓</p>}

      <section className="block">
        <h2>Photos</h2>
        <p className="muted small">Add 1–6 photos. The first one is your main photo. Show your face clearly.</p>
        <div className="photo-grid">
          {slots.map((_, i) => {
            const url = photos[i];
            if (url) {
              return (
                <div className="photo-slot filled" key={url}>
                  <img src={url} alt={`Photo ${i + 1}`} />
                  {i === 0 && <span className="main-tag">Main</span>}
                  {i > 0 && (
                    <button type="button" className="make-main" onClick={() => makeMain(url)}>
                      Make main
                    </button>
                  )}
                  <button type="button" className="remove-photo" onClick={() => removePhoto(url)} aria-label="Remove photo">
                    <XIcon size="1em" />
                  </button>
                </div>
              );
            }
            const isNextSlot = i === photos.length;
            return (
              <label className={`photo-slot${isNextSlot ? ' add' : ''}`} key={`empty-${i}`}>
                {isNextSlot && (
                  <>
                    <input type="file" accept="image/*" multiple onChange={onPickFiles} disabled={uploading} hidden />
                    {uploading ? <span className="mini-spinner" /> : <PlusIcon size="1.6em" />}
                  </>
                )}
              </label>
            );
          })}
        </div>
      </section>

      <section className="block">
        <h2>About you</h2>
        <label className="field">
          <span>First name</span>
          <input value={form.name} onChange={set('name')} maxLength={50} placeholder="Your first name" />
        </label>
        <label className="field">
          <span>Date of birth (must be 18+)</span>
          <input type="date" value={form.birthdate} onChange={set('birthdate')} max={latestBirthdateFor18()} />
        </label>

        <div className="field">
          <span>I am</span>
          <div className="seg">
            {[
              ['man', 'Man'],
              ['woman', 'Woman'],
              ['nonbinary', 'Non-binary'],
            ].map(([value, label]) => (
              <button
                type="button"
                key={value}
                className={form.gender === value ? 'on' : ''}
                onClick={() => setForm((f) => ({ ...f, gender: value }))}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <label className="field">
          <span>About me ({form.bio.length}/500)</span>
          <textarea
            rows={4}
            maxLength={500}
            value={form.bio}
            onChange={set('bio')}
            placeholder="A line or two about you, what you enjoy, what you're looking for…"
          />
        </label>

        <div className="field">
          <span>Interests (pick up to 8)</span>
          <div className="chips">
            {INTERESTS.map((tag) => (
              <button
                type="button"
                key={tag}
                className={`chip${interests.includes(tag) ? ' on' : ''}`}
                onClick={() => toggleInterest(tag)}
              >
                {tag}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="block">
        <h2>Who do you want to meet?</h2>
        <div className="field">
          <span>Show me</span>
          <div className="seg">
            {[
              ['men', 'Men'],
              ['women', 'Women'],
              ['everyone', 'Everyone'],
            ].map(([value, label]) => (
              <button
                type="button"
                key={value}
                className={form.interested_in === value ? 'on' : ''}
                onClick={() => setForm((f) => ({ ...f, interested_in: value }))}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="row2">
          <label className="field">
            <span>Min age</span>
            <input type="number" min={18} max={99} value={form.min_age} onChange={set('min_age')} />
          </label>
          <label className="field">
            <span>Max age</span>
            <input type="number" min={18} max={99} value={form.max_age} onChange={set('max_age')} />
          </label>
        </div>

        <label className="field">
          <span>Maximum distance: {form.max_distance_km} km</span>
          <input type="range" min={5} max={500} step={5} value={form.max_distance_km} onChange={set('max_distance_km')} />
        </label>
      </section>

      <section className="block">
        <h2>Location</h2>
        <label className="field">
          <span>City</span>
          <input value={form.city} onChange={set('city')} maxLength={80} placeholder="e.g. Pune" />
        </label>
        <button type="button" className="btn btn-ghost" onClick={grabLocation} disabled={locating}>
          <MapPinIcon size="1.1em" /> {locating ? 'Locating…' : form.latitude != null ? 'Update my location' : 'Use my location'}
        </button>
        <p className="muted small">
          {form.latitude != null
            ? 'Location saved (approximate, rounded to about 1 km). It is used to show distances and filter by distance.'
            : 'Optional. Without it, distance filtering is switched off for you.'}
        </p>
      </section>

      {error && <p className="error">{error}</p>}
      <button className="btn btn-primary btn-block" disabled={saving || uploading}>
        {saving ? 'Saving…' : isNew ? 'Save and start swiping' : 'Save changes'}
      </button>
    </form>
  );
}
