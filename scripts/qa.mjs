// Creates a disposable browser QA page. Do not deploy qa.html.
import {readFile,writeFile} from 'node:fs/promises';
const site=new URL('../site/',import.meta.url);
const [html,css,js]=await Promise.all(['index.html','style.css','game.js'].map(name=>readFile(new URL(name,site),'utf8')));
const inline=html.replace('<body>','<body class="embed">').replace('<link rel="stylesheet" href="./style.css">','<style>'+css+'</style>').replace('<script defer src="./game.js"></script>','').replace('</body>','<script>'+js+'</script></body>');
const escape=value=>value.replaceAll('&','&amp;').replaceAll('"','&quot;').replaceAll('<','&lt;');
const frame=(id,w,h,src='./?embed=1')=>`<section><h2>${id}: ${w} × ${h}</h2><iframe title="${id}" id="${id}" src="${src}" width="${w}" height="${h}"></iframe></section>`;
await writeFile(new URL('qa.html',site),`<!doctype html><html lang="uk"><meta charset="utf-8"><title>Internal responsive QA</title><style>body{background:#373730;color:#fff;font:14px monospace;margin:20px}.frames{display:flex;gap:25px;align-items:flex-start;flex-wrap:wrap}iframe{border:1px solid #666;background:#141412}h2{font-size:14px}</style><h1>Responsive / iframe QA</h1><div class="frames">${frame('small',320,720)}${frame('mobile',390,844)}${frame('tablet',768,800)}${frame('keyboard',390,340)}<section><h2>Storage blocked</h2><iframe title="Storage blocked" id="blocked" sandbox="allow-scripts" srcdoc="${escape(inline)}" width="390" height="700"></iframe></section>${frame('standalone',320,860,'./')}</div></html>`);
console.log('Created site/qa.html. Remove it after QA.');
