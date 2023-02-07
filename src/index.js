// TODO
// vuejs设计与实现 响应式系统
// 安装vitest
// 拆分功能点
// 添加对应功能点的测试用例
// tdd形式编写代码
// 1. 响应式系统的基本实现
// 2. 完善响应式系统
// 3. 分支切换(三元)与cleanup
// 4. 嵌套的effect和effect栈
// 5. 避免无线循环递归
// 6. 调度执行
// 7. 计算属性与lazy
// 8. watch的实现原理
// 9. 立即执行的watch与回调执行时机

/**
 * 
//1. 简单的响应式系统
// const data = {
//   text: 'nihao'
// }
// const obj = reactive(data)
// let result
// function effect() {
//   result = obj.text
// }
// effect()
// setTimeout(() => {
//   obj.text = 'nihao vue3'  // 在代理对象值改变时需要重新调用effect，所以在访问该key的时候需要把effect存起来 这里可以使用set
// })
//
 */
// export function reactive(data, effect) {
//   // 在代理对象值改变时需要重新调用effect，所以在访问该key的时候需要把effect存起来 这里可以使用set
//   const tmp = new Set()
//   return new Proxy(data, {
//     get(target, key) {
//       tmp.add(effect)
//       return target[key]
//     },
//     set(target, key, newValue) {
//       target[key] = newValue
//       tmp.forEach(i => {
//         i()
//       })
//        return true
//     }
//   })
// }

/**
 * 2. 更加完善的响应式系统
 * 第一版实现的响应式，存在一些问题：
 * 1）将副作用函数的名字effect硬编码到了代码中，优化一下，采用全局变量activeEffect来代替。将effect升级为包裹副作用函数的函数
 * 2）set中遍历执行副作用函数，导致key即使不被副作用函数收集，只要访问，都会执行副作用函数。这个时候需要将key与副作用函数建立联系。target => key => effectFn。使用weakMap(弱引用，当用户侧的数据不再被引用时，会被垃圾回收)保存target与Map的对应关系。Map中保存key与Set的对应关系。Set中保存，对应key被收集到的effectFn
 */
let actvieEffect
export function effect(fn) {
  actvieEffect = fn
  fn()
}
export function reactive(data) {
  const depsWeakMap = new WeakMap()
  return new Proxy(data, {
    get(target, key) {
      if(!actvieEffect) {
        return target[key]
      }
      let targetMap = depsWeakMap.get(target)
      if(!targetMap) {
        depsWeakMap.set(target, (targetMap = new Map))
      }
      let keySet = targetMap.get(key)
      if(!keySet) {
        targetMap.set(key, (keySet = new Set))
      }
      keySet.add(actvieEffect)
      return target[key]
    },
    set(target, key, newValue) {
      target[key] = newValue
      const targetMap = depsWeakMap.get(target)
      if(targetMap) {
        const keySet = targetMap.get(key)

        keySet && keySet.forEach(i => i())
      }
      return true
    }
  })
}

/*
const data = {
  text: 'nihao'
}
const obj = reactive(data)
let result

let count = 0
effect(
  // 匿名副作用函数
  () => {
    count ++
    result = obj.text
  }
)
console.log(count)
setTimeout(() => {
  // 副作用函数中并没有读取 notExist 属性的值
  obj.notExist = 'hello vue311'
  console.log(count)
})
*/
