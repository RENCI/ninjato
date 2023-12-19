import { useRef } from 'react';
import { Modal, Button, List, Divider, Header, Icon } from 'semantic-ui-react';
import html2pdf from 'html2pdf.js';
import { useModal } from 'hooks';
import styles from './styles.module.css';

const groupDescription = {
  general: 'General tools',
  edit: 'Standard editing tools',
  region: 'Whole-region editing tools',
  claim: 'Claim / remove region tools'
};

export const ControlsInfo = ({ tools }) => {
  const [open, openModal, closeModal] = useModal();
  const controlsRef = useRef();

  const groups = tools.reduce((groups, { group }) => {
    if (!groups.includes(group)) groups.push(group);
    return groups;
  }, []);

  const getIcon = name => <Icon name={ tools.find(({ value }) => value === name).icon } />;

  const holdShortcutInfo = hold => (
    <div className={ styles.controlsInfoShortCut }>
      { getIcon(hold) } { hold }
    </div>
  );

  const onPDFClick = () => {
    html2pdf()
      .set({ 
        margin: [5, 10, 5, 10],
        pagebreak: { mode: 'avoid-all'} 
      })
      .from(controlsRef.current)
      .toPdf()
      .get('pdf').then(pdf => {
        window.open(pdf.output('bloburl'), '_blank');
      });
  };

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
      <Modal.Header>
        Tools and Options
        <span style={{ float: 'right '}}>
          <Button 
            basic
            circular
            compact
            icon='file pdf outline'
            onClick={ onPDFClick }
          />
        </span>
      </Modal.Header>
      <Modal.Content>
        <div ref={ controlsRef }>
          <Header as ='h3'>Tools</Header>
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
            Releasing <b>Hold</b> keys will return to previous tool.
            <List relaxed>
              <List.Item>
                <List.Content>
                  <List.Header>Hold – Ctrl (PC) / Command (Mac)</List.Header> 
                  <List.Description>{ holdShortcutInfo('erase') }</List.Description>
                </List.Content>
              </List.Item>
              <List.Item>
                <List.Header>Hold – Shift</List.Header> 
                <List.Content>{ holdShortcutInfo('select') }</List.Content>
              </List.Item>
              <List.Item>
                <List.Header>Hold – Alt</List.Header> 
                <List.Content>{ holdShortcutInfo('navigate') }</List.Content>
              </List.Item>
              <List.Item />
              <List.Item>
                <List.Header>Arrow <Icon name='arrow up' /><Icon name='arrow down' /></List.Header> 
                <List.Content>Move slice up and down.</List.Content>
              </List.Item>
              <List.Item>
                <List.Header>Arrow <Icon name='arrow left' /><Icon name='arrow right' /></List.Header> 
                <List.Content>Change brush size.</List.Content>
              </List.Item>
            </List>
          </div>
          <Divider section={ true } content /> 
          <Header as='h3'>Options</Header>
          <Header as='h4'>2D</Header>
          <List relaxed>
            <List.Item>
              <List.Icon name={ 'circle outline' } />
              <List.Content>
                <List.Header>Show contours</List.Header> 
                <List.Description>Show or hide contours for regions.</List.Description>
              </List.Content>
            </List.Item>
          </List>
          <Header as='h4'>3D</Header>
          <List relaxed>
            <List.Item>
              <List.Icon name={ 'cubes' } />
              <List.Content>
                <List.Header>Show background regions</List.Header> 
                <List.Description>Show or hide translucent surfaces for background regions.</List.Description>
              </List.Content>
            </List.Item>
            <List.Item>
              <List.Icon name={ 'certificate' } />
              <List.Content>
                <List.Header>Show gold standard (training only)</List.Header> 
                <List.Description>Show gold standard image for training.</List.Description>
              </List.Content>
            </List.Item>
          </List>
        </div>
      </Modal.Content>
    </Modal> 
  );
};
