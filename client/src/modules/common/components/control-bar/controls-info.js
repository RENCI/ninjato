import { Modal, Button, List, Divider, Header } from 'semantic-ui-react';
import { useModal } from 'hooks';
import styles from './styles.module.css';

const groupDescription = {
  edit: 'Standard editing tools',
  region: 'Whole-region editing tools',
  claim: 'Claim / remove region tools'
};

export const ControlsInfo = ({ tools }) => {
  const [open, openModal, closeModal] = useModal();

  const groups = tools.reduce((groups, { group }) => {
    if (!groups.includes(group)) groups.push(group);
    return groups;
  }, []);

  return (
    <Modal
      onClose={ closeModal }
      onOpen={ openModal }
      open={ open }
      trigger={
        <div className={ styles.controlsInfo }>
          <Button 
            basic 
            circular 
            compact
            size='tiny'
            icon='info'    
          />
        </div>
      }
    >
      <Modal.Header>Tool Information</Modal.Header>
      <Modal.Content>
        { groups.map((group, i, a) => (
          <div key={ i }>
            <Header as='h4'>{ groupDescription[group] }</Header>
            <List key={ i } relaxed>
              { tools.filter(tool => tool.group === group).map((tool, i, a) => (
                <List.Item key={ i }>
                  <List.Icon name={ tool.icon } />
                  <List.Content>
                    <List.Header style={{ textTransform: 'capitalize' }}>{tool.value}</List.Header>
                    <List.Description>{ tool.info }</List.Description>
                  </List.Content>
                </List.Item>
              ))}
            </List>
            { i < a.length - 1 && <Divider /> }
          </div>
        ))}
      </Modal.Content>
    </Modal> 
  );
};
