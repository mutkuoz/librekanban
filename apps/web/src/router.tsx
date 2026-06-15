import { createRootRoute, createRoute, createRouter } from '@tanstack/react-router';
import { AppShell } from './components/AppShell';
import { BoardsListPage } from './components/BoardsListPage';
import { BoardPage } from './features/board/BoardPage';

const rootRoute = createRootRoute({ component: AppShell });

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: BoardsListPage,
});

const boardRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/b/$boardId',
  component: function BoardRoute() {
    const { boardId } = boardRoute.useParams();
    return <BoardPage boardId={boardId} />;
  },
});

const routeTree = rootRoute.addChildren([indexRoute, boardRoute]);

export const router = createRouter({ routeTree });

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
