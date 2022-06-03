import { RenderWindow, Slice, Image } from 'modules/view/components';
import { Widgets } from 'modules/refine/components/slice-view/widgets';
import { MaskPainter } from 'modules/refine/components/slice-view/mask-painter';

export function SliceView(onEdit, onSliceChange, onSelect, onHighlight, onKeyDown, onKeyUp) {
  const renderWindow = RenderWindow();
  const image = Image();
  const slice = Slice(evt => evt.key === 'i' ? image.toggleInterpolation() : onKeyDown(evt), onKeyUp);
  const mask = MaskPainter();

  const isValid = label => label !== null && label !== 0;

  const onHover = label => {
    if (isValid(label)) {
      onHighlight(label);
    }
    else {
      onHighlight(null);
    }
  };

  const widgets = Widgets(mask.getPainter(), onEdit, onSelect, onHover);

  return {
    initialize: rootNode => {
      if (renderWindow.initialized()) return;

      renderWindow.initialize(rootNode);      
      slice.initialize(renderWindow);

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
    setLabels: labels => {
      mask.setLabels(labels);
      widgets.setLabels(labels);

      if (!mask.getActiveLabel() && labels.length > 0) {
        const label = labels[0];
        
        mask.setActiveLabel(label);
        widgets.setActiveLabel(label);
      }
    },
    setActiveLabel: label => {
      mask.setActiveLabel(label);
      widgets.setActiveLabel(label);
    },
    setHighlightLabel: label => mask.setHighlightLabel(label),
    setTool: (tool, cursor) => {
      widgets.setTool(tool)
      renderWindow.setCursor(cursor);
    },
    setBrush: (type, brush) => widgets.setBrush(type, brush),
    setSlice: slice => image.getMapper().setSlice(slice),
    setShowContours: show => mask.getActor().setVisibility(show),
    splitRegion: async (splitLabel, newLabel, splitMode) => {
      const painter = mask.getPainter();

      const currentLabel = painter.getLabel();

      const slice = image.getMapper().getSlice();
            
      painter.setLabel(newLabel);
      painter.startStroke();      
      painter.split(splitLabel, splitMode === 'top' ? slice + 1: slice);            
      const promise = painter.endStroke();    
      await promise;

      painter.setLabel(currentLabel);

      onEdit();

      return promise;
    },
    mergeRegion: async label => {
      const painter = mask.getPainter();

      painter.startStroke();      
      painter.merge(label);
      const promise = painter.endStroke();    
      await promise;

      onEdit();

      return promise;
    },
    addRegion: label => {
      mask.setActiveLabel(label);
      return widgets.addRegion();      
    },
    undo: () => {
      mask.getPainter().undo();
      onEdit();
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