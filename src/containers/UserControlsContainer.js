import { connect } from 'react-redux';
import UserControls from '../components/UserControls';
import { checkLogin, login, logout, openLoginModal, closeLoginModal } from '../modules/user';

const mapStateToProps = state => {
  return {
    login: state.user.login,
    loginModalOpen: state.user.loginModalOpen,
    loginErrorMessage: state.user.loginErrorMessage,
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
  };
};

const UserControlsContainer = connect(
  mapStateToProps,
  mapDispatchToProps
)(UserControls);

export default UserControlsContainer;
