import {build} from 'esbuild';
import {createHash} from 'node:crypto';
import {writeFileSync,readFileSync} from 'node:fs';
await build({entryPoints:['src/main.tsx'],bundle:true,minify:true,jsx:'automatic',outfile:'assets/app.js',define:{'process.env.NODE_ENV':'"production"'}});
const version=createHash('sha256').update(readFileSync('assets/app.js')).update(readFileSync('assets/app.css')).digest('hex').slice(0,12);
writeFileSync('index.html',`<!DOCTYPE html><html lang="he" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="theme-color" content="#b91c1c"><title>הכדורגל שלנו | נפגשים במגרש</title><meta name="description" content="הבית של הכדורגל השכונתי. נרשמים, מתחלקים, משחקים."><link rel="stylesheet" href="./assets/app.css?v=${version}"></head><body><div id="app"></div><script type="module" src="./assets/app.js?v=${version}"></script></body></html>`);
