import { useContext } from 'react';
import { List, Popup, Button, Icon } from 'semantic-ui-react';
import { ControlsContext, SET_BRUSH } from 'contexts';

const { Group } = Button;

const iconType = brush => (
  brush[0][0] === 0 ? 'circle outline' : 'square outline'
);

const iconSize = brush => (
  brush.length === 5 ? 'big' : 
  brush.length === 3 ? 'large' :
  'small'
);

export const Settings = () => {
  const [{ brushes, paintBrush, eraseBrush }, dispatch] = useContext(ControlsContext);

  const onClick = (brush, which) => {
    dispatch({ type: SET_BRUSH, brush: brush, which: which });
  };

  const brush = (brush, i, which) => (
    <Button
      key={ i }
      toggle
      compact
      color={ 
        (which === 'paint' && i === paintBrush) || 
        (which === 'erase' && i === eraseBrush) ?
        'grey' : null 
      }
      onClick={ () => onClick(i, which) }
    >
      <Icon 
        name={ iconType(brush) }
        size={ iconSize(brush) }
        fitted
      />
    </Button> 
  );

  return (     
    <Popup
      trigger={ <Button icon='settings' /> }
      on='click'
      position='left center'
      content={ 
        <List relaxed>          
          <List.Item>
            Paint brush
            <Group>
              { brushes.map((d, i) => brush(d, i, 'paint')) }
            </Group>
          </List.Item>      
          <List.Item>
            Eraser
            <Group>
              { brushes.map((d, i) => brush(d, i, 'erase')) }
            </Group>
          </List.Item>
        </List>
      }
    />
  );
};
