import { createContext, useReducer } from "react";

export const PROGRESS_SET_CHART_TYPE = 'progress/CHART_TYPE';
export const PROGRESS_SET_REPORTING_DAY = 'progress/REPORTING_DAY';

const chartTypes = ['line', 'area'];
const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const initialState = {
  chartTypes: chartTypes,
  chartType: chartTypes[0],
  days: days,
  reportingDay: days.indexOf('Monday')
};

const reducer = (state, action) => {
  switch (action.type) {
    case PROGRESS_SET_CHART_TYPE:
      return {
        ...state,
        chartType: action.chartType
      };

    case PROGRESS_SET_REPORTING_DAY:
      return {
        ...state,
        reportingDay: action.reportingDay
      };

    default: 
      throw new Error("Invalid error context action: " + action.type);
  }
}

export const ProgressContext = createContext(initialState);

export const ProgressProvider = ({ children }) => {
  const [state, dispatch] = useReducer(reducer, initialState);
 
  return (
    <ProgressContext.Provider value={ [state, dispatch] }>
      { children }
    </ProgressContext.Provider>
  )
} 
