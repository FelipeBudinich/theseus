const debugValueEnablesDebug = (value) => value === '' || value === 'true';

const hasDebugQuery = () => {
  const debugValues = new URLSearchParams(window.location.search).getAll('debug');

  return (
    debugValues.length > 0 &&
    debugValues.every((value) => debugValueEnablesDebug(value))
  );
};

if (hasDebugQuery()) {
  await import('../impact/debug/debug.js');
}

await import('./main.js');
