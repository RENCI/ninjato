import { useContext } from 'react';
import { Button, Checkbox, Modal, Header } from 'semantic-ui-react';
import { AnnotateContext, ANNOTATE_SET_OPTION } from 'contexts';


const { Content } = Modal;

export const AnnotationOptions = () => {
  const [{ options }, annotateDispatch] = useContext(AnnotateContext);

  const onOptionChange = (option, value) => {
    annotateDispatch({ type: ANNOTATE_SET_OPTION, option: option, value: value });
  };

  return (
    <Modal
      dimmer='blurring'
      trigger={ 
        <Button 
          basic 
          icon='bars' 
        /> 
      }
    >
      <Header>Options</Header>
      <Content>
        <Checkbox 
          toggle
          label='Link paint/erase widgets'
          checked={ options.linkPaintWidget }
          onClick={ () => onOptionChange('linkPaintWidget', !options.linkPaintWidget) }
        />
      </Content>
    </Modal>
  );
};