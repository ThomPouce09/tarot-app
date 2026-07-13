const fs = require('fs');
const { Resvg } = require('@resvg/resvg-js');

const svg = fs.readFileSync('public/app-logo.svg', 'utf8');
const resvg = new Resvg(svg, { fitTo: { mode: 'width', value: 512 } });
const png = resvg.render();
fs.writeFileSync('public/app-logo.png', png.asPng());
console.log('PNG written: public/app-logo.png', png.asPng().length, 'bytes');
