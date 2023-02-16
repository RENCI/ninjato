import { useContext } from 'react';
import { Dropdown } from 'semantic-ui-react';
import { 
  ProgressContext, PROGRESS_SET_CHART_TYPE, PROGRESS_SET_REPORTING_DAY 
} from 'contexts';

export const VolumeControls = () => {
  const [{ chartTypes, chartType, days, reportingDay }, progressDispatch] = useContext(ProgressContext);

  const onChartTypeChange = (evt, data) => {
    progressDispatch({ type: PROGRESS_SET_CHART_TYPE, chartType: data.value });
  };

  const onDayChange = (evt, data) => {
    console.log(data);

    progressDispatch({ type: PROGRESS_SET_REPORTING_DAY, reportingDay: data.value });
  };

  return (
    <div style={{ display: 'flex', gap: '10px' }}>
      <div>
        Chart type: <Dropdown 
          selection
          value={ chartType }
          options={ chartTypes.map(chartType => ({
            key: chartType,
            text: chartType,
            value: chartType
          })) }
          onChange={ onChartTypeChange }
        />
      </div>
      <div>
        Reporting day: <Dropdown 
          selection
          value={ reportingDay }
          options={ days.map((day, i) => ({
            key: i,
            text: day,
            value: i
          })) }
          onChange={ onDayChange }
        />
      </div>
    </div>
  );
};