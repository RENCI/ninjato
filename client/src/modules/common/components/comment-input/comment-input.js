import { Form, Input } from 'semantic-ui-react';

const Field = { Form };

export const CommentInput = ({ label, options = [], onChange }) => {
  return (      
      <Form.Field>
        { label }
        <Input 
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
      </Form.Field>
  );
};
