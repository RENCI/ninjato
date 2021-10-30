import React, { Component } from 'react';
import { withRouter } from 'react-router-dom';
import { Button, Form, Menu, Message, Modal } from 'semantic-ui-react';
import AutoFocusForm from './AutoFocusForm';

class UserControls extends Component {
  componentDidMount = () => {
    this.props.fetchLoginStatus().then(() => {
      if (this.props.onInitialized) {
        this.props.onInitialized();
      }
    });
  }

  state = {
    loginModalUsername: null,
    loginModalPassword: null,
  }

  submitLogin = () => {
    const { loginModalUsername, loginModalPassword } = this.state;
    this.props.onLogin(loginModalUsername, loginModalPassword);
  }

  openLoginModal = () => {
    this.setState({
      loginModalUsername: null,
      loginModalPassword: null,
    })
    this.props.onOpenLoginModal();
    this.opening = true;
  }

  handleChange = (e, { name, value }) => this.setState({ [name]: value })

  logout = () => {
    this.props.onLogout();
    this.props.history.push('/');
  }

  render() {
    const { login, loginErrorMessage, onCloseLoginModal, loginModalOpen } = this.props;
    if (login) {
      return (
        <Menu.Menu position='right'>
          <Menu.Item content={ login } />
          <Menu.Item content='Log out' onClick={ this.logout } />
        </Menu.Menu>
      );
    }
    return (
      <Menu.Menu position='right'>
        <Menu.Item content='Register' />
        <Modal
          size='tiny'
          trigger={<Menu.Item content='Log in'/>}
          open={loginModalOpen}
          onOpen={this.openLoginModal}
          onClose={onCloseLoginModal}>
          <Modal.Header>Log in</Modal.Header>
          <Modal.Content>
            <AutoFocusForm error onSubmit={this.submitLogin}>
              <Form.Input label='Login or email' name='loginModalUsername' onChange={this.handleChange} />
              <Form.Input label='Password' type='password' name='loginModalPassword'  onChange={this.handleChange} />
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
            <Button onClick={onCloseLoginModal}>
              Cancel
            </Button>
            <Button color='green' onClick={this.submitLogin}>
              Log in
            </Button>
          </Modal.Actions>
        </Modal>
      </Menu.Menu>
    );
  };
}

export default withRouter(UserControls);
