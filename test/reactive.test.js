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
        count ++
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
})
