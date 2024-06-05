import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js'

import * as BufferGeometryUtils from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import * as dat from 'three/examples/jsm/libs/lil-gui.module.min.js'
import { EdgeMap } from './tools/Smooth'

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
   match: () => {
      match(crownCap, crownBase)
   },
}

function match(source, target) {
   let edgeMapSource = source.geometry.edgeMap.slice()
   let edgeMapTarget = target.geometry.edgeMap.slice()

   // if (edgeMapSource.length > edgeMapTarget.length) {
   //    const num = edgeMapSource.length - edgeMapTarget.length
   //    edgeMapSource = removeRandomItems(edgeMapSource, num)
   //    console.log(edgeMapSource.length, edgeMapTarget.length)
   // } else {
   //    const num = edgeMapTarget.length - edgeMapSource.length
   //    edgeMapTarget = removeRandomItems(edgeMapTarget, num)
   // }

   const positionsSource = source.geometry.attributes.position.array
   const positionsTarget = target.geometry.attributes.position.array
   const normalsSource = source.geometry.attributes.normal.array
   const normalsTarget = target.geometry.attributes.normal.array

   //find near map
   const nearMap = []
   for (const [idx, i] of edgeMapSource.entries()) {
      const index = i * 3
      const vertexSource = new THREE.Vector3(
         positionsSource[index],
         positionsSource[index + 1],
         positionsSource[index + 2],
      )
      let closetDistance = 1000
      for (const j of edgeMapTarget) {
         const id = j * 3
         const vertexTarget = new THREE.Vector3(
            positionsTarget[id],
            positionsTarget[id + 1],
            positionsTarget[id + 2],
         )
         const distance = vertexSource.distanceTo(vertexTarget)
         if (distance < closetDistance) {
            closetDistance = distance
            nearMap[idx] = j
         }
      }
   }

   // 假设meshA和meshB是已经存在的两个模型
   let geometryA = source.geometry
   let geometryB = target.geometry

   // 获取要桥接的顶点
   // 这里假设我们已经知道要桥接的顶点索引，例如顶点索引数组为indicesA和indicesB
   let indicesA = edgeMapSource
   let indicesB = nearMap

   // 获取顶点位置
   let verticesA = geometryA.attributes.position.array
   let verticesB = geometryB.attributes.position.array

   // 创建桥接几何体
   let bridgeGeometry = new THREE.BufferGeometry()
   let bridgeVertices = []
   let bridgeIndices = []

   // 控制点高度的比例因子
   let controlPointHeightFactor = 0.2 // 可调整

   // 插值点数量比例因子
   let divisionsFactor = 10 // 可调整

   // 添加桥接顶点
   for (let i = 0; i < indicesA.length; i++) {
      let pA = new THREE.Vector3(
         verticesA[indicesA[i] * 3],
         verticesA[indicesA[i] * 3 + 1],
         verticesA[indicesA[i] * 3 + 2],
      )
      let pB = new THREE.Vector3(
         verticesB[indicesB[i] * 3],
         verticesB[indicesB[i] * 3 + 1],
         verticesB[indicesB[i] * 3 + 2],
      )

      // 计算两点间的距离
      let distance = pA.distanceTo(pB)
      let divisions = Math.ceil(distance * divisionsFactor)

      // 控制点
      let controlPoint = new THREE.Vector3(
         (pA.x + pB.x) / 2,
         (pA.y + pB.y) / 2 + distance * controlPointHeightFactor,
         (pA.z + pB.z) / 2,
      )

      // 创建样条曲线
      let curve = new THREE.CatmullRomCurve3([pA, controlPoint, pB])

      // 获取曲线上插值点
      let points = curve.getPoints(divisions)
      for (let j = 0; j < points.length; j++) {
         bridgeVertices.push(points[j].x, points[j].y, points[j].z)
      }
   }

   // 创建桥接面的索引
   for (let i = 0; i < indicesA.length - 1; i++) {
      let pA1 = new THREE.Vector3(
         verticesA[indicesA[i] * 3],
         verticesA[indicesA[i] * 3 + 1],
         verticesA[indicesA[i] * 3 + 2],
      )
      let pA2 = new THREE.Vector3(
         verticesA[indicesA[i + 1] * 3],
         verticesA[indicesA[i + 1] * 3 + 1],
         verticesA[indicesA[i + 1] * 3 + 2],
      )
      let pB1 = new THREE.Vector3(
         verticesB[indicesB[i] * 3],
         verticesB[indicesB[i] * 3 + 1],
         verticesB[indicesB[i] * 3 + 2],
      )
      let pB2 = new THREE.Vector3(
         verticesB[indicesB[i + 1] * 3],
         verticesB[indicesB[i + 1] * 3 + 1],
         verticesB[indicesB[i + 1] * 3 + 2],
      )

      let distance1 = pA1.distanceTo(pB1)
      let distance2 = pA2.distanceTo(pB2)
      let divisions1 = Math.ceil(distance1 * divisionsFactor)
      let divisions2 = Math.ceil(distance2 * divisionsFactor)

      for (let j = 0; j < Math.max(divisions1, divisions2); j++) {
         let a = i * (Math.max(divisions1, divisions2) + 1) + j
         let b = a + 1
         let c = a + (Math.max(divisions1, divisions2) + 1)
         let d = c + 1

         bridgeIndices.push(a, b, c)
         bridgeIndices.push(b, d, c)
      }
   }

   // 设置几何体属性
   bridgeGeometry.setAttribute(
      'position',
      new THREE.Float32BufferAttribute(bridgeVertices, 3),
   )
   // bridgeGeometry.setIndex(bridgeIndices)
   // bridgeGeometry.computeVertexNormals()

   // 创建桥接的材质和网格
   // let bridgeMesh = new THREE.Mesh(bridgeGeometry, material)
   const dotMat = new THREE.PointsMaterial({ color: 0xffffff, size: 0.2 })
   const bridge = new THREE.Points(bridgeGeometry, dotMat)
   // 将桥接面添加到场景中
   scene.add(bridge)
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
