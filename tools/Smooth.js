import * as THREE from 'three'

// Assumes you have a THREE.js scene set up with a mesh named 'mesh'
// Function to apply Laplace smoothing to a mesh
export function Smooth(mesh, iterations = 1, lambda = 0.5, vertexIndices) {
   const geometry = mesh.geometry

   const positions = geometry.attributes.position.array
   if (!geometry.edgeMap) {
      EdgeMapNoOrder(geometry)
   }
   const edgeMap = geometry.edgeMap

   if (!vertexIndices) {
      vertexIndices = []
      for (let i = 0; i < positions.length; i += 3) {
         if (!edgeMap.includes(i / 3)) vertexIndices.push(i)
      }
   }

   if (!geometry.neighborMap) {
      NeighborMap(geometry)
   }
   const neighborMap = geometry.neighborMap

   // Apply smoothing iterations
   for (let iter = 0; iter < iterations; iter++) {
      for (let i = 0; i < vertexIndices.length; i++) {
         const index = vertexIndices[i]
         const vertex = new THREE.Vector3(
            positions[index],
            positions[index + 1],
            positions[index + 2],
         )
         const neighbors = neighborMap[index / 3]
         const average = new THREE.Vector3()

         neighbors.forEach((neighborIndex) => {
            const ni = neighborIndex * 3
            average.add(
               new THREE.Vector3(
                  positions[ni],
                  positions[ni + 1],
                  positions[ni + 2],
               ),
            )
         })

         average.divideScalar(neighbors.length)
         vertex.lerp(average, lambda)

         positions[index] = vertex.x
         positions[index + 1] = vertex.y
         positions[index + 2] = vertex.z
      }
   }
   geometry.computeVertexNormals()

   geometry.attributes.position.needsUpdate = true
}
// Create a map of vertex neighbors
export function NeighborMap(geometry) {
   if (geometry.constructor === THREE.Mesh) {
      geometry = geometry.geometry
   }
   let neighborMap = {}
   geometry.index.array.forEach((index, i, indices) => {
      const vA = indices[i * 3]
      const vB = indices[i * 3 + 1]
      const vC = indices[i * 3 + 2]

      if (!neighborMap[vA]) neighborMap[vA] = []
      if (!neighborMap[vB]) neighborMap[vB] = []
      if (!neighborMap[vC]) neighborMap[vC] = []

      neighborMap[vA].push(vB, vC)
      neighborMap[vB].push(vA, vC)
      neighborMap[vC].push(vA, vB)
   })
   geometry.neighborMap = neighborMap
}
export function EdgeMapNoOrder(geometry) {
   if (geometry.constructor === THREE.Mesh) {
      geometry = geometry.geometry
   }
   const index = geometry.index.array
   const edgeMap = {}
   const edgeVertices = new Set()

   // Helper function to add an edge to the edgeMap
   function addEdge(v1, v2) {
      const key = `${Math.min(v1, v2)}_${Math.max(v1, v2)}`
      if (edgeMap[key]) {
         edgeMap[key]++
      } else {
         edgeMap[key] = 1
      }
   }

   // Traverse each face and record its edges
   for (let i = 0; i < index.length; i += 3) {
      const vA = index[i]
      const vB = index[i + 1]
      const vC = index[i + 2]

      addEdge(vA, vB)
      addEdge(vB, vC)
      addEdge(vC, vA)
   }

   // Identify edge vertices
   for (const edge in edgeMap) {
      if (edgeMap[edge] === 1) {
         // Edge appears only once, it's a boundary edge
         const [v1, v2] = edge.split('_').map(Number)
         edgeVertices.add(v1)
         edgeVertices.add(v2)
      }
   }
   geometry.edgeMap = Array.from(edgeVertices)
}
export function EdgeMap(geometry) {
   if (geometry.constructor === THREE.Mesh) {
      geometry = geometry.geometry
   }
   console.log('checking edge map')
   const index = geometry.index.array
   const edgeMap = {}
   const edgeVertices = new Set()

   // Helper function to add an edge to the edgeMap
   function addEdge(v1, v2) {
      const key = `${Math.min(v1, v2)}_${Math.max(v1, v2)}`
      if (edgeMap[key]) {
         edgeMap[key]++
      } else {
         edgeMap[key] = 1
      }
   }

   // Traverse each face and record its edges
   for (let i = 0; i < index.length; i += 3) {
      const vA = index[i]
      const vB = index[i + 1]
      const vC = index[i + 2]

      addEdge(vA, vB)
      addEdge(vB, vC)
      addEdge(vC, vA)
   }

   // Identify edge vertices
   const oneEdgeMap = []
   for (const edge in edgeMap) {
      if (edgeMap[edge] === 1) {
         // Edge appears only once, it's a boundary edge
         const [v1, v2] = edge.split('_').map(Number)
         // edgeVertices.add(v1)
         // edgeVertices.add(v2)
         oneEdgeMap.push([v1, v2])
      }
   }
   edgeVertices.add(oneEdgeMap[0][0])
   edgeVertices.add(oneEdgeMap[0][1])
   const start = oneEdgeMap[0][0]
   let target = oneEdgeMap[0][1]

   const total = oneEdgeMap.length
   let count = 0
   oneEdgeMap.splice(0, 1)
   while (target !== start) {
      let find = false
      for (let i = 0; i < oneEdgeMap.length; i++) {
         if (oneEdgeMap[i][0] === target) {
            target = oneEdgeMap[i][1]
            edgeVertices.add(target)
            oneEdgeMap.splice(i, 1)
            // console.log('find')
            find = true
            break
         } else if (oneEdgeMap[i][1] === target) {
            target = oneEdgeMap[i][0]
            edgeVertices.add(target)
            oneEdgeMap.splice(i, 1)
            // console.log('find')
            find = true
            break
         }
      }
      // if (find) console.log('find')
      // else console.log('not find')
      count++
      if (count >= total) {
         console.log('checking edge map error')
         break
      }
   }
   geometry.edgeMap = Array.from(edgeVertices)
   console.log('finish check edge map')
}
