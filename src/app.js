import './plugins/cypress-reload'
import * as storage from './plugins/storage'

class App {
  constructor () {
    this.loaderEl = document.querySelector('.loader')
    this.setupListeners()
    this.recoverApi()
  }
  async setLoading (active) {
    return this.loaderEl.classList.toggle('hidden', !active)
  }
  async sleep (ms) {
    return new Promise(resolve => setTimeout(resolve, (ms || 1000)))
  }
  setupListeners () {
    window.addEventListener('settings-submitted', (event) => {
      console.log('new settings submitted :', event.detail)
      this.emit('action-required', false)
      this.loadTasks(event.detail.api)
    })
    window.addEventListener('show-error', event => this.showError(event.detail))
    window.addEventListener('fade-out', event => this.fadeOut(event.detail))
    window.addEventListener('set-loading', event => this.setLoading(event.detail))
    window.addEventListener('api-response', event => this.parseApiResponse(event.detail))
  }
  async emit (eventName, eventData) {
    console.log(`%c${eventName}`, 'color: blue', eventData)
    window.dispatchEvent(new CustomEvent(eventName, { detail: eventData }))
  }
  recoverApi () {
    this.sleep(10)
      .then(() => storage.get('api'))
      .then(api => {
        console.log('found api', api)
        this.emit('api-set', api)
        this.loadTasks(api)
      })
      .catch(() => {
        this.emit('show-toast', { type: 'info', message: 'please setup api in settings', delay: 5000 })
        this.emit('action-required', true)
      })
  }
  loadTasks (api) {
    this.setLoading(true)
      .then(() => storage.set('api', api))
      .then(() => fetch(api))
      .then(res => res.json())
      .then(data => this.parseApiResponse(data))
      .catch(err => this.showError(err.message))
      .then(() => this.setLoading(false))
  }
  async fadeOut (el) {
    el.classList.add('hide')
    await this.sleep(350)
    el.classList.remove('hide')
    el.classList.add('hidden')
  }
  showError (message) {
    console.error('app show error :', message)
    this.emit('show-toast', { type: 'error', message })
  }
  showLog (message, data) {
    console.log('%c' + 'app show log :', 'font-weight: bold', message, data)
    this.emit('show-toast', { type: 'info', message })
  }
  async parseApiResponse (data) {
    this.showLog('parsing api response...', data)
    if (!data.records) {
      throw Error('api does not return the expected format')
    }
    const tasks = data.records.map(task => ({
      id: task.id,
      ...task.fields,
    }))
    this.emit('tasks-loaded', tasks)
  }
  parseTasks (json) {
    json = json.replace(/\w.*\[(\w+)\]/g, (m, m1) => m1.toLowerCase())
    try {
      this.emit('tasks-loaded', JSON.parse(json))
      return Promise.resolve('tasks-loaded')
    } catch (err) {
      console.error(err)
      return Promise.reject(new Error('api does not return the expected format'))
    }
  }
}
// eslint-disable-next-line no-new
new App()
