import { createContext, useReducer } from "react";

export const SET_EDIT_MODE = 'controls/SET_EDIT_MODE';
export const SET_BRUSH = 'controls/SET_BRUSH'
export const RESET = 'controls/RESET';

const editModes = [
  { value: 'paint', icon: 'paint brush' },
  { value: 'erase', icon: 'eraser' }
];

const brushes = [
  [
    [1]
  ],
  [
    [1, 1, 1],
    [1, 1, 1],
    [1, 1, 1]
  ],  
  [
    [0, 1, 0],
    [1, 1, 1],
    [0, 1, 0]
  ],
  [
    [1, 1, 1, 1, 1],
    [1, 1, 1, 1, 1],
    [1, 1, 1, 1, 1],
    [1, 1, 1, 1, 1],
    [1, 1, 1, 1, 1]
  ],
  [
    [0, 0, 1, 0, 0],
    [0, 1, 1, 1, 0],
    [1, 1, 1, 1, 1],
    [0, 1, 1, 1, 0],
    [0, 0, 1, 0, 0]
  ]
];

const initialState = {
  editMode: 'paint',
  editModes: editModes,
  brushes: brushes,
  paintBrush: 0,
  eraseBrush: 1
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

    case RESET:
      return {
        ...initialState
      };

    default: 
      throw new Error("Invalid Controls context action: " + action.type);
  }
}

export const ControlsContext = createContext(initialState);

export const ControlsProvider = ({ children }) => {
  const [state, dispatch] = useReducer(reducer, initialState);
 
  return (
    <ControlsContext.Provider value={ [state, dispatch] }>
      { children }
    </ControlsContext.Provider>
  )
} 
