import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js'

import * as BufferGeometryUtils from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import * as dat from 'three/examples/jsm/libs/lil-gui.module.min.js'

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
   crownOutside,
   crownColorMap,
   circle,
   upperJaw,
   lowerJaw

let isDragging = false,
   choosedObject

const material = new THREE.MeshPhongMaterial({
      color: 0xece5b8,
      side: THREE.DoubleSide,
      shininess: 30,
      specular: 0x333333,
   }),
   choosedMaterial = new THREE.MeshPhongMaterial({
      color: 0xbfd9d5,
      side: THREE.DoubleSide,
      shininess: 30,
      specular: 0x333333,
      // flatShading: true,
   }),
   vertexMat = new THREE.MeshPhongMaterial({
      side: THREE.DoubleSide,
      vertexColors: true,
      transparent: true,
      opacity: 1.0,
   })
window.addEventListener('load', init)
function init() {
   createScene()
   createLights()
   loadModel()
   createGUI()
   animate()
}

// 创建Raycaster对象
let raycaster = new THREE.Raycaster()

// 创建一个鼠标向量
const mouse = new THREE.Vector2()

const params = {
   mode: 'Add',
   brushSize: 2,
   strength: 0.5,
   showColorMap: false,
   showUpperJaw: false,
   showLowerJaw: false,
}

function operateCrown(event) {
   choosedObject = crownOutside

   // 计算鼠标位置
   mouse.x = (event.clientX / window.innerWidth) * 2 - 1
   mouse.y = -(event.clientY / window.innerHeight) * 2 + 1

   // 发射射线
   raycaster.setFromCamera(mouse, camera)

   // 获取与射线相交的物体
   const intersects = raycaster.intersectObject(choosedObject)
   if (intersects.length > 0) {
      const clickedPosition = intersects[0].point
      const clickedNormal = intersects[0].face.normal
         .clone()
         .applyMatrix4(choosedObject.matrixWorld)

      const direction = new THREE.Vector3()
      direction.copy(clickedPosition)
      circle.position.copy(clickedPosition)
      circle.visible = true
      circle.lookAt(direction.add(clickedNormal))
      if (isDragging) {
         // const start = performance.now()
         sculpting(clickedNormal, clickedPosition, choosedObject)
         // const end = performance.now()
         // console.log(end - start)
      }
   } else {
      circle.visible = false
   }
}
function sculpting(clickedNormal, clickedPosition, object) {
   // 选中鼠标位置半径brushSize的所有点

   //check joint points
   const attributes = object.geometry.attributes
   const positions = attributes.position.array
   const normals = attributes.normal.array

   const intersect = new THREE.Vector3()
   intersect.copy(clickedPosition)

   const avgNormal = new THREE.Vector3()
   const avgPosition = new THREE.Vector3()
   let count = 0
   const vertexIndices = []
   const smoothRadius = params.brushSize * params.strength

   for (let i = 0; i < positions.length; i += 3) {
      const vertex = new THREE.Vector3(
         positions[i],
         positions[i + 1],
         positions[i + 2],
      )

      const distance = vertex.distanceTo(clickedPosition)
      const vertexNormal = new THREE.Vector3(
         normals[i],
         normals[i + 1],
         normals[i + 2],
      )
      const radius =
         params.mode === 'Smooth'
            ? params.brushSize + smoothRadius
            : params.brushSize

      if (distance < radius) {
         vertexIndices.push(i)
         avgPosition.add(vertex)
         avgNormal.add(vertexNormal)
         count++
      }
   }
   if (count > 0) {
      avgPosition.divideScalar(count)
      avgNormal.normalize()
   }

   for (let i = 0; i < vertexIndices.length; i++) {
      const index = vertexIndices[i]
      const vertex = new THREE.Vector3(
         positions[index],
         positions[index + 1],
         positions[index + 2],
      )
      const distance = vertex.distanceTo(clickedPosition)

      if (distance < params.brushSize) {
         let offset =
               (Math.exp(-(((distance / params.brushSize) * 2) ** 2)) / 20) *
               params.strength,
            diffrence,
            projectVector
         switch (params.mode) {
            case 'Add':
               positions[index] += clickedNormal.x * offset
               positions[index + 1] += clickedNormal.y * offset
               positions[index + 2] += clickedNormal.z * offset
               break
            case 'Remove':
               positions[index] += -clickedNormal.x * offset
               positions[index + 1] += -clickedNormal.y * offset
               positions[index + 2] += -clickedNormal.z * offset
               break
            case 'Smooth':
               // 计算邻域顶点的加权平均位置
               let avgPos = new THREE.Vector3(),
                  avgNorm = new THREE.Vector3(),
                  count = 0
               for (let j = 0; j < vertexIndices.length; j++) {
                  const nindex = vertexIndices[j]
                  const nvertex = new THREE.Vector3(
                     positions[nindex],
                     positions[nindex + 1],
                     positions[nindex + 2],
                  )
                  const nnormal = new THREE.Vector3(
                     normals[nindex],
                     normals[nindex + 1],
                     normals[nindex + 2],
                  )
                  const ndist = nvertex.distanceTo(vertex)
                  if (ndist < smoothRadius) {
                     const weight = 1 / (ndist + 1)
                     avgPos.add(nvertex.multiplyScalar(weight))
                     avgNorm.add(nnormal)
                     count += weight
                  }
               }
               if (count > 0) {
                  diffrence = avgPos.divideScalar(count).sub(vertex)
                  projectVector = projection(diffrence, avgNorm.normalize())
                  // console.log(diffrence, projectVector)
                  // 更新顶点位置
                  positions[index] += projectVector.x * offset
                  positions[index + 1] += projectVector.y * offset
                  positions[index + 2] += projectVector.z * offset
               }
               break
            case 'Smooth2':
               diffrence = avgPosition.clone().sub(vertex)
               projectVector = projection(diffrence, avgNormal)

               positions[index] += projectVector.x * offset
               positions[index + 1] += projectVector.y * offset
               positions[index + 2] += projectVector.z * offset
               break
            case 'Flatten':
               diffrence = avgPosition.clone().sub(vertex)
               projectVector = projection(diffrence, clickedNormal)
               // if (clickedNormal.dot(diffrence) < 0) {
               positions[index] += projectVector.x * offset
               positions[index + 1] += projectVector.y * offset
               positions[index + 2] += projectVector.z * offset
               // }
               break
         }
      }
   }
   attributes.position.needsUpdate = true
   object.geometry.computeVertexNormals(true)
   if (params.showColorMap && !isGenerating) {
      isGenerating = true
      generateColorMap(crownColorMap, upperJaw, vertexIndices)
   }
}

function projection(source, target) {
   // 计算点积
   const dotAB = source.dot(target)
   const dotBB = target.dot(target)

   // 计算投影
   const projection = target.clone().multiplyScalar(dotAB / dotBB)

   return projection
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

   const modeControl = gui.add(params, 'mode', [
      'Add',
      'Remove',
      'Smooth',
      'Flatten',
   ])

   const brushSizeControl = gui
      .add(params, 'brushSize', 0.2, 5, 0.01)
      .onChange(() => {
         circle.scale.set(params.brushSize, params.brushSize, params.brushSize)
      })
   const strengthControl = gui.add(params, 'strength', 0.05, 1, 0.01)

   gui.add(params, 'showColorMap').onChange(() => {
      if (params.showColorMap) {
         crownColorMap.visible = true
         generateColorMap(crownColorMap, upperJaw)
      } else {
         crownColorMap.visible = false
      }
   })
   gui.add(params, 'showUpperJaw').onChange(() => {
      upperJaw.visible = params.showUpperJaw
   })
   gui.add(params, 'showLowerJaw').onChange(() => {
      lowerJaw.visible = params.showLowerJaw
   })

   // 监听键盘和鼠标滚轮事件
   document.addEventListener('keydown', (event) => {
      if (event.shiftKey || event.ctrlKey || event.metaKey) {
         controls.enableZoom = false
      } else {
         switch (event.key) {
            case 'a':
               modeControl.setValue('Add')
               break
            case 'r':
               modeControl.setValue('Remove')
               break
            case 's':
               modeControl.setValue('Smooth')
               break
            case 'f':
               modeControl.setValue('Flatten')
               break
         }
      }
   })

   document.addEventListener('keyup', (event) => {
      if (!event.shiftKey || !event.ctrlKey || !event.metaKey) {
         controls.enableZoom = true
      }
   })
   let wheelDelta = 0
   window.addEventListener(
      'wheel',
      (event) => {
         if (event.shiftKey) {
            wheelDelta = event.deltaY * 0.001
            brushSizeControl.setValue(params.brushSize + wheelDelta)
         } else if (event.ctrlKey || event.metaKey) {
            event.preventDefault()
            wheelDelta = event.deltaY * 0.001
            strengthControl.setValue(params.strength + wheelDelta)
         }
      },
      { passive: false },
   )
}
function loadModel() {
   //add stl files
   const stlLoader = new STLLoader()
   stlLoader.load('/upperJaw.stl', function (geometry) {
      geometry.deleteAttribute('normal')
      geometry = BufferGeometryUtils.mergeVertices(geometry)
      geometry.computeVertexNormals()

      upperJaw = new THREE.Mesh(geometry, material)
      upperJaw.visible = false
      upperJaw.geometry.computeBoundsTree({
         maxLeafTris: 1,
      })
      scene.add(upperJaw)
   })
   stlLoader.load('/lowerJaw.stl', function (geometry) {
      geometry.deleteAttribute('normal')
      geometry = BufferGeometryUtils.mergeVertices(geometry)
      geometry.computeVertexNormals()

      lowerJaw = new THREE.Mesh(geometry, material)
      lowerJaw.visible = false
      lowerJaw.geometry.computeBoundsTree({
         maxLeafTris: 1,
      })
      scene.add(lowerJaw)
   })
   stlLoader.load('/crownEdge.stl', function (geometry) {
      geometry.deleteAttribute('normal')
      geometry = BufferGeometryUtils.mergeVertices(geometry)
      geometry.computeVertexNormals()

      const mesh = new THREE.Mesh(geometry, choosedMaterial)
      scene.add(mesh)
   })
   stlLoader.load('/crownInside.stl', function (geometry) {
      geometry.deleteAttribute('normal')
      geometry = BufferGeometryUtils.mergeVertices(geometry)
      geometry.computeVertexNormals()

      const mesh = new THREE.Mesh(geometry, choosedMaterial)

      scene.add(mesh)
   })

   stlLoader.load('/crownOutside.stl', function (geometry) {
      geometry.deleteAttribute('normal')
      geometry = BufferGeometryUtils.mergeVertices(geometry)
      geometry.computeVertexNormals()

      crownOutside = new THREE.Mesh(geometry, choosedMaterial)
      crownColorMap = new THREE.Mesh(geometry, vertexMat)

      crownColorMap.renderOrder = 1
      crownColorMap.visible = false
      const num = geometry.attributes.position.array.length
      const colors = new Array(4 * num).fill(0)
      crownColorMap.geometry.setAttribute(
         'color',
         new THREE.Float32BufferAttribute(colors, 4),
      )
      scene.add(crownOutside, crownColorMap)

      // 鼠标移动事件
      document.addEventListener('mousedown', (e) => {
         if (e.button === 0) isDragging = true
         operateCrown(e)
      })
      document.addEventListener('mouseup', () => (isDragging = false))
      document.addEventListener('mousemove', operateCrown)
   })

   // 3. 创建一个圆形区域,用于在鼠标悬停时显示
   const circleGeometry = new THREE.BufferGeometry().setFromPoints(
      new THREE.Path().absarc(0, 0, 0.5, 0, Math.PI * 2).getSpacedPoints(50),
   )
   const circleMaterial = new THREE.LineBasicMaterial({
      color: 0x16c2a6,
      transparent: true,
      opacity: 0.6,
      depthTest: false,
   })

   circle = new THREE.Line(circleGeometry, circleMaterial)
   circle.scale.set(params.brushSize, params.brushSize, params.brushSize)
   circle.position.set(0, 0, 0.5) // 将圆形区域放置在球体表面上方
   circle.renderOrder = 2
   scene.add(circle)
   circle.visible = false // 默认隐藏圆形区域
}
function createLights() {
   const ambientLight = new THREE.AmbientLight(0xffffff, 0.025)
   // scene.add(ambientLight)
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

// ******************距离检测部分****************
// 创建Raycaster对象
let raycasterFront = new THREE.Raycaster()
let raycasterBack = new THREE.Raycaster()
//参数设置
const raycastDistance = 4 //进行检测的距离范围
const validDistance =0.1 //正确配准距离范围

let isGenerating = false

function generateColorMap(detectObject, targetObject, vertexIndices) {
   // 获取A物体所有顶点
   const colors = detectObject.geometry.attributes.color
   // const colors = []
   const positions = detectObject.geometry.attributes.position.array
   if (!vertexIndices) {
      vertexIndices = []
      for (let i = 0; i < positions.length; i += 3) vertexIndices.push(i)
   }

   // 循环所有顶点
   for (let i = 0; i < vertexIndices.length; i++) {
      // 获取当前顶点

      const index = vertexIndices[i]
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

      // 创建射线
      raycasterFront = new THREE.Raycaster(vertex, normal, 0, raycastDistance)
      raycasterFront.firstHitOnly = true

      // 检测front射线是否与B物体相交
      const intersects = raycasterFront.intersectObject(targetObject)

      raycasterBack = new THREE.Raycaster(
         vertex,
         normal.clone().negate(),
         0,
         raycastDistance,
      )
      raycasterBack.firstHitOnly = true

      // 检测back射线是否与B物体相交
      const intersectsBack = raycasterBack.intersectObject(targetObject)

      let isIntersect = intersects.length > 0 || intersectsBack.length > 0
      let isJoin = false
      let distance
      if (isIntersect) {
         //判断模型是否相交（内、外）
         if (intersects.length > 0) {
            const intersectNormal = intersects[0].face.normal
               .clone()
               .applyMatrix4(targetObject.matrixWorld)
            isJoin = normal.dot(intersectNormal) > 0 ? true : isJoin
         }
         if (intersectsBack.length > 0) {
            const intersectNormal = intersectsBack[0].face.normal
               .clone()
               .applyMatrix4(targetObject.matrixWorld)
            isJoin = normal.dot(intersectNormal) < 0 ? true : isJoin
         }
         // 进行距离判断
         distance =
            intersects.length > 0 && intersectsBack.length > 0
               ? Math.min(intersects[0].distance, intersectsBack[0].distance)
               : intersects.length > 0
               ? intersects[0].distance
               : intersectsBack[0].distance
         const id = index / 3
         if (isJoin) {
            if (distance < validDistance * 0.4) {
               const v = distance / (validDistance * 0.4)
               colors.setXYZW(id, v, 1, 0, 1)
            } else if (distance < validDistance) {
               const v = (validDistance - distance) / (validDistance * 0.6)
               colors.setXYZW(id, 1, v, 0, 1)
            } else {
               colors.setXYZW(id, 1, 0, 0, 1)
            }
         } else {
            if (distance < validDistance * 0.4) {
               const v = distance / (validDistance * 0.4)
               colors.setXYZW(id, 0, 1, v, 1)
            } else if (distance < validDistance) {
               const v = (validDistance - distance) / (validDistance * 0.6)
               colors.setXYZW(id, 0, v, 1, 1)
            } else {
               colors.setXYZW(id, 1, 1, 1, 0)
            }
         }
      }
   }

   // 更新顶点颜色
   detectObject.geometry.attributes.color.needsUpdate = true
   isGenerating = false
}
