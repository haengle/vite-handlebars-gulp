import gulpHandlebarsFileInclude from "gulp-handlebars-file-include";

export function getFileFromURL(url) {
	return url.split('/').pop();
}

function handlebarsX(expression, context) {
	const result = (function() {
		try {
			return eval(expression);
		}
		catch (e) {
			console.warn(
				'• Expression: {{x \'' + expression + '\'}}\n'
				+ '• JS-Error: ', e, '\n'
			+ '• Context: ',
				context
			);
		}
	}).call(context);

	return result;
}

export const handlebarsHelpers = [
	// Run any js line
	{
		name: 'x',
		fn: function(expression, options) {
			return handlebarsX(expression, this, options);
		}
	},
	// Run any js line and check if it is true
	{
		name: 'xif',
		fn: function(expression, options) {
			return handlebarsX(expression, this, options) ? options.fn(this) : options.inverse(this);
		}
	},
	// Check if it is an array
	{
		name: 'isArray',
		fn: function(expression, options) {
			if (Array.isArray(expression)) {
				return options.fn(expression);
			} else {
				return options.inverse(expression);
			}
		}
	},
	// Reverse array
	{
		name: 'reverseArray',
		fn: function(expression) {
			expression.reverse();
		}
	},
	// Check if one var equals to another
	{
		name: 'equals',
		fn: function(v1, v2, block) {
			if (v1 === v2) {
				return block.fn(this);
			}
		}
	},
	// Convert string to uppercase
	{
		name: 'uppercase',
		fn: function(expression) {
			return 'string' === typeof expression ? expression.toUpperCase() : '';
		}
	},
	// Convert deferred styles string to links
	{
		name: 'deferredStyles',
		fn: function(str) {
			var urls = str.split(';'),
				links = [];

			urls.forEach(function(url) {
				links.push('<link href="' + url + '" rel="stylesheet" type="text/css" />');
			});

			return links.join('');
		}
	},
	// Format Phone number like type1 : xxx-xxx-xxxx OR type2 : (xxx) xxx-xxxx
	{
		name: 'formatPhoneNo',
		fn: function(expression, type) {
			var mask = /(\d{3})(\d{3})(\d{,4})?/;
			var newValues;
			if (type === 'type1') {
				newValues = '$1-$2-$3';
			} else {
				newValues = '($1) $2-$3';
			}
			return expression.replace(mask, newValues);
		}
	},
	// It will take the json object & variable name to assign the object & return it in the script tag
	{
		name: 'jsonVarScriptTag',
		fn: function(json, variable) {
			var check = (typeof json === 'object') && (typeof variable === 'string' && variable);
			return check ? '<script>' + 'var ' + variable + '=' + JSON.stringify(json) + '</script>' : '';
		}
	},
	// It will take & return json object
	{
		name: 'json',
		fn: function(json) {
			return JSON.stringify(json);
		}
	},
	// Adding increment of 1 to value
	{
		name: 'inc',
		fn: function(index) {
			index++;
			return index;
		}
	},
	// Loop to go through and add each attribute defined in the attributes: {} object
	{
		name: 'addAttributes',
		fn: function(obj) {
			var output = '';
			var ignoreKeys = Array.prototype.slice.call(arguments, 1, -1);
			if (obj && typeof obj.attributes === 'object') {
				for (var key in obj.attributes) {
					if (ignoreKeys.indexOf(key) === -1) {
						if (typeof obj.attributes[key] !== 'object') {
							output += key + '="' + obj.attributes[key] + '" ';
						} else if (key === 'data') {
							for (var dataKey in obj.attributes[key]) {
								output += 'data-' + dataKey + '="' + obj.attributes[key][dataKey] + '" ';
							}
						} else if (key === 'aria') {
							for (var ariaKey in obj.attributes[key]) {
								output += 'aria-' + ariaKey + '="' + obj.attributes[key][ariaKey] + '" ';
							}
						} 
					}
				}
			}
			return output.trim();
		}
	},
	{
		name: 'fileInclude',
		fn: function(input) {
			return gulpHandlebarsFileInclude(input);
		}
	}		
]