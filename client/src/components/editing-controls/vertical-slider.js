import { Input } from 'semantic-ui-react';

export const VerticalSlider = ({ value, min, max, onChange }) => {
  return (
    <Input 
      type='range' 
      style={{ 
        transform: 'rotate(270deg)',
        position: 'absolute',
        top: '50%',
        left: 'calc(50% - 10px)',
        paddingRight: 15,
        paddingLeft: 15,
        width: '100%',
        height: 0
      }}
      min={ min}
      max={ max }
      value={ value }
      onChange={ evt => onChange(+evt.target.value) }
    />
  );
};
