import styles from './styles.module.css';

export const RegionInfo = ({ region }) => {

  //console.log(region);

  return !region ? null : (
    <div className={ styles.info }>
      <div>{ region.label }</div>
    </div>
  );
};
