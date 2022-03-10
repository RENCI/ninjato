import { createContext, useReducer } from 'react';

export const FLAG_SET_FLAG = 'flag/SET_FLAG';
export const FLAG_SET_COMMENT = 'flag/SET_COMMENT';
export const FLAG_ADD_LINK = 'flag/ADD_LINK';
export const FLAG_REMOVE_LINK = 'flat/REMOVE_LINK';
export const FLAG_SET_SHOW_BACKGROUND = 'flag/SET_SHOW_BACKGROUND';
export const FLAG_RESET = 'flag/RESET';

const initialState = {
  flag: false,
  comment: '',
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

    case FLAG_ADD_LINK:
      return {
        ...state,
        links: state.links.includes(action.label) ? 
          [...state.links] :
          [...state.links, action.label]        
      };

    case FLAG_REMOVE_LINK:
      return {
        ...state,
        links: state.links.filter(label => label !== action.label)
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
