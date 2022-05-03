import { RenderWindow, Slice, Image } from 'modules/view/components';
import { Widgets } from 'modules/refine/components/slice-view/widgets';
import { MaskPainter } from 'modules/refine/components/slice-view/mask-painter';

export function SliceView(onEdit, onSliceChange, onSelect, onHighlight, onKeyDown, onKeyUp) {
  const renderWindow = RenderWindow();
  const slice = Slice();
  const image = Image();
  const mask = MaskPainter();

  const isValid = label => label !== null && label !== 0 && label !== mask.getActiveLabel();

  const onHover = label => {
    if (!isValid(label)) {
      onHighlight(null);
    }
    else {
      onHighlight(label);
    }
  };

  const widgets = Widgets(mask.getPainter(), onEdit, onSelect, onHover);

  return {
    initialize: rootNode => {
      if (renderWindow.initialized()) return;

      renderWindow.initialize(rootNode);      
      slice.initialize(renderWindow);

      const interactor = renderWindow.getInteractor();
      interactor.onKeyDown(evt => (
        evt.key === 'i' ? image.toggleInterpolation() : onKeyDown(evt)
      ));
      interactor.onKeyUp(onKeyUp);

      widgets.setRenderer(renderWindow.getRenderer());
    },
    setData: (imageData, maskData) => {
      image.setInputData(imageData);    
      mask.setInputData(maskData);

      const renderer = renderWindow.getRenderer();
      renderer.addViewProp(image.getActor());
      renderer.addViewProp(mask.getActor());

      widgets.setImageData(maskData);

      const onUpdateSlice = (z, position) => {
        // Update mask slice
        mask.setSlice(z);

        // Update widget position
        widgets.update(position, imageData.getSpacing());

        // Callback
        onSliceChange(z);
      }

      slice.setImage(image.getActor(), renderWindow.getCamera(), onUpdateSlice);
      slice.setSliceByLabel(image.getMapper(), maskData, mask.getActiveLabel());
    },
    setLabels: labels => mask.setLabels(labels),
    setActiveLabel: label => mask.setActiveLabel(label),
    setHighlightLabel: label => mask.setHighlightLabel(label),
    setEditMode: (editMode, cursor) => {
      widgets.setEditMode(editMode)
      renderWindow.setCursor(cursor);
    },
    setPaintBrush: brush => widgets.setPaintBrush(brush),
    setEraseBrush: brush => widgets.setEraseBrush(brush),
    setSlice: slice => image.getMapper().setSlice(slice),
    undo: () => {
      mask.getPainter().undo();
      onEdit()
    },
    redo: () => {
      mask.getPainter().redo();
      onEdit();
    },
    canUndo: () => mask.getPainter().canUndo(),
    canRedo: () => mask.getPainter().canRedo(),
    cleanUp: () => {
      console.log('Clean up slice view');

      // Clean up anything we instantiated
      renderWindow.cleanUp();
      slice.cleanUp();
      image.cleanUp();
      mask.cleanUp();
      widgets.cleanUp();
    }
  };
}