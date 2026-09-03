import { dev } from '$app/environment';
import { redirect, type Handle } from '@sveltejs/kit';

type SessionUser = NonNullable<App.Locals['user']>;

export const handle: Handle = async ({ event, resolve }) => {
  if (!dev && event.url.protocol === 'http:') {
    const httpsUrl = new URL(event.url);
    httpsUrl.protocol = 'https:';
    redirect(308, httpsUrl);
  }

  const encodedSession = event.cookies.get('dockflow_session');
  let user: SessionUser | null = null;

  if (encodedSession) {
    try {
      user = JSON.parse(atob(encodedSession)) as SessionUser;
    } catch {
      event.cookies.delete('dockflow_session', { path: '/' });
    }
  }

  event.locals.user = user;

  const routeId = event.route.id ?? '';
  const isPublicRoute = routeId === '/login' || routeId === '/logout';

  if (routeId && !isPublicRoute && !user) redirect(303, '/login');
  if (routeId === '/login' && user) redirect(303, '/');

  return resolve(event);
};
