import { createContext, useReducer } from 'react';
import { getCursor } from 'utils/cursor';

export const FLAG_SET_FLAG = 'flag/SET_FLAG';
export const FLAG_SET_COMMENT = 'flag/SET_COMMENT';
export const FLAG_SET_EDIT_MODE = 'flag/SET_LINK_MODE';
export const FLAG_ADD_LINK = 'flag/ADD_LINK';
export const FLAG_REMOVE_LINK = 'flat/REMOVE_LINK';
export const FLAG_SET_SHOW_BACKGROUND = 'flag/SET_SHOW_BACKGROUND';
export const FLAG_RESET = 'flag/RESET';

const editModes = [
  { value: 'addLink', icon: 'chain', cursor: getCursor('chain.png', 12, 23) },
  { value: 'removeLink', icon: 'broken chain', cursor: getCursor('broken-chain.png', 11, 23) }
];

const initialState = {
  flag: false,
  comment: '',
  editMode: 'addLink',
  editModes: editModes,
  links: [],  
  showBackground: true
};

const reducer = (state, action) => {
  switch (action.type) {
    case FLAG_SET_FLAG:
      return {
        ...state,
        flag: action.flag
      };

    case FLAG_SET_COMMENT:
      return {
        ...state,
        comment: action.comment
      };

    case FLAG_SET_EDIT_MODE:
      return {
        ...state,
        editMode: action.mode
      };

    case FLAG_ADD_LINK:
      return {
        ...state,
        links: [
          ...state.links,
          action.id
        ]
      };

    case FLAG_REMOVE_LINK:
      return {
        ...state,
        links: state.links.filter(id => id !== action.id)
      };

    case FLAG_SET_SHOW_BACKGROUND:
      return {
        ...state,
        showBackground: action.show
      }

    case FLAG_RESET:
      return {
        ...initialState
      };

    default: 
      throw new Error('Invalid flag context action: ' + action.type);
  }
}

export const FlagContext = createContext(initialState);

export const FlagProvider = ({ children }) => {
  const [state, dispatch] = useReducer(reducer, initialState);
 
  return (
    <FlagContext.Provider value={ [state, dispatch] }>
      { children }
    </FlagContext.Provider>
  )
} 
