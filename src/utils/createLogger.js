import debug from 'debug'

const name = 'app-logger'

export default domain => {
  if (domain) {
    return debug(name + ':' + domain)
  }

  return debug(name)
}
