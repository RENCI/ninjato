import * as d3 from "d3-color";

// Colors from https://colorbrewer2.org

const rgb2vtk = ({ r, g, b }) => [r, g, b].map(c => c / 255);

// Colorbrewer 8-class Set1
const set1 = ['#e41a1c', '#377eb8', '#4daf4a', '#984ea3', '#ff7f00', '#ffff33', '#a65628', '#f781bf'];

const colors = set1;

const regionColors = colors.reduce((colors, color) => {
  const c = d3.hsl(color);
  
  return {
    ...colors,
    [color]: {
      base: color,

      contour: rgb2vtk(c.brighter(0.8).rgb()),
      contourActive: rgb2vtk(c.rgb()),
      contourHighlight: rgb2vtk(c.brighter(1.2).rgb()),

      surface: rgb2vtk(c.brighter(0.8).rgb()),
      surfaceActive: rgb2vtk(c.darker(1).rgb()),
      surfaceHighlight: rgb2vtk(c.brighter(1).rgb()),
      surfaceSlice: [rgb2vtk(c.rgb()), rgb2vtk(c.darker(1).rgb())]
    }
  };
}, {});

export const backgroundColors = {
  contour: [0.5, 0.5, 0.5],
  contourHighlight: [0.8, 0.8, 0.8],
  surface1: [0.2, 0.2, 0.2],
  surface2: [0.8, 0.8, 0.8]
};

/*
// Contour

export const regionContourColor = (index = null, type = null) => (
  index === null || index === -1 ? 
    type === 'highlight' ? backgroundColor.contourHighlight : backgroundColor.contour
  :
    getIndexColor(index)[
      type === 'active' ? 'contourActive' : 
      type === 'highlight' ? 'contourHighlight' : 
      'contour'
    ]
);

// Surface

export const regionSurfaceColor = (index = null, type = null) => (
  index === null || index === -1? 
    [backgroundColor.surface1, backgroundColor.surface2]
  :
    getIndexColor(index)
      [type === 'active' ? 'surfaceActive' : 
      type === 'highlight' ? 'surfaceHighlight' : 
      type === 'slice' ? 'surfaceSlice' :
      'surface'
    ]
);

*/

export const updateColors = regions => {
  // 1. Remove any colors not in the color palette
  regions.forEach(region => {
    if (!colors.includes(region.color)) region.color = null;
  });

  // 2. Get counts and remove excess colors
  const counts = colors.map((color, i) => ({ 
    color: color, 
    index: i,
    count: 0
  }));

  const maxCount = Math.ceil(regions.length / colors.length);

  regions.forEach(region => {
    const count = counts.find(count => count.color === region.color);

    if (!count) return;

    if (count.count < maxCount) {
      count.count++;
    }
    else {
      region.color = null;
    }
  });

  // 3. Sort by count, then index
  counts.sort((a, b) => a.count === b.count ? a.index - b.index : a.count - b.count);

  // 4. Assign colors
  let index = 0;
  regions.forEach(region => {
    if (!region.color) {
      region.color = counts[index].color;
      index = (index + 1) % colors.length;
    }
  });

  // 5. Decorate with color object
  regions.forEach(region => {
    region.colors = regionColors[region.color];
  });
};