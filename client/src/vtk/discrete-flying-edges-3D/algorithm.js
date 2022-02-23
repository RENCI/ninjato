import * as vtkMath from '@kitware/vtk.js/Common/Core/Math';

import triangleCases from './marching-cubes-triangle-cases';

import { regionTest } from './test-region-20';

export default function algorithm() {
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
  const EdgeCases = new Array(256).fill().map(() => new Uint8Array(16));

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
  const EdgeUses = new Array(256).fill().map(() => new Uint8Array(12));

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
  let Origin;
  let Spacing;
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

  // Setup algorithm
  // This takes the place of the vtkDiscreteFlyingEdges3DAlgorithm constructor
  initializeAlgorithm();

  // Adjust the origin to the lower-left corner of the volume (if necessary)
  const adjustOrigin = () => {
    Origin[0] = Origin[0] + Spacing[0] * Min0;
    Origin[1] = Origin[1] + Spacing[1] * Min1;
    Origin[2] = Origin[2] + Spacing[2] * Min2;
  };

  //------------------------------------------------------------------------------
  // PASS 1: Process a single volume x-row (and all of the voxel edges that
  // compose the row). Determine the x-edges case classification, count the
  // number of x-edge intersections, and figure out where intersections along
  // the x-row begins and ends (i.e., gather information for computational
  // trimming).
  const processXEdge = (value, inArray, inIndex, row, slice) => {
    const nxcells = Dims[0] - 1;
    let minInt = nxcells, maxInt = 0;
    let edgeMetaDataIndex;
    let edgeCase, eIndex = slice * SliceOffset + row * nxcells;
    let s0, s1 = inArray[inIndex];
    let labelValue = value;
    let sum = 0;

    // run along the entire x-edge computing edge cases
    edgeMetaDataIndex = (slice * Dims[1] + row) * 6;
    EdgeMetaData.fill(edgeMetaDataIndex, edgeMetaDataIndex + 6, 0);

    // pull this out help reduce false sharing
    const inc0 = Inc0;

    for (let i = 0; i < nxcells; ++i, ++eIndex) {
      s0 = s1;
      s1 = inArray[inIndex + (i + 1) * inc0];

      if (s0 !== labelValue) {
        edgeCase = s1 !== value ? EdgeClass.BothOutside 
                                : EdgeClass.LeftOutside;
      }
      else { // s0 == labelValue
        edgeCase = s1 !== value ? EdgeClass.RightOutside 
                                : EdgeClass.BothInside;
      }

      setXEdge(XCases, eIndex, edgeCase);

      // if edge intersects contour
      if (edgeCase === EdgeClass.LeftOutside || edgeCase === EdgeClass.RightOutside) {
        ++sum; // increment number of intersections along x-edge
        if (i < minInt) {
          minInt = i;
        }
        maxInt = i + 1;
      } // if contour interacts with this x-edge
    }   // for all x-cell edges along this x-edge

    EdgeMetaData[edgeMetaDataIndex] += sum; // write back the number of intersections along x-edge

    // The beginning and ending of intersections along the edge is used for
    // computational trimming.
    EdgeMetaData[edgeMetaDataIndex + 4] = minInt; // where intersections start along x edge
    EdgeMetaData[edgeMetaDataIndex + 5] = maxInt; // where intersections end along x edge  
  };

  //------------------------------------------------------------------------------
  // PASS 2: Process a single x-row of voxels. Count the number of y- and
  // z-intersections by topological reasoning from x-edge cases. Determine the
  // number of primitives (i.e., triangles) generated from this row. Use
  // computational trimming to reduce work. Note *ePtr[4] is four pointers to
  // four x-edge rows that bound the voxel x-row and which contain edge case
  // information.
  const processYZEdges = (row, slice) => {
    // Grab the four edge cases bounding this voxel x-row.
    const eIndeces = new Array(4);
    let ec0, ec1, ec2, ec3, xInts = 1;
    eIndeces[0] = slice * SliceOffset + row * (Dims[0] - 1);
    eIndeces[1] = eIndeces[0] + Dims[0] - 1;
    eIndeces[2] = eIndeces[0] + SliceOffset;
    eIndeces[3] = eIndeces[2] + Dims[0] - 1;

    // Grab the edge meta data surrounding the voxel row.
    const eMDIndeces = new Array(4);
    eMDIndeces[0] = (slice * Dims[1] + row) * 6; // this x-edge
    eMDIndeces[1] = eMDIndeces[0] + 6;           // x-edge in +y direction
    eMDIndeces[2] = eMDIndeces[0] + Dims[1] * 6; // x-edge in +z direction
    eMDIndeces[3] = eMDIndeces[2] + 6;           // x-edge in +y+z direction

    const TEST = row === 14 && slice === 0;

    // Determine whether this row of x-cells needs processing. If there are no
    // x-edge intersections, and the state of the four bounding x-edges is the
    // same, then there is no need for processing.
    if ((EdgeMetaData[eMDIndeces[0]] | EdgeMetaData[eMDIndeces[1]] | EdgeMetaData[eMDIndeces[3]]) === 0) { // any x-ints?    
      if (XCases[eIndeces[0]] === XCases[eIndeces[1]] && XCases[eIndeces[1]] === XCases[eIndeces[2]] && XCases[eIndeces[2]] === XCases[eIndeces[3]]) {
        return; // there are no y- or z-ints, thus no contour, skip voxel row
      }
      else {
        xInts = 0; // there are y- or z- edge ints however
      }
    }

    // Determine proximity to the boundary of volume. This information is used
    // to count edge intersections in boundary situations.
    let loc, yLoc, zLoc, yzLoc;
    yLoc = row >= (Dims[1] - 2) ? CellClass.MaxBoundary : CellClass.Interior;
    zLoc = slice >= (Dims[2] - 2) ? CellClass.MaxBoundary : CellClass.Interior;
    yzLoc = (yLoc << 2) | (zLoc << 4);

    if (TEST) console.log(yLoc, zLoc, yzLoc);

    // The trim edges may need adjustment if the contour travels between rows
    // of x-edges (without intersecting these x-edges). This means checking
    // whether the trim faces at (xL,xR) made up of the y-z edges intersect the
    // contour. Basically just an intersection operation. Determine the voxel
    // row trim edges, need to check all four x-edges.
    let xL = EdgeMetaData[eMDIndeces[0] + 4], xR = EdgeMetaData[eMDIndeces[0] + 5];
    let i;
    if (xInts) {
      for (i = 1; i < 4; ++i) {
        xL = EdgeMetaData[eMDIndeces[i] + 4] < xL ? EdgeMetaData[eMDIndeces[i] + 4] : xL;
        xR = EdgeMetaData[eMDIndeces[i] + 5] > xR ? EdgeMetaData[eMDIndeces[i] + 5] : xR;
      }

      if (xL > 0) { // if trimmed in the -x direction      
        ec0 = XCases[eIndeces[0] + xL];
        ec1 = XCases[eIndeces[1] + xL];
        ec2 = XCases[eIndeces[2] + xL];
        ec3 = XCases[eIndeces[3] + xL];
        if ((ec0 & 0x1) !== (ec1 & 0x1) || (ec1 & 0x1) !== (ec2 & 0x1) || (ec2 & 0x1) !== (ec3 & 0x1)) {
          xL = EdgeMetaData[eMDIndeces[0] + 4] = 0; // reset left trim
        }
      }

      if (xR < (Dims[0] - 1)) { // if trimmed in the +x direction      
        ec0 = XCases[eIndeces[0] + xR];
        ec1 = XCases[eIndeces[1] + xR];
        ec2 = XCases[eIndeces[2] + xR];
        ec3 = XCases[eIndeces[3] + xR];
        if ((ec0 & 0x2) !== (ec1 & 0x2) || (ec1 & 0x2) !== (ec2 & 0x2) || (ec2 & 0x2) !== (ec3 & 0x2)) {
          xR = EdgeMetaData[eMDIndeces[0] + 5] = Dims[0] - 1; // reset right trim
        }
      }
    }
    else // contour cuts through without intersecting x-edges, reset trim edges
    {
      xL = EdgeMetaData[eMDIndeces[0] + 4] = 0;
      xR = EdgeMetaData[eMDIndeces[0] + 5] = Dims[0] - 1;
    }

    if (TEST) console.log(xL, xR, ec0, ec1, ec2, ec3);

    // Okay run along the x-voxels and count the number of y- and
    // z-intersections. Here we are just checking y,z edges that make up the
    // voxel axes. Also check the number of primitives generated.
    let edgeUses, eCase, numTris;
    eIndeces[0] += xL;
    eIndeces[1] += xL;
    eIndeces[2] += xL;
    eIndeces[3] += xL;
    const dim0Wall = Dims[0] - 2;
    for (i = xL; i < xR; ++i) { // run along the trimmed x-voxels
      eCase = getEdgeCase(XCases, eIndeces);

      if ((numTris = getNumberOfPrimitives(eCase)) > 0) {
        // Okay let's increment the triangle count.
        EdgeMetaData[eMDIndeces[0] + 3] += numTris;

        // Count the number of y- and z-points to be generated. Pass# 1 counted
        // the number of x-intersections along the x-edges. Now we count all
        // intersections on the y- and z-voxel axes.
        edgeUses = getEdgeUses(eCase);
        EdgeMetaData[eMDIndeces[0] + 1] += edgeUses[4]; // y-voxel axes edge always counted
        EdgeMetaData[eMDIndeces[0] + 2] += edgeUses[8]; // z-voxel axes edge always counted
        loc = yzLoc | (i >= dim0Wall ? CellClass.MaxBoundary : CellClass.Interior);
        if (loc !== 0) {
          countBoundaryYZInts(loc, edgeUses, EdgeMetaData, eMDIndeces);
        }

        if (TEST) console.log(EdgeMetaData[87]);
      } // if cell contains contour

      // advance the four pointers along voxel row
      eIndeces[0]++;
      eIndeces[1]++;
      eIndeces[2]++;
      eIndeces[3]++;
    } // for all voxels along this x-edge

    console.log(EdgeMetaData[87]);
  };

  //------------------------------------------------------------------------------
  // PASS 4: Process the x-row cells to generate output primitives, including
  // point coordinates and triangles. This is the fourth and final pass of the
  // algorithm.
  const generateOutput = (value, rowArray, rowIndex, row, slice) => {
    // Grab the edge meta data surrounding the voxel row.
    const eMDIndeces = new Array(4);
    eMDIndeces[0] = (slice * Dims[1] + row) * 6; // this x-edge
    eMDIndeces[1] = eMDIndeces[0] + 6;           // x-edge in +y direction
    eMDIndeces[2] = eMDIndeces[0] + Dims[1] * 6; // x-edge in +z direction
    eMDIndeces[3] = eMDIndeces[2] + 6;           // x-edge in +y+z direction

    // Return if there is nothing to do (i.e., no triangles to generate)
    if (EdgeMetaData[eMDIndeces[0] + 3] === EdgeMetaData[eMDIndeces[1] + 3]) {
      return;
    }

    // Get the voxel row trim edges and prepare to generate. Find the voxel row
    // trim edges, need to check all four x-edges to compute row trim edge.
    let xL = EdgeMetaData[eMDIndeces[0] + 4], xR = EdgeMetaData[eMDIndeces[0] + 5];
    let i;
    for (i = 1; i < 4; ++i) {
      xL = EdgeMetaData[eMDIndeces[i] + 4] < xL ? EdgeMetaData[eMDIndeces[i] + 4] : xL;
      xR = EdgeMetaData[eMDIndeces[i] + 5] > xR ? EdgeMetaData[eMDIndeces[i] + 5] : xR;
    }

    // Grab the four edge cases bounding this voxel x-row. Begin at left trim edge.
    const eIndeces = new Array(4);
    eIndeces[0] = slice * SliceOffset + row * (Dims[0] - 1) + xL;
    eIndeces[1] = eIndeces[0] + Dims[0] - 1;
    eIndeces[2] = eIndeces[0] + SliceOffset;
    eIndeces[3] = eIndeces[2] + Dims[0] - 1;

    // Traverse all voxels in this row, those containing the contour are
    // further identified for processing, meaning generating points and
    // triangles. Begin by setting up point ids on voxel edges.
    const triId = { value: EdgeMetaData[eMDIndeces[0] + 3] }; // Use object because need to pass by value
    const eIds = new Array(12); // the ids of generated points

    let eCase = initVoxelIds(XCases, eIndeces, EdgeMetaData, eMDIndeces, eIds);

    // Determine the proximity to the boundary of volume. This information is
    // used to generate edge intersections.
    let loc, yLoc, zLoc, yzLoc;
		yLoc = (row < 1 ? CellClass.MinBoundary :
			(row >= (Dims[1] - 2) ? CellClass.MaxBoundary :  CellClass.Interior));
		zLoc = (slice < 1 ? CellClass.MinBoundary :
			(slice >= (Dims[2] - 2) ? CellClass.MaxBoundary :  CellClass.Interior));
		yzLoc = (yLoc << 2) | (zLoc << 4);

		// Run along voxels in x-row direction and generate output primitives. Note
		// that active voxel axes edges are interpolated to produce points and
		// possibly interpolate attribute data.
		const x = [
      Origin[0] + xL * Spacing[0],
      Origin[1] + row * Spacing[1],
      Origin[2] + slice * Spacing[2]
    ];

    // compute the ijk for this section
    const ijk = [xL, row, slice];

    // load the inc0/inc1/inc2 into local memory
    const incs = [Inc0, Inc1, Inc2];
    let sIndex = rowIndex + xL * incs[0];
		const xSpace = Spacing[0];
    const dim0Wall = Dims[0] - 2;
    const endVoxel = xR - 1;

    for (i = xL; i < xR; ++i) {
      const numTris = getNumberOfPrimitives(eCase);
      if (numTris > 0) {
        // Start by generating triangles for this case
        generateTris(eCase, numTris, eIds, triId);

        // Now generate point(s) along voxel axes if needed. Remember to take
        // boundary into account.
        loc = yzLoc | (i < 1 ? CellClass.MinBoundary :
					(i >= dim0Wall ? CellClass.MaxBoundary : CellClass.Interior));
        if (caseIncludesAxes(eCase) || loc !== CellClass.Interior) {
          const edgeUses = getEdgeUses(eCase);
          generatePoints(value, loc, ijk, 
            rowArray, sIndex, incs, 
            x, edgeUses, eIds);
        }
        advanceVoxelIds(eCase, eIds);
      }

      // Advance along voxel row if not at the end. Saves a little work.
      if (i < endVoxel) {
        eIndeces[0]++;
        eIndeces[1]++;
        eIndeces[2]++;
        eIndeces[3]++;
        eCase = getEdgeCase(XCases, eIndeces);

        ++ijk[0];
        sIndex += incs[0];
				x[0] += xSpace;
      } // if not at end of voxel row
    }   // for all non-trimmed cells along this x-edge
  };

  // Place holder for now in case fancy bit fiddling is needed later.
  const setXEdge = (eArray, eIndex, edgeCase) => eArray[eIndex] = edgeCase;

  // Given the four x-edge cases defining this voxel, return the voxel case
  // number.
  const getEdgeCase = (eArray, eIndeces) => 
    eArray[eIndeces[0]] | (eArray[eIndeces[1]] << 2) | (eArray[eIndeces[2]] << 4) | (eArray[eIndeces[3]] << 6);

  // Return the number of contouring primitives for a particular edge case number.
  const getNumberOfPrimitives = (eCase) => EdgeCases[eCase][0];

  // Return an array indicating which voxel edges intersect the contour.
  const getEdgeUses = (eCase) => EdgeUses[eCase];

  // Indicate whether voxel axes need processing for this case.
  const caseIncludesAxes = (eCase) => IncludesAxes[eCase];

  //------------------------------------------------------------------------------
  // Count intersections along voxel axes. When traversing the volume across
  // x-edges, the voxel axes on the boundary may be undefined near boundaries
  // (because there are no fully-formed cells). Thus the voxel axes on the
  // boundary are treated specially.
  const countBoundaryYZInts = (loc, edgeUses, eMDArray, eMDIndeces) => {
    switch (loc) {
      case 2: //+x boundary
        eMDArray[eMDIndeces[0] + 1] += edgeUses[5];
        eMDArray[eMDIndeces[0] + 2] += edgeUses[9];
        break;
      case 8: //+y
        eMDArray[eMDIndeces[1] + 2] += edgeUses[10];
        break;
      case 10: //+x +y
        eMDArray[eMDIndeces[0] + 1] += edgeUses[5];
        eMDArray[eMDIndeces[0] + 2] += edgeUses[9];
        eMDArray[eMDIndeces[1] + 2] += edgeUses[10];
        eMDArray[eMDIndeces[1] + 2] += edgeUses[11];
        break;
      case 32: //+z
        eMDArray[eMDIndeces[2] + 1] += edgeUses[6];
        break;
      case 34: //+x +z
        eMDArray[eMDIndeces[0] + 1] += edgeUses[5];
        eMDArray[eMDIndeces[0] + 2] += edgeUses[9];
        eMDArray[eMDIndeces[2] + 1] += edgeUses[6];
        eMDArray[eMDIndeces[2] + 1] += edgeUses[7];
        break;
      case 40: //+y +z
        eMDArray[eMDIndeces[2] + 1] += edgeUses[6];
        eMDArray[eMDIndeces[1] + 2] += edgeUses[10];
        break;
      case 42: //+x +y +z happens no more than once per volume
        eMDArray[eMDIndeces[0] + 1] += edgeUses[5];
        eMDArray[eMDIndeces[0] + 2] += edgeUses[9];
        eMDArray[eMDIndeces[1] + 2] += edgeUses[10];
        eMDArray[eMDIndeces[1] + 2] += edgeUses[11];
        eMDArray[eMDIndeces[2] + 1] += edgeUses[6];
        eMDArray[eMDIndeces[2] + 1] += edgeUses[7];
        break;
      default: // uh-oh shouldn't happen
        break;
    }
  };
 
  // Produce the output triangles for this voxel cell.
  const generateTris = (eCase, numTris, eIds, triId) => {
    // XXX: CHECK THIS?
    const edges = EdgeCases[eCase];
    let edgesIndex = 1;

    for (let i = 0; i < numTris; ++i, edgesIndex += 3) {
      const triIndex = 4 * triId.value++;
      NewTris[triIndex] = 3;
      NewTris[triIndex + 1] = eIds[edges[edgesIndex]];
      NewTris[triIndex + 2] = eIds[edges[edgesIndex + 1]];
      NewTris[triIndex + 3] = eIds[edges[edgesIndex + 2]];
    }
  };

  // Compute gradient on interior point.
  const computeGradient = (loc, ijk, sArray, s0_start, s0_end, s1_start, s1_end, s2_start, s2_end, g) => {
    if (loc === CellClass.Interior) {
      g[0] = 0.5 * ((sArray[s0_start] - sArray[s0_end]) / Spacing[0]);
      g[1] = 0.5 * ((sArray[s1_start] - sArray[s1_end]) / Spacing[1]);
      g[2] = 0.5 * ((sArray[s2_start] - sArray[s2_end]) / Spacing[2]);
    }
    else {
      computeBoundaryGradient(ijk, sArray, 
        s0_start, s0_end, 
        s1_start, s1_end, 
        s2_start, s2_end, 
        g);
    }
  };

  // Interpolate along a voxel axes edge.
  const interpolateAxesEdge = (t, loc, x0, sArray, sIndex, incs, x1, vId, ijk0, ijk1, g0) => {
    const xIndex = 3 * vId;
    NewPoints[xIndex] = x0[0] + t * (x1[0] - x0[0]);
    NewPoints[xIndex + 1] = x0[1] + t * (x1[1] - x0[1]);
    NewPoints[xIndex + 2] = x0[2] + t * (x1[2] - x0[2]);
    
    if (NeedGradients) {
      const g1 = new Array(3);
      computeGradient(loc, ijk1, sArray, 
        sIndex + incs[0], sIndex - incs[0], 
        sIndex + incs[1], sIndex - incs[1],
        sIndex + incs[2], sIndex - incs[2], 
        g1);

      const gTmp0 = g0[0] + t * (g1[0] - g0[0]);
      const gTmp1 = g0[1] + t * (g1[1] - g0[1]);
      const gTmp2 = g0[2] + t * (g1[2] - g0[2]);
      if (NewGradients) {
        const gIndex = 3 * vId;
        NewGradients[gIndex] = gTmp0;
        NewGradients[gIndex + 1] = gTmp1;
        NewGradients[gIndex + 2] = gTmp2;
      }

      if (NewNormals) {
        const n = [-gTmp0, -gTmp1, -gTmp2];
        vtkMath.normalize(n);

        const nIndex = 3 * vId;
        NewNormals[nIndex] = n[0];
        NewNormals[nIndex + 1] = n[1];
        NewNormals[nIndex + 2] = n[2];
      }
    } // if normals or gradients required

    if (InterpolateAttributes) {
      //const v0 = ijk0[0] + ijk0[1] * incs[1] + ijk0[2] * incs[2];
      //const v1 = ijk1[0] + ijk1[1] * incs[1] + ijk1[2] * incs[2];
      // XXX: NEED AN IMPLEMENTATION FOR THIS
      //Arrays.InterpolateEdge(v0, v1, t, vId);
    }
  };

  // Compute the gradient when the point may be near the boundary of the
  // volume.
  const computeBoundaryGradient = (ijk, sArray, s0_start, s0_end, s1_start, s1_end, s2_start, s2_end, g) => {
    const sIndex = s0_start - Inc0;

    if (ijk[0] === 0) {
      g[0] = (sArray[s0_start] - sArray[sIndex]) / Spacing[0];
    }
    else if (ijk[0] >= Dims[0] - 1) {
      g[0] = (sArray[sIndex] - sArray[s0_end]) / Spacing[0];
    }
    else {
      g[0] = 0.5 * (sArray[s0_start] - sArray[s0_end]) / Spacing[0];
    }

    if (ijk[1] === 0) {
      g[1] = (sArray[s1_start] - sArray[sIndex]) / Spacing[1];
    }
    else if (ijk[1] >= Dims[1] - 1) {
      g[1] = (sArray[sIndex] - sArray[s1_end]) / Spacing[1];
    }
    else {
      g[1] = 0.5 * (sArray[s1_start] - sArray[s1_end]) / Spacing[1];
    }

    if (ijk[2] === 0) {
      g[2] = (sArray[s2_start] - sArray[sIndex]) / Spacing[2];
    }
    else if (ijk[2] >= Dims[2] - 1) {
      g[2] = (sArray[sIndex] - sArray[s2_end]) / Spacing[2];
    }
    else {
      g[2] = 0.5 * (sArray[s2_start] - sArray[s2_end]) / Spacing[2];
    }
  };

  //------------------------------------------------------------------------------
  // Interpolate a new point along a boundary edge. Make sure to consider
  // proximity to the boundary when computing gradients, etc.
  const interpolateEdge = (notUsed, ijk, sArray, sIndex, incs, x, edgeNum, edgeUses, eIds) => {
    // if this edge is not used then get out
    if (!edgeUses[edgeNum]) {
      return;
    }

    // build the edge information
    const vertMap = VertMap[edgeNum];

    const x0 = new Array(3), x1 = new Array(3);
    const ijk0 = new Array(3), ijk1 = new Array(3), vId = eIds[edgeNum];
    let i;

    let offsets = VertOffsets[vertMap[0]];
    const s0 = sIndex + offsets[0] * incs[0] + offsets[1] * incs[1] + offsets[2] * incs[2];
    for (i = 0; i < 3; i++) {
      ijk0[i] = ijk[i] + offsets[i];
			x0[i] = x[i] + offsets[i] * Spacing[i];
    }

    offsets = VertOffsets[vertMap[1]];
    const s1 = sIndex + offsets[0] * incs[0] + offsets[1] * incs[1] + offsets[2] * incs[2];
		for (i = 0; i<3; ++i) {
			ijk1[i] = ijk[i] + offsets[i];
			x1[i] = x[i] + offsets[i] * Spacing[i];
		}

    // Okay interpolate
    const t = 0.5;
    const xIndex = 3 * vId;
    NewPoints[xIndex] = x0[0] + t * (x1[0] - x0[0]);
    NewPoints[xIndex + 1] = x0[1] + t * (x1[1] - x0[1]);
    NewPoints[xIndex + 2] = x0[2] + t * (x1[2] - x0[2]);

    if (NeedGradients) {
      const g0 = new Array(3), g1 = new Array(3);
      computeBoundaryGradient(ijk0, sArray, 
        s0 + incs[0], s0 - incs[0], 
        s0 + incs[1], s0 - incs[1], 
        s0 + incs[2], s0 - incs[2], 
        g0);
      computeBoundaryGradient(ijk1, sArray, 
        s1 + incs[0], s1 - incs[0], 
        s1 + incs[1], s1 - incs[1], 
        s1 + incs[2], s1 - incs[2], 
        g1);

      const gTmp0 = g0[0] + t * (g1[0] - g0[0]);
      const gTmp1 = g0[1] + t * (g1[1] - g0[1]);
      const gTmp2 = g0[2] + t * (g1[2] - g0[2]);

      if (NewGradients) {
        const gIndex = 3 * vId;
        NewGradients[gIndex] = gTmp0;
        NewGradients[gIndex + 1] = gTmp1;
        NewGradients[gIndex + 2] = gTmp2;
      }

      if (NewNormals) {
        const n = [-gTmp0, -gTmp1, -gTmp2];
        vtkMath.normalize(n);

        const nIndex = 3 * vId;
        NewNormals[nIndex] = n[0];
        NewNormals[nIndex + 1] = n[1];
        NewNormals[nIndex + 2] = n[2];
      }
    } // if normals or gradients required

    if (InterpolateAttributes) {
      //const v0 = ijk0[0] + ijk0[1] * incs[1] + ijk0[2] * incs[2];
      //const v1 = ijk1[0] + ijk1[1] * incs[1] + ijk1[2] * incs[2];
      // XXX: NEED AN IMPLEMENTATION FOR THIS
      //Arrays.InterpolateEdge(v0, v1, t, vId);
    }
  };

  //------------------------------------------------------------------------------
  // Generate the output points and optionally normals, gradients and
  // interpolate attributes.
  const generatePoints = (value, loc, ijk, sArray, sIndex, incs, x, edgeUses, eIds) => {
    // Create a slightly faster path for voxel axes interior to the volume.
    const g0 = new Array(3);
    if (NeedGradients) {
      computeGradient(loc, ijk, sArray, 
        sIndex + incs[0], sIndex - incs[0], 
        sIndex + incs[1], sIndex - incs[1],
        sIndex + incs[2], sIndex - incs[2], 
        g0);
    }

    // Interpolate the cell axes edges
    for (let i = 0; i < 3; ++i) {
      if (edgeUses[i * 4]) {
        // edgesUses[0] == i axes edge
        // edgesUses[4] == j axes edge
        // edgesUses[8] == k axes edge
        const x1 = [...x];
        x1[i] += Spacing[i];
        const ijk1 = [...ijk];
        ++ijk1[i];

        const sIndex2 = sIndex + incs[i];
        const t = 0.5;
        interpolateAxesEdge(t, loc, x, sArray, sIndex2, incs, x1, eIds[i * 4], ijk, ijk1, g0);
      }
    }

		// On the boundary cells special work has to be done to cover the partial
		// cell axes. These are boundary situations where the voxel axes is not
		// fully formed. These situations occur on the +x,+y,+z volume
		// boundaries. (The other cases fall through the default: case which is
		// expected.)
		//
		// Note that loc is one of 27 regions in the volume, with (0,1,2)
    // indicating (interior, min, max) along coordinate axes.
		switch (loc)
		{
		case 2: case 6: case 18: case 22: //+x
			interpolateEdge(value, ijk, sArray, sIndex, incs, x, 5, edgeUses, eIds);
			interpolateEdge(value, ijk, sArray, sIndex, incs, x, 9, edgeUses, eIds);
			break;
		case 8: case 9: case 24: case 25: //+y
			interpolateEdge(value, ijk, sArray, sIndex, incs, x, 1, edgeUses, eIds);
			interpolateEdge(value, ijk, sArray, sIndex, incs, x, 10, edgeUses, eIds);
			break;
		case 32: case 33: case 36: case 37: //+z
			interpolateEdge(value, ijk, sArray, sIndex, incs, x, 2, edgeUses, eIds);
			interpolateEdge(value, ijk, sArray, sIndex, incs, x, 6, edgeUses, eIds);
			break;
		case 10: case 26: //+x +y
			interpolateEdge(value, ijk, sArray, sIndex, incs, x, 1, edgeUses, eIds);
			interpolateEdge(value, ijk, sArray, sIndex, incs, x, 5, edgeUses, eIds);
			interpolateEdge(value, ijk, sArray, sIndex, incs, x, 9, edgeUses, eIds);
			interpolateEdge(value, ijk, sArray, sIndex, incs, x, 10, edgeUses, eIds);
			interpolateEdge(value, ijk, sArray, sIndex, incs, x, 11, edgeUses, eIds);
			break;
		case 34: case 38: //+x +z
			interpolateEdge(value, ijk, sArray, sIndex, incs, x, 2, edgeUses, eIds);
			interpolateEdge(value, ijk, sArray, sIndex, incs, x, 5, edgeUses, eIds);
			interpolateEdge(value, ijk, sArray, sIndex, incs, x, 9, edgeUses, eIds);
			interpolateEdge(value, ijk, sArray, sIndex, incs, x, 6, edgeUses, eIds);
			interpolateEdge(value, ijk, sArray, sIndex, incs, x, 7, edgeUses, eIds);
			break;
		case 40: case 41: //+y +z
			interpolateEdge(value, ijk, sArray, sIndex, incs, x, 1, edgeUses, eIds);
			interpolateEdge(value, ijk, sArray, sIndex, incs, x, 2, edgeUses, eIds);
			interpolateEdge(value, ijk, sArray, sIndex, incs, x, 3, edgeUses, eIds);
			interpolateEdge(value, ijk, sArray, sIndex, incs, x, 6, edgeUses, eIds);
			interpolateEdge(value, ijk, sArray, sIndex, incs, x, 10, edgeUses, eIds);
			break;
		case 42: //+x +y +z happens no more than once per volume
			interpolateEdge(value, ijk, sArray, sIndex, incs, x, 1, edgeUses, eIds);
			interpolateEdge(value, ijk, sArray, sIndex, incs, x, 2, edgeUses, eIds);
			interpolateEdge(value, ijk, sArray, sIndex, incs, x, 3, edgeUses, eIds);
			interpolateEdge(value, ijk, sArray, sIndex, incs, x, 5, edgeUses, eIds);
			interpolateEdge(value, ijk, sArray, sIndex, incs, x, 9, edgeUses, eIds);
			interpolateEdge(value, ijk, sArray, sIndex, incs, x, 10, edgeUses, eIds);
			interpolateEdge(value, ijk, sArray, sIndex, incs, x, 11, edgeUses, eIds);
			interpolateEdge(value, ijk, sArray, sIndex, incs, x, 6, edgeUses, eIds);
			interpolateEdge(value, ijk, sArray, sIndex, incs, x, 7, edgeUses, eIds);
			break;
		default: //interior, or -x,-y,-z boundaries
			return;
		}
  };

  // Helper function to set up the point ids on voxel edges.
  const initVoxelIds = (eArray, eIndeces, eMDArray, eMDIndeces, eIds) => {
    const eCase = getEdgeCase(eArray, eIndeces);
    eIds[0] = eMDArray[eMDIndeces[0]]; // x-edges
    eIds[1] = eMDArray[eMDIndeces[1]];
    eIds[2] = eMDArray[eMDIndeces[2]];
    eIds[3] = eMDArray[eMDIndeces[3]];
    eIds[4] = eMDArray[eMDIndeces[0] + 1]; // y-edges
    eIds[5] = eIds[4] + EdgeUses[eCase][4];
    eIds[6] = eMDArray[eMDIndeces[2] + 1];
    eIds[7] = eIds[6] + EdgeUses[eCase][6];
    eIds[8] = eMDArray[eMDIndeces[0] + 2]; // z-edges
    eIds[9] = eIds[8] + EdgeUses[eCase][8];
    eIds[10] = eMDArray[eMDIndeces[1] + 2];
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
    let rowIndex, sliceIndex = slice * Inc2;      
    for (; slice < end; ++slice) {
      for (row = 0, rowIndex = sliceIndex; row < Dims[1]; ++row) {
        processXEdge(value, Scalars, rowIndex, row, slice);
        rowIndex += Inc1;
      } // for all rows in this slice
      sliceIndex += Inc2;
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
    let eMDIndex0 = slice * 6 * Dims[1];
    let eMDIndex1 = eMDIndex0 + 6 * Dims[1];
    let rowIndex, sliceIndex = slice * Inc2;
    for (; slice < end; ++slice) {
      // It's possible to skip entire slices if there is nothing to generate
      if (EdgeMetaData[eMDIndex1 + 3] > EdgeMetaData[eMDIndex0 + 3]) { // there are triangle primitives!
        for (row = 0, rowIndex = sliceIndex; row < Dims[1] - 1; ++row) {
          generateOutput(value, Scalars, rowIndex, row, slice);
          rowIndex += Inc1;
        } // for all rows in this slice
      }   // if there are triangles
      sliceIndex += Inc2;
      eMDIndex0 = eMDIndex1;
      eMDIndex1 = eMDIndex0 + 6 * Dims[1];
    } // for all slices in this batch
  };

  function initializeAlgorithm() {
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
    let edge, edgeIndex;
    let edgeCase, edgeCaseIndex;

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
                edgeCase[edgeCaseIndex] = EdgeMap[edge[edgeIndex]];
                edgeCase[edgeCaseIndex + 1] = EdgeMap[edge[edgeIndex + 1]];
                edgeCase[edgeCaseIndex + 2] = EdgeMap[edge[edgeIndex + 2]];
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

  // Main function called externally
  return {
    contour: (
      model, input, newPts, newTris, newScalars, newNormals, newGradients
    ) => {
      const inScalars = input.getPointData().getScalars();
      const extent = input.getExtent();
      const incs = input.computeIncrements(input.getExtent(), 1);
      const scalars = inScalars.getData();
      
      let value;
      const values = model.values;
      const numContours = values.length;
      let vidx, row, slice, eMD, zInc;
      let numOutXPts, numOutYPts, numOutZPts, numOutTris;
      let numXPts = 0, numYPts = 0, numZPts = 0, numTris = 0;
      let startXPts = 0, startYPts = 0, startZPts = 0, startTris = 0;

      // This may be subvolume of the total 3D image. Capture information for
      // subsequent processing.
      Scalars = scalars;
      Origin = input.getOrigin();
      Spacing = input.getSpacing();
      Min0 = extent[0];
      Max0 = extent[1];
      Inc0 = incs[0];
      Min1 = extent[2];
      Max1 = extent[3];
      Inc1 = incs[1];
      Min2 = extent[4];
      Max2 = extent[5];
      Inc2 = incs[2];
      adjustOrigin();

      // Now allocate working arrays. The XCases array tracks x-edge cases.
      Dims[0] = Max0 - Min0 + 1;
      Dims[1] = Max1 - Min1 + 1;
      Dims[2] = Max2 - Min2 + 1;
      NumberOfEdges = Dims[1] * Dims[2];
      SliceOffset = (Dims[0] - 1) * Dims[1];
      XCases = new Uint8Array((Dims[0] - 1) * NumberOfEdges);

      // Also allocate the characterization (metadata) array for the x edges.
      // This array tracks the number of x-, y- and z- intersections on the voxel
      // axes along an x-edge; as well as the number of the output triangles, and
      // the xMin_i and xMax_i (minimum index of first intersection, maximum
      // index of intersection for the ith x-row, the so-called trim edges used
      // for computational trimming).
      EdgeMetaData = new Uint32Array(NumberOfEdges * 6);

      // Interpolating attributes and other stuff. Interpolate extra attributes only if they
      // exist and the user requests it.
      NeedGradients = (newGradients || newNormals);
      InterpolateAttributes = false;
        // XXX: Check this
        //self->GetInterpolateAttributes() && input->GetPointData()->GetNumberOfArrays() > 1;

      
      const checkArrays = (name, a1, a2) => {
        const diff = a1.reduce((diff, v, i) => {
          if (a1[i] !== a2[i]) diff.push(i)
          return diff;
        }, []);

        if (diff.length > 0) {
          console.log(`${ name }: ${ diff }`);
          console.log(a1);
          console.log(a2);
        }
        else {
          console.log(`${ name }: No diffs`);
        }
      };

      const checkArrays2D = (name, a1, a2) => {
        const diff = a1.reduce((diff, v, i) => {
          a1[i].forEach((v, j) => {
            if (a1[i][j] !== a2[i][j]) diff.push(i);
          });
          return diff;
        }, []);

        if (diff.length > 0) {
          console.log(`${ name }: ${ diff }`);
          console.log(a1);
          console.log(a2);
        }
        else {
          console.log(`${ name }: No diffs`);
        }
      };

      checkArrays2D('EdgeCases', regionTest.EdgeCases, EdgeCases);
      checkArrays('EdgeMap', regionTest.EdgeMap, EdgeMap);
      checkArrays2D('VertMap', regionTest.VertMap, VertMap);
      checkArrays2D('VertOffsets', regionTest.VertOffsets, VertOffsets);
      checkArrays2D('EdgeUses',regionTest.EdgeUses, EdgeUses);
      checkArrays('IncludesAxes', regionTest.IncludesAxes, IncludesAxes);

      // Loop across each contour value. This encompasses all three passes.
      for (vidx = 0; vidx < numContours; vidx++) {        
        value = values[vidx];

        // PASS 1: Traverse all x-rows building edge cases and counting number of
        // intersections (i.e., accumulate information necessary for later output
        // memory allocation, e.g., the number of output points along the x-rows
        // are counted).
        pass1(value, 0, Dims[2]);

        checkArrays('EdgeMetaDataPass1', regionTest.EdgeMetaDataPass1, EdgeMetaData.slice());

        // PASS 2: Traverse all voxel x-rows and process voxel y&z edges.  The
        // result is a count of the number of y- and z-intersections, as well as
        // the number of triangles generated along these voxel rows.
        pass2(0, Dims[2] - 1);

        checkArrays('EdgeMetaDataPass2', regionTest.EdgeMetaData, EdgeMetaData.slice());

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
          for (row = 0; row < Dims[1]; ++row) {
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
        const totalPts = numOutXPts + numOutYPts + numOutZPts;

        if (totalPts > 0) {
          newPts.length = 3 * totalPts;
          NewPoints = newPts;
          newTris.length = 4 * numOutTris;
          NewTris = newTris;
          if (newScalars) {
            newScalars.length = totalPts;
            NewScalars = newScalars;
            NewScalars.fill(value);
          }              
          if (newGradients) {
            newGradients.length = 3 * totalPts;
            NewGradients = newGradients;
          }
          if (newNormals) {
            newNormals.length = 3 * totalPts;
            NewNormals = newNormals;
          }
          // XXX: WORRY ABOUT THIS LATER
          /*
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

          checkArrays('XCases', regionTest.XCases, XCases);
          checkArrays('EdgeMetaData', regionTest.EdgeMetaData, EdgeMetaData);


        } // if anything generated

        // Handle multiple contours
        startXPts = numOutXPts;
        startYPts = numOutYPts;
        startZPts = numOutZPts;
        startTris = numOutTris;
      } // for all contour values

      //console.log(NewPoints);
      //for (let i = 0; i < NewPoints.length / 3; i++) {
      //  console.log(i + ": ", NewPoints[i * 3], NewPoints[i * 3 + 1], NewPoints[i * 3 + 2]);
      //}
      //console.log(NewTris);
    }
  };
}