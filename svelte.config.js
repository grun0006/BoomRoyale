import adapter from '@sveltejs/adapter-node';

export default {
  kit: {
    adapter: adapter(),
    csrf: {
      trustedOrigins: []
    },
    csp: { mode: 'none' }
  }
};