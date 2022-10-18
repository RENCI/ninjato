import styles from './styles.module.css';

export const VerticalSlider = ({ value, min, max, onChange }) => (
  <input 
    type='range'
    orient='vertical'
    className={ styles.verticalSlider }
    value={ value }
    min={ min }
    max={ max }
    onChange={ evt => onChange(+evt.target.value) }

    // Turn off default arrow key behavior
    onKeyDown={ evt => evt.preventDefault() }
    onKeyPress={ evt => evt.preventDefault() }
    onKeyUp={ evt => evt.preventDefault() }
  />
);

