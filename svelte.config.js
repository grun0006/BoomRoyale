import adapter from '@sveltejs/adapter-static';

export default {
  kit: {
    adapter: adapter({
      pages: 'build',  // hier kun je dist of build kiezen
      assets: 'build',
      fallback: 'index.html'
    })
  }
};
