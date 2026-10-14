import { defineConfig } from 'cypress';

export default defineConfig({
  video: true,
  videoCompression: 28,
  viewportWidth: 1280,
  viewportHeight: 760,
  defaultCommandTimeout: 15000,
  e2e: {
    baseUrl: 'http://127.0.0.1:4173',
    specPattern: 'cypress/e2e/**/*.cy.js',
    supportFile: false,
  },
});
