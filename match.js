import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js'

import * as BufferGeometryUtils from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import * as dat from 'three/examples/jsm/libs/lil-gui.module.min.js'
import { Smooth, NeighborMap, EdgeMap } from './tools/Smooth'

import {
   computeBoundsTree,
   disposeBoundsTree,
   acceleratedRaycast,
} from 'three-mesh-bvh'

// Add the extension functions
THREE.BufferGeometry.prototype.computeBoundsTree = computeBoundsTree
THREE.BufferGeometry.prototype.disposeBoundsTree = disposeBoundsTree
THREE.Mesh.prototype.raycast = acceleratedRaycast

let scene = new THREE.Scene(),
   camera,
   width,
   height,
   renderer,
   controls,
   crownCap,
   plane,
   sphere

const material = new THREE.MeshPhongMaterial({
      color: 0xece5b8,
      side: THREE.DoubleSide,
      shininess: 30,
      specular: 0x333333,
      // wireframe: true,
   }),
   choosedMaterial = new THREE.MeshPhongMaterial({
      color: 0xbfd9d5,
      side: THREE.DoubleSide,
      shininess: 30,
      specular: 0x333333,
      // flatShading: true,
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
   showMatch: true,
   showSphere: false,
   wireframe: false,
   remeshStrength: 0.5,
   strength,
   target: 'sphere',
   remesh: () => {
      for (let i = 0; i < 10; i++) {
         Smooth(plane, 10, params.remeshStrength)
      }
   },
   remesh2: () => {
      for (let i = 0; i < 10; i++) {
         Smooth(plane, 10, 0.1, vertexIndices)
      }
   },
   match,
}
// 创建Raycaster对象
let raycaster = new THREE.Raycaster()
let raycasterBack = new THREE.Raycaster()
const raycastDistance = 10
const direction = new THREE.Vector3(0, 0, -1)

let targetObject
const vertexIndices = []
function match() {
   // 获取A物体所有顶点
   const detectObject = plane

   const positions = detectObject.geometry.attributes.position.array
   let count = 0
   // 循环所有顶点
   const edgeMap = detectObject.geometry.edgeMap

   let mindistance = 100,
      maxdistance = -100
   if (params.target === 'crown') {
      for (let i = 0; i < positions.length / 3; i++) {
         // 获取当前顶点
         const index = i * 3
         const vertex = new THREE.Vector3(
            positions[index],
            positions[index + 1],
            positions[index + 2],
         )

         // 将顶点坐标转换为世界坐标
         vertex.applyMatrix4(detectObject.matrixWorld)

         // 获取顶点法线

         const normal = new THREE.Vector3()
         normal.fromArray(detectObject.geometry.attributes.normal.array, index)

         const ndirection = normal
            .clone()
            .negate()
            .multiplyScalar(1)
            .add(direction)

         // 创建射线
         raycaster = new THREE.Raycaster(vertex, ndirection, 0, raycastDistance)
         raycaster.firstHitOnly = true
         // 检测front射线是否与B物体相交
         const intersects = raycaster.intersectObject(targetObject)

         if (intersects.length) {
            if (intersects[0].distance > maxdistance)
               maxdistance = intersects[0].distance
            if (intersects[0].distance < mindistance)
               mindistance = intersects[0].distance
         }
      }
   }
   console.log(mindistance, maxdistance)

   for (let i = 0; i < positions.length / 3; i++) {
      if (edgeMap.includes(i)) continue
      // 获取当前顶点
      const index = i * 3
      const vertex = new THREE.Vector3(
         positions[index],
         positions[index + 1],
         positions[index + 2],
      )

      // 将顶点坐标转换为世界坐标
      vertex.applyMatrix4(detectObject.matrixWorld)

      // 获取顶点法线

      const normal = new THREE.Vector3()
      normal.fromArray(detectObject.geometry.attributes.normal.array, index)

      const ndirection =
         params.target === 'crown'
            ? normal.clone().negate().multiplyScalar(1).add(direction)
            : normal

      // 创建射线
      raycaster = new THREE.Raycaster(vertex, ndirection, 0, raycastDistance)
      raycaster.firstHitOnly = true
      // 检测front射线是否与B物体相交
      const intersects = raycaster.intersectObject(targetObject)

      let intersectsBack
      if (params.target === 'crown') {
         // 创建射线
         raycasterBack = new THREE.Raycaster(
            vertex,
            ndirection.clone().negate(),
            0,
            raycastDistance / 3,
         )
         raycasterBack.firstHitOnly = true
         // 检测front射线是否与B物体相交
         intersectsBack = raycasterBack.intersectObject(targetObject)
      }

      if (params.target != 'crown' && intersects.length) {
         count++
         const intersectPosition = intersects[0].point

         const diffrence = intersectPosition.clone().sub(vertex)
         positions[index] += diffrence.x * strength
         positions[index + 1] += diffrence.y * strength
         positions[index + 2] += diffrence.z * strength
      } else if (
         params.target === 'crown' &&
         (intersects.length || intersectsBack.length)
      ) {
         count++
         const intersectPosition = intersects.length
            ? intersects[0].point
            : intersectsBack[0].point
         const offset = map(
            intersectPosition.length(),
            mindistance,
            maxdistance,
            0.1 * strength * strength,
            strength * strength,
         )

         const diffrence = intersectPosition.clone().sub(vertex)
         positions[index] += diffrence.x * offset
         positions[index + 1] += diffrence.y * offset
         positions[index + 2] += diffrence.z * offset
      } else {
         vertexIndices.push(index)
      }
   }
   console.log('intersect number:', count)
   // console.log('need smooth number:', vertexIndices.length)
   // Smooth(plane, 50, 0.5, vertexIndices)

   detectObject.geometry.attributes.position.needsUpdate = true
   detectObject.geometry.computeVertexNormals(true)
}
function map(value, originalMin, originalMax, targetMin, targetMax) {
   return (
      ((value - originalMin) * (targetMax - targetMin)) /
         (originalMax - originalMin) +
      targetMin
   )
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

   gui.add(params, 'remesh').name('remesh')
   gui.add(params, 'remeshStrength', 0.01, 1, 0.01)
   gui.add(params, 'remesh2').name('remesh2')
   gui.add(params, 'match').name('match')
   gui.add(params, 'strength', 0.01, 1, 0.01).onChange(() => {
      strength = params.strength
   })
   gui.add(params, 'target', ['crown', 'sphere']).onChange(() => {
      if (params.target === 'crown') {
         targetObject = crownCap
      } else {
         targetObject = sphere
      }
   })
   gui.add(params, 'showCrown').onChange(() => {
      crownCap.visible = params.showCrown
   })
   gui.add(params, 'showMatch').onChange(() => {
      plane.visible = params.showMatch
   })
   gui.add(params, 'showSphere').onChange(() => {
      sphere.visible = params.showSphere
   })
   gui.add(params, 'wireframe').onChange(() => {
      if (params.wireframe) {
         plane.material.wireframe = true
      } else {
         plane.material.wireframe = false
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

      NeighborMap(geometry)
      EdgeMap(geometry)

      plane = new THREE.Mesh(geometry, material)
      scene.add(plane)
      // plane.scale.set(1.2,1.2,1.2)
      // 假设 'model' 是您要居中的THREE.Object3D对象
      const bbox = new THREE.Box3().setFromObject(plane)
      const center = bbox.getCenter(new THREE.Vector3())
      plane.position.copy(center.multiplyScalar(-1))
      plane.position.z += -3
      for (let i = 0; i < 20; i++) {
         Smooth(plane, 10, 1)
      }
   })

   stlLoader.load('/crownCap.stl', function (geometry) {
      geometry.deleteAttribute('normal')
      geometry = BufferGeometryUtils.mergeVertices(geometry)
      geometry.computeVertexNormals()

      geometry.computeBoundsTree({
         maxLeafTris: 1,
      })

      crownCap = new THREE.Mesh(geometry, choosedMaterial)

      scene.add(crownCap)

      // 假设 'model' 是您要居中的THREE.Object3D对象
      const bbox = new THREE.Box3().setFromObject(crownCap)
      const center = bbox.getCenter(new THREE.Vector3())
      crownCap.position.copy(center.multiplyScalar(-1))
   })
   // 创建球体几何体
   const sphereGeometry = new THREE.SphereGeometry(10, 64, 64)
   sphereGeometry.computeBoundsTree()
   // 创建球体网格
   sphere = new THREE.Mesh(sphereGeometry, material)
   scene.add(sphere)
   sphere.visible = params.showSphere
   targetObject = sphere
   sphere.position.z = -3
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
