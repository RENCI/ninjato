import { createContext, useReducer } from 'react';
import { getCursor } from 'utils/cursor';

export const ANNOTATE_SET_TOOL = 'annotate/SET_TOOL';
export const ANNOTATE_SET_BRUSH = 'annotate/ANNOTATE_SET_BRUSH';
export const ANNOTATE_CHANGE_BRUSH_SIZE = 'annotate/ANNOTATE_CHANGE_BRUSH_SIZE';
export const ANNOTATE_SET_CONTROL = 'annotate/SET_CONTROL';
export const ANNOTATE_SET_ACTION = 'annotate/SET_ACTION';
export const ANNOTATE_SET_OPTION = 'annotate/SET_OPTION';
export const ANNOTATE_RESET = 'annotate/RESET';

// Functions to determine disabled status
const disabled = type => 
  type === 'no active' ? activeRegion => !activeRegion :
  type === 'one region' ? (activeRegion, regions) => regions.length < 2 :
  type === 'never' ? () => false :
  () => null;

const tools = [
  { group: 'general', value: 'select', icon: 'map marker alternate', cursor: getCursor('map-marker-alternate.png', 16, 23), tooltip: 'select region', disabled: disabled('one region'), volume: true,
    info: 'Click on a region in the assignment to select it as the active region for editing.' 
  },
  { group: 'general', value: 'navigate', icon: 'location arrow', cursor: getCursor('location-arrow.png', 22, 8), tooltip: 'navigate', disabled: disabled('never'),
    info: 'Left-click and drag to pan, right-click and drag to zoom.' 
  },
  { group: 'general', value: 'visibility', icon: 'eye', cursor: getCursor('eye.png', 16, 16), tooltip: 'visibility', disabled: disabled('never'), volume: true,
    info: 'Click on a region to toggle visibility in the 3D view.' 
  },

  { group: 'edit', value: 'sam', icon: 'magic', cursor: getCursor('magic.png', 23, 12), tooltip: 'segment', disabled: disabled('no active'), volume: false,
    info: 'Click and drag a bounding box to segment voxels with the active region label using the segment anything model.'  
  },
  { group: 'edit', value: 'paint', icon: 'paint brush', cursor: getCursor('paint-brush.png', 11, 23), tooltip: 'paint', disabled: disabled('no active'), volume: true,
    info: 'Click and drag to paint voxels with the active region label. A flood fill operation will fill any holes after painting. Change brush size by clicking the option button next to the icon.'  
  },
  { group: 'edit', value: 'erase', icon: 'eraser', cursor: getCursor('eraser.png', 12, 22), tooltip: 'erase', disabled: disabled('no active'), volume: true,
    info: 'Click and drag to erase voxels containing the active region label. Change brush size by clicking the option button next to the icon.'  
  },
  { group: 'edit', value: 'crop', icon: 'crop', cursor: getCursor('crop.png', 11, 21), tooltip: 'crop', disabled: disabled('no active'),
    info: 'Click and drag to erase all voxels containing the active region label within the specified rectangle – 2D only.'
  },

  { group: 'region', value: 'split', icon: 'share alternate', cursor: getCursor('split.png', 12, 16), tooltip: 'split', disabled: disabled('no active'), volume: true,
    info: 'Click on a region in the assignment to split it into two regions at the current z slice.'
  },
  { group: 'region', value: 'merge', icon: 'sign-in', cursor: getCursor('merge.png', 12, 16), tooltip: 'merge', disabled: disabled('one region'), volume: true,
    info: 'Click on a region in the assignment to assign all of its voxels to the active region.'
  },
  { group: 'region', value: 'create', icon: 'plus circle', cursor: getCursor('create.png', 15, 16), tooltip: 'create', disabled: disabled('never'),
    info: 'Click to add a new region – 2D only.'
  },
  { group: 'region', value: 'delete', icon: 'minus circle', cursor: getCursor('delete.png', 15, 16), tooltip: 'delete', disabled: disabled('no active'), volume: true,
    info: 'Click to delete a region in the assignment, erasing all of its voxels.'
  },
  
  { group: 'claim', value: 'claim', icon: 'flag', cursor: getCursor('flag.png', 10, 23), tooltip: 'claim', disabled: disabled('never'), volume: true,
    info: 'Click an available region not in the assignment to add it to the assignment.'
  },
  { group: 'claim', value: 'remove', icon: 'share', cursor: getCursor('remove.png', 23, 14), tooltip: 'remove claimed region', disabled: disabled('no active'), volume: true,
    info: 'Click to remove a region from the assignment, making it available to others for editing – not applicable for regions created via split or add.'
  }
];

const brushes = [
  [
    [1]
  ], 
  [
    [0, 1, 0],
    [1, 1, 1],
    [0, 1, 0]
  ],
  [
    [1, 1, 1],
    [1, 1, 1],
    [1, 1, 1]
  ],
  [
    [0, 0, 1, 0, 0],
    [0, 1, 1, 1, 0],
    [1, 1, 1, 1, 1],
    [0, 1, 1, 1, 0],
    [0, 0, 1, 0, 0]
  ],
  [
    [1, 1, 1, 1, 1],
    [1, 1, 1, 1, 1],
    [1, 1, 1, 1, 1],
    [1, 1, 1, 1, 1],
    [1, 1, 1, 1, 1]
  ]
];

const initialState = {
  tool: 'paint',
  tools: tools,
  brushes: brushes,
  paintBrush: 0,
  eraseBrush: 0,
  createBrush: 3,
  options: {
    linkPaintSlice: true
  },
  showBackground: true,
  showGoldStandard: false,
  showContours: true,
  action: null
};

const reducer = (state, action) => {
  switch (action.type) {
    case ANNOTATE_SET_TOOL:
      return {
        ...state,
        tool: action.tool
      };

    case ANNOTATE_SET_BRUSH:
      return {
        ...state,
        [`${ action.which }Brush`]: action.brush
      };

    case ANNOTATE_CHANGE_BRUSH_SIZE: {
      if (!(state.tool === 'paint' || state.tool === 'erase')) return state;

      const brushName = state.tool + 'Brush';

      let brush = state[brushName];

      brush += action.direction === 'down' ? -1 : 1;
      brush = Math.max(0, Math.min(brush, brushes.length - 1));

      return {
        ...state,
        [brushName]: brush
      };
    }

    case ANNOTATE_SET_CONTROL:
      return {
        ...state,
        [action.name]: action.value
      };

    case ANNOTATE_SET_ACTION:
      return {
        ...state,
        action: action.action
      };

    case ANNOTATE_SET_OPTION: {
      const options = {...state.options};

      options[action.option] = action.value;

      return {
        ...state,
        options: options
      }
    };

    case ANNOTATE_RESET:
      return {
        ...initialState,
        paintBrush: state.paintBrush,
        eraseBrush: state.eraseBrush,
        createBrush: state.createBrush
      };

    default: 
      throw new Error('Invalid annotate context action: ' + action.type);
  }
}

export const AnnotateContext = createContext(initialState);

export const AnnotateProvider = ({ children }) => {
  const [state, dispatch] = useReducer(reducer, initialState);
 
  return (
    <AnnotateContext.Provider value={ [state, dispatch] }>
      { children }
    </AnnotateContext.Provider>
  )
} 
