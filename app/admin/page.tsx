import { redirect } from 'next/navigation';

/**
 * `/admin` had nothing at it, so the obvious address 404'd while the page it
 * should have shown sat one segment deeper. The layout above already refuses
 * anyone who is not an admin, so this redirect leaks nothing.
 */
export default function AdminIndex() {
  redirect('/admin/acessos');
}
