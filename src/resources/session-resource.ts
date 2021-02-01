// import {unthinkResource, data, DataResult, RouteContext} from '@epandco/unthink-foundation';
// import {AddCharacterRequest} from '../schemas/combat-character.schema';

/*
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
    }),

    data('/:id', {
      'get': async context => {
        if (!context.params?.hasOwnProperty('id')) {
          return DataResult.notFound();
        }
        if (!context.query
          || !context.query.hasOwnProperty('t')) {
          return DataResult.notFound();
        }
        const token = (context.query as Record<string, string>).t;
        try {
          const session = await getSessionByToken(token);
          return DataResult.ok({
            value: session
          });
        } catch (e) {
          return DataResult.notFound();
        }
      }
    }),

    data('/:id/join', {
      'post': async (context: RouteContext): Promise<DataResult> => {
        if (!context.params?.hasOwnProperty('id')) {
          return DataResult.notFound();
        }
        // validate model
        if (!context.body
          || !context.body.hasOwnProperty('password')
          || !context.body.hasOwnProperty('role')) {
          return DataResult.error('Invalid request.');
        }
        const model = context.body as { password: string; role: number; };
        try {
          const user = await joinSession(context.params.id, model.password, model.role);
          return DataResult.ok({
            value: user
          });
        } catch (e) {
          return DataResult.notFound();
        }
      }
    }),

    data('/:id/combat/characters', {
      'post': async context => {
        if (!context.params?.id) {
          return DataResult.notFound();
        }

        if (!context.body) {
          return DataResult.error('Invalid request data.');
        }

        const model = context.body as AddCharacterRequest;
        if (!model.token || !model.character) {
          return DataResult.error('Invalid request data.');
        }

        try {
          const character = await addCharacter(model.token, model.character);
          return DataResult.ok({
            value: character
          });
        } catch (e) {
          return DataResult.error('Invalid request data.');
        }
      }
    })
  ]
});
*/
