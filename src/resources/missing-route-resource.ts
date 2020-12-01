import { unthinkResource, data, DataResult} from '@epandco/unthink-foundation';


export default unthinkResource({
  name: 'Not Found',
  routes: [
    data('*', {
      'get': async () => DataResult.notFound(),
      'put': async () => DataResult.notFound(),
      'post': async () => DataResult.notFound(),
      'delete': async () => DataResult.notFound()
    })
  ]
});
