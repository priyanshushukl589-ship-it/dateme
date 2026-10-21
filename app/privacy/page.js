import Link from 'next/link';

export const metadata = { title: 'Privacy Policy – DateMe' };

// TEMPLATE ONLY – have a lawyer review and adapt this before you launch publicly
// (India: Digital Personal Data Protection Act; EU/UK: GDPR; etc.).
export default function PrivacyPage() {
  return (
    <div className="page prose">
      <p>
        <Link href="/">&larr; Back</Link>
      </p>
      <h1>Privacy Policy</h1>
      <p className="muted small">Template – review with a lawyer before public launch. Last updated: [DATE].</p>

      <h2>What we collect</h2>
      <ul>
        <li>Account details: your email address and a securely hashed password.</li>
        <li>Profile details: name, date of birth, gender, who you want to meet, bio, interests, city and photos.</li>
        <li>Approximate location (rounded to about 1 km) if you choose &ldquo;Use my location&rdquo;.</li>
        <li>Your swipes, matches, messages, blocks and reports.</li>
      </ul>

      <h2>How we use it</h2>
      <ul>
        <li>To run the service: show your profile to other people, suggest matches and deliver messages.</li>
        <li>To keep people safe: handle reports, block abuse and enforce our Terms.</li>
      </ul>

      <h2>Who can see what</h2>
      <ul>
        <li>Other users see your name, age (not your birth date), photos, bio, interests, city and approximate distance.</li>
        <li>Only you and the person you matched with can read your messages.</li>
        <li>Profile photos are stored at public web addresses, so anyone who has a photo&apos;s direct link can open it.</li>
        <li>We do not sell your personal data.</li>
      </ul>

      <h2>Service providers</h2>
      <p>
        DateMe uses Supabase (database, login and file storage) and Vercel (website hosting) to operate. They process data
        on our behalf.
      </p>

      <h2>Your choices</h2>
      <ul>
        <li>Edit your profile or hide it from Discover at any time.</li>
        <li>Delete your account in Settings. This removes your profile, photos, matches and messages.</li>
        <li>Reports about other users may be kept for safety reasons even after an account is deleted.</li>
      </ul>

      <h2>Contact</h2>
      <p>Privacy questions or requests: [YOUR CONTACT EMAIL]</p>
    </div>
  );
}
