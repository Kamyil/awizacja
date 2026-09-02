import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = ({ cookies }) => {
  cookies.delete('dockflow_session', { path: '/' });
  redirect(303, '/login');
};
