import { redirect } from 'next/navigation';

export default function ReadingsRedirect() {
  redirect('/dashboard/account/readings');
}
