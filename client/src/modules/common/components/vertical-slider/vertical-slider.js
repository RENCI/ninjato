import styles from './styles.module.css';

export const VerticalSlider = ({ value, min, max, onChange }) => {
  return (
    <input 
      type='range'
      orient='vertical'
      className={ styles.verticalSlider }
      value={ value }
      min={ min }
      max={ max }
      onChange={ evt => onChange(+evt.target.value) }
    />
  );
};
