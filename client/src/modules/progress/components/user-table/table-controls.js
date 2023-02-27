import { useContext } from 'react';
import { Dropdown } from 'semantic-ui-react';
import { 
  ProgressContext, PROGRESS_SET_TABLE_DISPLAY
} from 'contexts';

export const TableControls = () => {
  const [{ tableDisplayTypes, tableDisplay }, progressDispatch] = useContext(ProgressContext);

  const onTableDisplayChange = (evt, data) => {
    progressDispatch({ type: PROGRESS_SET_TABLE_DISPLAY, tableDisplay: data.value });
  };

  return (
    <div style={{ display: 'flex', gap: '10px' }}>
      <div>
        Table display: <Dropdown 
          selection
          value={ tableDisplay }
          options={ tableDisplayTypes.map(tableDisplay => ({
            key: tableDisplay,
            text: tableDisplay,
            value: tableDisplay
          })) }
          onChange={ onTableDisplayChange }
        />
      </div>
    </div>
  );
};