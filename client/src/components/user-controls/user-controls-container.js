import { connect } from 'react-redux';
import UserControls from './user-controls';
import {
  checkLogin,
  login,
  logout,
  openLoginModal,
  closeLoginModal,
  register,
  closeRegisterModal,
  openRegisterModal
} from '../../modules/user';

const mapStateToProps = state => {
  return {
    login: state.user.login,
    loginModalOpen: state.user.loginModalOpen,
    loginErrorMessage: state.user.loginErrorMessage,
    register: state.user.register,
    registerModalOpen: state.user.registerModalOpen,
    registerErrorMessage: state.user.registerErrorMessage,
  };
};

const mapDispatchToProps = (dispatch, ownProps) => {
  return {
    fetchLoginStatus: () => {
      return dispatch(checkLogin());
    },
    onLogout: () => {
      return dispatch(logout());
    },
    onLogin: (username, password) => {
      return dispatch(login(username, password));
    },
    onOpenLoginModal: () => {
      return dispatch(openLoginModal());
    },
    onCloseLoginModal: () => {
      return dispatch(closeLoginModal());
    },
    onRegister: (username, email, firstname, lastname, password) => {
      return dispatch(register(username, email, firstname, lastname, password));
    },
    onOpenRegisterModal: () => {
      return dispatch(openRegisterModal());
    },
    onCloseRegisterModal: () => {
      return dispatch(closeRegisterModal());
    },
  };
};

const UserControlsContainer = connect(
  mapStateToProps,
  mapDispatchToProps
)(UserControls);

export default UserControlsContainer;
