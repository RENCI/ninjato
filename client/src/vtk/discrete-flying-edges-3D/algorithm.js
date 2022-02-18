export function algorithm() {
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

  // The three main passes of the algorithm.
  void processXEdge(double value, T const* inPtr, vtkIdType row, vtkIdType slice); // PASS 1
  void processYZEdges(vtkIdType row, vtkIdType slice);                             // PASS 2
  void generateOutput(double value, T* inPtr, vtkIdType row, vtkIdType slice);     // PASS 4

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
      g[0] = s - s0_end;
    }
    else {
      g[0] = 0.5 * (s0_start - s0_end);
    }

    if (ijk[1] === 0) {
      g[1] = s1_start - s;
    }
    else if (ijk[1] >= Dims[1] - 1) {
      g[1] = s - s1_end;
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
    if (loc === CellClass.Interior) {
      g[0] = 0.5 * (s0_start - s0_end);
      g[1] = 0.5 * (s1_start - s1_end);
      g[2] = 0.5 * (s2_start - s2_end);
    }
    else {
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
    NewPoints[x] = ijk0[0] + t * (ijk1[0] - ijk0[0]) + Min0;
    NewPoints[x + 1] = ijk0[1] + t * (ijk1[1] - ijk0[1]) + Min1;
    NewPoints[x + 2] = ijk0[2] + t * (ijk1[2] - ijk0[2]) + Min2;

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

  const pass1 = (value, slice, end) => {
    let row;
    let rowPtr;
    // XXX: Using slice below will be inefficient
    let slicePtr = Scalars.slice(slice * Inc2);      
    for (; slice < end; ++slice) {
      for (row = 0, rowPtr = slicePtr; row < Dims[1]; ++row) {
        processXEdge(value, rowPtr, row, slice);
        rowPtr = rowPtr.slice(Inc1);
      } // for all rows in this slice
      slicePtr = slicePtr.slice(Inc2);
    } // for all slices in this batch
  };
  
  const pass2 = (slice, end) => {
    for (; slice < end; ++slice) {
      for (let row = 0; row < Dims[1] - 1; ++row) {
        processYZEdges(row, slice);
      } // for all rows in this slice
    }   // for all slices in this batch
  };

  const pass4 = (value, slice, end) => {
    let row;
    let eMD0 = slice * 6 * Dims[1];
    let eMD1 = eMD0 + 6 * Dims[1];
    // XXX: Using slice below will be inefficient
    let rowPtr;
    let slicePtr = scalars.slice(slice * Inc2);
    for (; slice < end; ++slice) {
      // It's possible to skip entire slices if there is nothing to generate
      if (EdgeMetaData[eMD1 + 3] > EdgeMetaData[eMD0 + 3]) { // there are triangle primitives!
        for (row = 0, rowPtr = slicePtr; row < Dims[1] - 1; ++row) {
          generateOutput(value, rowPtr, row, slice);
          rowPtr = rowPtr.slice(Inc1);
        } // for all rows in this slice
      }   // if there are triangles
      slicePtr = slicePtr.slice(Inc2);
      eMD0 = eMD1;
      eMD1 = eMD0 + 6 * Dims[1];
    } // for all slices in this batch
  };

  const initializeAlgorithm = () => {
    XCases = null;
    EdgeMetaData = null;
    NewScalars = null;
    NewTris = null;
    NewPoints = null;
    NewGradients = null;
    NewNormals = null;

    let i, j, k, l, ii, eCase, index, numTris, edgeIndex, edgeCaseIndex;
    const vertMap = [ 0, 1, 3, 2, 4, 5, 7, 6];
    const CASE_MASK = [1, 2, 4, 8, 16, 32, 64, 128];
    let edge;
    let edgeCase;

    // Initialize cases, increments, and edge intersection flags
    for (eCase = 0; eCase < 256; ++eCase) {
      for (j = 0; j < 16; ++j) {
        EdgeCases[eCase][j] = 0;
      }
      for (j = 0; j < 12; ++j) {
        EdgeUses[eCase][j] = 0;
      }
      IncludesAxes[eCase] = 0;
    }

    // The voxel, edge-based case table is a function of the four x-edge cases
    // that define the voxel. Here we convert the existing MC vertex-based case
    // table into a x-edge case table. Note that the four x-edges are ordered
    // (0->3): x, x+y, x+z, x+y+z; the four y-edges are ordered (4->7): y, y+x,
    // y+z, y+x+z; and the four z-edges are ordered (8->11): z, z+x, z+y,
    // z+x+y.
    for (l = 0; l < 4; ++l) {
      for (k = 0; k < 4; ++k) {
        for (j = 0; j < 4; ++j) {
          for (i = 0; i < 4; ++i) {
            // yes we could just count to (0->255) but where's the fun in that?
            eCase = i | (j << 2) | (k << 4) | (l << 6);
            for (ii = 0, index = 0; ii < 8; ++ii) {
              if (eCase & (1 << vertMap[ii])) { // map into ancient MC table
                index |= CASE_MASK[ii];
              }
            }
            // Now build case table
            edge = triangleCases[index];
            for (numTris = 0, edgeIndex = 0; edge[edgeIndex] > -1; edgeIndex += 3) { 
              // count the number of triangles
              numTris++;
            }
            if (numTris > 0) {
              edgeCase = EdgeCases[eCase];
              edgeCase[0] = numTris;
              for (edgeIndex = 0, edgeCaseIndex = 1; edge[edgeIndex] > -1; edgeIndex += 3, edgeCaseIndex += 3) {
                // Build new case table.
                edgeCase[edgeCaseIndex] = EdgeMap[edge[0]];
                edgeCase[edgeCaseIndex + 1] = EdgeMap[edge[1]];
                edgeCase[edgeCaseIndex + 2] = EdgeMap[edge[2]];
              }
            }
          } // x-edges
        }   // x+y-edges
      }     // x+z-edges
    }       // x+y+z-edges

    // Okay now build the acceleration structure. This is used to generate
    // output points and triangles when processing a voxel x-row as well as to
    // perform other topological reasoning. This structure is a function of the
    // particular case number.
    for (eCase = 0; eCase < 256; ++eCase) {
      edgeCase = EdgeCases[eCase];
      numTris = edgeCase[0];

      // Mark edges that are used by this case.
      for (i = 0, edgeCaseIndex = 1; i < numTris * 3; ++i) {
        // just loop over all edges
        EdgeUses[eCase][edgeCase[edgeCaseIndex + i]] = 1;
      }

      IncludesAxes[eCase] = EdgeUses[eCase][0] | EdgeUses[eCase][4] | EdgeUses[eCase][8];

    } // for all cases
  };

  //------------------------------------------------------------------------------
  // Count intersections along voxel axes. When traversing the volume across
  // x-edges, the voxel axes on the boundary may be undefined near boundaries
  // (because there are no fully-formed cells). Thus the voxel axes on the
  // boundary are treated specially.
  const countBoundaryYZInts = (loc, edgeUses, eMD) => {
    switch (loc) {
      case 2: //+x boundary
        eMD[0][1] += edgeUses[5];
        eMD[0][2] += edgeUses[9];
        break;
      case 8: //+y
        eMD[1][2] += edgeUses[10];
        break;
      case 10: //+x +y
        eMD[0][1] += edgeUses[5];
        eMD[0][2] += edgeUses[9];
        eMD[1][2] += edgeUses[10];
        eMD[1][2] += edgeUses[11];
        break;
      case 32: //+z
        eMD[2][1] += edgeUses[6];
        break;
      case 34: //+x +z
        eMD[0][1] += edgeUses[5];
        eMD[0][2] += edgeUses[9];
        eMD[2][1] += edgeUses[6];
        eMD[2][1] += edgeUses[7];
        break;
      case 40: //+y +z
        eMD[2][1] += edgeUses[6];
        eMD[1][2] += edgeUses[10];
        break;
      case 42: //+x +y +z happens no more than once per volume
        eMD[0][1] += edgeUses[5];
        eMD[0][2] += edgeUses[9];
        eMD[1][2] += edgeUses[10];
        eMD[1][2] += edgeUses[11];
        eMD[2][1] += edgeUses[6];
        eMD[2][1] += edgeUses[7];
        break;
      default: // uh-oh shouldn't happen
        break;
    }
  };

  //------------------------------------------------------------------------------
  // Interpolate a new point along a boundary edge. Make sure to consider
  // proximity to the boundary when computing gradients, etc.
  const interpolateEdge = (value, ijk, s, incs, edgeNum, edgeUses, eIds) => {
    // if this edge is not used then get out
    if (!edgeUses[edgeNum]) {
      return;
    }

    // build the edge information
    const vertMap = VertMap[edgeNum];

    const ijk0 = [];
    const ijk1 = [];
    const vId = eIds[edgeNum];

    const offsets = VertOffsets[vertMap[0]];
    const s0 = s + offsets[0] * incs[0] + offsets[1] * incs[1] + offsets[2] * incs[2];
    ijk0[0] = ijk[0] + offsets[0];
    ijk0[1] = ijk[1] + offsets[1];
    ijk0[2] = ijk[2] + offsets[2];

    offsets = VertOffsets[vertMap[1]];
    const s1 = s + offsets[0] * incs[0] + offsets[1] * incs[1] + offsets[2] * incs[2];
    ijk1[0] = ijk[0] + offsets[0];
    ijk1[1] = ijk[1] + offsets[1];
    ijk1[2] = ijk[2] + offsets[2];

    // Okay interpolate
    const t = 0.5;
    const xPtr = 3 * vId;
    NewPoints[xPtr] = ijk0[0] + t * (ijk1[0] - ijk0[0]) + Min0;
    NewPoints[xPtr + 1] = ijk0[1] + t * (ijk1[1] - ijk0[1]) + Min1;
    NewPoints[xPtr + 2] = ijk0[2] + t * (ijk1[2] - ijk0[2]) + Min2;

    if (NeedGradients) {
      const g0 = [];
      const g1 = [];
      computeBoundaryGradient(
        ijk0, s0 + incs[0], s0 - incs[0], s0 + incs[1], s0 - incs[1], s0 + incs[2], s0 - incs[2], g0);
      computeBoundaryGradient(
        ijk1, s1 + incs[0], s1 - incs[0], s1 + incs[1], s1 - incs[1], s1 + incs[2], s1 - incs[2], g1);

      const gTmp0 = g0[0] + t * (g1[0] - g0[0]);
      const gTmp1 = g0[1] + t * (g1[1] - g0[1]);
      const gTmp2 = g0[2] + t * (g1[2] - g0[2]);

      if (NewGradients) {
        const g = 3 * vId;
        NewGradients[g] = gTmp0;
        NewGradients[g + 1] = gTmp1;
        NewGradients[g + 2] = gTmp2;
      }

      if (NewNormals) {
        const n = 3 * vId;
        NewNormals[n] = -gTmp0;
        NewNormals[n + 1] = -gTmp1;
        NewNormals[n + 2] = -gTmp2;
        vtkMath.normalize(n);
      }
    } // if normals or gradients required

    if (InterpolateAttributes)
    {
      const v0 = ijk0[0] + ijk0[1] * incs[1] + ijk0[2] * incs[2];
      const v1 = ijk1[0] + ijk1[1] * incs[1] + ijk1[2] * incs[2];
      // XXX: Check below
      //Arrays.InterpolateEdge(v0, v1, t, vId);
    }
  };

  const contour = (
    input, inScalars, extent, output, newPts, newTris, newScalars, newNormals, newGradients
  ) => {
    const incs = input.computeIncrements(input.getExtent(), 1);
    const scalars = input.getPointData().getScalars();
    
    let value;
    const values = model.values;
    const numContours = values.length;
    let vidx, row, slice, emD, zInc;
    let numOutputXPts, numOutYPts, numOutZPts, numOutTris;
    let numXpts = 0, numYPts = 0, numZPts = 0, numTris = 0;
    let startXPts = 0, startYPts = 0, startZPts = 0, startTris = 0;

    // This may be subvolume of the total 3D image. Capture information for
    // subsequent processing.
    vtkDiscreteFlyingEdges3DAlgorithm<T> algo;
    Scalars = scalars;
    Min0 = extent[0];
    Max0 = extent[1];
    Inc0 = incs[0];
    Min1 = extent[2];
    Max1 = extent[3];
    Inc1 = incs[1];
    Min2 = extent[4];
    Max2 = extent[5];
    Inc2 = incs[2];

    // Now allocate working arrays. The XCases array tracks x-edge cases.
    Dims[0] = algo.Max0 - algo.Min0 + 1;
    Dims[1] = algo.Max1 - algo.Min1 + 1;
    Dims[2] = algo.Max2 - algo.Min2 + 1;
    NumberOfEdges = Dims[1] * Dims[2];
    SliceOffset = (Dims[0] - 1) * Dims[1];
    XCases = new Uint8Array((Dims[0] - 1) * NumberOfEdges);

    // Also allocate the characterization (metadata) array for the x edges.
    // This array tracks the number of x-, y- and z- intersections on the voxel
    // axes along an x-edge; as well as the number of the output triangles, and
    // the xMin_i and xMax_i (minimum index of first intersection, maximum
    // index of intersection for the ith x-row, the so-called trim edges used
    // for computational trimming).
    EdgeMetaData = new Uint32Array[NumberOfEdges * 6];

    // Interpolating attributes and other stuff. Interpolate extra attributes only if they
    // exist and the user requests it.
    NeedGradients = (newGradients || newNormals);
    InterpolateAttributes = false;
      // XXX: Check this
      //self->GetInterpolateAttributes() && input->GetPointData()->GetNumberOfArrays() > 1;

    // Loop across each contour value. This encompasses all three passes.
    for (vidx = 0; vidx < numContours; vidx++) {
      value = values[vidx];

      // PASS 1: Traverse all x-rows building edge cases and counting number of
      // intersections (i.e., accumulate information necessary for later output
      // memory allocation, e.g., the number of output points along the x-rows
      // are counted).
      pass1(0, Dims[2]);

      // PASS 2: Traverse all voxel x-rows and process voxel y&z edges.  The
      // result is a count of the number of y- and z-intersections, as well as
      // the number of triangles generated along these voxel rows.
      pass2(0, algo.Dims[2] - 1);

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
      for (slice = 0; slice < Dims[2]; ++slice) {
        zInc = slice * Dims[1];
        for (row = 0; row < algo.Dims[1]; ++row) {
          eMD = (zInc + row) * 6;
          numXPts = EdgeMetaData[eMD];
          numYPts = EdgeMetaData[eMD + 1];
          numZPts = EdgeMetaData[eMD + 2];
          numTris = EdgeMetaData[eMD + 3];
          EdgeMetaData[eMD] = numOutXPts + numOutYPts + numOutZPts;
          EdgeMetaData[eMD + 1] = EdgeMetaData[eMD] + numXPts;
          EdgeMetaData[eMD + 2] = EdgeMetaData[eMD + 1] + numYPts;
          EdgeMetaData[eMD + 3] = numOutTris;
          numOutXPts += numXPts;
          numOutYPts += numYPts;
          numOutZPts += numZPts;
          numOutTris += numTris;
        }
      }

      // Output can now be allocated.
      totalPts = numOutXPts + numOutYPts + numOutZPts;
      if (totalPts > 0) {
        newPts.setNumberOfPoints(totalPts);
        NewPoints = new Float32Array(3 * totalPts);
        //newTris->ResizeExact(numOutTris, 3 * numOutTris);
        // XXX: Will need to change this to an array including 3 for number of points per triangle before setting as output
        NewTris = new Uint32Array(3 * numOutTris);
        if (newScalars) {
          const numPrevPts = newScalars.getNumberOfTuples();
          const numNewPts = totalPts - numPrevPts;
          newScalars.setNumberOfPoints(totalPts);
          NewScalars = new Float32Array(totalPts);
          NewScalars.fill(value);
        }
        // XXX: Deal with these later
/*        
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
*/        

        // PASS 4: Fourth and final pass: Process voxel rows and generate output.
        // Note that we are simultaneously generating triangles and interpolating
        // points. These could be split into separate, parallel operations for
        // maximum performance.
        pass4(value, 0, Dims[2] - 1);
      } // if anything generated

      // Handle multiple contours
      startXPts = numOutXPts;
      startYPts = numOutYPts;
      startZPts = numOutZPts;
      startTris = numOutTris;
    } // for all contour values

    // Clean up and return
    //delete[] algo.XCases;
    //delete[] algo.EdgeMetaData;
  };
}