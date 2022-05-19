import { createContext, useReducer } from 'react';
import { getCursor } from 'utils/cursor';

export const REFINE_SET_EDIT_MODE = 'refine/SET_EDIT_MODE';
export const REFINE_SET_BRUSH = 'refine/REFINE_SET_BRUSH';
export const REFINE_SET_CONTROL = 'refine/SET_SHOW_BACKGROUND';
export const REFINE_SET_CLAIM_LABEL = 'refine/SET_CLAIM_LABEL';
export const REFINE_SET_SPLIT_LABEL = 'fefine/SET_SPLIT_LABEL';
export const REFINE_RESET = 'refine/RESET';

const editModes = [
  { group: 'select', value: 'select', icon: 'map marker alternate', cursor: getCursor('map-marker-alternate.png', 16, 23), tooltip: 'select region' },
  { group: 'select', value: 'claim', icon: 'flag', cursor: getCursor('flag.png', 10, 23), tooltip: 'claim region' },

  { group: 'edit', value: 'paint', icon: 'paint brush', cursor: getCursor('paint-brush.png', 11, 23), tooltip: 'paint' },
  { group: 'edit', value: 'erase', icon: 'eraser', cursor: getCursor('eraser.png', 12, 22), tooltip: 'erase' },
  { group: 'edit', value: 'crop', icon: 'crop', cursor: getCursor('crop.png', 11, 21), tooltip: 'crop' },

  { group: 'splitMerge', value: 'split', icon: 'share alternate', cursor: getCursor('split.png', 16, 16), tooltip: 'split' },
  { group: 'splitMerge', value: 'merge', icon: 'sign-in', cursor: getCursor('merge.png', 12, 16), tooltip: 'merge' }
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
  editMode: 'paint',
  editModes: editModes,
  brushes: brushes,
  paintBrush: 0,
  eraseBrush: 2,
  showBackground: true,
  showContours: true,
  claimLabel: null,
  splitLabel: null
};

const reducer = (state, action) => {
  switch (action.type) {
    case REFINE_SET_EDIT_MODE:
      return {
        ...state,
        editMode: action.mode
      };

    case REFINE_SET_BRUSH:
      return {
        ...state,
        [`${ action.which }Brush`]: action.brush
      };

    case REFINE_SET_CONTROL:
      return {
        ...state,
        [action.name]: action.value
      };

    case REFINE_SET_CLAIM_LABEL:       
      return {
        ...state,
        claimLabel: action.label
      };

    case REFINE_SET_SPLIT_LABEL:       
      return {
        ...state,
        splitLabel: action.label
      };

    case REFINE_RESET:
      return {
        ...initialState,
        paintBrush: state.paintBrush,
        eraseBrush: state.eraseBrush
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
