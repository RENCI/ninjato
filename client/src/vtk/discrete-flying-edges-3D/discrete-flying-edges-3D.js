import macro from '@kitware/vtk.js/macros';
import vtkDataArray from '@kitware/vtk.js/Common/Core/DataArray';
import vtkPolyData from '@kitware/vtk.js/Common/DataModel/PolyData';
import * as vtkMath from '@kitware/vtk.js/Common/Core/Math';

const { vtkErrorMacro, vtkDebugMacro } = macro;

// ----------------------------------------------------------------------------
// vtkDiscreteFlyingEdges3D methods
// ----------------------------------------------------------------------------

function vtkDiscreteFlyingEdges3D(publicAPI, model) {
  // Set our className
  model.classHierarchy.push('vtkDiscreteFlyingEdges3D');

  // --- Algorithm Internals ---------------------------------------------------

  // Edge case table values.
  const EdgeClass = {
    BothOutside: 0,  // both vertices outside region
    RightOutside: 1, // right vertex is outside region, left is inside
    LeftOutside: 2,  // left vertex is outside region, right is inside
    BothInside: 3,   // both vertices inside region 
  };

  // Dealing with boundary situations when processing volumes.
  // The voxel cells on the +x,+y,+z boundaries reference cell
  // axes triads which are not fully formed. These are treated
  // specially during certain operations (e.g., point generation).
  const CellClass = {
    Interior: 0,
    MinBoundary: 1,
    MaxBoundary: 2
  };

  // Edge-based case table to generate output triangle primitives. It is
  // equivalent to the vertex-based Marching Cubes case table but provides
  // several computational advantages (parallel separability, more efficient
  // computation). This table is built from the MC case table when the class
  // is instantiated.
  const EdgeCases = new Array(256).fill(new Uint8Array(16));

  // A table to map old edge ids (as defined from vtkMarchingCubesCases) into
  // the edge-based case table. This is so that the existing Marching Cubes
  // case tables can be reused.
  const EdgeMap = new Uint8Array([0, 5, 1, 4, 2, 7, 3, 6, 8, 9, 10, 11]);

  // A table that lists voxel point ids as a function of edge ids (edge ids
  // for edge-based case table).
  const VertMap = [
    new Uint8Array([0, 1]),
    new Uint8Array([2, 3]),
    new Uint8Array([4, 5]),
    new Uint8Array([6, 7]),
    new Uint8Array([0, 2]),
    new Uint8Array([1, 3]),
    new Uint8Array([4, 6]),
    new Uint8Array([5, 7]),
    new Uint8Array([0, 4]),
    new Uint8Array([1, 5]),
    new Uint8Array([2, 6]),
    new Uint8Array([3, 7])
  ];

  // A table describing vertex offsets (in index space) from the cube axes
  // origin for each of the eight vertices of a voxel.
  const VertOffsets = [
    new Uint8Array([ 0, 0, 0 ]),
    new Uint8Array([ 1, 0, 0 ]),
    new Uint8Array([ 0, 1, 0 ]),
    new Uint8Array([ 1, 1, 0 ]),
    new Uint8Array([ 0, 0, 1 ]),
    new Uint8Array([ 1, 0, 1 ]),
    new Uint8Array([ 0, 1, 1 ]),
    new Uint8Array([ 1, 1, 1 ])
  ];

  // This table is used to accelerate the generation of output triangles and
  // points. The EdgeUses array, a function of the voxel case number,
  // indicates which voxel edges intersect with the contour (i.e., require
  // interpolation). This array is filled in at instantiation during the case
  // table generation process.
  const EdgeUses = new Array(256).fill(new Uint8Array(12));

  // Flags indicate whether a particular case requires voxel axes to be
  // processed. A cheap acceleration structure computed from the case
  // tables at the point of instantiation.
  const IncludesAxes = new Uint8Array(256);

  // Algorithm-derived data. XCases tracks the x-row edge cases. The
  // EdgeMetaData tracks information needed for parallel partitioning,
  // and to enable generation of the output primitives without using
  // a point locator.
  let XCases;
  let EdgeMetaData;

  // Internal variables used by the various algorithm methods. Interfaces VTK
  // image data in a form more convenient to the algorithm.
  let Scalars;
  const Dims = new Array(3);
  let NumberOfEdges;
  let SliceOffset;
  let Min0;
  let Max0;
  let Inc0;
  let Min1;
  let Max1;
  let Inc1;
  let Min2;
  let Max2;
  let Inc2;

  // Output data. Threads write to partitioned memory.
  let NewScalars;
  let NewTris;
  let NewPoints;
  let NewGradients;
  let NewNormals;
  let NeedGradients;
  let InterpolateAttributes;
  let Arrays = [];

  // Place holder for now in case fancy bit fiddling is needed later.
  const setXEdge = (ePtr, edgeCase) => ePtr = edgeCase;

  // Given the four x-edge cases defining this voxel, return the voxel case
  // number.
  // XXX: IS THIS CORRECT?
  const getEdgeCase = (ePtr) => 
    ePtr[0] | (ePtr[1] << 2) | (ePtr[2] << 4) | (ePtr[3] << 6);

  // Return the number of contouring primitives for a particular edge case number.
  const getNumberOfPrimitives = (eCase) => EdgeCases[eCase][0];

  // Return an array indicating which voxel edges intersect the contour.
  const getEdgeUses = (eCase) => EdgeUses[eCase];

  // Indicate whether voxel axes need processing for this case.
  const caseIncludesAxes = (eCase) => IncludesAxes[eCase];
 
  // Produce the output triangles for this voxel cell.
  const GenerateTris = (eCase, numTris, eIds, triId) => {
    const edges = EdgeCases[eCase] + 1;
    // XXX: IS THIS CORRECT?
/*    
    NewTris.forEach(state => {
      const offsets = state.GetOffsets();
      const conn = state.GetConnectivity();

      const offsetRange = vtk::DataArrayValueRange<1>(offsets);
      const offsetIter = offsetRange.begin() + triId;
      const connRange = vtk::DataArrayValueRange<1>(conn);
      const connIter = connRange.begin() + (triId * 3);

      for (let i = 0; i < numTris; ++i) {
        *offsetIter++ = static_cast<ValueType>(3 * triId++);
        *connIter++ = eIds[*edges++];
        *connIter++ = eIds[*edges++];
        *connIter++ = eIds[*edges++];
      }

      // Write the last offset:
      *offsetIter = static_cast<ValueType>(3 * triId);
    });
*/    
  };

  // Compute the gradient when the point may be near the boundary of the
  // volume.
  const computeBoundaryGradient = (ijk, s0_start, s0_end, s1_start, s1_end, s2_start, s2_end, g) => {
    const s = s0_start - Inc0;

    if (ijk[0] === 0) {
      g[0] = s0_start - s;
    }
    else if (ijk[0] >= Dims[0] - 1) {
      g[0] = *s - *s0_end;
    }
    else {
      g[0] = 0.5 * (s0_start - s0_end);
    }

    if (ijk[1] === 0) {
      g[1] = s1_start - s;
    }
    else if (ijk[1] >= Dims[1] - 1) {
      g[1] = *s - *s1_end;
    }
    else {
      g[1] = 0.5 * (s1_start - s1_end);
    }

    if (ijk[2] === 0) {
      g[2] = s2_start - s;
    }
    else if (ijk[2] >= Dims[2] - 1) {
      g[2] = s - s2_end;
    }
    else {
      g[2] = 0.5 * (s2_start - s2_end);
    }
  };

  // Compute gradient on interior point.
  const computeGradient = (loc, ijk, s0_start, s0_end, s1_start, s1_end, s2_start, s2_end, g) => {
    if (loc === Interior)
    {
      g[0] = 0.5 * (s0_start - s0_end);
      g[1] = 0.5 * (s1_start - s1_end);
      g[2] = 0.5 * (s2_start - s2_end);
    }
    else
    {
      computeBoundaryGradient(ijk, s0_start, s0_end, s1_start, s1_end, s2_start, s2_end, g);
    }
  };

  // Interpolate along a voxel axes edge.
  const interpolateAxesEdge = (t, loc, s, incs, vId, ijk0, ijk1, g0) => {
    // XXX: IS THIS CORRECT?
    /*
    float* x = this->NewPoints + 3 * vId;
    x[0] = ijk0[0] + t * (ijk1[0] - ijk0[0]) + this->Min0;
    x[1] = ijk0[1] + t * (ijk1[1] - ijk0[1]) + this->Min1;
    x[2] = ijk0[2] + t * (ijk1[2] - ijk0[2]) + this->Min2;
    */
    const x = 3 * vId;
    newPoints[x] = ijk0[0] + t * (ijk1[0] - ijk0[0]) + Min0;
    newPoints[x + 1] = ijk0[1] + t * (ijk1[1] - ijk0[1]) + Min1;
    newPoints[x + 2] = ijk0[2] + t * (ijk1[2] - ijk0[2]) + Min2;

    if (NeedGradients) {
      const g1 = computeGradient(loc, ijk1, s + incs[0], s - incs[0], s + incs[1], s - incs[1],
        s + incs[2], s - incs[2]);

      const gTmp0 = g0[0] + t * (g1[0] - g0[0]);
      const gTmp1 = g0[1] + t * (g1[1] - g0[1]);
      const gTmp2 = g0[2] + t * (g1[2] - g0[2]);
      if (NewGradients) {
        // XXX: IS THIS CORRECT?
        /*
        float* g = this->NewGradients + 3 * vId;
        g[0] = gTmp0;
        g[1] = gTmp1;
        g[2] = gTmp2;
        */
        const g = 3 * vId;
        NewGradients[g] = gTmp0;
        NewGradients[g + 1] = gTmp1;
        NewGradients[g + 2] = gTmp2;
      }

      if (NewNormals) {
        // XXX: IS THIS CORRECT?
        /*
        float* n = this->NewNormals + 3 * vId;
        n[0] = -gTmp0;
        n[1] = -gTmp1;
        n[2] = -gTmp2;
        vtkMath::Normalize(n);
        */
        const n = + 3 * vId;
        NewNormals[n] = -gTmp0;
        NewNormals[n + 1] = -gTmp1;
        NewNormals[n + 2] = -gTmp2;
        vtkMath.normalize(n);
      }
    } // if normals or gradients required

    if (InterpolateAttributes) {
      const v0 = ijk0[0] + ijk0[1] * incs[1] + ijk0[2] * incs[2];
      const v1 = ijk1[0] + ijk1[1] * incs[1] + ijk1[2] * incs[2];
      Arrays.InterpolateEdge(v0, v1, t, vId);
    }
  };

  // Helper function to set up the point ids on voxel edges.
  const initVoxelIds = (ePtr, eMD, eIds) => {
    const eCase = getEdgeCase(ePtr);
    eIds[0] = eMD[0][0]; // x-edges
    eIds[1] = eMD[1][0];
    eIds[2] = eMD[2][0];
    eIds[3] = eMD[3][0];
    eIds[4] = eMD[0][1]; // y-edges
    eIds[5] = eIds[4] + EdgeUses[eCase][4];
    eIds[6] = eMD[2][1];
    eIds[7] = eIds[6] + EdgeUses[eCase][6];
    eIds[8] = eMD[0][2]; // z-edges
    eIds[9] = eIds[8] + EdgeUses[eCase][8];
    eIds[10] = eMD[1][2];
    eIds[11] = eIds[10] + EdgeUses[eCase][10];
    return eCase;
  };

  // Helper function to advance the point ids along voxel rows.
  const advanceVoxelIds = (eCase, eIds) => {
    eIds[0] += EdgeUses[eCase][0]; // x-edges
    eIds[1] += EdgeUses[eCase][1];
    eIds[2] += EdgeUses[eCase][2];
    eIds[3] += EdgeUses[eCase][3];
    eIds[4] += EdgeUses[eCase][4]; // y-edges
    eIds[5] = eIds[4] + EdgeUses[eCase][5];
    eIds[6] += EdgeUses[eCase][6];
    eIds[7] = eIds[6] + EdgeUses[eCase][7];
    eIds[8] += EdgeUses[eCase][8]; // z-edges
    eIds[9] = eIds[8] + EdgeUses[eCase][9];
    eIds[10] += EdgeUses[eCase][10];
    eIds[11] = eIds[10] + EdgeUses[eCase][11];
  };

  // XXX: PUNTING FOR NOW
  /*
  // Threading integration via SMPTools
  template <class TT>
  class Pass1
  {
  public:
    vtkDiscreteFlyingEdges3DAlgorithm<TT>* Algo;
    double Value;
    Pass1(vtkDiscreteFlyingEdges3DAlgorithm<TT>* algo, double value)
    {
      this->Algo = algo;
      this->Value = value;
    }
    void operator()(vtkIdType slice, vtkIdType end)
    {
      vtkIdType row;
      TT *rowPtr, *slicePtr = this->Algo->Scalars + slice * this->Algo->Inc2;
      for (; slice < end; ++slice)
      {
        for (row = 0, rowPtr = slicePtr; row < this->Algo->Dims[1]; ++row)
        {
          this->Algo->ProcessXEdge(this->Value, rowPtr, row, slice);
          rowPtr += this->Algo->Inc1;
        } // for all rows in this slice
        slicePtr += this->Algo->Inc2;
      } // for all slices in this batch
    }
  };
  template <class TT>
  class Pass2
  {
  public:
    Pass2(vtkDiscreteFlyingEdges3DAlgorithm<TT>* algo) { this->Algo = algo; }
    vtkDiscreteFlyingEdges3DAlgorithm<TT>* Algo;
    void operator()(vtkIdType slice, vtkIdType end)
    {
      for (; slice < end; ++slice)
      {
        for (vtkIdType row = 0; row < (this->Algo->Dims[1] - 1); ++row)
        {
          this->Algo->ProcessYZEdges(row, slice);
        } // for all rows in this slice
      }   // for all slices in this batch
    }
  };
  template <class TT>
  class Pass4
  {
  public:
    Pass4(vtkDiscreteFlyingEdges3DAlgorithm<TT>* algo, double value)
    {
      this->Algo = algo;
      this->Value = value;
    }
    vtkDiscreteFlyingEdges3DAlgorithm<TT>* Algo;
    double Value;
    void operator()(vtkIdType slice, vtkIdType end)
    {
      vtkIdType row;
      vtkIdType* eMD0 = this->Algo->EdgeMetaData + slice * 6 * this->Algo->Dims[1];
      vtkIdType* eMD1 = eMD0 + 6 * this->Algo->Dims[1];
      TT *rowPtr, *slicePtr = this->Algo->Scalars + slice * this->Algo->Inc2;
      for (; slice < end; ++slice)
      {
        // It's possible to skip entire slices if there is nothing to generate
        if (eMD1[3] > eMD0[3]) // there are triangle primitives!
        {
          for (row = 0, rowPtr = slicePtr; row < this->Algo->Dims[1] - 1; ++row)
          {
            this->Algo->GenerateOutput(this->Value, rowPtr, row, slice);
            rowPtr += this->Algo->Inc1;
          } // for all rows in this slice
        }   // if there are triangles
        slicePtr += this->Algo->Inc2;
        eMD0 = eMD1;
        eMD1 = eMD0 + 6 * this->Algo->Dims[1];
      } // for all slices in this batch
    }
  };
  */

  const initializeAlgorithm = () => {
    XCases = null;
    EdgeMetaData = null;
    NewScalars = null;
    NewTris = null;
    NewPoints = null;
    NewGradients = null;
    NewNormals = null;

    let i, j, k, l, ii, eCase, index, numTris;
    const vertMap = [ 0, 1, 3, 2, 4, 5, 7, 6];
    const CASE_MASK = [1, 2, 4, 8, 16, 32, 64, 128];
    //EDGE_LIST* edge;
    vtkMarchingCubesTriangleCases* triCase;
    unsigned char* edgeCase;
  };

  const contour = (input, pBuffer, tBuffer, sBuffer, nBuffer, gBuffer) => {
    const incs = input.computeIncrements(input.getExtent(), 1);
    const scalars = input.getPointData().getScalars();
    
    let value;
    const values = model.values;
    const numContours = values.length;
    let vidx, row, slice, *eMD, zInc;
    vtkIdType numOutXPts, numOutYPts, numOutZPts, numOutTris;
    vtkIdType numXPts = 0, numYPts = 0, numZPts = 0, numTris = 0;
    vtkIdType startXPts, startYPts, startZPts, startTris;
    startXPts = startYPts = startZPts = startTris = 0;

    // This may be subvolume of the total 3D image. Capture information for
    // subsequent processing.
    vtkDiscreteFlyingEdges3DAlgorithm<T> algo;
    algo.Scalars = scalars;
    algo.Min0 = extent[0];
    algo.Max0 = extent[1];
    algo.Inc0 = incs[0];
    algo.Min1 = extent[2];
    algo.Max1 = extent[3];
    algo.Inc1 = incs[1];
    algo.Min2 = extent[4];
    algo.Max2 = extent[5];
    algo.Inc2 = incs[2];

    // Now allocate working arrays. The XCases array tracks x-edge cases.
    algo.Dims[0] = algo.Max0 - algo.Min0 + 1;
    algo.Dims[1] = algo.Max1 - algo.Min1 + 1;
    algo.Dims[2] = algo.Max2 - algo.Min2 + 1;
    algo.NumberOfEdges = algo.Dims[1] * algo.Dims[2];
    algo.SliceOffset = (algo.Dims[0] - 1) * algo.Dims[1];
    algo.XCases = new unsigned char[(algo.Dims[0] - 1) * algo.NumberOfEdges];

    // Also allocate the characterization (metadata) array for the x edges.
    // This array tracks the number of x-, y- and z- intersections on the voxel
    // axes along an x-edge; as well as the number of the output triangles, and
    // the xMin_i and xMax_i (minimum index of first intersection, maximum
    // index of intersection for the ith x-row, the so-called trim edges used
    // for computational trimming).
    algo.EdgeMetaData = new vtkIdType[algo.NumberOfEdges * 6];

    // Interpolating attributes and other stuff. Interpolate extra attributes only if they
    // exist and the user requests it.
    algo.NeedGradients = (newGradients || newNormals);
    algo.InterpolateAttributes =
      self->GetInterpolateAttributes() && input->GetPointData()->GetNumberOfArrays() > 1;

    // Loop across each contour value. This encompasses all three passes.
    for (vidx = 0; vidx < numContours; vidx++)
    {
      value = values[vidx];

      // PASS 1: Traverse all x-rows building edge cases and counting number of
      // intersections (i.e., accumulate information necessary for later output
      // memory allocation, e.g., the number of output points along the x-rows
      // are counted).
      Pass1<T> pass1(&algo, value);
      vtkSMPTools::For(0, algo.Dims[2], pass1);

      // PASS 2: Traverse all voxel x-rows and process voxel y&z edges.  The
      // result is a count of the number of y- and z-intersections, as well as
      // the number of triangles generated along these voxel rows.
      Pass2<T> pass2(&algo);
      vtkSMPTools::For(0, algo.Dims[2] - 1, pass2);

      // PASS 3: Now allocate and generate output. First we have to update the
      // edge meta data to partition the output into separate pieces so
      // independent threads can write without collisions. Once allocation is
      // complete, the volume is processed on a voxel row by row basis to
      // produce output points and triangles, and interpolate point attribute
      // data (as necessary). NOTE: This implementation is serial. It is
      // possible to use a threaded prefix sum to make it even faster. Since
      // this pass usually takes a small amount of time, we choose simplicity
      // over performance.
      numOutXPts = startXPts;
      numOutYPts = startYPts;
      numOutZPts = startZPts;
      numOutTris = startTris;

      // Count number of points and tris generate along each cell row
      for (slice = 0; slice < algo.Dims[2]; ++slice)
      {
        zInc = slice * algo.Dims[1];
        for (row = 0; row < algo.Dims[1]; ++row)
        {
          eMD = algo.EdgeMetaData + (zInc + row) * 6;
          numXPts = eMD[0];
          numYPts = eMD[1];
          numZPts = eMD[2];
          numTris = eMD[3];
          eMD[0] = numOutXPts + numOutYPts + numOutZPts;
          eMD[1] = eMD[0] + numXPts;
          eMD[2] = eMD[1] + numYPts;
          eMD[3] = numOutTris;
          numOutXPts += numXPts;
          numOutYPts += numYPts;
          numOutZPts += numZPts;
          numOutTris += numTris;
        }
      }

      // Output can now be allocated.
      vtkIdType totalPts = numOutXPts + numOutYPts + numOutZPts;
      if (totalPts > 0)
      {
        newPts->GetData()->WriteVoidPointer(0, 3 * totalPts);
        algo.NewPoints = static_cast<float*>(newPts->GetVoidPointer(0));
        newTris->ResizeExact(numOutTris, 3 * numOutTris);
        algo.NewTris = newTris;
        if (newScalars)
        {
          vtkIdType numPrevPts = newScalars->GetNumberOfTuples();
          vtkIdType numNewPts = totalPts - numPrevPts;
          newScalars->WriteVoidPointer(0, totalPts);
          algo.NewScalars = static_cast<T*>(newScalars->GetVoidPointer(0));
          T TValue = static_cast<T>(value);
          std::fill_n(algo.NewScalars + numPrevPts, numNewPts, TValue);
        }
        if (newGradients)
        {
          newGradients->WriteVoidPointer(0, 3 * totalPts);
          algo.NewGradients = static_cast<float*>(newGradients->GetVoidPointer(0));
        }
        if (newNormals)
        {
          newNormals->WriteVoidPointer(0, 3 * totalPts);
          algo.NewNormals = static_cast<float*>(newNormals->GetVoidPointer(0));
        }
        if (algo.InterpolateAttributes)
        {
          if (vidx === 0) // first contour
          {
            // Make sure we don't interpolate the input scalars twice; or generate scalars
            // when ComputeScalars is off.
            output->GetPointData()->InterpolateAllocate(input->GetPointData(), totalPts);
            output->GetPointData()->RemoveArray(inScalars->GetName());
            algo.Arrays.ExcludeArray(inScalars);
            algo.Arrays.AddArrays(totalPts, input->GetPointData(), output->GetPointData());
          }
          else
          {
            algo.Arrays.Realloc(totalPts);
          }
        }

        // PASS 4: Fourth and final pass: Process voxel rows and generate output.
        // Note that we are simultaneously generating triangles and interpolating
        // points. These could be split into separate, parallel operations for
        // maximum performance.
        Pass4<T> pass4(&algo, value);
        vtkSMPTools::For(0, algo.Dims[2] - 1, pass4);
      } // if anything generated

      // Handle multiple contours
      startXPts = numOutXPts;
      startYPts = numOutYPts;
      startZPts = numOutZPts;
      startTris = numOutTris;
    } // for all contour values

    // Clean up and return
    delete[] algo.XCases;
    delete[] algo.EdgeMetaData;
  };

  publicAPI.requestData = (inData, outData) => {
    // implement requestData
    const input = inData[0];

    if (!input || input.getClassName() !=== 'vtkImageData') {
      vtkErrorMacro('Invalid or missing input');
      return;
    }

    // Check dimensions
    const dims = input.getDimensions();
    if (dims[0] === 1 || dims[1] === 1 || dims[2] === 1) {
      vtkErrorMacro('Discrete flying edges 3D requires 3D data');
      return;
    }

    // Check scalars
    if (!input.getPointData().getScalars()) {
      vtkErrorMacro('No scalars for contouring');
    }

    console.time('flying edges');

    // Points
    const pBuffer = [];

    // Cells (triangles)
    const tBuffer = [];

    // Scalars
    const sBuffer = [];

    // Normals
    const nBuffer = [];

    // Gradients
    const gBuffer = [];

    contour(input, pBuffer, tBuffer, sBuffer, nBuffer, gBuffer);

    // Update output
    const polydata = vtkPolyData.newInstance();
    polydata.getPoints().setData(new Float32Array(pBuffer), 3);
    polydata.getPolys().setData(new Uint32Array(tBuffer));
    if (model.computeNormals) {
      const nData = new Float32Array(nBuffer);
      const normals = vtkDataArray.newInstance({
        numberOfComponents: 3,
        values: nData,
        name: 'Normals',
      });
      polydata.getPointData().setNormals(normals);
    }
    outData[0] = polydata; 

    console.timeEnd('flying edges');
  };
}

// ----------------------------------------------------------------------------
// Object factory
// ----------------------------------------------------------------------------

const DEFAULT_VALUES = {
  values: [],
  computeNormals: true,
  computeGradients: false,
  computeScalars: true,
  interpolateAttributes: false,
  arrayComponent: 0
};

// ----------------------------------------------------------------------------

export function extend(publicAPI, model, initialValues = {}) {
  Object.assign(model, DEFAULT_VALUES, initialValues);

  // Make this a VTK object
  macro.obj(publicAPI, model);

  // Also make it an algorithm with one input and one output
  macro.algo(publicAPI, model, 1, 1);

  macro.setGet(publicAPI, model, [
    'values',
    'computeNormals',
    'computeGradients',
    'computeScalars',
    'interpolateAttributes',
    'arrayComponent'
  ]);

  // Object specific methods
  macro.algo(publicAPI, model, 1, 1);
  vtkDiscreteFlyingEdges3D(publicAPI, model);
}

// ----------------------------------------------------------------------------

export const newInstance = macro.newInstance(extend, 'vtkDiscreteFlyingEdges3D');

// ----------------------------------------------------------------------------

// eslint-disable-next-line import/no-anonymous-default-export
export default { newInstance, extend };
