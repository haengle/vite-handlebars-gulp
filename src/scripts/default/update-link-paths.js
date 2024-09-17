const updateFooterModalPaths = (config) => {
	const footerModalLinks = document.querySelectorAll('.footer__links a');
	const { pathSubdirectory } = config;
	let footerPath = '';

	if (pathSubdirectory) {
		footerPath = pathSubdirectory.replace(/\/$/, '');
	}

	footerModalLinks.forEach((link) => {
		let href = link.dataset.load;
		if (href) {
			href = href.startsWith('/src') ? href.substring(5) : href;
		}

		if (href && import.meta.env.MODE === 'development') {
			link.setAttribute('data-load', `${href}index.hbs`);
		} else if (href && import.meta.env.MODE === 'production') {
			link.setAttribute('data-load', `${footerPath}${href}index.html`);
		}
	});
};

export const updateFooterLinkPaths = (config) => {
	const observer = new MutationObserver((mutationsList) => {
		for (const mutation of mutationsList) {
			if (mutation.type === 'childList') {
				const footerLinks = document.querySelector('.footer__links');
				if (footerLinks) {
					updateFooterModalPaths(config);
					observer.disconnect();
					break;
				}
			}
		}
	});

	observer.observe(document.body, { childList: true, subtree: true });
};
