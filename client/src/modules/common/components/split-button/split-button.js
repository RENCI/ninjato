import { Button, Icon, Popup } from 'semantic-ui-react';
import { ControlPopup } from 'modules/common/components/control-bar';
import styles from './styles.module.css';
  
const cancelEvent = evt => evt.stopPropagation();

export const SplitButton = ({ 
  toggle = false, 
  icon, 
  tooltip = null,
  active = true, 
  disabled = false, 
  position = 'top right',
  content,
  onClick 
}) => {
  const button = (
    <Button             
      as='div'
      className={ styles.splitButton }
      toggle={ toggle }
      icon
      compact
      color={ active ? 'grey' : null }
      disabled={ disabled }
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

  return (
    <>
      { tooltip ? 
        <ControlPopup content={ tooltip } trigger={ button } />
      :
        <>{ button }</>
      }
    </>
  );
};
