import { createContext, useReducer } from "react";

export const SET_EDIT_MODE = 'refine/SET_EDIT_MODE';
export const SET_BRUSH = 'refine/SET_BRUSH';
export const SET_SHOW_BACKGROUND = 'refine/SET_SHOW_BACKGROUND';
export const RESET = 'refine/RESET';

const getCursor = (file, x, y) => `url(/cursors/${ file }) ${ x } ${ y }, auto`;

const editModes = [
  { value: 'paint', icon: 'paint brush', cursor: getCursor('paint-brush.png', 11, 23) },
  { value: 'erase', icon: 'eraser', cursor: getCursor('eraser.png', 12, 22) },
  { value: 'crop', icon: 'crop', cursor: getCursor('crop.png', 11, 21) }
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
  showBackground: true
};

const reducer = (state, action) => {
  switch (action.type) {
    case SET_EDIT_MODE:
      return {
        ...state,
        editMode: action.mode
      };

    case SET_BRUSH:
      return {
        ...state,
        [`${ action.which }Brush`]: action.brush
      };

    case SET_SHOW_BACKGROUND:
      return {
        ...state,
        showBackground: action.show
      }

    case RESET:
      return {
        ...initialState,
        paintBrush: state.paintBrush,
        eraseBrush: state.eraseBrush
      };

    default: 
      throw new Error("Invalid Controls context action: " + action.type);
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
