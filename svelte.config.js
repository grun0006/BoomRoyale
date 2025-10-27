import adapter from '@sveltejs/adapter-node';

export default {
  kit: {
    adapter: adapter(),
    csrf: {
      trustedOrigins: []
    },
    csp: {
      mode: 'auto',
      directives: {
        'default-src': ["'self'"],
        'img-src': ["'self'", "data:", "https:"],
        'script-src': ["'self'"],
        'style-src': ["'self'", "'unsafe-inline'"]
      }
    }
  }
};