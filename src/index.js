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
// let activeEffect
// export function effect(fn) {
//   activeEffect = fn
//   fn()
// }
// export function reactive(data) {
//   const depsWeakMap = new WeakMap()
//   return new Proxy(data, {
//     get(target, key) {
//       if(!activeEffect) {
//         return target[key]
//       }
//       let targetMap = depsWeakMap.get(target)
//       if(!targetMap) {
//         depsWeakMap.set(target, (targetMap = new Map))
//       }
//       let keySet = targetMap.get(key)
//       if(!keySet) {
//         targetMap.set(key, (keySet = new Set))
//       }
//       keySet.add(activeEffect)
//       return target[key]
//     },
//     set(target, key, newValue) {
//       target[key] = newValue
//       const targetMap = depsWeakMap.get(target)
//       if(targetMap) {
//         const keySet = targetMap.get(key)

//         keySet && keySet.forEach(i => i())
//       }
//       return true
//     }
//   })
// }

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

/**
 * 3. 分支切换(三元)与cleanup
 * 第一版实现的响应式，存在一些问题：
 *   const data = { ok: true, text: 'hello world' }
  const obj = reactive(data)
  let result
  let count = 0
  effect(function effectFn() {
    count ++
    result = obj.ok ? obj.text : 'not'
  })
  obj.ok = false
  expect(count).to.equal(2)
  obj.text = 'hello'
 * 1）三元表达式时，当ok的值为false，执行effectFn，然后text的值就不会访问到，那么effectFn就不会被text收集，所以设置text的值理论上不会执行effectFn，但是现在是会执行的。
 * 解决办法：在执行副作用函数前将副作用函数从所有保存他的set中清理，执行完副作用函数时，会重新执行代码，收集依赖。
 * 难点：要清理副作用函数，就得知道哪些set收集了他，所以创建一个数组收集信息。可以改造一下effectFn，给他添加一个数组属性，在effectFn被收集的时候同步收集set的信息
 * 2) 改造后的代码在set的froEach遍历执行会无限循环：语言规范中对此有明确的说明：在调用 forEach 遍历 Set 集合时，如果一个值已经被访问过了，但该值被删除并重新添加到集合，如果此时 forEach 遍历没有结束，那么该值会重新被访问。
 */

// let activeEffect
// export function effect(fn) {
//   function effectFn() {
//     cleanup(effectFn)
//     activeEffect = effectFn
//     fn()
//   }
//   effectFn.deps = []
//   effectFn()
// }
// function cleanup(effectFn) {
//   effectFn.deps.forEach(i => {
//     i.delete(effectFn)
//   })
//   effectFn.deps.length = 0
// }
// export function reactive(data) {
//   const depsWeakMap = new WeakMap()
//   return new Proxy(data, {
//     get(target, key) {
//       if (!activeEffect) {
//         return target[key]
//       }
//       let targetMap = depsWeakMap.get(target)
//       if (!targetMap) {
//         depsWeakMap.set(target, (targetMap = new Map))
//       }
//       let keySet = targetMap.get(key)
//       if (!keySet) {
//         targetMap.set(key, (keySet = new Set))
//       }
//       keySet.add(activeEffect)
//       activeEffect.deps.push(keySet)
//       return target[key]
//     },
//     set(target, key, newValue) {
//       target[key] = newValue
//       const targetMap = depsWeakMap.get(target)
//       if (targetMap) {
//         const keySet = targetMap.get(key)

//         // 这里会无线循环卡死：语言规范中对此有明确的说明：在调用 forEach 遍历 Set 集合时，如果一个值已经被访问过了，但该值被删除并重新添加到集合，如果此时 forEach 遍历没有结束，那么该值会重新被访问。
//         // 因为这里执行时，会先cleanup然后再收集，也就是先delete(effectFn),然后add(effectFn)，命中上面规范提出的问题。所以copy一个set或者长度相同的数组(set不能用下标取值，所以用数组的话要遍历存函数比较麻烦，所以直接copy set)来跑即可。
//         // keySet && keySet.forEach(i => i())

//         const runStack = new Set(keySet)
//         runStack.forEach(i => i())
//       }
//       return true
//     }
//   })
// }


// const data = { ok: true, text: 'hello world' }
// const obj = reactive(data)
// let result
// let count = 0
// effect(function effectFn() {
//   count++
//   result = obj.ok ? obj.text : 'not'
// })
// obj.ok = false
// obj.text = 'hello'
// console.log(count, 888)


/**
 * 4. 嵌套的effect和effect栈
 * effect 有嵌套需求  例如组件嵌套子组件
 * 
 *     const data = { foo: true, bar: true }
    const obj = reactive(data)
    let temp1, temp2
    effect(function effectFn1() {
      console.log('effectFn1 执行')

      effect(function effectFn2() {
        console.log('effectFn2 执行')
        // 在 effectFn2 中读取 obj.bar 属性
        temp2 = obj.bar
      })
      // 在 effectFn1 中读取 obj.foo 属性
      temp1 = obj.foo
    })
 * 1）以上代码修改bar的值理论上应该只打印‘effectFn2执行’。修改foo的值应该打印‘effectFn1执行’以及‘effectFn2执行’。实际修改foo的值只会打印'effectFn2执行'。这是因为收集依赖是利用了全局变量activeEffect,当初始化执行effectFn1时，activeEffect指向effectFn1，先打印‘effectFn1执行’，然后执行effectFn2，activeEffect指向effectFn2,打印'effectFn2执行',访问bar,将activeEffect(也就是effectFn2）收集到对应bar的set中。然后effectFn2执行完，向下继续执行effectFn1中的剩余代码。访问foo，将activeEffect(也就是effectFn2）收集到对应foo的set中。
 * 这里就出现了问题。理论上来说我们需要bar->effectFn2,foo->effectFn1。结果因为activeEffect的指向问题，导致foo也收集的是effectFn2（bar->effectFn2,foo->effectFn2），所以实际修改foo的值只会打印'effectFn2执行'。
 * 解决办法：执行完副作用函数时，将activeEffect重置到上一次的指向（可以利用数组保存/恢复）
 */

// let activeEffect
// const activeEffectStack = []

// export function effect(fn) {
//   function effectFn() {
//     cleanup(effectFn)
//     activeEffect = effectFn
//     activeEffectStack.push(activeEffect)
//     fn()
//     activeEffectStack.length--
//     activeEffect = activeEffectStack.at(-1)
//   }
//   effectFn.deps = []
//   effectFn()
// }
// function cleanup(effectFn) {
//   effectFn.deps.forEach(i => {
//     i.delete(effectFn)
//   })
//   effectFn.deps.length = 0
// }
// export function reactive(data) {
//   const depsWeakMap = new WeakMap()
//   return new Proxy(data, {
//     get(target, key) {
//       if (!activeEffect) {
//         return target[key]
//       }
//       let targetMap = depsWeakMap.get(target)
//       if (!targetMap) {
//         depsWeakMap.set(target, (targetMap = new Map))
//       }
//       let keySet = targetMap.get(key)
//       if (!keySet) {
//         targetMap.set(key, (keySet = new Set))
//       }
//       keySet.add(activeEffect)
//       activeEffect.deps.push(keySet)
//       return target[key]
//     },
//     set(target, key, newValue) {
//       target[key] = newValue
//       const targetMap = depsWeakMap.get(target)
//       if (targetMap) {
//         const keySet = targetMap.get(key)

//         const runStack = new Set(keySet)
//         runStack.forEach(i => i())
//       }
//       return true
//     }
//   })
// }


// const data = { foo: true, bar: true }
// const obj = reactive(data)
// let temp1, temp2
// effect(function effectFn1() {
//   console.log('effectFn1 执行')

//   effect(function effectFn2() {
//     console.log('effectFn2 执行')
//     // 在 effectFn2 中读取 obj.bar 属性
//     temp2 = obj.bar
//   })
//   // 在 effectFn1 中读取 obj.foo 属性
//   temp1 = obj.foo
// })
// obj.foo = false


/**
 * 5. 避免无线循环递归
 * 以下操作会引起栈溢出：
 * 
 *      effect(() => {
    obj.foo = obj.foo + 1
     })

 * 1）引起堆栈溢出的原因是，在右侧计算时方位foo，将副作用函数收集，在左侧赋值时执行副作用函数，但是此时函数还没执行结束，就要开始执行下一轮，所以最终导致堆栈溢出。
 * 解决办法：第一次赋值执行副作用函数时，初始化执行effect还没结束，所以此时activeEffect指向该副作用函数。也就是当前执行的副作用函数与设置时触发的依赖相同。这个时候我们选择不执行触发的依赖即可。
 */
// let activeEffect
// const activeEffectStack = []

// export function effect(fn) {
//   function effectFn() {
//     cleanup(effectFn)
//     activeEffect = effectFn
//     activeEffectStack.push(activeEffect)
//     fn()
//     activeEffectStack.length--
//     activeEffect = activeEffectStack.at(-1)
//   }
//   effectFn.deps = []
//   effectFn()
// }
// function cleanup(effectFn) {
//   effectFn.deps.forEach(i => {
//     i.delete(effectFn)
//   })
//   effectFn.deps.length = 0
// }
// export function reactive(data) {
//   const depsWeakMap = new WeakMap()
//   return new Proxy(data, {
//     get(target, key) {
//       if (!activeEffect) {
//         return target[key]
//       }
//       let targetMap = depsWeakMap.get(target)
//       if (!targetMap) {
//         depsWeakMap.set(target, (targetMap = new Map))
//       }
//       let keySet = targetMap.get(key)
//       if (!keySet) {
//         targetMap.set(key, (keySet = new Set))
//       }
//       keySet.add(activeEffect)
//       activeEffect.deps.push(keySet)
//       return target[key]
//     },
//     set(target, key, newValue) {
//       target[key] = newValue
//       const targetMap = depsWeakMap.get(target)
//       if (targetMap) {
//         const keySet = targetMap.get(key)

//         const runStack = new Set(keySet)
//         runStack.forEach(i => {
//           if(i !== activeEffect) {
//             i()
//           }
//         })
//       }
//       return true
//     }
//   })
// }

// const data = {foo:0}
// const obj = reactive(data)
// effect(() => {
//   obj.foo = obj.foo +1
//   console.log(88888, obj.foo)
// })



/**
 * 6. 调度执行
 * 在实际业务中我们有时候需要控制副作用函数执行的时机\次数\方式
 * ```
 *  const data = { foo: 1 }
 *  const obj = reactive(data)
 *  effect(()=>console.log(obj.foo))
 *  obj.foo++
 *  console.log('结束了')
 * ```
 * 正常打印顺序是1,2，结束了
 * 现在要求改成1，结束了，2
 * 这就要求改变打印的时机
 * 这也就是所说的调度执行，schedule
 * 方案：配置项传入schedule回调函数，如果需要调度，则不执行触发依赖操作，将依赖的函数传入schedule的回调，按调度方式执行/或者不执行
 * 这里顺便重构一下代码，把依赖收集/触发依赖的逻辑提取出来
 */
// let activeEffect
// const activeEffectStack = []

// export function effect(fn, options) {
//   function effectFn() {
//     cleanup(effectFn)
//     activeEffect = effectFn
//     activeEffectStack.push(activeEffect)
//     fn()
//     activeEffectStack.length--
//     activeEffect = activeEffectStack.at(-1)
//   }
//   effectFn.deps = []
//   effectFn.schedule = options?.schedule
//   effectFn()
// }
// function cleanup(effectFn) {
//   effectFn.deps.forEach(i => {
//     i.delete(effectFn)
//   })
//   effectFn.deps.length = 0
// }
// export function reactive(data) {
//   const depsWeakMap = new WeakMap()
//   return new Proxy(data, {
//     get(target, key) {
//       track(target, key)
//       return target[key]
//     },
//     set(target, key, newValue) {
//       target[key] = newValue
//       trigger(target, key)
//       return true
//     }
//   })

//   function track(target, key) {
//     if (!activeEffect) {
//       return
//     }
//     let targetMap = depsWeakMap.get(target)
//     if (!targetMap) {
//       depsWeakMap.set(target, (targetMap = new Map))
//     }
//     let keySet = targetMap.get(key)
//     if (!keySet) {
//       targetMap.set(key, (keySet = new Set))
//     }
//     keySet.add(activeEffect)
//     activeEffect.deps.push(keySet)
//   }
//   function trigger(target, key) {
//     const targetMap = depsWeakMap.get(target)
//     if (targetMap) {
//       const keySet = targetMap.get(key)

//       const runStack = new Set()
//       keySet.forEach(i => {
//         if (i !== activeEffect) {
//           runStack.add(i)
//         }
//       })
//       runStack.forEach(i => {
//         if (i.schedule) {
//           i.schedule(i)
//         } else {
//           i()
//         }
//       })
//     }
//   }
// }

// test1
// 要求打印：1，结束了，2
// const data = { foo: 1 }
// const obj = reactive(data)
// effect(() => console.log(obj.foo), {
//   schedule(fn) {
//     setTimeout(() => {
//       fn()
//     });
//   }
// })
// obj.foo++
// console.log('结束了')
// test 2
// 连续触发副作用函数只打印最后一次： 1,3
// const data2 = { foo: 1 }
// const obj2 = reactive(data2)
// const jobQueue = new Set
// let isFlushing = false
// function flushJob() {
//   if (isFlushing) return
//   isFlushing = true
//   Promise.resolve().then(() => {
//     jobQueue.forEach(i => i())
//   })
// }
// effect(() => console.log(obj2.foo), {
//   schedule(fn) {
//     jobQueue.add(fn)
//     flushJob()
//   }
// })
// obj2.foo++
// obj2.foo++


/**
 * 7. 计算属性与lazy
 * lazy: 懒执行，将初始执行的副作用函数导出，在需要执行的时机或者想要执行的位置手动执行
 * 计算属性：基于lazy和schedule,结合对象的value访问器属性构建计算属性computed
 * 1）：获取对应回调函数的return值 通过lazy，在方位computed的value值时，调用effectFn并返回值
 * 2）：对不变值的缓存。不做处理时每次访问value都要调用effectFn，这并没有缓存。使用变量dirty记录是否改变值，并结合schedule（执行完重置）使用。将第一次的值缓存起来，访问时判断是否dirty，再看是重新执行，还是返回缓存
 * 3) ：effect中嵌套computed的值。理论上computed依赖的obj.foo的值改变，则compunted的value值改变，嵌套的effectFn要重新执行。如果不做处理达不到这个要求。（目前的obj.foo和compunted中的effectFn关联起来了，所以obj.foo改变，响应的effectFn执行。但是computed的value和嵌套的effectFn没有关联。所以这里需要在访问value的时候，手动追踪（不用担心各处访问，有activeEffect守卫，只有在effect中才会执行）。在schedule中触发依赖。
 */
// let activeEffect
// const activeEffectStack = []

// export function effect(fn, options = {}) {
//   function effectFn() {
//     cleanup(effectFn)
//     activeEffect = effectFn
//     activeEffectStack.push(activeEffect)
//     const result = fn()
//     activeEffectStack.length--
//     activeEffect = activeEffectStack.at(-1)
//     return result
//   }
//   effectFn.deps = []
//   effectFn.options = options
//   if (options?.lazy) {
//     return effectFn
//   }
//   effectFn()
// }
// function cleanup(effectFn) {
//   effectFn.deps.forEach(i => {
//     i.delete(effectFn)
//   })
//   effectFn.deps.length = 0
// }
// export function reactive(data) {
//   const { track, trigger } = handleDep()
//   return new Proxy(data, {
//     get(target, key) {
//       track(target, key)
//       return target[key]
//     },
//     set(target, key, newValue) {
//       target[key] = newValue
//       trigger(target, key)
//       return true
//     }
//   })
// }

// function handleDep() {
//   const depsWeakMap = new WeakMap()

//   function track(target, key) {
//     if (!activeEffect) {
//       return
//     }
//     let targetMap = depsWeakMap.get(target)
//     if (!targetMap) {
//       depsWeakMap.set(target, (targetMap = new Map))
//     }
//     let keySet = targetMap.get(key)
//     if (!keySet) {
//       targetMap.set(key, (keySet = new Set))
//     }
//     keySet.add(activeEffect)
//     activeEffect.deps.push(keySet)
//   }
//   function trigger(target, key) {
//     const targetMap = depsWeakMap.get(target)
//     if (targetMap) {
//       const keySet = targetMap.get(key)

//       const runStack = new Set()
//       keySet.forEach(i => {
//         if (i !== activeEffect) {
//           runStack.add(i)
//         }
//       })
//       runStack.forEach(i => {
//         if (i?.options?.schedule) {
//           i.options.schedule(i)
//         } else {
//           i()
//         }
//       })
//     }
//   }
//   return {
//     track,
//     trigger
//   }
// }

// // test1
// // 要求手动执行
// // const data = { foo: 1 }
// // const obj = reactive(data)
// // const effectFn = effect(() => console.log(obj.foo), {
// //   lazy: true
// // })
// // effectFn()
// // obj.foo++
// // console.log('结束了')

// function computed(fn) {
//   let value
//   let dirty = true
//   const { track, trigger } = handleDep()
//   const effectFn = effect(fn, {
//     lazy: true,
//     schedule() {
//       dirty = true

//       trigger(obj, 'value')
//     }
//   })

//   const obj = {
//     get value() {
//       if (dirty) {
//         dirty = false
//         value = effectFn()
//       }
//       track(obj, 'value')
//       return value
//     }
//   }
//   return obj
// }

// // test2
// // 1)computed 获取到值
// const data = { foo: 1 }
// const obj = reactive(data)
// const obj2 = computed(() => {
//   console.log('--effectFn--')
//   return obj.foo + 'computed!'
// })
// console.log(obj2.value, '--obj3---')
// // 2)缓存值
// console.log(obj2.value, '--obj3---')
// console.log(obj2.value, '--obj3---')
// obj.foo = 2
// console.log(obj2.value, '--obj3---')
// console.log(obj2.value, '--obj3---')
// // 3)嵌套computed
// effect(() => {
//   // 在该副作用函数中读取 sumRes.value
//   console.log(obj2.value, '--嵌套effectFn执行---')
// })

// // 修改 obj.foo 的值
// obj.foo++

/**
 * 8. watch 的实现 9. 立即执行的watch 和 回调执行时机
 * 1. 监听传入的值，并在触发响应后执行回调函数
 * 2. 传入的可能是响应式数据也可能是返回响应式数据的函数，需要处理传入的参数
 * 3. 用effect对传入的响应式数据进行依赖的管理，触发回调可以放到调度schedule中执行
 * 4. newValue 和 oldValue
 * 5. 立即执行即 初始化时执行一次cb
 * 6. 回调执行时机这个暂时不管他
 */
let activeEffect
const activeEffectStack = []

export function effect(fn, options = {}) {
  function effectFn() {
    cleanup(effectFn)
    activeEffect = effectFn
    activeEffectStack.push(activeEffect)
    const result = fn()
    activeEffectStack.length--
    activeEffect = activeEffectStack.at(-1)
    return result
  }
  effectFn.deps = []
  effectFn.options = options
  if (options?.lazy) {
    return effectFn
  }
  effectFn()
}
function cleanup(effectFn) {
  effectFn.deps.forEach(i => {
    i.delete(effectFn)
  })
  effectFn.deps.length = 0
}
export function reactive(data) {
  const { track, trigger } = handleDep()
  return new Proxy(data, {
    get(target, key) {
      track(target, key)
      return target[key]
    },
    set(target, key, newValue) {
      target[key] = newValue
      trigger(target, key)
      return true
    }
  })
}

function handleDep() {
  const depsWeakMap = new WeakMap()

  function track(target, key) {
    if (!activeEffect) {
      return
    }
    let targetMap = depsWeakMap.get(target)
    if (!targetMap) {
      depsWeakMap.set(target, (targetMap = new Map))
    }
    let keySet = targetMap.get(key)
    if (!keySet) {
      targetMap.set(key, (keySet = new Set))
    }
    keySet.add(activeEffect)
    activeEffect.deps.push(keySet)
  }
  function trigger(target, key) {
    const targetMap = depsWeakMap.get(target)
    if (targetMap) {
      const keySet = targetMap.get(key)

      const runStack = new Set()
      keySet.forEach(i => {
        if (i !== activeEffect) {
          runStack.add(i)
        }
      })
      runStack.forEach(i => {
        if (i?.options?.schedule) {
          i.options.schedule(i)
        } else {
          i()
        }
      })
    }
  }
  return {
    track,
    trigger
  }
}

function computed(fn) {
  let value
  let dirty = true
  const { track, trigger } = handleDep()
  const effectFn = effect(fn, {
    lazy: true,
    schedule() {
      dirty = true

      trigger(obj, 'value')
    }
  })

  const obj = {
    get value() {
      if (dirty) {
        dirty = false
        value = effectFn()
      }
      track(obj, 'value')
      return value
    }
  }
  return obj
}

function watch(data, cb, options = {}) {
  let getter
  if (typeof data === 'function') {
    getter = data
  } else {
    getter = () => traverse(data)
  }
  let newValue,oldValue

  const job = () => {
    newValue = effectFn()
    cb(newValue, oldValue)
    oldValue = newValue 
  }
  const effectFn = effect(() =>
    getter()
    , {
      lazy: true,
      schedule: job
    })

    if(options?.immediate) {
      job()
    }else {
      oldValue = effectFn()
    }
}

function traverse(data, seen = new Set) {
  if (typeof data !== 'object' || data === null || seen.has(data)) {
    // 原始值或者null直接返回不管
    // seen是为了防止循环引用
    return
  }
  seen.add(data)
  for (const key in data) {
    traverse(data[key])
  }
  return data
}

// test2
// 1)computed 获取到值
const data = { foo: 1 }
const obj = reactive(data)
watch(obj, (n,o) => {
  console.log(1111,n,o)
})
watch(() => { obj.foo }, (n,o) => {
  console.log(222,n,o)
})
watch(() => obj.foo, (n,o) => {
  console.log(3333,n,o)
})
watch(() => obj.foo, (n,o) => {
  console.log(3333,n,o)
},{
  immediate: true
})
obj.foo++
