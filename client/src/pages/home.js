import { useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserContext } from 'contexts';
import { Image, Segment, Grid, Button, Divider, Menu } from 'semantic-ui-react';
import { LoginForm } from 'modules/login/components/login-form';
import { RegisterForm } from 'modules/login/components/register-form';
import styles from './home.module.css';

export const Home = () => {
  const [{ user }] = useContext(UserContext);
  const navigate = useNavigate();

  const onSelectAssignment = () => {
    navigate('/select');
  };

  // XXX: Add navigate to login and register forms

  return (
    <>
    <div className={ styles.container }>
      <div className={ styles.wrapper }>
        <div className={ styles.wrapper }>
          <Image src='https://images.squarespace-cdn.com/content/v1/55d80033e4b02dba43ff8058/1563373073348-ZQUETA5SCNUQLCPSB6O6/OlehKrupaWTmousecortex.jpg' />
          <div>
            <div className={ styles.text }>
              With ~100 million nuclei, no human can count all the cells in a mouse brain
            </div>
            <div className={ styles.text }>
              We need to train an image recognition algorithm to recognize what a nucleus looks like
            </div>
            <div className={ styles.text }>
              This requires many manually labeled nuclear samples, so we've developed ninjatō to make this easier to do
            </div>
            <div className={ styles.text }>
              This tool will enable us to quantify differences in brain structure caused by mutations associated with neuropsychiatric disorders
            </div>
            <div className={ styles.text }>
              You can help
            </div>
          </div>
        </div>
        <Divider hidden>To continue...</Divider>        
        <Segment basic>
          { user ? 
            <Grid columns={ 1 } relaxed='very'>
              <Grid.Column>
                <Button content='Select assignment' icon='clipboard list' size='big' basic fluid onClick={ onSelectAssignment } />
              </Grid.Column>
            </Grid>
          :
            <>
              <Grid columns={ 2 } stackable relaxed='very'>
                <Grid.Column>
                  <LoginForm trigger={ <Button content='Log in' icon='user' size='big' basic fluid /> } />
                </Grid.Column>

                <Grid.Column verticalAlign='middle'>
                  <RegisterForm trigger={ <Button content='Register' icon='signup' size='big' basic fluid /> } />
                </Grid.Column>
              </Grid>
              <Divider vertical hidden>Or</Divider>            
            </>
          }
        </Segment>
        </div>
    </div>
    <Menu secondary fixed='bottom'>
      <Menu.Item name='Project Website' link href='https://www.nucleininja.org/' />
      <Menu.Item name='Github repo' icon='github' link href='https://github.com/RENCI/ninjato' />
    </Menu>
    </>
  );
};