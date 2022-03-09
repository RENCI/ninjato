import vtkFullScreenRenderWindow from '@kitware/vtk.js/Rendering/Misc/FullScreenRenderWindow';

export function RenderWindow() {
  let fullScreenRenderWindow = null;
  let renderWindow = null;
  let renderer = null;

  return {
    initialize: (rootNode, background = [0, 0, 0, 0]) => {
      if (fullScreenRenderWindow) return;

      fullScreenRenderWindow = vtkFullScreenRenderWindow.newInstance({
        rootContainer: rootNode,
        background: background,
        listenWindowResize: false
      });

      renderWindow = fullScreenRenderWindow.getRenderWindow();
      renderer = fullScreenRenderWindow.getRenderer();
    },
    initialized: () => fullScreenRenderWindow !== null,
    getRenderer: () => renderer,
    getCamera: () => renderer.getActiveCamera(),
    getInteractor: () => renderWindow.getInteractor(),
    render: () => renderWindow.render(),
    cleanUp: () => {
      console.log("Clean up slice view");

      // Clean up anything we instantiated
      if (fullScreenRenderWindow) {
        if (fullScreenRenderWindow.getInteractor()) fullScreenRenderWindow.getInteractor().delete();
        fullScreenRenderWindow.delete();
      }
    }
  };
}