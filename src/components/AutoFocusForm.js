import React, { Component } from 'react';
import { findDOMNode } from 'react-dom';
import { Form } from 'semantic-ui-react';

class AutoFocusForm extends Component {
  componentDidMount = () => {
    const el = findDOMNode(this);
    const inputs = el.getElementsByTagName('input');
    if (inputs.length > 0) {
      const firstInput = inputs[0];
      firstInput.focus();
      firstInput.selectionStart = firstInput.selectionEnd = firstInput.value.length;
    }
  }

  render() {
    return <Form {...this.props} />;
  }
};

export default AutoFocusForm;
