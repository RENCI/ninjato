// Colors from https://colorbrewer2.org

// Assuming 6-values with # prepend
const hex2rgb = h => {
  const r = "0x" + h[1] + h[2];
  const g = "0x" + h[3] + h[4];
  const b = "0x" + h[5] + h[6]; 

  return [+r / 255, +g / 255, +b / 255];
};

export const cssString = color => `rgb(${ color.map(d => d * 255).join(',') })`;

export const Reds = [
  '#fff5f0', '#fee0d2', '#fcbba1', '#fc9272', '#fb6a4a', '#ef3b2c', '#cb181d', '#a50f15', '#67000d'
].map(hex2rgb);

export const Blues = [
  '#f7fbff', '#deebf7', '#c6dbef', '#9ecae1', '#6baed6', '#4292c6', '#2171b5', '#08519c', '#08306b'
].map(hex2rgb);

export const Purples = [
  '#fcfbfd', '#efedf5', '#dadaeb', '#bcbddc', '#9e9ac8', '#807dba', '#6a51a3', '#54278f', '#3f007d'
].map(hex2rgb);