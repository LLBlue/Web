export namespace MarkDownViewer {
	export const getHtml = (id: string): string => `<!DOCTYPE html>
<html lang="en">
<head>
	<meta charset="UTF-8">
	<style>
		html, body, #content {
			margin: 0;
			padding: 0;
		}

		#content {
			word-wrap: break-word;
			-webkit-box-sizing: border-box;
			-moz-box-sizing: border-box;
			box-sizing: border-box;
			min-width: 170px;
			min-height: 50px;
			padding: 5px;
			font-family: "Roboto", sans-serif;
			line-height: 1.5;
		}

		#content > :first-child {
			margin-top: 0;
		}

		a {
			color: #039be5;
			text-decoration: none;
		}

		h1, h2, h3, h4, h5, h6 {
			font-weight: 400;
		}

		table {
			width: 100%;
			display: table;
		}

		table, th, td {
			border: 1px solid black;
			border-collapse: collapse;
			background-color: white;
		}

		th, td {
			padding: 5px;
		}

		blockquote {
			background: #f9f9f9;
			border-left: 10px solid #ffb300;
			margin: 1.5em 10px;
			padding: 0.5em 10px;
			quotes: "\\201C""\\201D""\\2018""\\2019";
		}

		blockquote:before {
			color: #607d8b;
			content: open-quote;
			font-size: 4em;
			line-height: 0.1em;
			margin-right: 0.25em;
			vertical-align: -0.4em;
			font-family: serif;
		}

		blockquote:after {
			content: no-close-quote;
		}

		blockquote > p {
			display: inline;
		}
	</style>
</head>
<body>
<div id="content"></div>

<script>
	var content = document.getElementById('content');
	var id = '${id}';
	var element;

	window.addEventListener('message', handleMessage);

	function handleMessage(event) {
		var message = event.data;
		if (message.id !== id) return;

		switch (message.type) {
			case 'resize':
				parent.postMessage({
					id,
					type: 'resize',
					payload: {
						width: window.getComputedStyle(content, null).getPropertyValue('width'),
						height: window.getComputedStyle(content, null).getPropertyValue('height')
					}
				}, '*');
				break;

			case 'render':
				element = message.payload;
				content.style.width = element.args.width || 'auto';
				content.style.height = element.args.height || '50px';
				content.style.fontSize = element.args.fontSize || '16px';

				document.getElementById('content').innerHTML = element.content;
				
				document.querySelectorAll('a').forEach(function(link) {
					if (link.getAttribute('href').substring(0, 24) !== 'javascript:searchHashtag') {
						link.setAttribute('target', '_blank');
						link.setAttribute('rel', 'noopener noreferrer');
					}
				});
				adjustWidth();

				MathJax.Hub.Queue(['Typeset', MathJax.Hub, content]);
				MathJax.Hub.Queue(function () {
					if (!element.args.width || element.args.width === 'auto') {
						content.style.width = 'fit-content';
						document.documentElement.style.overflow = 'hidden';
					}
					adjustWidth();
				});
				break;
		}
	}

	function adjustWidth() {
		if (content.style.width === 'auto' || content.style.width === 'fit-content') {
			// Expand tables
			var style = document.createElement('style');
			style.type = 'text/css';
			style.appendChild(document.createTextNode('table { width: max-content; }'));
			document.head.appendChild(style);

			content.style.width = 'max-content';

			var computedWidth = parseInt(window.getComputedStyle(content, null).getPropertyValue('width'), 10) + 10 + 'px';
			content.style.width = computedWidth;

			parent.postMessage({
				id,
				type: 'resize',
				payload: {
					width: computedWidth
				}
			}, '*');
		}

		handleMessage({ data: { type: 'resize', id } });
	}
	
	function searchHashtag(query) {
		parent.postMessage({
			id,
			type: 'hashtag',
			payload: query
		}, '*');
	}

	try {
		new ResizeObserver(function() {
			if (!!element && element.args.width === 'auto') content.style.width = 'auto';

			adjustWidth();
		}).observe(content);
	} catch (e) {
		console.warn('Resize Observer not supported. IFrame rendering might be slightly off.')
	}
</script>

<script src="/assets/mathjax/MathJax.js"></script>
<script>
	MathJax.Hub.Config({
		jax: ['input/AsciiMath', 'input/TeX', 'output/SVG'],
		extensions: ['Safe.js', 'tex2jax.js', 'asciimath2jax.js'],
		messageStyle: 'none',
		tex2jax: {
			inlineMath: [[';;', ';;']]
		},
		asciimath2jax: {
			delimiters: [['===', '===']]
		},
		showMathMenu: false,
		skipStartupTypeset: true
	});
</script>
</body>
</html>`;
}