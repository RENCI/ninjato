import { createContext, useReducer } from 'react';
import { getCursor } from 'utils/cursor';

export const REFINE_SET_TOOL = 'refine/SET_TOOL';
export const REFINE_SET_BRUSH = 'refine/REFINE_SET_BRUSH';
export const REFINE_CHANGE_BRUSH_SIZE = 'refine/REFINE_CHANGE_BRUSH_SIZE';
export const REFINE_SET_CONTROL = 'refine/SET_SHOW_BACKGROUND';
export const REFINE_SET_ACTION = 'refine/SET_ACTION';
export const REFINE_SET_ACTIVE_LABEL = 'refine/SET_ACTIVE_LABEL';
export const REFINE_RESET = 'refine/RESET';

const tools = [
  { group: 'select', value: 'select', icon: 'map marker alternate', cursor: getCursor('map-marker-alternate.png', 16, 23), tooltip: 'select region' },
  { group: 'select', value: 'claim', icon: 'flag', cursor: getCursor('flag.png', 10, 23), tooltip: 'claim region' },

  { group: 'edit', value: 'paint', icon: 'paint brush', cursor: getCursor('paint-brush.png', 11, 23), tooltip: 'paint' },
  { group: 'edit', value: 'erase', icon: 'eraser', cursor: getCursor('eraser.png', 12, 22), tooltip: 'erase' },
  { group: 'edit', value: 'crop', icon: 'crop', cursor: getCursor('crop.png', 11, 21), tooltip: 'crop' },

  { group: 'region', value: 'split', icon: 'share alternate', cursor: getCursor('split.png', 12, 16), tooltip: 'split' },
  { group: 'region', value: 'merge', icon: 'sign-in', cursor: getCursor('merge.png', 12, 16), tooltip: 'merge' },
  { group: 'region', value: 'add', icon: 'add circle', cursor: getCursor('add.png', 15, 16), tooltip: 'add' }
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
  activeLabel: null,
  tool: 'paint',
  tools: tools,
  brushes: brushes,
  paintBrush: 0,
  eraseBrush: 2,
  addBrush: 3,
  showBackground: true,
  showContours: true,
  action: null
};

const reducer = (state, action) => {
  switch (action.type) {
    case REFINE_SET_ACTIVE_LABEL:
      return {
        ...state,
        activeLabel: action.label
      };

    case REFINE_SET_TOOL:
      return {
        ...state,
        tool: action.tool
      };

    case REFINE_SET_BRUSH:
      return {
        ...state,
        [`${ action.which }Brush`]: action.brush
      };

    case REFINE_CHANGE_BRUSH_SIZE: {
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

    case REFINE_SET_CONTROL:
      return {
        ...state,
        [action.name]: action.value
      };

    case REFINE_SET_ACTION:
      return {
        ...state,
        action: action.action
      };

    case REFINE_RESET:
      return {
        ...initialState,
        paintBrush: state.paintBrush,
        eraseBrush: state.eraseBrush,
        addBrush: state.addBrush
      };

    default: 
      throw new Error('Invalid refine context action: ' + action.type);
  }
}

export const RefineContext = createContext(initialState);

export const RefineProvider = ({ children }) => {
  const [state, dispatch] = useReducer(reducer, initialState);
 
  return (
    <RefineContext.Provider value={ [state, dispatch] }>
      { children }
    </RefineContext.Provider>
  )
} 
