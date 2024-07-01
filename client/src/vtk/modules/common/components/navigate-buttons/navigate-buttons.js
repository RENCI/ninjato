import { useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { Segment, Grid, Button, Divider } from 'semantic-ui-react';
import { UserContext } from 'contexts';
import { LoginForm } from 'modules/login/components/login-form';
import { RegisterForm } from 'modules/login/components/register-form';

export const NavigateButtons = () => {
  const [{ user, assignment }] = useContext(UserContext);
  const navigate = useNavigate();

  const onSelectAssignmentClick = () => {
    navigate('/select');
  };

  const onEditAssignmentClick = () => {
    navigate('/assignment');
  };

  const NavButton = ({ content, icon, onClick }) => (
    <Button
      content={ content }
      icon={ icon }
      size='big'
      basic
      fluid
      onClick={ onClick }
    />
  );

  return (
    <Segment basic>
      { user ? 
        assignment ?
          <>
            <Grid columns={ 2 } stackable relaxed='very'>
              <Grid.Column>
                <NavButton 
                  content='Select assignment' 
                  icon='clipboard list' 
                  onClick={ onSelectAssignmentClick } 
                />
              </Grid.Column>

              <Grid.Column verticalAlign='middle'>
                <NavButton 
                  content='Edit assignment' 
                  icon='edit' 
                  onClick={ onEditAssignmentClick } 
                />
              </Grid.Column>
            </Grid>
            <Divider vertical hidden>Or</Divider>            
          </> 
        :
          <Grid columns={ 1 } relaxed='very'>
            <Grid.Column>
              <NavButton 
                content='Select assignment' 
                icon='clipboard list' 
                onClick={ onSelectAssignmentClick } 
              />
            </Grid.Column>
          </Grid>        
      :
        <>
          <Grid columns={ 2 } stackable relaxed='very'>
            <Grid.Column>
              <LoginForm 
                trigger={ 
                  <NavButton 
                    content='Log in' 
                    icon='user' 
                  /> 
                }
              />
            </Grid.Column>

            <Grid.Column verticalAlign='middle'>
              <RegisterForm 
                trigger={ 
                  <NavButton 
                    content='Register' 
                    icon='signup' 
                  /> 
                } 
              />
            </Grid.Column>
          </Grid>
          <Divider vertical hidden>Or</Divider>            
        </>
      }
    </Segment>
  );
};