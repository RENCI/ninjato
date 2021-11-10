import React, { useEffect, useRef } from 'react';
import { Form } from 'semantic-ui-react';

export const AutoFocusForm = props => {
  const div = useRef();

  useEffect(() => {
    const inputs = div.current.getElementsByTagName('input');

    if (inputs.length > 0) {
      const firstInput = inputs[0];
      firstInput.focus();
      firstInput.selectionStart = firstInput.selectionEnd = firstInput.value.length;
    }
  }, []);

  return (
    <div ref={ div }>
      <Form {...props} />
    </div>
  );
}