const debugValueEnablesDebug = (value) => value === '' || value === 'true';

const searchEnablesDebug = (search) => {
  const debugValues = new URLSearchParams(search).getAll('debug');

  return (
    debugValues.length > 0 &&
    debugValues.every((value) => debugValueEnablesDebug(value))
  );
};

export { searchEnablesDebug };
