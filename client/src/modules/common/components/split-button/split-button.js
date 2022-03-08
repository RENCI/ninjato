import { Button, Icon} from 'semantic-ui-react';
import styles from './styles.module.css';

export const SplitButton = ({ toggle = false, icon, active = true, content, onClick }) => {
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
      <div>
        { content }
      </div>
    </Button>
  );
};
