import {build} from 'esbuild';
import {writeFileSync} from 'node:fs';
await build({entryPoints:['src/main.tsx'],bundle:true,minify:true,jsx:'automatic',outfile:'assets/app.js',define:{'process.env.NODE_ENV':'"production"'}});
writeFileSync('index.html',`<!DOCTYPE html><html lang="he" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="theme-color" content="#224f3a"><title>הכדורגל שלנו | נפגשים במגרש</title><meta name="description" content="הבית של הכדורגל השכונתי. נרשמים, מתחלקים, משחקים."><link rel="stylesheet" href="./assets/app.css"></head><body><div id="app"></div><script type="module" src="./assets/app.js"></script></body></html>`);
