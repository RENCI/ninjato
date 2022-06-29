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

  return (
    <Segment basic>
      { user ? 
        assignment ?
          <>
            <Grid columns={ 2 } stackable relaxed='very'>
              <Grid.Column>
                <Button 
                  content='Select assignment' 
                  icon='clipboard list' 
                  size='big' 
                  basic 
                  fluid 
                  onClick={ onSelectAssignmentClick } 
                />
              </Grid.Column>

              <Grid.Column verticalAlign='middle'>
                <Button 
                  content='Edit assignment' 
                  icon='edit' 
                  size='big' 
                  basic 
                  fluid 
                  onClick={ onEditAssignmentClick } 
                />
              </Grid.Column>
            </Grid>
            <Divider vertical hidden>Or</Divider>            
          </> 
        :
          <Grid columns={ 1 } relaxed='very'>
            <Grid.Column>
              <Button 
                content='Select assignment' 
                icon='clipboard list' 
                size='big' 
                basic 
                fluid 
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
                  <Button 
                    content='Log in' 
                    icon='user' 
                    size='big' 
                    basic 
                    fluid 
                  /> 
                }
              />
            </Grid.Column>

            <Grid.Column verticalAlign='middle'>
              <RegisterForm 
                trigger={ 
                  <Button 
                    content='Register' 
                    icon='signup' 
                    size='big' 
                    basic 
                    fluid 
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