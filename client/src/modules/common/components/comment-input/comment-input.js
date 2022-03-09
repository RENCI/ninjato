import { Form, Input } from 'semantic-ui-react';

const { Field } = Form;

export const CommentInput = ({ label, comment, options = [], onChange }) => {
  return (      
    <Field>
      { label }
      <Input 
        value={ comment }
        list='options'         
        onChange={ onChange }
      />
      <datalist id='options'>
        { options.map((option, i) => (
          <option 
            key={ i }  
            value={ option }
          >
            { option }
          </option>
        ))}
      </datalist>
    </Field>
  );
};
