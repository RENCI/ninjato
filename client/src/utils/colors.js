import { color, hsl } from "d3-color";

// Colors from https://colorbrewer2.org



const contourAmount = 1.0;
const activeContourAmount = 0.8;
const highlightContourAmount = 1.2;

const surfaceAmount = 1.0;
const activeSurfaceAmount = 0.8;
const highlightSurfaceAmount = 1.2;

/*

// Assuming 6-values with # prepend
const hex2rgb = h => {
  const r = "0x" + h[1] + h[2];
  const g = "0x" + h[3] + h[4];
  const b = "0x" + h[5] + h[6]; 

  return [+r / 255, +g / 255, +b / 255];
};

export const cssString = color => `rgb(${ color.map(d => d * 255).join(', ') })`;

// Colorbrewer 8-class Set1
const regionColors = ['#e41a1c', '#377eb8', '#4daf4a', '#984ea3', '#ff7f00', '#ffff33', '#a65628', '#f781bf'];

const getIndexColor = index => regionColors[index % regionColors.length];

// Contour

export const backgroundContourColor = [0.5, 0.5, 0.5];
const backgroundContourHighlightColor = [0.8, 0.8, 0.8];

export const regionContourColor = (index, active = false) => 
  getIndexColors(index)[active ? activeContourIndex : contourIndex];

export const regionContourHighlightColor = (index = null)=> 
  index !== null ? getIndexColors(index)[highlightContourIndex] : backgroundContourHighlightColor;

// Surface

export const backgroundSurfaceColor1 = [0.2, 0.2, 0.2];
export const backgroundSurfaceColor2 = [0.8, 0.8, 0.8];

export const regionSurfaceColor = (index, active = false) => 
getIndexColors(index)[active ? activeSurfaceIndex : surfaceIndex];

export const regionSurfaceHighlightColor = index => regionSurfaceColor(index, true);

export const regionSliceHighlightColors = index => {
  const i = index % regionColors.length;

  return [
    regionColors[i][surfaceIndex + 2],
    regionColors[i][surfaceIndex + 4]
  ];
}; 

const regionColors = [
  // Reds
  ['#fff5f0', '#fee0d2', '#fcbba1', '#fc9272', '#fb6a4a', '#ef3b2c', '#cb181d', '#a50f15', '#67000d'],
  
  // Blues
  ['#f7fbff', '#deebf7', '#c6dbef', '#9ecae1', '#6baed6', '#4292c6', '#2171b5', '#08519c', '#08306b'],

  // Purples
  ['#fcfbfd', '#efedf5', '#dadaeb', '#bcbddc', '#9e9ac8', '#807dba', '#6a51a3', '#54278f', '#3f007d'],

  // Greens
  ['#f7fcf5', '#e5f5e0', '#c7e9c0', '#a1d99b', '#74c476', '#41ab5d', '#238b45', '#006d2c', '#00441b']
].map(colors => colors.map(hex2rgb));

const getIndexColors = index => regionColors[index % regionColors.length];

const contourIndex = 4;
const activeContourIndex = 6;
const highlightContourIndex = 2;

const surfaceIndex = 4;
const activeSurfaceIndex = 6;
const highlightSurfaceIndex = 7;

// Contour

export const backgroundContourColor = [0.5, 0.5, 0.5];
const backgroundContourHighlightColor = [0.8, 0.8, 0.8];

export const regionContourColor = (index, active = false) => 
  getIndexColors(index)[active ? activeContourIndex : contourIndex];

export const regionContourHighlightColor = (index = null)=> 
  index !== null ? getIndexColors(index)[highlightContourIndex] : backgroundContourHighlightColor;

// Surface

export const backgroundSurfaceColor1 = [0.2, 0.2, 0.2];
export const backgroundSurfaceColor2 = [0.8, 0.8, 0.8];

export const regionSurfaceColor = (index, active = false) => 
getIndexColors(index)[active ? activeSurfaceIndex : surfaceIndex];

export const regionSurfaceHighlightColor = index => regionSurfaceColor(index, true);

export const regionSliceHighlightColors = index => {
  const i = index % regionColors.length;

  return [
    regionColors[i][surfaceIndex + 2],
    regionColors[i][surfaceIndex + 4]
  ];
}; 

*/