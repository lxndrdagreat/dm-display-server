import MissingRouteResource from './resources/missing-route-resource';
import SessionResource from './resources/session-resource';

/** Add new resources to the list below */
export default [
  SessionResource,
  /* To catch all routes not defined by the resources above */
  MissingRouteResource
];
