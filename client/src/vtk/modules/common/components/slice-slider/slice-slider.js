import { VerticalSlider } from 'modules/common/components/vertical-slider';
import styles from './styles.module.css';

export const SliceSlider = props => (
  <div className={ styles.sliceSlider }>
    <VerticalSlider {...props} />
  </div>
);
