import { redirect, RedirectType } from 'next/navigation';

export default function ProtectedPage() {
    return redirect('/dashboard', RedirectType.replace);
}
