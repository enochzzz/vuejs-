import { expect, describe, it, vi } from 'vitest'
import { reactive, effect } from '../src/index'

describe('reactive', () => {
  // it('1. basic reactive', () => {
  //   const data = {
  //     text: 'nihao'
  //   }
  //   const obj = reactive(data, effect)
  //   let result
  //   function effect() {
  //     result = obj.text
  //   }
  //   effect()
  //   expect(result).to.equal('nihao')
  //   setTimeout(() => {
  //     obj.text = 'nihao vue3'
  //     expect(result).to.equal('nihao vue3')
  //   })
  // })
  it('2. more perfect reactive 1', () => {
    const data = {
      text: 'nihao'
    }
    const obj = reactive(data)
    let result
    effect(() => {
      result = obj.text
    })
    expect(result).to.equal('nihao')
    setTimeout(() => {
      obj.text = 'nihao vue3'
      expect(result).to.equal('nihao vue3')
    })
  })

  it('2. more perfect reactive 2', () => {
    const data = {
      text: 'nihao'
    }
    const obj = reactive(data)
    let result

    let count = 0
    effect(
      // 匿名副作用函数
      () => {
        count++
        result = obj.text
      }
    )
    vi.useFakeTimers()
    expect(count).to.equal(1)
    setTimeout(() => {
      // 副作用函数中并没有读取 notExist 属性的值
      obj.notExist = 'hello vue311'
      expect(count).to.equal(1)
    }, 1000)
    vi.restoreAllMocks()
  })

  it('3. switch branch', () => {
    const data = { ok: true, text: 'hello world' }
    const obj = reactive(data)
    let result
    let count = 0
    effect(function effectFn() {
      count++
      result = obj.ok ? obj.text : 'not'
    })
    obj.ok = false
    expect(count).to.equal(2)
    obj.text = 'hello'
    expect(count).to.equal(2)

  })


  it('4. nest effect', () => {
    const data = { foo: true, bar: true }
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

  })
})
