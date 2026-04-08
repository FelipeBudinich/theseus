import { prepareWeltmeisterEntityState } from './entities.js';
import { bootWeltmeister } from './weltmeister.js';

const startWeltmeister = async () => {
  await prepareWeltmeisterEntityState();
  await bootWeltmeister();
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    void startWeltmeister();
  }, { once: true });
} else {
  void startWeltmeister();
}
