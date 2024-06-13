import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js'
import { OBJExporter } from 'three/examples/jsm/exporters/OBJExporter'

import * as BufferGeometryUtils from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import * as dat from 'three/examples/jsm/libs/lil-gui.module.min.js'
import { EdgeMap, Smooth } from './tools/Smooth'

let scene = new THREE.Scene(),
   camera,
   width,
   height,
   renderer,
   controls,
   crownCap,
   crownBase,
   bridge,
   normalHelper,
   crownTop
let showCrownControl
const material = new THREE.MeshPhongMaterial({
   color: 0xece5b8,
   side: THREE.DoubleSide,
   shininess: 30,
   specular: 0x333333,
   // wireframe: true,
})
window.addEventListener('load', init)
function init() {
   createScene()
   createLights()
   loadModel()
   createGUI()
   animate()
}
let strength = 0.1
const smoothIndices = []
const connectIndices = []
const params = {
   showCrown: true,
   showBase: true,
   wireframe: false,
   strength,
   smooth: () => {
      if (bridge) {
         Smooth(bridge, 20, params.strength, smoothIndices)
      } else {
         if (!bridge) Smooth(crownCap, 10, params.strength / 2)
      }
   },
   smoothConnect: () => {
      Smooth(bridge, 50, params.strength, connectIndices)
   },
   smoothTop: () => {
      if (bridge) {
         Smooth(bridge, 50, params.strength)
      }
   },
   match: () => {
      match(crownCap, crownBase)
   },
   showNormal: true,
   export: () => exportModel(scene, 'scene.obj'),
}
function mergeCrown() {
   // 将两个网格合并到新的几何体中
   // 创建一个新的 BufferGeometry 来存储合并后的结果
   let mergedGeometry = new THREE.BufferGeometry()

   // 将两个网格合并到新的 BufferGeometry 中
   mergedGeometry.setAttribute(
      'position',
      new THREE.BufferAttribute(
         new Float32Array([
            ...bridge.geometry.attributes.position.array,
            ...crownCap.geometry.attributes.position.array,
         ]),
         3,
      ),
   )
   // 合并索引数组
   const indices = new Uint16Array([
      ...bridge.geometry.index.array,
      ...crownCap.geometry.index.array.map(
         (i) => i + bridge.geometry.attributes.position.count,
      ),
   ])
   mergedGeometry.setIndex(new THREE.BufferAttribute(indices, 1))

   mergedGeometry.computeVertexNormals()

   // 创建一个新的网格并将其添加到场景中
   mergedGeometry = mergeVertices(mergedGeometry)
   crownTop = new THREE.Mesh(mergedGeometry, material)
   scene.add(crownTop)
   crownCap.visible = false
   bridge.visible = false
}
// 合并重合的顶点
function mergeVertices(geometry, tolerance = 0.00001) {
   const vertices = geometry.attributes.position.array
   const indices = geometry.index.array

   const newVertices = []
   const newIndices = []

   const vertexMap = new Map()
   const precision = Math.pow(10, Math.round(Math.log10(1 / tolerance)))

   for (let i = 0; i < vertices.length; i += 3) {
      const x = Math.round(vertices[i] * precision) / precision
      const y = Math.round(vertices[i + 1] * precision) / precision
      const z = Math.round(vertices[i + 2] * precision) / precision

      const key = `${x}_${y}_${z}`

      if (!vertexMap.has(key)) {
         vertexMap.set(key, newVertices.length / 3)
         newVertices.push(vertices[i], vertices[i + 1], vertices[i + 2])
      }
   }

   for (let i = 0; i < indices.length; i++) {
      const oldIndex = indices[i]
      const x = Math.round(vertices[oldIndex * 3] * precision) / precision
      const y = Math.round(vertices[oldIndex * 3 + 1] * precision) / precision
      const z = Math.round(vertices[oldIndex * 3 + 2] * precision) / precision

      const key = `${x}_${y}_${z}`
      const newIndex = vertexMap.get(key)

      newIndices.push(newIndex)
   }

   const newGeometry = new THREE.BufferGeometry()
   newGeometry.setAttribute(
      'position',
      new THREE.Float32BufferAttribute(newVertices, 3),
   )
   newGeometry.setIndex(newIndices)
   newGeometry.computeVertexNormals() // 重新计算法线

   return newGeometry
}

function exportModel(object, filename) {
   const exporter = new OBJExporter()
   const objData = exporter.parse(object)

   const link = document.createElement('a')
   link.style.display = 'none'
   document.body.appendChild(link)

   const blob = new Blob([objData], { type: 'text/plain' })
   const url = URL.createObjectURL(blob)
   link.href = url
   link.download = filename
   link.click()

   document.body.removeChild(link)
   URL.revokeObjectURL(url)
}

function match(source, target) {
   let edgeMapSource = source.geometry.edgeMap.slice()
   let edgeMapTarget = target.geometry.edgeMap.slice()

   if (edgeMapSource.length > edgeMapTarget.length) {
      const num = edgeMapSource.length - edgeMapTarget.length
      edgeMapTarget = duplicateValues(edgeMapTarget, num)
   } else {
      const num = edgeMapTarget.length - edgeMapSource.length
      edgeMapSource = duplicateValues(edgeMapSource, num)
   }
   console.log(edgeMapSource.length, edgeMapTarget.length)

   const positionsSource = source.geometry.attributes.position.array
   const positionsTarget = target.geometry.attributes.position.array
   const normalsSource = source.geometry.attributes.normal.array
   const normalsTarget = target.geometry.attributes.normal.array

   //find near map
   const index = edgeMapSource[0] * 3
   let closestIndex = -1
   const vertexSource = new THREE.Vector3(
      positionsSource[index],
      positionsSource[index + 1],
      positionsSource[index + 2],
   )
   let closetDistance = 1000
   for (const [idx, j] of edgeMapTarget.entries()) {
      const id = j * 3
      const vertexTarget = new THREE.Vector3(
         positionsTarget[id],
         positionsTarget[id + 1],
         positionsTarget[id + 2],
      )
      const distance = vertexSource.distanceTo(vertexTarget)
      if (distance < closetDistance) {
         closetDistance = distance
         closestIndex = idx
      }
   }
   const movedItems = edgeMapTarget.slice(closestIndex)
   const nearMap = movedItems.concat(edgeMapTarget.slice(0, closestIndex))

   // 此处代码需要优化
   nearMap.reverse()

   //generate vertex cloud
   const positions = Array.from(positionsSource)

   const indices = Array.from(source.geometry.index.array)
   // console.log('before:', positions, indices)
   const indicesBridge = []
   let lastId = positions.length / 3 - 1

   const gap = 0.1

   for (const [idx, i] of edgeMapSource.entries()) {
      const index = i * 3
      const vertexSource = new THREE.Vector3(
         positionsSource[index],
         positionsSource[index + 1],
         positionsSource[index + 2],
      )
      const normalSource = new THREE.Vector3(
         normalsSource[index],
         normalsSource[index + 1],
         normalsSource[index + 2],
      )
      const id = nearMap[idx] * 3
      const vertexTarget = new THREE.Vector3(
         positionsTarget[id],
         positionsTarget[id + 1],
         positionsTarget[id + 2],
      )
      const normalTarget = new THREE.Vector3(
         normalsTarget[id],
         normalsTarget[id + 1],
         normalsTarget[id + 2],
      )

      // 将顶点坐标转换为世界坐标
      vertexSource.applyMatrix4(source.matrixWorld)
      vertexTarget.applyMatrix4(target.matrixWorld)
      const distance = vertexSource.distanceTo(vertexTarget)
      const numPoints = Math.round(distance / gap)

      // generate upper 0.3
      let A = vertexSource.clone()
      let t = 0.5
      let AB = vertexTarget.clone().sub(vertexSource).multiplyScalar(t)

      let S = new THREE.Vector3().crossVectors(AB, normalSource)
      let CS = new THREE.Vector3().crossVectors(S, AB).normalize()

      let N = normalSource.clone().lerp(CS, 0)
      // 计算BC的方向向量，通过AB和N的叉积
      let M = new THREE.Vector3().crossVectors(N, AB)
      let AC_normal = new THREE.Vector3().crossVectors(N, M)

      let AC = AC_normal.multiplyScalar(getK(AB.clone().negate(), AC_normal))
      // 计算C点的坐标
      const C1 = new THREE.Vector3().addVectors(A, AC)

      //generate lower 0.3
      t = 0.25
      A = vertexTarget.clone()
      AB = vertexSource.clone().sub(vertexTarget).multiplyScalar(t)

      S = new THREE.Vector3().crossVectors(AB, normalTarget)
      CS = new THREE.Vector3().crossVectors(S, AB).normalize()

      N = normalTarget.clone().lerp(CS, t)
      // 计算BC的方向向量，通过AB和N的叉积
      M = new THREE.Vector3().crossVectors(N, AB)
      AC_normal = new THREE.Vector3().crossVectors(N, M)

      AC = AC_normal.multiplyScalar(getK(AB.clone().negate(), AC_normal))
      // 计算C点的坐标
      const C2 = new THREE.Vector3().addVectors(A, AC)

      // 创建样条曲线
      // let curve = new THREE.CatmullRomCurve3([
      //    vertexSource,
      //    C1,
      //    // C2,
      //    vertexTarget,
      // ])
      let curve = new THREE.QuadraticBezierCurve3(
         vertexSource,
         C1,
         // C2,
         vertexTarget,
      )

      // 获取曲线上插值点
      let points = curve.getPoints(numPoints)
      indicesBridge[idx] = []
      indicesBridge[idx][0] = i
      // smoothIndices.push(i * 3)
      connectIndices.push(i * 3)
      for (let j = 1; j < points.length; j++) {
         indicesBridge[idx].push(++lastId)
         if (j !== points.length - 1) smoothIndices.push(lastId * 3)
         positions.push(points[j].x, points[j].y, points[j].z)
      }
   }
   console.log(smoothIndices, indicesBridge.slice().flat())
   // console.log('after:', positions, indicesBridge.slice().flat())
   const geometry = generateGeometry(positions, indicesBridge, indices)

   bridge = new THREE.Mesh(geometry, material)
   scene.add(bridge)
   crownCap.visible = false
   showCrownControl.setValue(false)
   // normalHelper = createNormalHelper(geometry)
   // scene.add(normalHelper)
}
function generateGeometry(positions, indicesBridge, indices) {
   for (let i = 0; i < indicesBridge.length; i++) {
      // if (i === 1) break
      const indicesA = indicesBridge[i]
      const indicesB =
         i === indicesBridge.length - 1
            ? indicesBridge[0]
            : indicesBridge[i + 1]

      let last = 0
      const lenA = indicesA.length

      for (let m = 0; m < lenA - 1; m++) {
         // if (m === lenA - 3) break //only for test
         const idA = indicesA[m] * 3

         const vertexA = new THREE.Vector3(
            positions[idA],
            positions[idA + 1],
            positions[idA + 2],
         )
         const vertexC = new THREE.Vector3(
            positions[idA + 3],
            positions[idA + 4],
            positions[idA + 5],
         )
         let closestIndex = -1,
            closestDistance = 1000
         for (let n = 0; n < indicesB.length; n++) {
            const idB = indicesB[n] * 3
            const vertexB = new THREE.Vector3(
               positions[idB],
               positions[idB + 1],
               positions[idB + 2],
            )
            const distance =
               vertexA.distanceTo(vertexB) + vertexC.distanceTo(vertexB)
            if (distance < closestDistance) {
               closestDistance = distance
               closestIndex = n
            }
         }

         const v1 = indicesA[m]
         const v2 = indicesB[closestIndex]
         const v3 = indicesA[m + 1]
         indices.push(v3, v2, v1)
         let p = closestIndex
         while (p !== last) {
            const v0 = indicesB[p]
            const vt = indicesB[--p]
            indices.push(v1, v0, vt)
         }
         last = closestIndex
      }
      if (last !== indicesB.length - 1) {
         let p = last
         while (p !== indicesB.length - 1) {
            const v0 = indicesB[p]
            const vt = indicesB[++p]
            const v1 = indicesA[lenA - 1]
            indices.push(v1, vt, v0)
         }
      }
   }
   const geometry = new THREE.BufferGeometry()
   geometry.setAttribute(
      'position',
      new THREE.BufferAttribute(new Float32Array(positions.flat()), 3),
   )

   // 设置几何体的索引
   geometry.setIndex(indices)
   geometry.computeVertexNormals()

   return geometry
}
function getK(c, a0) {
   const cMagnitude = c.length()
   const dotProduct = a0.dot(c)
   return (-cMagnitude * cMagnitude) / dotProduct
}
function duplicateValues(arr, n) {
   // 计算需要挑选值的索引
   const step = Math.floor(arr.length / n)
   const indicesToDuplicate = []
   for (let i = 0; i < n; i++) {
      indicesToDuplicate.push(i * step)
   }

   // 在这些索引处插入新值
   for (let i = indicesToDuplicate.length - 1; i >= 0; i--) {
      arr.splice(indicesToDuplicate[i] + 1, 0, arr[indicesToDuplicate[i]])
   }

   return arr
}
function removeUniformly(positions, n) {
   // 检查数组长度是否小于要删除的项数
   const length = positions.length
   if (length < n) {
      return positions
   }

   const stepSize = Math.floor(length / n)
   const selectedIndices = []
   const result = []

   // 选择需要保留的点的索引
   for (let i = 0; i < n; i++) {
      selectedIndices.push(i * stepSize)
   }

   // 遍历原始数组,只保留未被选中的点
   for (let i = 0; i < length; i++) {
      if (!selectedIndices.includes(i)) {
         result.push(positions[i])
      }
   }

   return result
}
function createScene() {
   width = window.innerWidth
   height = window.innerHeight

   const scaleRatio = 80
   // camera
   // camera = new THREE.PerspectiveCamera(30, width / height, 1, 10000)
   camera = new THREE.OrthographicCamera(
      (width / scaleRatio) * -1, // 左边界
      width / scaleRatio, // 右边界
      height / scaleRatio, // 上边界
      (height / scaleRatio) * -1, // 下边界
      0.1, // 近平面距离
      1000, // 远平面距离
   )

   camera.position.set(0, 100, 50)
   scene.add(camera)

   //renderer
   const canvas = document.querySelector('#world')
   renderer = new THREE.WebGLRenderer({
      antialias: true,
      // alpha: true,
      canvas,
   })
   renderer.setClearColor(0x393939, 1)
   renderer.setSize(width, height)

   // orbit control
   camera.up.set(0, 0, 1)
   controls = new OrbitControls(camera, canvas)
   controls.mouseButtons.LEFT = null
   controls.mouseButtons.MIDDLE = 0

   controls.update()
}
function createGUI() {
   const gui = new dat.GUI()

   gui.add(params, 'match').name('match')
   gui.add(params, 'strength', 0.01, 1, 0.01).onChange(() => {
      strength = params.strength
   })

   showCrownControl = gui.add(params, 'showCrown').onChange(() => {
      crownCap.visible = params.showCrown
   })
   gui.add(params, 'showBase').onChange(() => {
      crownBase.visible = params.showBase
   })
   // gui.add(params, 'showNormal').onChange(() => {
   //    if (normalHelper) normalHelper.visible = params.showNormal
   // })
   gui.add(params, 'wireframe').onChange(() => {
      if (params.wireframe) {
         material.wireframe = true
      } else {
         material.wireframe = false
      }
   })
   gui.add(params, 'smooth').name('smooth')
   gui.add(params, 'smoothConnect').name('smoothConnect')
   gui.add(params, 'smoothTop').name('smoothTop')
   gui.add(params, 'export').name('export')
}
function loadModel() {
   //add stl files
   const stlLoader = new STLLoader()

   stlLoader.load('/crownBase.stl', function (geometry) {
      geometry.deleteAttribute('normal')
      geometry = BufferGeometryUtils.mergeVertices(geometry)
      geometry.computeVertexNormals()

      EdgeMap(geometry)

      crownBase = new THREE.Mesh(geometry, material)
      scene.add(crownBase)
      // crownBase.position.x += 2
      // const normalHelper = createNormalHelper(geometry)
      // scene.add(normalHelper)
   })

   stlLoader.load('/crownCap.stl', function (geometry) {
      geometry.deleteAttribute('normal')
      geometry = BufferGeometryUtils.mergeVertices(geometry)
      geometry.computeVertexNormals()
      EdgeMap(geometry)

      crownCap = new THREE.Mesh(geometry, material)
      scene.add(crownCap)
   })
}
function createNormalHelper(geometry) {
   const normalLength = 0.1 // 法线向量的长度
   const normalColor = [0.15, 0.4, 1] // 法线向量的颜色

   const normalGeometry = new THREE.BufferGeometry()
   const normalVertices = []
   const normalColors = []

   const positions = geometry.attributes.position.array
   const normals = geometry.attributes.normal.array

   for (let i = 0; i < positions.length; i += 3) {
      normalVertices.push(
         positions[i],
         positions[i + 1],
         positions[i + 2],
         positions[i] + normals[i] * normalLength,
         positions[i + 1] + normals[i + 1] * normalLength,
         positions[i + 2] + normals[i + 2] * normalLength,
      )

      normalColors.push(...normalColor, ...normalColor)
   }

   normalGeometry.setAttribute(
      'position',
      new THREE.BufferAttribute(new Float32Array(normalVertices), 3),
   )
   normalGeometry.setAttribute(
      'color',
      new THREE.BufferAttribute(new Float32Array(normalColors), 3),
   )

   return new THREE.LineSegments(
      normalGeometry,
      new THREE.LineBasicMaterial({
         vertexColors: true,
         transparent: true,
         opacity: 0.7,
      }),
   )
}
function createLights() {
   const ambientLight = new THREE.AmbientLight(0xffffff, 0.1)
   scene.add(ambientLight)
   const sunlight = new THREE.DirectionalLight(0xffffff, 2)
   const sunlight2 = new THREE.DirectionalLight(0x8f858f, 0.5)
   const sunlight3 = new THREE.DirectionalLight(0x879399, 0.75)

   sunlight.position.set(0, 0.7, 1)
   sunlight2.position.set(1, -0.5, 0)
   sunlight3.position.set(-1, -0.5, 0)

   sunlight.target = camera
   sunlight2.target = camera
   sunlight3.target = camera

   // 将光源添加到相机中
   camera.add(sunlight, sunlight2, sunlight3)
}

function animate() {
   renderer.render(scene, camera)
   requestAnimationFrame(animate)
}
