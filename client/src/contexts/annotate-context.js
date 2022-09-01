import { createContext, useReducer } from 'react';
import { getCursor } from 'utils/cursor';

export const ANNOTATE_SET_TOOL = 'annotate/SET_TOOL';
export const ANNOTATE_SET_BRUSH = 'annotate/ANNOTATE_SET_BRUSH';
export const ANNOTATE_CHANGE_BRUSH_SIZE = 'annotate/ANNOTATE_CHANGE_BRUSH_SIZE';
export const ANNOTATE_SET_CONTROL = 'annotate/SET_CONTROL';
export const ANNOTATE_SET_ACTION = 'annotate/SET_ACTION';
export const ANNOTATE_SET_ACTIVE_REGION = 'annotate/SET_ACTIVE_REGION';
export const ANNOTATE_RESET = 'annotate/RESET';

const tools = [
  { group: 'edit', value: 'select', icon: 'map marker alternate', cursor: getCursor('map-marker-alternate.png', 16, 23), tooltip: 'select region' },
  { group: 'edit', value: 'paint', icon: 'paint brush', cursor: getCursor('paint-brush.png', 11, 23), tooltip: 'paint' },
  { group: 'edit', value: 'erase', icon: 'eraser', cursor: getCursor('eraser.png', 12, 22), tooltip: 'erase' },
  { group: 'edit', value: 'crop', icon: 'crop', cursor: getCursor('crop.png', 11, 21), tooltip: 'crop' },

  { group: 'region', value: 'split', icon: 'share alternate', cursor: getCursor('split.png', 12, 16), tooltip: 'split' },
  { group: 'region', value: 'merge', icon: 'sign-in', cursor: getCursor('merge.png', 12, 16), tooltip: 'merge' },
  { group: 'region', value: 'create', icon: 'plus circle', cursor: getCursor('create.png', 15, 16), tooltip: 'create', alwaysEnabled: true  },
  { group: 'region', value: 'delete', icon: 'minus circle', cursor: getCursor('delete.png', 15, 16), tooltip: 'delete' },

  { group: 'claim', value: 'claim', icon: 'flag', cursor: getCursor('flag.png', 10, 23), tooltip: 'claim', alwaysEnabled: true },
  { group: 'claim', value: 'remove', icon: 'share', cursor: getCursor('remove.png', 23, 14), tooltip: 'remove', }
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
  activeRegion: null,
  tool: 'paint',
  tools: tools,
  brushes: brushes,
  paintBrush: 0,
  eraseBrush: 0,
  createBrush: 3,
  showBackground: true,
  showContours: true,
  action: null
};

const reducer = (state, action) => {
  switch (action.type) {
    case ANNOTATE_SET_ACTIVE_REGION:
      return {
        ...state,
        activeRegion: action.region
      };

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

      console.log(brushName);

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
