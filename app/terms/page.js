import Link from 'next/link';

export const metadata = { title: 'Terms of Service – DateMe' };

// TEMPLATE ONLY – have a lawyer review and adapt this before you launch publicly.
export default function TermsPage() {
  return (
    <div className="page prose">
      <p>
        <Link href="/">&larr; Back</Link>
      </p>
      <h1>Terms of Service</h1>
      <p className="muted small">Template – review with a lawyer before public launch. Last updated: [DATE].</p>

      <h2>1. Who can use DateMe</h2>
      <p>
        You must be at least 18 years old. By creating an account you confirm you are 18 or older and that the
        information you give is true. We may remove accounts that appear to belong to anyone under 18.
      </p>

      <h2>2. Your account</h2>
      <p>
        Keep your password private. You are responsible for activity on your account. One person, one account.
      </p>

      <h2>3. How to behave</h2>
      <p>You agree not to:</p>
      <ul>
        <li>harass, threaten, abuse or discriminate against anyone;</li>
        <li>post sexual content involving minors, nudity, violence, or anything illegal;</li>
        <li>impersonate others, use fake photos, or run scams, or ask other users for money;</li>
        <li>send spam, advertise, or promote other services;</li>
        <li>attempt to hack, scrape or disrupt the service.</li>
      </ul>

      <h2>4. Your content</h2>
      <p>
        You own the photos and text you post, but you give DateMe permission to store and show them to other users as
        part of the service. Only upload photos you have the right to use.
      </p>

      <h2>5. Safety and moderation</h2>
      <p>
        We may review reports, remove content, and suspend or delete accounts that break these rules. We cannot verify
        every user, so please read our <Link href="/safety">safety tips</Link> and use your own judgment when meeting
        people.
      </p>

      <h2>6. Ending your account</h2>
      <p>You can delete your account at any time in Settings. We may suspend accounts that violate these terms.</p>

      <h2>7. Disclaimers</h2>
      <p>
        DateMe is provided &ldquo;as is&rdquo;. We do not guarantee that you will find a match, and we are not
        responsible for the conduct of users, online or offline, to the extent permitted by law.
      </p>

      <h2>8. Contact</h2>
      <p>Questions or complaints: [YOUR CONTACT EMAIL]</p>
    </div>
  );
}
