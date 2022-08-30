import { Segment } from 'semantic-ui-react';
import styles from './styles.module.css';

export const RegionInfo = ({ region }) => {

  console.log(region);

  return !region ? null : (
    <div className={ styles.info }>
    <Segment raised>
      <div>{ region.label }</div>
      { region.info &&
        <>
          <div>{ region.info.status }</div>
        </>
      }
    </Segment>
    </div>
  );
};
