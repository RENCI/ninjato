import vtkStateBuilder from '@kitware/vtk.js/Widgets/Core/StateBuilder';

export default function generateState(radius) {
  return vtkStateBuilder
    .createBuilder()
    .addStateFromMixin({
      labels: ['handle'],
      mixins: [
        'origin',
        'color',
        'orientation',
        'manipulator',
        'visible'
      ],
      name: 'handle',
      initialValues: {
        visible: true
      }  
    })
    .build();
}
