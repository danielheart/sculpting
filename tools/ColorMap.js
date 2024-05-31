// ******************距离检测部分****************
import * as THREE from 'three'
// 创建Raycaster对象
let raycasterFront = new THREE.Raycaster()
let raycasterBack = new THREE.Raycaster()
//参数设置
const raycastDistance = 4 //进行检测的距离范围
const validDistance = 0.1 //正确配准距离范围
export function ColorMap(detectObject, targetObject, vertexIndices) {
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
}
