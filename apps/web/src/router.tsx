import { createRootRoute, createRoute, createRouter } from '@tanstack/react-router';
import { AcceptInvitePage } from './components/AcceptInvitePage';
import { AppShell } from './components/AppShell';
import { BoardsListPage } from './components/BoardsListPage';
import { SettingsPage } from './components/SettingsPage';
import { BoardPage } from './features/board/BoardPage';

const rootRoute = createRootRoute({ component: AppShell });

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: BoardsListPage,
});

const settingsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/settings',
  component: SettingsPage,
});

const boardRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/b/$boardId',
  component: function BoardRoute() {
    const { boardId } = boardRoute.useParams();
    return <BoardPage boardId={boardId} />;
  },
});

const inviteRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/invite/$token',
  component: function InviteRoute() {
    const { token } = inviteRoute.useParams();
    return <AcceptInvitePage token={token} />;
  },
});

const routeTree = rootRoute.addChildren([indexRoute, settingsRoute, boardRoute, inviteRoute]);

export const router = createRouter({ routeTree });

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
