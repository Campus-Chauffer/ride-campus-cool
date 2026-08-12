import { registerRootComponent } from 'expo';

import { initSentry } from './src/utils/sentry';
import App from './App';

// Initialize before anything else in the app so crashes during module-level
// side effects (e.g. App.tsx's background-location task registration) are
// still caught.
initSentry();

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);
