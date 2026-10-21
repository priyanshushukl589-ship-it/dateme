import Link from 'next/link';

export const metadata = { title: 'Safety tips – DateMe' };

export default function SafetyPage() {
  return (
    <div className="page prose">
      <p>
        <Link href="/">&larr; Back</Link>
      </p>
      <h1>Safety tips</h1>
      <p>Meeting new people is exciting. These habits keep it safe.</p>

      <h2>Before you meet</h2>
      <ul>
        <li>Chat for a while on DateMe first. Video call before meeting if you can.</li>
        <li>Never send money, gift cards or financial details to someone you have not met, whatever the story.</li>
        <li>Keep your address, workplace and daily routine private until you really trust someone.</li>
        <li>Be wary of anyone who pushes to move to another app straight away, or whose photos and story do not add up.</li>
      </ul>

      <h2>On the first date</h2>
      <ul>
        <li>Meet in a busy public place and arrange your own transport.</li>
        <li>Tell a friend where you are going, who you are meeting, and when you expect to be back.</li>
        <li>Keep your phone charged and stay sober enough to look after yourself.</li>
        <li>Leave if anything feels wrong. You never owe anyone an explanation.</li>
      </ul>

      <h2>Using DateMe</h2>
      <ul>
        <li>Tap the &ldquo;&hellip;&rdquo; button on a profile or in a chat to report or block someone at any time.</li>
        <li>Report anyone who seems under 18, asks for money, or behaves abusively.</li>
        <li>You can hide your profile or delete your account any time in Settings.</li>
      </ul>

      <p>
        If you are in immediate danger, contact your local emergency services (in India, call 112).
      </p>
    </div>
  );
}
