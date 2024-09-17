export const responseInterceptor = (instance) => {
	let retryCount = 0; 

	instance.interceptors.response.use(
		(response) => {
			return response;
		},
		(error) => {
			console.error('Response failed:', error.response.status);

			// Retry the request if the error code is 4xx or 5xx and retry count is less than 2
			if (error.response && error.response.status >= 400 && error.response.status < 600 && retryCount < 2) {
				retryCount++;
				console.log('Retrying request...', retryCount);
				return instance(error.config);
			}

			return Promise.reject(error);
		}
	);
};