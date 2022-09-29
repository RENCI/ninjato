import { Modal, Button, List, Divider, Header, Icon } from 'semantic-ui-react';
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

  const getIcon = name => <Icon name={ tools.find(({ value }) => value === name).icon } />;

  const holdShortcutInfo = (hold, release) => (
    <div className={ styles.controlsInfoShortCut }>
      <div>
        <div>Hold</div>
        <div>Release</div>
      </div>
      <div>
        <div>{ getIcon(hold) } { hold }</div>
        <div> { getIcon(release) } { release }</div>
      </div>
    </div>
  );

  return (
    <Modal
      onClose={ closeModal }
      onOpen={ openModal }
      open={ open }
      trigger={
        <div className={ styles.controlsInfoButton }>
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
                    <List.Header style={{ textTransform: 'capitalize' }}>{ tool.value }</List.Header>
                    <List.Description>{ tool.info }</List.Description>
                  </List.Content>
                </List.Item>
              ))}
            </List>
            <Divider /> 
          </div>
        ))}
        <div>
          <Header as='h4'>Shortcuts</Header>
          <List relaxed>
            <List.Item>
              <List.Header>Ctrl (PC) / Command (Mac)</List.Header> 
              <List.Content>{ holdShortcutInfo('erase', 'paint') }</List.Content>
            </List.Item>
            <List.Item>
              <List.Header>Shift</List.Header> 
              <List.Content>{ holdShortcutInfo('select', 'paint') }</List.Content>
            </List.Item>
            <List.Item>
              <List.Header>Alt</List.Header> 
              <List.Content>{ holdShortcutInfo('navigate', 'paint') }</List.Content>
            </List.Item>
            <List.Item>
              <List.Header>Arrow <Icon name='arrow up' /><Icon name='arrow down' /></List.Header> 
              <List.Content>Move slice up and down</List.Content>
            </List.Item>
            <List.Item>
              <List.Header>Arrow <Icon name='arrow left' /><Icon name='arrow right' /></List.Header> 
              <List.Content>Change brush size</List.Content>
            </List.Item>
          </List>
        </div>
      </Modal.Content>
    </Modal> 
  );
};
