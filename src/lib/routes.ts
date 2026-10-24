/**
 * Client-facing route families. The original plaza and the Universe share the
 * same data contracts, but keep separate URLs so either experience can evolve
 * without rewriting links inside the other.
 */
export interface SiteRoutes {
  home: string;
  leaderboard: string;
  allModels: string;
  compare: string;
  chronicle: string;
  credits: string;
  /**
   * Route prefixes are strings because these objects cross the server/client
   * boundary. Functions cannot be serialized into the static RSC payload.
   */
  modelPrefix: string;
  vendorPrefix: string;
}

export const WORLD_ROUTES: SiteRoutes = {
  home: '/legacy/',
  leaderboard: '/leaderboard/',
  allModels: '/leaderboard/all/',
  compare: '/compare/',
  chronicle: '/chronicle/',
  credits: '/credits/',
  modelPrefix: '/model/',
  vendorPrefix: '/vendor/',
};

export const UNIVERSE_ROUTES: SiteRoutes = {
  home: '/',
  leaderboard: '/universe/leaderboard/',
  allModels: '/universe/models/',
  compare: '/universe/compare/',
  chronicle: '/universe/chronicle/',
  credits: '/universe/credits/',
  modelPrefix: '/universe/model/',
  vendorPrefix: '/universe/vendor/',
};

export function modelHref(routes: SiteRoutes, slug: string): string {
  return `${routes.modelPrefix}${encodeURIComponent(slug)}/`;
}

export function vendorHref(routes: SiteRoutes, id: string): string {
  return `${routes.vendorPrefix}${encodeURIComponent(id)}/`;
}
