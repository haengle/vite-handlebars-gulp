// On page load if hash has an ampersand all text after is removed, if there's a hash with only 'q + number' format we replace history without hash
let hash = window.location.hash;
if (hash.indexOf('&') > -1) {
	window.location.hash = hash = hash.split('&')[0];
}
if (/^#q\d$/.test(hash)) {
	history.replaceState(null, '', window.location.href.split('#')[0]);
}