import router from './router/index'


// 用到哪个store, 待修改, pinia只能特化引入
import store from './store'


// import { Message } from 'element-ui'
import { ElMessage } from 'element-plus'

import NProgress from 'nprogress' // 进度条
import 'nprogress/nprogress.css' // 进度条样式
import { getToken } from './utils/auth'
import getPageTitle from './utils/get-page-title' // 这个文件是

NProgress.configure({ showSpinner: false }) // NProgress配置

const whiteList = ['/login', '/register', '/forget-password'] // 无需重定向白名单, 页面不需权限可直接登录

// 导航守卫, 拦截并进行权限认证
router.beforeEach(async(to, from, next) => {
  // 进度条开始
  NProgress.start()

  // 设置页面标题
  document.title = getPageTitle(to.meta.title)

  // 判断用户是否已登录
  const hasToken = getToken()

  if (hasToken) {
    if (to.path === '/login') {
      // 若已登录则重定向至首页
      next({ path: '/' })
      NProgress.done()
    } else {
      // 判断用户是否已获取用户信息
      const hasRoles = store.getters.roles && store.getters.roles.length > 0
      console.log("hasRoles: " + store.getters.roles )
      if (hasRoles) {
        next()
      } else {
        try {
          // 获取用户信息
          // note: roles must be an object array! such as: ['admin'] or ,['developer','editor']
          const { user_type } = await store.dispatch('user/getInfo')
          let roles = []
          if (user_type) {
            roles = ['admin']
          } else {
            roles = ['normal']
          }
          /**********************************/
          // roles = ['admin']
          /**********************************/
          // 基于角色生成可访问的路由表
          const accessRoutes = await store.dispatch('permission/generateRoutes', roles)

          // 动态添加可访问路由表
          router.addRoutes(accessRoutes)

          // hack方法，确保addRoutes已完成
          // set the replace: true, so the navigation will not leave a history record
          next({ ...to, replace: true })
        } catch (error) {
          // 移除token并跳转至登录界面
          await store.dispatch('user/resetToken')
          ElMessage.error(error || 'Has Error')
          next(`/login?redirect=${to.path}`)
          NProgress.done()
        }
      }
    }
  } else {
    // 无token
    console.log("no token")
    if (whiteList.indexOf(to.path) !== -1) {
      // 在免登录白名单，直接进入
      next()
    } else {
      // 全部重定向到登录页
      next(`/login?redirect=${to.path}`)
      NProgress.done()
    }
  }
})

router.afterEach(() => {
  // 进度条结束
  NProgress.done()
})
