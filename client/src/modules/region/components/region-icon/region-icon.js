import { Label } from 'semantic-ui-react';
import styles from './styles.module.css';

export const RegionIcon = ({ region }) => {
  return (
    <div className={ styles.region }>
      <Label style={{ background: region.color }} circular={ true } empty={ true } />
      <div>{ region.label }</div>
    </div>
  );
};