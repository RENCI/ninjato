import { Icon } from 'semantic-ui-react';
import styles from './styles.module.css';

export const EmptyList = () => {
  return (
    <div className={ styles.container }>
      <Icon name='ban' size='huge' color='grey' disabled />
    </div>
  )
};