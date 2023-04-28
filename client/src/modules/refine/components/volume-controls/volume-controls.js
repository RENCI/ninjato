import { useContext } from 'react';
import { AnnotateContext, ANNOTATE_SET_CONTROL } from 'contexts';
import { ControlBar, ControlGroup, ControlButton, ControlLabel } from 'modules/common/components/control-bar';

export const VolumeControls = () => {
  const [{ showBackground, showGoldStandard }, dispatch] = useContext(AnnotateContext);

  const onShowBackgroundClick = () => {
    dispatch({ type: ANNOTATE_SET_CONTROL, name: 'showBackground', value: !showBackground });
  };

  const onShowGoldStandardClick = () => {
    dispatch({ type: ANNOTATE_SET_CONTROL, name: 'showGoldStandard', value: !showGoldStandard });
  };

  return (
    <ControlBar>
      <ControlLabel>options</ControlLabel>
      <ControlGroup>
        <ControlButton
          icon='cubes'
          toggle
          tooltip='show background regions'
          active={ showBackground }
          onClick={ onShowBackgroundClick }
        /> 
      </ControlGroup>
      <ControlGroup>
        <ControlButton
          icon='certificate'
          toggle
          tooltip='show gold standard'
          active={ showGoldStandard }
          onClick={ onShowGoldStandardClick }
        />
      </ControlGroup>
    </ControlBar>
  );
};
