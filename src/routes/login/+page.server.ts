import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

const accounts = [
  { login: 'admin', password: 'admin123', name: 'Kamil Michalski', role: 'admin' as const },
  { login: 'dostawca', password: 'dostawca123', name: 'NordSteel Sp. z o.o.', role: 'supplier' as const }
];

export const load: PageServerLoad = ({ locals }) => {
  if (locals.user) redirect(303, '/');
  return {};
};

export const actions: Actions = {
  default: async ({ request, cookies }) => {
    const form = await request.formData();
    const login = String(form.get('login') ?? '').trim().toLowerCase();
    const password = String(form.get('password') ?? '');
    const account = accounts.find((item) => item.login === login && item.password === password);

    if (!account) {
      return fail(400, { login, error: 'Nieprawidłowy login lub hasło.' });
    }

    const session = { login: account.login, name: account.name, role: account.role };
    cookies.set('dockflow_session', btoa(JSON.stringify(session)), {
      path: '/',
      httpOnly: true,
      sameSite: 'lax',
      maxAge: 8 * 60 * 60
    });

    redirect(303, '/');
  }
};
