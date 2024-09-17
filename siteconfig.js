/* Example values for site config */

export let siteData = () => {
	return {
		primary_trade: 'WINDOWS',
		service: 'windows',
		gtm_container_ID: 'GTM-XXX', // e.g. GTM-N23VMDW
		qs_gtm_container_ID: 'GTM-XXX',
		email: 'support@email.com', 
		email_unsub: 'unsubscribe@email.com', 
		domain: 'example.com',
		company_name: 'Example', 
		website_name: 'Example.com',
		useCDN: true,
		isWhiteLabel: true,
		isQSPage: true,
		isVite: true,
		useRelativeBuildPath: false,
		useAccessibleConfig: true,
		siteData: {
			test: 'test23'
		}
	};
};