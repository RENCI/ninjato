import { Button, Icon, Popup } from 'semantic-ui-react';
import styles from './styles.module.css';
  
const cancelEvent = evt => evt.stopPropagation();

export const SplitButton = ({ 
  toggle = false, 
  icon, 
  active = true, 
  position = 'top right',
  content,
  onClick 
}) => {
  return (
    <Button             
      as='div'
      className={ styles.splitButton }
      toggle={ toggle }
      icon
      compact
      color={ active ? 'grey' : null }
      onClick={ onClick } 
    >
      <div className={ styles.iconDiv }>
        <Icon name={ icon } fitted />
      </div>
      <div 
        onClick={ cancelEvent }
        onKeyDown={ cancelEvent }
        onKeyUp={ cancelEvent }
        onKeyPress={ cancelEvent }
      >
        <Popup
          trigger={ 
            <Button           
              icon 
              basic 
              compact
            >
              <Icon name='ellipsis vertical' fitted />
            </Button>
          }
          on='click'
          position={ position }
          content={ content }
        />
      </div>
    </Button>
  );
};
