import * as THREE from 'three'
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js'
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js'
import { PLYLoader } from 'three/examples/jsm/loaders/PLYLoader.js'
import * as BufferGeometryUtils from 'three/examples/jsm/utils/BufferGeometryUtils.js'

import {
   computeBoundsTree,
   disposeBoundsTree,
   acceleratedRaycast,
} from 'three-mesh-bvh'

// Add the extension functions
THREE.BufferGeometry.prototype.computeBoundsTree = computeBoundsTree
THREE.BufferGeometry.prototype.disposeBoundsTree = disposeBoundsTree
THREE.Mesh.prototype.raycast = acceleratedRaycast

export const state = {
   width: 300, // canvas default
   height: 150, // canvas default
}

// ************搭建threejs场景，导入模型**********
let scene, renderer, camera, faceObj, upperJaw, lowerJaw,crownOutside
const stlLoader = new STLLoader()
const objLoader = new OBJLoader()
const plyLoader = new PLYLoader()
const material = new THREE.MeshStandardMaterial({ side: THREE.DoubleSide })
// 搭建场景
export function init(data) {
   createScene()
   createLights()
   function createScene() {
      const { canvas } = data
      renderer = new THREE.WebGLRenderer({
         antialias: true,
         canvas,
         // depth: false,
      })

      state.width = canvas.width
      state.height = canvas.height

      camera = new THREE.PerspectiveCamera(50, 1.5, 1, 10000)
      camera.position.set(0, -500, 0)
      camera.lookAt(0, 0, 0)

      scene = new THREE.Scene()
      const axesHelper = new THREE.AxesHelper(50)
      axesHelper.renderOrder = 2
      scene.add(axesHelper)
   }

   //灯光部分只用来预览，可删除此部分
   function createLights() {
      //hemisphere light
      const hemisphereLight = new THREE.HemisphereLight(0xffffff, 0x000000, 0.9)
      // an ambient light modifies the global color of a scene and makes the shadows softer
      const ambientLight = new THREE.AmbientLight(0xffffff, 0.9)

      const sunlight = new THREE.DirectionalLight(0xffffff, 1)
      sunlight.position.set(0, -1, -1)
      scene.add(ambientLight)
      scene.add(hemisphereLight)
      scene.add(sunlight)
   }
   //更新渲染尺寸只用来预览，也可删除此部分
   function resizeRendererToDisplaySize(renderer) {
      const canvas = renderer.domElement
      const width = state.width
      const height = state.height
      const needResize = canvas.width !== width || canvas.height !== height
      if (needResize) {
         renderer.setSize(width, height, false)
      }

      return needResize
   }

   function render() {
      //更新渲染尺寸只用来预览，可删除此部分
      if (resizeRendererToDisplaySize(renderer)) {
         camera.aspect = state.width / state.height
         camera.updateProjectionMatrix()
      }
      renderer.render(scene, camera)
      requestAnimationFrame(render)
   }
   requestAnimationFrame(render)
}
// 加载模型
export function model(data) {
   //
   if (data.object === 'upperjaw' || data.object === 'lowerjaw') {
      if (data.path.endsWith('stl'))
         stlLoader.load(data.path, function (geom) {
            //generate merged shape of upperjaw
            geom.deleteAttribute('normal')
            geom = BufferGeometryUtils.mergeVertices(geom)
            geom.computeVertexNormals()
            if (data.object === 'upperjaw') {
               upperJaw = new THREE.Mesh(geom, material)
               scene.add(upperJaw)
            } else {
               lowerJaw = new THREE.Mesh(geom, material)
               scene.add(lowerJaw)
            }
         })
      else if (data.path.endsWith('ply'))
         plyLoader.load(data.path, function (geom) {
            const material = new THREE.MeshBasicMaterial({
               vertexColors: true,
            })
            geom.deleteAttribute('normal')
            geom.computeVertexNormals()
            if (data.object === 'upperjaw') {
               upperJaw = new THREE.Mesh(geom, material)
               scene.add(upperJaw)
            } else {
               lowerJaw = new THREE.Mesh(geom, material)
               scene.add(lowerJaw)
            }
         })
   } else if (data.object === 'face') {
      objLoader.load(data.path, function (object) {
         faceObj = object.children[0]
         //对物体进行旋转以使其与blender位置相同
         faceObj.rotation.x = Math.PI / 2
         apply({ type: 'apply', object: 'face' })

         faceObj.geometry.computeBoundsTree({
            maxLeafTris: 1,
         })
         scene.add(faceObj)
         faceObj.material = material
      })
   }
}

export function matrix(data) {
   // 将物体应用变换矩阵
   if (data.object === 'face') {
      faceObj.matrix = matrixWorld
      faceObj.matrixAutoUpdate = false
   } else if (data.object === 'upperjaw') {
      upperJaw.matrix = matrixWorld
      upperJaw.matrixAutoUpdate = false
   } else if (data.object === 'lowerjaw') {
      lowerJaw.matrix = matrixWorld
      lowerJaw.matrixAutoUpdate = false
   }
}
// 应用模型数据
export function apply(data) {
   let object
   switch (data.object) {
      case 'face':
         object = faceObj
         break
      case 'upperjaw':
         object = upperJaw
         break
      case 'lowerjaw':
         object = lowerJaw
         break
      default:
         object = faceObj
         break
   }

   object.updateMatrix()
   object.geometry.applyMatrix4(faceObj.matrix)
   object.position.set(0, 0, 0)
   object.rotation.set(0, 0, 0)
   object.scale.set(1, 1, 1)
   object.updateMatrix()
}

// ******************距离检测部分****************
// 创建Raycaster对象
let raycasterFront = new THREE.Raycaster()
let raycasterBack = new THREE.Raycaster()
//参数设置
const itemSize = 3 * 1 // 距离颜色边缘精度，越大精度越小（建议取值范围3~27）
const raycastDistance = 10 //进行检测的距离范围
const validDistance = 1.5 //正确配准距离范围
const validcolors = [0, 1, 0, 1] //正确配准的色彩

export function detect(data) {
   console.log('received detect task', data.id)
   let colorArray = []
   for (let objectDetect of [upperJaw, lowerJaw]) {
      // 获取A物体所有顶点
      let colors = []
      const positions = objectDetect.geometry.attributes.position.array

      // 循环所有顶点
      const begin =
         Math.floor((positions.length / itemSize) * (data.id / data.total)) *
         itemSize
      const end =
         Math.floor(
            (positions.length / itemSize) * ((data.id + 1) / data.total),
         ) * itemSize

      for (let i = begin; i < end; i += itemSize) {
         if (i + itemSize - 1 > end) console.log(i)
         // 获取当前顶点
         const vertex = new THREE.Vector3(
            positions[i],
            positions[i + 1],
            positions[i + 2],
         )

         // 将顶点坐标转换为世界坐标
         vertex.applyMatrix4(objectDetect.matrixWorld)

         // 获取顶点法线
         const normal = new THREE.Vector3()
         normal.fromArray(objectDetect.geometry.attributes.normal.array, i)

         // 创建射线
         raycasterFront = new THREE.Raycaster(
            vertex,
            normal,
            0,
            raycastDistance,
         )
         raycasterFront.firstHitOnly = true

         // 检测射线是否与B物体相交
         const intersects = raycasterFront.intersectObject(faceObj)

         raycasterBack = new THREE.Raycaster(
            vertex,
            normal.negate(),
            0,
            raycastDistance,
         )
         raycasterBack.firstHitOnly = true

         // 检测射线是否与B物体相交
         const intersects2 = raycasterBack.intersectObject(faceObj)
         let closerDirection = ''

         // 进行距离判断
         if (intersects.length > 0 && intersects2.length)
            if (intersects[0].distance < intersects2[0].distance)
               closerDirection = 'front'
            else closerDirection = 'back'

         if (intersects.length > 0 || closerDirection == 'front') {
            if (intersects[0].distance < validDistance)
               for (let i = 0; i < itemSize / 3; i++)
                  colors.push(...validcolors)
            else {
               const v = 1 - intersects[0].distance / raycastDistance
               for (let i = 0; i < itemSize / 3; i++) colors.push(0, v, 1, 1)
            }
         } else if (intersects2.length > 0 || closerDirection == 'back') {
            if (intersects2[0].distance < validDistance)
               for (let i = 0; i < itemSize / 3; i++)
                  colors.push(...validcolors)
            else {
               const v = 1 - intersects2[0].distance / raycastDistance
               for (let i = 0; i < itemSize / 3; i++) colors.push(1, v, 0, 1)
            }
         } else
            for (let i = 0; i < itemSize / 3; i++) {
               colors.push(1, 1, 1, 1)
            }
      }

      colorArray.push(colors)
   }
   return { type: 'color', array: colorArray, id: data.id }
}
