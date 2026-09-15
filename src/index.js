export default {
  async fetch(request, env, ctx) {
    return new Response('Kitchen Tracker Worker is running', {
      headers: { 'content-type': 'text/plain; charset=utf-8' },
    });
  },
};
