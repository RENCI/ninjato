import { useContext } from 'react';
import { Popup, Icon, Button } from 'semantic-ui-react';
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

export const BrushOptions = ({ which }) => {
  const [{ brushes, paintBrush, eraseBrush }, dispatch] = useContext(ControlsContext);

  const onClick = (brush, which) => {
    dispatch({ type: SET_BRUSH, brush: brush, which: which });
  };

  const brush = (brush, i) => (
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
      trigger={ 
        <Button           
          icon 
          basic 
          compact
        >
          <Icon name='caret down' fitted />
        </Button>
      }
      on='click'
      position='top left'
      content={ 
        <>
          { which === 'erase' ? 'Eraser' : 'Paint brush' }
          <Group>
            { brushes.map((d, i) => brush(d, i)) }
          </Group>
        </>
      }
    />
  );
};
