const getFetch = (fetchImpl) => {
  var requestFetch = fetchImpl || globalThis.fetch;

  if (typeof requestFetch !== 'function') {
    throw new Error('Weltmeister requires fetch() for browser API requests');
  }

  return requestFetch;
};

const createResponseError = async (response) => {
  var body = null;
  var responseText = '';

  try {
    body = await response.json();
  } catch (_jsonError) {
    try {
      responseText = await response.text();
    } catch (_textError) {
      responseText = '';
    }
  }

  var message =
    body && body.error
      ? body.error
      : response.statusText || 'Request failed';
  var error = new Error(message);
  error.status = response.status;
  error.statusText = response.statusText;
  error.responseJSON = body;
  error.responseText = responseText;
  return error;
};

const requestJson = async (url, options = {}) => {
  var { fetchImpl, ...fetchOptions } = options;
  var response = await getFetch(fetchImpl)(url, fetchOptions);
  var body = await response.json().catch(() => null);

  if (!response.ok) {
    var error = new Error(
      body && body.error
        ? body.error
        : response.statusText || 'Request failed'
    );
    error.status = response.status;
    error.statusText = response.statusText;
    error.responseJSON = body;
    error.responseText = '';
    throw error;
  }

  return body;
};

const requestText = async (url, options = {}) => {
  var { fetchImpl, ...fetchOptions } = options;
  var response = await getFetch(fetchImpl)(url, fetchOptions);

  if (!response.ok) {
    throw await createResponseError(response);
  }

  return response.text();
};

export { createResponseError, requestJson, requestText };
