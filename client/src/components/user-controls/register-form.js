import React, { useEffect, useState } from 'react';
import { withRouter, useHistory } from 'react-router-dom';
import { Button, Form, Menu, Message, Modal } from 'semantic-ui-react';
import { AutoFocusForm } from '../auto-focus-form';

export const RegisterForm = props => {
  return (
    <Modal
      size='tiny'
      trigger={ <Menu.Item content='Register'/> }
      open={ registerModalOpen }
      onOpen={ this.openRegisterModal }
      onClose={ onCloseRegisterModal }
    >
      <Modal.Header>Register new user</Modal.Header>
      <Modal.Content>
        <AutoFocusForm error onSubmit={ this.submitRegister }>
          <Form.Input label='Enter a login name' name='regModalUsername' onChange={ this.handleChange } />
          <Form.Input label='Enter email address' name='regModalEmail' onChange={ this.handleChange } />
          <Form.Input label='Enter first name' name='regModalFirstname' onChange={ this.handleChange } />
          <Form.Input label='Enter last name' name='regModalLastname' onChange={ this.handleChange } />
          <Form.Input label='Enter a password' type='password' name='regModalPassword'  onChange={ this.handleChange } />
          <Message
            error
            content={ registerErrorMessage }
          />
          <div style={{ display: 'none' }}>
            <Form.Button content='Submit' />
          </div>
        </AutoFocusForm>
      </Modal.Content>
      <Modal.Actions>
        <Button onClick={ onCloseRegisterModal }>
          Cancel
        </Button>
        <Button color='green' onClick={ this.submitRegister }>
          Register
        </Button>
      </Modal.Actions>
    </Modal>
  );
};
