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
   brigde

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
let strength = 0.5
const params = {
   showCrown: true,
   showBase: true,
   wireframe: false,
   strength,
   smooth: () => {
      Smooth(brigde, 10, 0.1)
      brigde.geometry.deleteAttribute('normal')
   },
   match: () => {
      match(crownCap, crownBase)
   },
   export: () => exportModel(scene, 'scene.obj'),
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
      edgeMapSource = removeRandomItems(edgeMapSource, num)
   } else {
      const num = edgeMapTarget.length - edgeMapSource.length
      edgeMapTarget = removeRandomItems(edgeMapTarget, num)
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
   const positions = []
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

      let N = normalSource.clone().lerp(CS, t)
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
      let curve = new THREE.CatmullRomCurve3([
         vertexSource,
         C1,
         // C2,
         vertexTarget,
      ])

      // 获取曲线上插值点
      let points = curve.getPoints(numPoints)
      positions[idx] = []
      for (let j = 0; j < points.length; j++) {
         positions[idx].push(points[j].x, points[j].y, points[j].z)
      }
   }

   const geometry = generateGeometry(positions)

   brigde = new THREE.Mesh(geometry, material)
   scene.add(brigde)
}
function generateGeometry(positions) {
   let indexBefore = 0
   const indices = []
   for (let i = 0; i < positions.length; i++) {
      // if (i === 1) break
      const posA = positions[i]
      const posB = i === positions.length - 1 ? positions[0] : positions[i + 1]
      let last = 0
      const lenA = posA.length
      const startB = i === positions.length - 1 ? 0 : indexBefore + lenA
      for (let m = 0; m < lenA; m += 3) {
         if (m === lenA - 3) break
         const vertexA = new THREE.Vector3(posA[m], posA[m + 1], posA[m + 2])
         const vertexC = new THREE.Vector3(
            posA[m + 3],
            posA[m + 4],
            posA[m + 5],
         )
         let closestIndex = -1,
            closestDistance = 1000
         for (let n = 0; n < posB.length; n += 3) {
            const vertexB = new THREE.Vector3(posB[n], posB[n + 1], posB[n + 2])
            const distance =
               vertexA.distanceTo(vertexB) + vertexC.distanceTo(vertexB)
            if (distance < closestDistance) {
               closestDistance = distance
               closestIndex = n
            }
         }

         const v1 = (indexBefore + m) / 3
         const v2 = (startB + closestIndex) / 3
         const v3 = (indexBefore + m + 3) / 3
         indices.push(v1, v2, v3)
         let p = closestIndex
         while (p !== last) {
            const v0 = (startB + p) / 3
            const vt = (startB + p - 3) / 3
            indices.push(v0, vt, v1)
            p -= 3
         }
         last = closestIndex
      }
      if (last !== posB.length - 3) {
         let p = last
         while (p !== posB.length - 3) {
            const v0 = (startB + p) / 3
            const vt = (startB + p + 3) / 3
            const v1 = (indexBefore + lenA - 3) / 3
            indices.push(v0, vt, v1)
            p += 3
         }
      }
      indexBefore += lenA
   }
   const geometry = new THREE.BufferGeometry()
   geometry.setAttribute(
      'position',
      new THREE.BufferAttribute(new Float32Array(positions.flat()), 3),
   )
   // 设置几何体的索引
   geometry.setIndex(indices)

   // 计算法线
   // geometry.computeVertexNormals()
   return geometry
}
function getK(c, a0) {
   const cMagnitude = c.length()
   const dotProduct = a0.dot(c)
   return (-cMagnitude * cMagnitude) / dotProduct
}

function removeRandomItems(arr, numToRemove) {
   // 检查数组长度是否小于要删除的项数
   if (arr.length < numToRemove) {
      return arr
   }
   console.log(arr.length)
   // 创建一个新数组用来存储要删除的索引
   const indexesToRemove = []

   // 随机选择要删除的 3 个项的索引
   while (indexesToRemove.length < numToRemove) {
      const randomIndex = Math.floor(Math.random() * arr.length)
      if (!indexesToRemove.includes(randomIndex)) {
         indexesToRemove.push(randomIndex)
      }
   }

   // 从后往前删除数组项,保证索引不受影响
   indexesToRemove
      .sort((a, b) => b - a)
      .forEach((index) => {
         arr.splice(index, 1)
      })
   console.log(arr.length)
   return arr
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

   gui.add(params, 'showCrown').onChange(() => {
      crownCap.visible = params.showCrown
   })
   gui.add(params, 'showBase').onChange(() => {
      crownBase.visible = params.showBase
   })

   gui.add(params, 'wireframe').onChange(() => {
      if (params.wireframe) {
         material.wireframe = true
      } else {
         material.wireframe = false
      }
   })
   gui.add(params, 'smooth').name('smooth')
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
