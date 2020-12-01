import {unthinkResource, data, DataResult, RouteContext} from '@epandco/unthink-foundation';
import {createSession} from '../services/session-service';


export default unthinkResource({
  name: 'Not Found',
  basePath: '/session',
  routes: [
    data('/create', {
      'post': async (context: RouteContext): Promise<DataResult> => {
        if (!context.body
          || !context.body.hasOwnProperty('password')) {
          return DataResult.error('Password is required.');
        }
        // TODO: validate password
        const password = (context.body as Record<string, string>).password;
        const session = await createSession(password);
        return DataResult.ok({
          value: {
            id: session.id
          }
        });
      }
    })
  ]
});
