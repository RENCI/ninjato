import React, { useEffect, useState } from 'react';
import { withRouter, useHistory } from 'react-router-dom';
import { Button, Form, Menu, Message, Modal } from 'semantic-ui-react';
import { AutoFocusForm } from '../auto-focus-form';

export const LoginForm = props => {
  return (
    <Modal
      size='tiny'
      trigger={ <Menu.Item content='Log in'/> }
      open={ loginModalOpen}
      onOpen={ this.openLoginModal }
      onClose={ onCloseLoginModal }
    >
      <Modal.Header>Log in</Modal.Header>
      <Modal.Content>
        <AutoFocusForm error onSubmit={ this.submitLogin }>
          <Form.Input label='Login or email' name='loginModalUsername' onChange={ this.handleChange } />
          <Form.Input label='Password' type='password' name='loginModalPassword' onChange={ this.handleChange } />
          <Message
            error
            content={loginErrorMessage}
          />
          <div style={{display: 'none'}}>
            <Form.Button content='Submit' />
          </div>
        </AutoFocusForm>
      </Modal.Content>
      <Modal.Actions>
        <Button onClick={ onCloseLoginModal }>
          Cancel
        </Button>
        <Button color='green' onClick={ this.submitLogin }>
          Log in
        </Button>
      </Modal.Actions>
    </Modal>
  );
};
