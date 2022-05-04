// Colors from https://colorbrewer2.org

// Assuming 6-values with # prepend
const hex2rgb = h => {
  const r = "0x" + h[1] + h[2];
  const g = "0x" + h[3] + h[4];
  const b = "0x" + h[5] + h[6]; 

  return [+r / 255, +g / 255, +b / 255];
};

export const cssString = color => `rgb(${ color.map(d => d * 255).join(', ') })`;

export const regionColors = [
  // Reds
  ['#fff5f0', '#fee0d2', '#fcbba1', '#fc9272', '#fb6a4a', '#ef3b2c', '#cb181d', '#a50f15', '#67000d'],
  
  // Blues
  ['#f7fbff', '#deebf7', '#c6dbef', '#9ecae1', '#6baed6', '#4292c6', '#2171b5', '#08519c', '#08306b'],

  // Purples
  ['#fcfbfd', '#efedf5', '#dadaeb', '#bcbddc', '#9e9ac8', '#807dba', '#6a51a3', '#54278f', '#3f007d'],

  // Greens
  ['#f7fcf5', '#e5f5e0', '#c7e9c0', '#a1d99b', '#74c476', '#41ab5d', '#238b45', '#006d2c', '#00441b']
].map(colors => colors.map(hex2rgb));

const contourIndex = 4;
const activeContourIndex = 6;

const surfaceIndex = 4;
const activeSurfaceIndex = 6;

/*
export const Reds = [
  '#fff5f0', '#fee0d2', '#fcbba1', '#fc9272', '#fb6a4a', '#ef3b2c', '#cb181d', '#a50f15', '#67000d'
].map(hex2rgb);

export const Blues = [
  '#f7fbff', '#deebf7', '#c6dbef', '#9ecae1', '#6baed6', '#4292c6', '#2171b5', '#08519c', '#08306b'
].map(hex2rgb);

export const Purples = [
  '#fcfbfd', '#efedf5', '#dadaeb', '#bcbddc', '#9e9ac8', '#807dba', '#6a51a3', '#54278f', '#3f007d'
].map(hex2rgb);

export const Greens = [
  '#f7fcf5', '#e5f5e0', '#c7e9c0', '#a1d99b', '#74c476', '#41ab5d', '#238b45', '#006d2c', '#00441b'
].map(hex2rgb);

export const regionSurfaceColor = Reds[1];
export const activeSurfaceColor = Reds[3];
*/

//export const backgroundSurfaceColor1 = Blues[2];
//export const backgroundSurfaceColor2 = Blues[8];

// Contour

export const backgroundContourColor = [0.5, 0.5, 0.5];

export const regionContourColor = (label, active = false) => 
  regionColors[label % regionColors.length][active ? activeContourIndex : contourIndex];

export const regionContourHighlightColor = label => regionContourColor(label, true);

// Surface

export const backgroundSurfaceColor1 = [0.2, 0.2, 0.2];
export const backgroundSurfaceColor2 = [0.8, 0.8, 0.8];

export const regionSurfaceColor = (label, active = false) => 
  regionColors[label % regionColors.length][active ? activeSurfaceIndex : surfaceIndex];

export const regionSurfaceHighlightColor = label => regionSurfaceColor(label, true);

export const regionSliceHighlightColors = label => {
  const i = label % regionColors.length;

  return [
    regionColors[i][surfaceIndex + 2],
    regionColors[i][surfaceIndex + 4]
  ];
}; 